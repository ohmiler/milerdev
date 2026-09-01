import { describe, expect, it, vi } from 'vitest';

import {
  createLearningMeasurementProjector,
  createLearningMeasurementRecorder,
  parseLearningMilestoneEvent,
  type LearningMeasurementStore,
  type LearningMilestoneIdentity,
  type LearningMilestoneProjection,
} from '@/lib/learning-measurement';

const exposureId = '123e4567-e89b-42d3-a456-426614174000';

class MemoryLearningMeasurementStore implements LearningMeasurementStore {
  workspace = {
    enrollmentId: 'enrollment-1',
    courseId: 'course-1',
    lessonId: 'lesson-1',
  };
  workspaceFacts = new Set<string>();
  pending = new Map<string, LearningMilestoneProjection>();
  projected = new Set<string>();
  failures = 0;
  failProjection = false;

  async readAuthorizedWorkspace(userId: string, lessonId: string) {
    return userId === 'user-1' && lessonId === this.workspace.lessonId
      ? this.workspace
      : null;
  }

  async insertWorkspaceStart(input: { exposureId: string }) {
    const duplicate = this.workspaceFacts.has(input.exposureId);
    this.workspaceFacts.add(input.exposureId);
    return duplicate ? 'duplicate' as const : 'inserted' as const;
  }

  async readPendingMilestone(identity: LearningMilestoneIdentity) {
    return this.pending.get(`${identity.eventName}:${identity.factId}`) ?? null;
  }

  async listPendingMilestones(enrollmentId: string) {
    return [...this.pending.values()]
      .filter((milestone) => milestone.enrollmentId === enrollmentId)
      .map(({ eventName, factId }) => ({ eventName, factId }));
  }

  async projectPendingMilestone(milestone: LearningMilestoneProjection) {
    if (this.failProjection) throw new Error('projection unavailable');
    const key = `${milestone.eventName}:${milestone.factId}`;
    const duplicate = this.projected.has(key);
    this.projected.add(key);
    this.pending.delete(key);
    return duplicate ? 'duplicate' as const : 'projected' as const;
  }

  async recordProjectionFailure() {
    this.failures += 1;
  }
}

describe('learning workspace measurement recorder', () => {
  it('records one authorized workspace exposure without user identity in the fact', async () => {
    const store = new MemoryLearningMeasurementStore();
    const recorder = createLearningMeasurementRecorder({
      store,
      isEventEnabled: async () => true,
    });

    await expect(recorder.recordWorkspaceStart({
      exposureId,
      userId: 'user-1',
      lessonId: 'lesson-1',
    })).resolves.toEqual({ status: 'recorded' });
    await expect(recorder.recordWorkspaceStart({
      exposureId,
      userId: 'user-1',
      lessonId: 'lesson-1',
    })).resolves.toEqual({ status: 'duplicate' });
    expect(store.workspaceFacts).toEqual(new Set([exposureId]));
  });

  it('rejects another learner or lesson before persistence', async () => {
    const store = new MemoryLearningMeasurementStore();
    const recorder = createLearningMeasurementRecorder({ store, isEventEnabled: async () => true });

    await expect(recorder.recordWorkspaceStart({
      exposureId,
      userId: 'other-user',
      lessonId: 'lesson-1',
    })).resolves.toEqual({ status: 'ineligible' });
    expect(store.workspaceFacts.size).toBe(0);
  });

  it('stops before authorization lookup when learning analytics is disabled', async () => {
    const store = new MemoryLearningMeasurementStore();
    const readAuthorizedWorkspace = vi.spyOn(store, 'readAuthorizedWorkspace');
    const recorder = createLearningMeasurementRecorder({ store, isEventEnabled: async () => false });

    await expect(recorder.recordWorkspaceStart({
      exposureId,
      userId: 'user-1',
      lessonId: 'lesson-1',
    })).resolves.toEqual({ status: 'disabled' });
    expect(readAuthorizedWorkspace).not.toHaveBeenCalled();
  });
});

describe('learning milestone projector', () => {
  const identity: LearningMilestoneIdentity = {
    eventName: 'lesson_completed',
    factId: 'progress-1',
  };

  function pendingMilestone(): LearningMilestoneProjection {
    return {
      ...identity,
      enrollmentId: 'enrollment-1',
      courseId: 'course-1',
      lessonId: 'lesson-1',
      createdAt: new Date('2026-09-01T02:00:00.000Z'),
    };
  }

  it('projects a pending positive transition exactly once', async () => {
    const store = new MemoryLearningMeasurementStore();
    store.pending.set('lesson_completed:progress-1', pendingMilestone());
    const projector = createLearningMeasurementProjector({ store, isEventEnabled: async () => true });

    await expect(projector.projectMilestone(identity)).resolves.toEqual({ status: 'projected' });
    await expect(projector.projectMilestone(identity)).resolves.toEqual({ status: 'already_projected' });
    expect(store.projected).toEqual(new Set(['lesson_completed:progress-1']));
  });

  it('keeps the outbox recoverable through projection failure', async () => {
    const store = new MemoryLearningMeasurementStore();
    store.pending.set('lesson_completed:progress-1', pendingMilestone());
    store.failProjection = true;
    const projector = createLearningMeasurementProjector({ store, isEventEnabled: async () => true });

    await expect(projector.projectMilestone(identity)).resolves.toEqual({ status: 'failed' });
    expect(store.pending.has('lesson_completed:progress-1')).toBe(true);
    expect(store.failures).toBe(1);
  });

  it('reconciles pending milestones for an enrollment after a projection outage', async () => {
    const store = new MemoryLearningMeasurementStore();
    store.pending.set('lesson_completed:progress-1', pendingMilestone());
    store.failProjection = true;
    const projector = createLearningMeasurementProjector({ store, isEventEnabled: async () => true });

    await expect(projector.projectMilestone(identity)).resolves.toEqual({ status: 'failed' });
    store.failProjection = false;

    await expect(projector.projectPendingMilestones('enrollment-1')).resolves.toEqual([
      { identity, status: 'projected' },
    ]);
    expect(store.projected).toEqual(new Set(['lesson_completed:progress-1']));
  });

  it('routes production milestone facts through the privacy allow-list shape', () => {
    expect(parseLearningMilestoneEvent(pendingMilestone())).toEqual({
      eventName: 'lesson_completed',
      courseId: 'course-1',
      factId: 'progress-1',
      learningEnrollmentId: 'enrollment-1',
      lessonId: 'lesson-1',
    });

    expect(() => parseLearningMilestoneEvent({
      ...pendingMilestone(),
      eventName: 'course_completed',
    })).toThrow();
  });
});
