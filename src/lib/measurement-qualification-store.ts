import 'server-only';

import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { analyticsEvents, measurementOutbox, payments, webVitals } from '@/lib/db/schema';
import {
  createLearnerObservationEnd,
  type MeasurementEventRow,
  type MeasurementPaymentRow,
  type MeasurementQualificationStore,
  type MeasurementWebVitalRow,
  type MeasurementWindow,
} from '@/lib/measurement-qualification-report';

const BASELINE_EVENT_NAMES = [
  'course_viewed',
  'bundle_viewed',
  'purchase_completed',
  'learning_workspace_started',
  'lesson_completed',
  'course_completed',
] as const;

const LEARNER_TAIL_EVENT_NAMES = ['lesson_completed', 'course_completed'] as const;

export type PersistedMeasurementEventRow = Omit<MeasurementEventRow, 'privacyUnsafe'> & {
  privacyUnsafe: boolean | number;
};

export interface MeasurementQualificationQueries {
  readPayments(window: MeasurementWindow): Promise<MeasurementPaymentRow[]>;
  readBaselineEvents(window: MeasurementWindow): Promise<PersistedMeasurementEventRow[]>;
  readLearnerTailEvents(window: MeasurementWindow): Promise<PersistedMeasurementEventRow[]>;
  readLinkedPurchaseEvents(
    window: MeasurementWindow,
    observedBefore: Date,
  ): Promise<PersistedMeasurementEventRow[]>;
  readWebVitals(window: MeasurementWindow): Promise<MeasurementWebVitalRow[]>;
}

export function createMeasurementQualificationStore(
  queries: MeasurementQualificationQueries,
): MeasurementQualificationStore {
  return {
    async readSnapshot(window, observedAt) {
      const learnerTailWindow = {
        start: window.end,
        end: createLearnerObservationEnd(window, observedAt),
      };
      const [paymentRows, baselineEvents, learnerTailEvents, linkedPurchaseEvents, vitalRows]
        = await Promise.all([
          queries.readPayments(window),
          queries.readBaselineEvents(window),
          queries.readLearnerTailEvents(learnerTailWindow),
          queries.readLinkedPurchaseEvents(window, observedAt),
          queries.readWebVitals(window),
        ]);
      const eventsById = new Map(
        [...baselineEvents, ...learnerTailEvents, ...linkedPurchaseEvents].map((row) => [
          row.id,
          { ...row, privacyUnsafe: Boolean(row.privacyUnsafe) },
        ]),
      );
      return {
        payments: paymentRows,
        events: [...eventsById.values()],
        webVitals: vitalRows,
      };
    },
  };
}

const eventSelection = {
  id: analyticsEvents.id,
  eventName: analyticsEvents.eventName,
  exposureId: analyticsEvents.exposureId,
  attributedExposureId: analyticsEvents.attributedExposureId,
  userId: analyticsEvents.userId,
  courseId: analyticsEvents.courseId,
  bundleId: analyticsEvents.bundleId,
  paymentId: analyticsEvents.paymentId,
  enrollmentId: analyticsEvents.enrollmentId,
  learningFactId: analyticsEvents.learningFactId,
  learningEnrollmentId: analyticsEvents.learningEnrollmentId,
  lessonId: analyticsEvents.lessonId,
  source: analyticsEvents.source,
  metadata: analyticsEvents.metadata,
  privacyUnsafe: sql<number>`CASE WHEN ${analyticsEvents.ipAddress} IS NOT NULL OR ${analyticsEvents.userAgent} IS NOT NULL THEN 1 ELSE 0 END`,
  createdAt: analyticsEvents.createdAt,
};

const drizzleMeasurementQualificationQueries: MeasurementQualificationQueries = {
  async readPayments(window) {
    return db.select({
      id: payments.id,
      userId: payments.userId,
      courseId: payments.courseId,
      bundleId: payments.bundleId,
      attributedExposureId: payments.attributedExposureId,
      amount: payments.amount,
      currency: payments.currency,
      method: payments.method,
      status: payments.status,
      purchaseCompletedAt: measurementOutbox.createdAt,
    }).from(measurementOutbox)
      .innerJoin(payments, eq(measurementOutbox.paymentId, payments.id))
      .where(and(
        eq(measurementOutbox.eventName, 'purchase_completed'),
        gte(measurementOutbox.createdAt, window.start),
        lt(measurementOutbox.createdAt, window.end),
      ));
  },
  async readBaselineEvents(window) {
    return db.select(eventSelection).from(analyticsEvents).where(and(
      inArray(analyticsEvents.eventName, [...BASELINE_EVENT_NAMES]),
      gte(analyticsEvents.createdAt, window.start),
      lt(analyticsEvents.createdAt, window.end),
    ));
  },
  async readLearnerTailEvents(window) {
    return db.select(eventSelection).from(analyticsEvents).where(and(
      inArray(analyticsEvents.eventName, [...LEARNER_TAIL_EVENT_NAMES]),
      gte(analyticsEvents.createdAt, window.start),
      lt(analyticsEvents.createdAt, window.end),
    ));
  },
  async readLinkedPurchaseEvents(window, observedBefore) {
    return db.select(eventSelection).from(analyticsEvents)
      .innerJoin(measurementOutbox, eq(analyticsEvents.paymentId, measurementOutbox.paymentId))
      .innerJoin(payments, eq(measurementOutbox.paymentId, payments.id))
      .where(and(
        eq(analyticsEvents.eventName, 'purchase_completed'),
        eq(measurementOutbox.eventName, 'purchase_completed'),
        gte(analyticsEvents.createdAt, measurementOutbox.createdAt),
        lt(analyticsEvents.createdAt, observedBefore),
        gte(measurementOutbox.createdAt, window.start),
        lt(measurementOutbox.createdAt, window.end),
      ));
  },
  async readWebVitals(window) {
    return db.select({
      pageLoadId: webVitals.pageLoadId,
      metricName: webVitals.metricName,
      routeFamily: webVitals.routeFamily,
      deviceClass: webVitals.deviceClass,
      releaseIdentity: webVitals.releaseIdentity,
      value: webVitals.value,
      rating: webVitals.rating,
      createdAt: webVitals.createdAt,
    }).from(webVitals).where(and(
      gte(webVitals.createdAt, window.start),
      lt(webVitals.createdAt, window.end),
    ));
  },
};

export const drizzleMeasurementQualificationStore = createMeasurementQualificationStore(
  drizzleMeasurementQualificationQueries,
);
