import 'server-only';

import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm';

import { getAnalyticsControlState } from '@/lib/analytics-control';
import { db } from '@/lib/db';
import { analyticsEvents, payments, webVitals } from '@/lib/db/schema';
import {
  WEB_VITAL_DEVICE_CLASSES,
  WEB_VITAL_NAMES,
  type WebVitalDeviceClass,
  type WebVitalName,
} from '@/lib/web-vitals-contract';
import { webVitalReportSchema } from '@/lib/web-vitals';

const DAY_MS = 24 * 60 * 60 * 1_000;
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1_000;
const BASELINE_DAYS = 14;
const LEARNER_OBSERVATION_DAYS = 7;
const MINIMUM_ELIGIBLE_VIEWS = 100;
const DEFAULT_WEB_VITAL_SAMPLE_FLOOR = 75;
const DIAGNOSTIC_IDENTITY_LIMIT = 50;

const REQUIRED_EVENT_CLASSES = [
  'product_interaction',
  'commerce',
  'learning',
  'performance',
] as const;

const RELEVANT_EVENT_NAMES = [
  'course_viewed',
  'bundle_viewed',
  'purchase_completed',
  'learning_workspace_started',
  'lesson_completed',
  'course_completed',
] as const;

export type MeasurementWindow = { start: Date; end: Date };

export type MeasurementPaymentRow = {
  id: string;
  userId: string | null;
  courseId: string | null;
  bundleId: string | null;
  attributedExposureId: string | null;
  amount: string;
  currency: string;
  method: 'stripe' | 'promptpay' | 'bank_transfer';
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'verifying';
  createdAt: Date | null;
};

export type MeasurementEventRow = {
  id: string;
  eventName: string;
  exposureId: string | null;
  attributedExposureId: string | null;
  userId: string | null;
  courseId: string | null;
  bundleId: string | null;
  paymentId: string | null;
  enrollmentId: string | null;
  learningFactId: string | null;
  learningEnrollmentId: string | null;
  lessonId: string | null;
  source: 'client' | 'server';
  privacyUnsafe: boolean;
  createdAt: Date | null;
};

export type MeasurementWebVitalRow = {
  pageLoadId: string;
  metricName: WebVitalName;
  routeFamily: string;
  deviceClass: WebVitalDeviceClass;
  releaseIdentity: string;
  value: string;
  rating: string;
  updatedAt: Date;
};

export type MeasurementControlState = {
  operationalEnabled: boolean;
  governanceApproved: boolean;
  effectiveEventClasses: readonly string[];
  rawEventRetentionDays: number | null;
};

export type MeasurementQualificationSnapshot = {
  payments: MeasurementPaymentRow[];
  events: MeasurementEventRow[];
  webVitals: MeasurementWebVitalRow[];
};

export interface MeasurementQualificationStore {
  readSnapshot(
    window: MeasurementWindow,
    observedAt: Date,
  ): Promise<MeasurementQualificationSnapshot>;
}

function isWithin(value: Date | null, start: Date, end: Date): value is Date {
  return Boolean(value && value >= start && value < end);
}

function hasExactlyOneProduct(row: { courseId: string | null; bundleId: string | null }) {
  return Boolean(row.courseId) !== Boolean(row.bundleId);
}

function isEligiblePayment(row: MeasurementPaymentRow, window: MeasurementWindow): boolean {
  const amount = Number(row.amount);
  return row.status === 'completed'
    && row.currency === 'THB'
    && Boolean(row.userId)
    && hasExactlyOneProduct(row)
    && Number.isFinite(amount)
    && amount > 0
    && isWithin(row.createdAt, window.start, window.end);
}

function isProductExposure(row: MeasurementEventRow): boolean {
  if (!row.createdAt || !row.exposureId || row.source !== 'client') return false;
  if (row.attributedExposureId || row.userId || row.paymentId || row.enrollmentId) return false;
  if (row.learningFactId || row.learningEnrollmentId || row.lessonId) return false;
  return row.eventName === 'course_viewed'
    ? Boolean(row.courseId) && !row.bundleId
    : row.eventName === 'bundle_viewed' && Boolean(row.bundleId) && !row.courseId;
}

