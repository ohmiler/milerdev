import 'server-only';

import { and, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';

import { isAnalyticsEventEnabled } from '@/lib/analytics-control';
import {
  analyticsExposureIdSchema,
  serverAnalyticsEventSchema,
} from '@/lib/analytics-contract';
import { db } from '@/lib/db';
import {
  analyticsEvents,
  enrollments,
  lessons,
  measurementOutbox,
} from '@/lib/db/schema';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';

export type LearningMilestoneEventName = 'lesson_completed' | 'course_completed';

export type LearningWorkspaceProjection = {
  enrollmentId: string;
  courseId: string;
  lessonId: string;
};

export type LearningMilestoneIdentity = {
  eventName: LearningMilestoneEventName;
  factId: string;
};

export type LearningMilestoneProjection = LearningMilestoneIdentity & {
  enrollmentId: string;
  courseId: string;
  lessonId: string | null;
  createdAt: Date;
};

export interface LearningMeasurementStore {
  readAuthorizedWorkspace(
    userId: string,
    lessonId: string,
  ): Promise<LearningWorkspaceProjection | null>;
  insertWorkspaceStart(input: LearningWorkspaceProjection & {
    exposureId: string;
  }): Promise<'inserted' | 'duplicate'>;
  readPendingMilestone(
    identity: LearningMilestoneIdentity,
  ): Promise<LearningMilestoneProjection | null>;
  listPendingMilestones(
    enrollmentId: string,
  ): Promise<LearningMilestoneIdentity[]>;
  projectPendingMilestone(
    milestone: LearningMilestoneProjection,
  ): Promise<'projected' | 'duplicate' | 'already_projected'>;
  recordProjectionFailure(identity: LearningMilestoneIdentity): Promise<void>;
}

const analyticsIdSchema = z.string().trim().min(1).max(36);
const workspaceStartSchema = z.object({
  exposureId: analyticsExposureIdSchema,
  userId: analyticsIdSchema,
  lessonId: analyticsIdSchema,
}).strict();
const milestoneIdentitySchema = z.object({
  eventName: z.enum(['lesson_completed', 'course_completed']),
  factId: analyticsIdSchema,
}).strict();

export function parseLearningMilestoneEvent(milestone: LearningMilestoneProjection) {
  return serverAnalyticsEventSchema.parse({
    eventName: milestone.eventName,
    courseId: milestone.courseId,
    factId: milestone.factId,
    learningEnrollmentId: milestone.enrollmentId,
    ...(milestone.lessonId ? { lessonId: milestone.lessonId } : {}),
  });
}

export function createLearningMeasurementRecorder(input: {
  store: LearningMeasurementStore;
  isEventEnabled(eventName: 'learning_workspace_started'): Promise<boolean>;
}) {
  return {
    async recordWorkspaceStart(fact: {
      exposureId: string;
      userId: string;
      lessonId: string;
    }): Promise<{ status: 'recorded' | 'duplicate' | 'disabled' | 'ineligible' | 'failed' }> {
      const parsed = workspaceStartSchema.safeParse(fact);
      if (!parsed.success) return { status: 'ineligible' };

      try {
        if (!(await input.isEventEnabled('learning_workspace_started'))) {
          return { status: 'disabled' };
        }
        const workspace = await input.store.readAuthorizedWorkspace(
          parsed.data.userId,
          parsed.data.lessonId,
        );
        if (!workspace) return { status: 'ineligible' };

        const status = await input.store.insertWorkspaceStart({
          exposureId: parsed.data.exposureId,
          ...workspace,
        });
        return { status: status === 'inserted' ? 'recorded' : 'duplicate' };
      } catch {
        return { status: 'failed' };
      }
    },
  };
}

export function createLearningMeasurementProjector(input: {
  store: LearningMeasurementStore;
  isEventEnabled(eventName: LearningMilestoneEventName): Promise<boolean>;
}) {
  async function projectMilestone(
    identity: LearningMilestoneIdentity,
  ): Promise<{ status: 'projected' | 'duplicate' | 'already_projected' | 'disabled' | 'ineligible' | 'failed' }> {
    const parsed = milestoneIdentitySchema.safeParse(identity);
    if (!parsed.success) return { status: 'ineligible' };

    try {
      if (!(await input.isEventEnabled(parsed.data.eventName))) return { status: 'disabled' };
      const milestone = await input.store.readPendingMilestone(parsed.data);
      if (!milestone) return { status: 'already_projected' };
      return { status: await input.store.projectPendingMilestone(milestone) };
    } catch {
      try {
        await input.store.recordProjectionFailure(parsed.data);
      } catch {
        // Optional measurement recovery never becomes progress authority.
      }
      return { status: 'failed' };
    }
  }

  return {
    projectMilestone,
    async projectPendingMilestones(enrollmentId: string) {
      const parsedEnrollmentId = analyticsIdSchema.safeParse(enrollmentId);
      if (!parsedEnrollmentId.success) return [];
      try {
        const enabled = await Promise.all([
          input.isEventEnabled('lesson_completed'),
          input.isEventEnabled('course_completed'),
        ]);
        if (!enabled.some(Boolean)) return [];

        const pending = await input.store.listPendingMilestones(parsedEnrollmentId.data);
        return Promise.all(pending.map(async (identity) => ({
          identity,
          status: (await projectMilestone(identity)).status,
        })));
      } catch {
        return [];
      }
    },
  };
}

const drizzleLearningMeasurementStore: LearningMeasurementStore = {
  async readAuthorizedWorkspace(userId, lessonId) {
    const [workspace] = await db
      .select({
        enrollmentId: enrollments.id,
        courseId: enrollments.courseId,
        lessonId: lessons.id,
      })
      .from(enrollments)
      .innerJoin(lessons, eq(lessons.courseId, enrollments.courseId))
      .where(and(
        eq(enrollments.userId, userId),
        eq(lessons.id, lessonId),
      ))
      .limit(1);
    return workspace ?? null;
  },

  async insertWorkspaceStart(input) {
    try {
      await db.insert(analyticsEvents).values({
        eventName: 'learning_workspace_started',
        exposureId: input.exposureId,
        source: 'client',
        userId: null,
        courseId: input.courseId,
        bundleId: null,
        paymentId: null,
        enrollmentId: null,
        learningFactId: null,
        learningEnrollmentId: input.enrollmentId,
        lessonId: input.lessonId,
        metadata: null,
        ipAddress: null,
        userAgent: null,
      });
      return 'inserted';
    } catch (error) {
      if (isDuplicateKeyError(error)) return 'duplicate';
      throw error;
    }
  },

  async readPendingMilestone(identity) {
    const [milestone] = await db
      .select({
        eventName: measurementOutbox.eventName,
        factId: measurementOutbox.learningFactId,
        enrollmentId: measurementOutbox.learningEnrollmentId,
        courseId: measurementOutbox.courseId,
        lessonId: measurementOutbox.lessonId,
        createdAt: measurementOutbox.createdAt,
      })
      .from(measurementOutbox)
      .where(and(
        eq(measurementOutbox.eventName, identity.eventName),
        eq(measurementOutbox.learningFactId, identity.factId),
        isNull(measurementOutbox.projectedAt),
      ))
      .limit(1);

    if (
      !milestone?.factId
      || !milestone.enrollmentId
      || !milestone.courseId
      || (milestone.eventName === 'lesson_completed' && !milestone.lessonId)
      || (milestone.eventName === 'course_completed' && milestone.lessonId)
    ) return null;

    return {
      eventName: milestone.eventName as LearningMilestoneEventName,
      factId: milestone.factId,
      enrollmentId: milestone.enrollmentId,
      courseId: milestone.courseId,
      lessonId: milestone.lessonId,
      createdAt: milestone.createdAt,
    };
  },

  async listPendingMilestones(enrollmentId) {
    const pending = await db
      .select({
        eventName: measurementOutbox.eventName,
        factId: measurementOutbox.learningFactId,
      })
      .from(measurementOutbox)
      .where(and(
        eq(measurementOutbox.learningEnrollmentId, enrollmentId),
        isNull(measurementOutbox.projectedAt),
      ));

    return pending.flatMap((milestone) => {
      const parsed = milestoneIdentitySchema.safeParse(milestone);
      return parsed.success ? [parsed.data] : [];
    });
  },

  async projectPendingMilestone(milestone) {
    const event = parseLearningMilestoneEvent(milestone);
    return db.transaction(async (tx) => {
      const [outbox] = await tx
        .select({ id: measurementOutbox.id, createdAt: measurementOutbox.createdAt })
        .from(measurementOutbox)
        .where(and(
          eq(measurementOutbox.eventName, milestone.eventName),
          eq(measurementOutbox.learningFactId, milestone.factId),
          isNull(measurementOutbox.projectedAt),
        ))
        .limit(1)
        .for('update');
      if (!outbox) return 'already_projected';

      let duplicate = false;
      try {
        await tx.insert(analyticsEvents).values({
          eventName: event.eventName,
          exposureId: null,
          source: 'server',
          userId: null,
          courseId: event.courseId ?? null,
          bundleId: null,
          paymentId: null,
          enrollmentId: null,
          learningFactId: event.factId ?? null,
          learningEnrollmentId: event.learningEnrollmentId ?? null,
          lessonId: event.lessonId ?? null,
          metadata: null,
          ipAddress: null,
          userAgent: null,
          createdAt: outbox.createdAt,
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        duplicate = true;
      }

      await tx.update(measurementOutbox).set({
        attemptCount: sql`${measurementOutbox.attemptCount} + 1`,
        lastAttemptAt: new Date(),
        lastErrorCode: null,
        projectedAt: new Date(),
      }).where(and(
        eq(measurementOutbox.id, outbox.id),
        isNull(measurementOutbox.projectedAt),
      ));
      return duplicate ? 'duplicate' : 'projected';
    });
  },

  async recordProjectionFailure(identity) {
    await db.update(measurementOutbox).set({
      attemptCount: sql`${measurementOutbox.attemptCount} + 1`,
      lastAttemptAt: new Date(),
      lastErrorCode: 'projection_failed',
    }).where(and(
      eq(measurementOutbox.eventName, identity.eventName),
      eq(measurementOutbox.learningFactId, identity.factId),
      isNull(measurementOutbox.projectedAt),
    ));
  },
};

export const learningMeasurementRecorder = createLearningMeasurementRecorder({
  store: drizzleLearningMeasurementStore,
  isEventEnabled: isAnalyticsEventEnabled,
});

export const learningMeasurementProjector = createLearningMeasurementProjector({
  store: drizzleLearningMeasurementStore,
  isEventEnabled: isAnalyticsEventEnabled,
});
