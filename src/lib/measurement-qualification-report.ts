import 'server-only';

import {
  WEB_VITAL_DEVICE_CLASSES,
  WEB_VITAL_NAMES,
  type WebVitalName,
} from '@/lib/web-vitals-contract';
import { webVitalReportSchema } from '@/lib/web-vitals';
import {
  LEARNER_OBSERVATION_DAYS,
  MEASUREMENT_DAY_MS,
  type MeasurementControlState,
  type MeasurementEventRow,
  type MeasurementPaymentRow,
  type MeasurementWebVitalRow,
  type MeasurementWindow,
} from '@/lib/measurement-qualification-contract';
import {
  exposureTargetMatchesPayment,
  hasValidEventMetadata,
  isCourseCompletion,
  isEligiblePayment,
  isLessonCompletion,
  isProductExposure,
  isPurchaseFact,
  isStructurallyValidEvent,
  isWithin,
  isWorkspaceStart,
  paymentTargetMatchesEvent,
} from '@/lib/measurement-qualification-validation';

export * from '@/lib/measurement-qualification-contract';

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1_000;
const BASELINE_DAYS = 14;
const MINIMUM_ELIGIBLE_VIEWS = 100;
const DEFAULT_WEB_VITAL_SAMPLE_FLOOR = 75;
const DIAGNOSTIC_IDENTITY_LIMIT = 50;
const UNTRUSTED_RELEASE_IDENTITIES = new Set(['unknown-release', 'local-development']);

const REQUIRED_EVENT_CLASSES = [
  'product_interaction',
  'commerce',
  'learning',
  'performance',
] as const;

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
    start: new Date(end.getTime() - BASELINE_DAYS * MEASUREMENT_DAY_MS),
    end,
  };
}

export function createLearnerObservationEnd(window: MeasurementWindow, observedAt: Date): Date {
  return new Date(Math.min(
    observedAt.getTime(),
    window.end.getTime() + LEARNER_OBSERVATION_DAYS * MEASUREMENT_DAY_MS,
  ));
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
  const startsByEnrollment = new Map<string, MeasurementEventRow[]>();
  for (const start of workspaceStarts) {
    const enrollmentId = start.learningEnrollmentId!;
    const existing = startsByEnrollment.get(enrollmentId) ?? [];
    existing.push(start);
    startsByEnrollment.set(enrollmentId, existing);
  }
  const lessonCompletions = input.events.filter(isLessonCompletion);
  const courseCompletions = input.events.filter(isCourseCompletion);
  let maturedEnrollmentCount = 0;
  let pendingObservationCount = 0;
  let nextLessonCompletedWithin7DaysCount = 0;
  let courseCompletedWithin7DaysCount = 0;
  const completionHours: number[] = [];
  for (const [enrollmentId, starts] of startsByEnrollment) {
    const maturedStarts = starts.filter((start) => (
      start.createdAt!.getTime() + LEARNER_OBSERVATION_DAYS * MEASUREMENT_DAY_MS
      <= input.observedAt.getTime()
    ));
    if (maturedStarts.length === 0) {
      pendingObservationCount += 1;
      continue;
    }
    maturedEnrollmentCount += 1;
    const enrollmentCompletionHours = maturedStarts.flatMap((start) => {
      const horizon = new Date(
        start.createdAt!.getTime() + LEARNER_OBSERVATION_DAYS * MEASUREMENT_DAY_MS,
      );
      return lessonCompletions
        .filter((eventRow) => (
          eventRow.learningEnrollmentId === enrollmentId
          && eventRow.lessonId === start.lessonId
          && eventRow.createdAt! >= start.createdAt!
          && eventRow.createdAt! <= horizon
        ))
        .map((eventRow) => (
          (eventRow.createdAt!.getTime() - start.createdAt!.getTime()) / 3_600_000
        ));
    });
    if (enrollmentCompletionHours.length > 0) {
      nextLessonCompletedWithin7DaysCount += 1;
      completionHours.push(Math.min(...enrollmentCompletionHours));
    }
    if (maturedStarts.some((start) => {
      const horizon = new Date(
        start.createdAt!.getTime() + LEARNER_OBSERVATION_DAYS * MEASUREMENT_DAY_MS,
      );
      return courseCompletions.some((eventRow) => (
        eventRow.learningEnrollmentId === enrollmentId
        && eventRow.createdAt! >= start.createdAt!
        && eventRow.createdAt! <= horizon
      ));
    })) courseCompletedWithin7DaysCount += 1;
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
    return parsed.success && isWithin(row.createdAt, input.window.start, input.window.end)
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
  const invalidMetadataCount = input.events.filter((row) => !hasValidEventMetadata(row)).length;
  const privacyUnsafeEventCount = input.events.filter((row) => (
    row.privacyUnsafe || !hasValidEventMetadata(row)
  )).length;
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
  const releaseReasons = [
    ...(releaseIdentities.length === 0 ? ['release_identity_missing'] : []),
    ...(releaseIdentities.length > 1 ? ['multiple_release_identities'] : []),
    ...(releaseIdentities.some((identity) => UNTRUSTED_RELEASE_IDENTITIES.has(identity))
      ? ['release_identity_untrusted'] : []),
  ];
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
      startedEnrollmentCount: startsByEnrollment.size,
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
      invalidMetadataCount,
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
      refundedPaymentCount: eligiblePayments.filter((row) => row.status === 'refunded').length,
    },
  };
}