function isPurchaseFact(row: MeasurementEventRow): boolean {
  return row.eventName === 'purchase_completed'
    && row.source === 'server'
    && Boolean(row.userId)
    && Boolean(row.paymentId)
    && hasExactlyOneProduct(row)
    && !row.exposureId
    && !row.enrollmentId
    && !row.learningFactId
    && !row.learningEnrollmentId
    && !row.lessonId;
}

function isWorkspaceStart(row: MeasurementEventRow): boolean {
  return row.eventName === 'learning_workspace_started'
    && row.source === 'client'
    && Boolean(row.exposureId)
    && Boolean(row.courseId)
    && Boolean(row.learningEnrollmentId)
    && Boolean(row.lessonId)
    && !row.attributedExposureId
    && !row.userId
    && !row.bundleId
    && !row.paymentId
    && !row.enrollmentId
    && !row.learningFactId;
}

function isLessonCompletion(row: MeasurementEventRow): boolean {
  return row.eventName === 'lesson_completed'
    && row.source === 'server'
    && Boolean(row.learningFactId)
    && Boolean(row.learningEnrollmentId)
    && Boolean(row.courseId)
    && Boolean(row.lessonId)
    && !row.attributedExposureId
    && !row.userId
    && !row.bundleId
    && !row.paymentId
    && !row.enrollmentId
    && !row.exposureId;
}

function isCourseCompletion(row: MeasurementEventRow): boolean {
  return row.eventName === 'course_completed'
    && row.source === 'server'
    && Boolean(row.learningFactId)
    && Boolean(row.learningEnrollmentId)
    && Boolean(row.courseId)
    && !row.lessonId
    && !row.attributedExposureId
    && !row.userId
    && !row.bundleId
    && !row.paymentId
    && !row.enrollmentId
    && !row.exposureId;
}

function isStructurallyValidEvent(row: MeasurementEventRow): boolean {
  if (!row.createdAt) return false;
  if (row.eventName === 'course_viewed' || row.eventName === 'bundle_viewed') {
    return isProductExposure(row);
  }
  if (row.eventName === 'purchase_completed') return isPurchaseFact(row);
  if (row.eventName === 'learning_workspace_started') return isWorkspaceStart(row);
  if (row.eventName === 'lesson_completed') return isLessonCompletion(row);
  if (row.eventName === 'course_completed') return isCourseCompletion(row);
  return false;
}

function paymentTargetMatchesEvent(payment: MeasurementPaymentRow, fact: MeasurementEventRow) {
  return payment.userId === fact.userId
    && payment.courseId === fact.courseId
    && payment.bundleId === fact.bundleId;
}

function exposureTargetMatchesPayment(exposure: MeasurementEventRow, payment: MeasurementPaymentRow) {
  return exposure.courseId === payment.courseId && exposure.bundleId === payment.bundleId;
}

function cappedIdentities(identities: string[]) {
  const sorted = [...new Set(identities)].sort();
  return {
    count: sorted.length,
    identities: sorted.slice(0, DIAGNOSTIC_IDENTITY_LIMIT),
    truncated: sorted.length > DIAGNOSTIC_IDENTITY_LIMIT,
  };
}

function percentile75(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.75) - 1] ?? null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function metricBudget(metricName: WebVitalName) {
  if (metricName === 'LCP') return 2_500;
  if (metricName === 'INP') return 200;
  return 0.1;
}

function gate(passed: boolean, reasons: string[]) {
  return { passed, reasons: passed ? [] : reasons };
}

export function createAsiaBangkokMeasurementWindow(now: Date): MeasurementWindow {
  const bangkok = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  const bangkokDayStartAsUtc = Date.UTC(
    bangkok.getUTCFullYear(),
    bangkok.getUTCMonth(),
    bangkok.getUTCDate(),
  );
  const end = new Date(bangkokDayStartAsUtc - BANGKOK_OFFSET_MS);
  return {
    start: new Date(end.getTime() - BASELINE_DAYS * DAY_MS),
    end,
  };
}

export function buildMeasurementQualificationReport(input: {
  window: MeasurementWindow;
  observedAt: Date;
  control: MeasurementControlState;
  payments: MeasurementPaymentRow[];
  events: MeasurementEventRow[];
  webVitals: MeasurementWebVitalRow[];
  minimumWebVitalSampleCount?: number;
}) {
  const minimumWebVitalSampleCount = input.minimumWebVitalSampleCount
    ?? DEFAULT_WEB_VITAL_SAMPLE_FLOOR;
  const eligiblePayments = input.payments.filter((row) => isEligiblePayment(row, input.window));
  const eligiblePaymentById = new Map(eligiblePayments.map((row) => [row.id, row]));
  const rawPurchaseFacts = input.events.filter((row) => row.eventName === 'purchase_completed');
  const purchaseFactsByPayment = new Map<string, MeasurementEventRow[]>();
  for (const fact of rawPurchaseFacts) {
    if (!fact.paymentId) continue;
    const existing = purchaseFactsByPayment.get(fact.paymentId) ?? [];
    existing.push(fact);
    purchaseFactsByPayment.set(fact.paymentId, existing);
  }

  const missingPaymentIds: string[] = [];
  const duplicatePaymentIds: string[] = [];
  const reconciledPayments: Array<{ payment: MeasurementPaymentRow; fact: MeasurementEventRow }> = [];
  for (const payment of eligiblePayments) {
    const facts = purchaseFactsByPayment.get(payment.id) ?? [];
    if (facts.length === 0) missingPaymentIds.push(payment.id);
    if (facts.length > 1) duplicatePaymentIds.push(payment.id);
    if (facts.length === 1 && isPurchaseFact(facts[0]!) && paymentTargetMatchesEvent(payment, facts[0]!)) {
      reconciledPayments.push({ payment, fact: facts[0]! });
    }
  }

  const unknownPurchaseFactIds = rawPurchaseFacts.flatMap((fact) => {
    const payment = fact.paymentId ? eligiblePaymentById.get(fact.paymentId) : null;
    return payment && isPurchaseFact(fact) && paymentTargetMatchesEvent(payment, fact)
      ? []
      : [fact.id];
  });

  const eligibleExposures = input.events.filter((row) => (
    isProductExposure(row)
    && isWithin(row.createdAt, input.window.start, input.window.end)
  ));
  const exposureById = new Map(eligibleExposures.map((row) => [row.exposureId!, row]));
  const attributedExposureIds = new Set<string>();
  let attributedPurchaseCount = 0;
  let unattributedPurchaseCount = 0;
  let attributionTargetMismatchCount = 0;
  let attributionIdentityMismatchCount = 0;
  for (const { payment, fact } of reconciledPayments) {
    if (fact.attributedExposureId !== payment.attributedExposureId) {
      attributionIdentityMismatchCount += 1;
      unattributedPurchaseCount += 1;
      continue;
    }
    const attributionId = fact.attributedExposureId;
    const exposure = attributionId ? exposureById.get(attributionId) : null;
    if (exposure && exposureTargetMatchesPayment(exposure, payment)) {
      attributedPurchaseCount += 1;
      attributedExposureIds.add(exposure.exposureId!);
    } else {
      unattributedPurchaseCount += 1;
      if (attributionId) attributionTargetMismatchCount += 1;
    }
  }

  const workspaceStarts = input.events.filter((row) => (
    isWorkspaceStart(row)
    && isWithin(row.createdAt, input.window.start, input.window.end)
  ));
  const firstStartByEnrollment = new Map<string, MeasurementEventRow>();
  for (const start of workspaceStarts) {
    const enrollmentId = start.learningEnrollmentId!;
    const existing = firstStartByEnrollment.get(enrollmentId);
    if (!existing || start.createdAt! < existing.createdAt!) {
      firstStartByEnrollment.set(enrollmentId, start);
    }
  }
  const lessonCompletions = input.events.filter(isLessonCompletion);
  const courseCompletions = input.events.filter(isCourseCompletion);
  let maturedEnrollmentCount = 0;
  let pendingObservationCount = 0;
  let nextLessonCompletedWithin7DaysCount = 0;
  let courseCompletedWithin7DaysCount = 0;
  const completionHours: number[] = [];
  for (const [enrollmentId, start] of firstStartByEnrollment) {
    const horizon = new Date(start.createdAt!.getTime() + LEARNER_OBSERVATION_DAYS * DAY_MS);
    if (horizon > input.observedAt) {
      pendingObservationCount += 1;
      continue;
    }
    maturedEnrollmentCount += 1;
    const lessonCompletion = lessonCompletions
      .filter((eventRow) => (
        eventRow.learningEnrollmentId === enrollmentId
        && eventRow.lessonId === start.lessonId
        && eventRow.createdAt! >= start.createdAt!
        && eventRow.createdAt! <= horizon
      ))
      .sort((left, right) => left.createdAt!.getTime() - right.createdAt!.getTime())[0];
    if (lessonCompletion) {
      nextLessonCompletedWithin7DaysCount += 1;
      completionHours.push((lessonCompletion.createdAt!.getTime() - start.createdAt!.getTime()) / 3_600_000);
    }
    if (courseCompletions.some((eventRow) => (
      eventRow.learningEnrollmentId === enrollmentId
      && eventRow.createdAt! >= start.createdAt!
      && eventRow.createdAt! <= horizon
    ))) courseCompletedWithin7DaysCount += 1;
  }

  const validWebVitals = input.webVitals.flatMap((row) => {
    const value = Number(row.value);
    const parsed = webVitalReportSchema.safeParse({
      pageLoadId: row.pageLoadId,
      metricName: row.metricName,
      routeFamily: row.routeFamily,
      deviceClass: row.deviceClass,
      releaseIdentity: row.releaseIdentity,
      value,
      rating: row.rating,
    });
    return parsed.success && isWithin(row.updatedAt, input.window.start, input.window.end)
      ? [{ ...row, value }]
      : [];
  });
  const invalidWebVitalCount = input.webVitals.length - validWebVitals.length;
  const releaseIdentities = [...new Set(validWebVitals.map((row) => row.releaseIdentity))].sort();
  const reportReleaseIdentities: Array<string | null> = releaseIdentities.length > 0
    ? releaseIdentities
    : [null];
  const series = reportReleaseIdentities.flatMap((releaseIdentity) => (
    WEB_VITAL_NAMES.flatMap((metricName) => (
      WEB_VITAL_DEVICE_CLASSES.map((deviceClass) => {
        const values = validWebVitals
          .filter((row) => (
            releaseIdentity !== null
            && row.releaseIdentity === releaseIdentity
            && row.metricName === metricName
            && row.deviceClass === deviceClass
          ))
          .map((row) => row.value);
        const p75 = percentile75(values);
        const sampleCount = values.length;
        return {
          releaseIdentity,
          metricName,
          deviceClass,
          sampleCount,
          p75,
          budget: metricBudget(metricName),
          decision: sampleCount < minimumWebVitalSampleCount
            ? 'insufficient_samples' as const
            : p75 !== null && p75 <= metricBudget(metricName)
              ? 'within_budget' as const
              : 'over_budget' as const,
        };
      })
    ))
  ));

  const invalidEventCount = input.events.filter((row) => !isStructurallyValidEvent(row)).length;
  const privacyUnsafeEventCount = input.events.filter((row) => row.privacyUnsafe).length;
  const schemaReasons = [
    ...(invalidEventCount > 0 ? ['invalid_measurement_event_shape'] : []),
    ...(invalidWebVitalCount > 0 ? ['invalid_web_vital_shape'] : []),
    ...(attributionIdentityMismatchCount > 0 ? ['purchase_attribution_identity_mismatch'] : []),
  ];
  const eligibilityReasons = [
    ...(eligibleExposures.length < MINIMUM_ELIGIBLE_VIEWS ? ['eligible_view_floor_not_met'] : []),
    ...(series.length < WEB_VITAL_NAMES.length * WEB_VITAL_DEVICE_CLASSES.length
      || series.some((entry) => entry.sampleCount < minimumWebVitalSampleCount)
      ? ['web_vital_sample_floor_not_met'] : []),
  ];
  const privacyReasons = [
    ...(!input.control.operationalEnabled ? ['analytics_kill_switch_disabled'] : []),
    ...(!input.control.governanceApproved ? ['analytics_governance_not_approved'] : []),
    ...((input.control.rawEventRetentionDays ?? 0) < BASELINE_DAYS + LEARNER_OBSERVATION_DAYS
      ? ['raw_retention_shorter_than_observation_window'] : []),
    ...REQUIRED_EVENT_CLASSES.filter((eventClass) => (
      !input.control.effectiveEventClasses.includes(eventClass)
    )).map((eventClass) => `event_class_not_enabled:${eventClass}`),
    ...(privacyUnsafeEventCount > 0 ? ['privacy_unsafe_measurement_rows'] : []),
  ];
  const releaseReasons = releaseIdentities.length === 1
    ? []
    : [releaseIdentities.length === 0 ? 'release_identity_missing' : 'multiple_release_identities'];
  const reconciliationReasons = [
    ...(missingPaymentIds.length > 0 ? ['missing_purchase_facts'] : []),
    ...(duplicatePaymentIds.length > 0 ? ['duplicate_purchase_facts'] : []),
    ...(unknownPurchaseFactIds.length > 0 ? ['unknown_purchase_fact_identities'] : []),
  ];
  const gates = {
    schema: gate(schemaReasons.length === 0, schemaReasons),
    eligibility: gate(eligibilityReasons.length === 0, eligibilityReasons),
    privacy: gate(privacyReasons.length === 0, privacyReasons),
    release: gate(releaseReasons.length === 0, releaseReasons),
    reconciliation: gate(reconciliationReasons.length === 0, reconciliationReasons),
  };
  const qualified = Object.values(gates).every((entry) => entry.passed);

  return {
    generatedAt: input.observedAt.toISOString(),
    window: {
      timezone: 'Asia/Bangkok',
      start: input.window.start.toISOString(),
      endExclusive: input.window.end.toISOString(),
      fullCalendarDays: BASELINE_DAYS,
    },
    qualification: { status: qualified ? 'qualified' as const : 'rejected' as const, gates },
    purchaseReconciliation: {
      eligiblePaymentCount: eligiblePayments.length,
      reconciledPaymentCount: reconciledPayments.length,
      missing: cappedIdentities(missingPaymentIds),
      duplicate: cappedIdentities(duplicatePaymentIds),
      unknown: cappedIdentities(unknownPurchaseFactIds),
    },
    attribution: {
      eligibleViewCount: eligibleExposures.length,
      attributedPurchaseCount,
      attributedConversionRate: eligibleExposures.length > 0
        ? attributedPurchaseCount / eligibleExposures.length
        : null,
      unattributedPurchaseCount,
      viewsWithoutAttributedPurchaseCount: eligibleExposures.length - attributedExposureIds.size,
      labels: {
        unattributedPurchase: 'operational_unattributed_purchases',
        viewWithoutAttributedPurchase: 'operational_views_without_attributed_purchase',
      },
    },
    learner: {
      workspaceStartObservationCount: workspaceStarts.length,
      startedEnrollmentCount: firstStartByEnrollment.size,
      maturedEnrollmentCount,
      pendingObservationCount,
      nextLessonCompletedWithin7DaysCount,
      courseCompletedWithin7DaysCount,
      continuityRate: maturedEnrollmentCount > 0
        ? nextLessonCompletedWithin7DaysCount / maturedEnrollmentCount
        : null,
      medianHoursToNextLessonCompletion: median(completionHours),
    },
    webVitals: {
      minimumSampleCount: minimumWebVitalSampleCount,
      releaseIdentities,
      series,
    },
    diagnostics: {
      invalidEventCount,
      invalidWebVitalCount,
      privacyUnsafeEventCount,
      attributionTargetMismatchCount,
      attributionIdentityMismatchCount,
      eligiblePaymentsByMethod: Object.fromEntries(
        ['stripe', 'promptpay', 'bank_transfer'].map((method) => [
          method,
          eligiblePayments.filter((row) => row.method === method).length,
        ]),
      ),
      eligiblePaymentsByProduct: {
        course: eligiblePayments.filter((row) => row.courseId).length,
        bundle: eligiblePayments.filter((row) => row.bundleId).length,
      },
      refundedPaymentCount: input.payments.filter((row) => (
        row.status === 'refunded' && isWithin(row.createdAt, input.window.start, input.window.end)
      )).length,
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
  privacyUnsafe: sql<number>`CASE WHEN ${analyticsEvents.ipAddress} IS NOT NULL OR ${analyticsEvents.userAgent} IS NOT NULL THEN 1 ELSE 0 END`,
  createdAt: analyticsEvents.createdAt,
};

const drizzleMeasurementQualificationStore: MeasurementQualificationStore = {
  async readSnapshot(window, observedAt) {
    const observationEnd = new Date(Math.min(
      observedAt.getTime(),
      window.end.getTime() + LEARNER_OBSERVATION_DAYS * DAY_MS,
    ));
    const [paymentRows, eventRows, linkedPurchaseRows, vitalRows] = await Promise.all([
      db.select({
        id: payments.id,
        userId: payments.userId,
        courseId: payments.courseId,
        bundleId: payments.bundleId,
        attributedExposureId: payments.attributedExposureId,
        amount: payments.amount,
        currency: payments.currency,
        method: payments.method,
        status: payments.status,
        createdAt: payments.createdAt,
      }).from(payments).where(and(
        gte(payments.createdAt, window.start),
        lt(payments.createdAt, window.end),
      )),
      db.select(eventSelection).from(analyticsEvents).where(and(
        inArray(analyticsEvents.eventName, [...RELEVANT_EVENT_NAMES]),
        gte(analyticsEvents.createdAt, window.start),
        lt(analyticsEvents.createdAt, observationEnd),
      )),
      db.select(eventSelection).from(analyticsEvents)
        .innerJoin(payments, eq(analyticsEvents.paymentId, payments.id))
        .where(and(
          eq(analyticsEvents.eventName, 'purchase_completed'),
          gte(payments.createdAt, window.start),
          lt(payments.createdAt, window.end),
        )),
      db.select({
        pageLoadId: webVitals.pageLoadId,
        metricName: webVitals.metricName,
        routeFamily: webVitals.routeFamily,
        deviceClass: webVitals.deviceClass,
        releaseIdentity: webVitals.releaseIdentity,
        value: webVitals.value,
        rating: webVitals.rating,
        updatedAt: webVitals.updatedAt,
      }).from(webVitals).where(and(
        gte(webVitals.updatedAt, window.start),
        lt(webVitals.updatedAt, window.end),
      )),
    ]);
    const eventsById = new Map(
      [...eventRows, ...linkedPurchaseRows].map((row) => [row.id, {
        ...row,
        privacyUnsafe: Boolean(row.privacyUnsafe),
      }]),
    );
    return {
      payments: paymentRows,
      events: [...eventsById.values()],
      webVitals: vitalRows,
    };
  },
};

export function createMeasurementQualificationService(input: {
  store: MeasurementQualificationStore;
  getControlState(): Promise<MeasurementControlState>;
  now?: () => Date;
}) {
  return {
    async getReport() {
      const observedAt = input.now?.() ?? new Date();
      const window = createAsiaBangkokMeasurementWindow(observedAt);
      const [snapshot, control] = await Promise.all([
        input.store.readSnapshot(window, observedAt),
        input.getControlState(),
      ]);
      return buildMeasurementQualificationReport({
        window,
        observedAt,
        control,
        ...snapshot,
      });
    },
  };
}

export const measurementQualificationService = createMeasurementQualificationService({
  store: drizzleMeasurementQualificationStore,
  async getControlState() {
    const state = await getAnalyticsControlState({ fresh: true });
    return {
      operationalEnabled: state.operationalEnabled,
      governanceApproved: state.governanceApproved,
      effectiveEventClasses: state.effectiveEventClasses,
      rawEventRetentionDays: state.governanceDecision?.rawEventRetentionDays ?? null,
    };
  },
});
