import { describe, expect, it } from 'vitest';

import {
  buildMeasurementQualificationReport,
  createAsiaBangkokMeasurementWindow,
  createMeasurementQualificationStore,
  type MeasurementEventRow,
  type MeasurementPaymentRow,
  type MeasurementQualificationQueries,
  type MeasurementWebVitalRow,
} from '@/lib/measurement-qualification';

const window = {
  start: new Date('2026-08-17T17:00:00.000Z'),
  end: new Date('2026-08-31T17:00:00.000Z'),
};
const observedAt = new Date('2026-09-08T17:00:00.000Z');

function payment(overrides: Partial<MeasurementPaymentRow> = {}): MeasurementPaymentRow {
  return {
    id: 'payment-1',
    userId: 'user-1',
    courseId: 'course-1',
    bundleId: null,
    attributedExposureId: 'exposure-1',
    amount: '990.00',
    currency: 'THB',
    method: 'stripe',
    status: 'completed',
    purchaseCompletedAt: new Date('2026-08-20T03:00:00.000Z'),
    ...overrides,
  };
}

function event(overrides: Partial<MeasurementEventRow> = {}): MeasurementEventRow {
  return {
    id: 'fact-1',
    eventName: 'purchase_completed',
    exposureId: null,
    attributedExposureId: 'exposure-1',
    userId: 'user-1',
    courseId: 'course-1',
    bundleId: null,
    paymentId: 'payment-1',
    enrollmentId: null,
    learningFactId: null,
    learningEnrollmentId: null,
    lessonId: null,
    source: 'server',
    metadata: JSON.stringify({ method: 'stripe' }),
    privacyUnsafe: false,
    createdAt: new Date('2026-08-20T03:01:00.000Z'),
    ...overrides,
  };
}

function exposure(index: number): MeasurementEventRow {
  const id = `exposure-${index}`;
  return event({
    id: `view-${index}`,
    eventName: 'course_viewed',
    exposureId: id,
    attributedExposureId: null,
    userId: null,
    paymentId: null,
    source: 'client',
    metadata: JSON.stringify({ placement: 'course_detail' }),
  });
}

function vital(
  metricName: 'LCP' | 'INP' | 'CLS',
  deviceClass: 'mobile' | 'desktop',
  index: number,
): MeasurementWebVitalRow {
  const value = metricName === 'LCP'
    ? 2_000 + index
    : metricName === 'INP'
      ? 120 + index
      : 0.02 + index / 1_000;
  return {
    pageLoadId: `page-${metricName}-${deviceClass}-${index}`,
    metricName,
    routeFamily: 'product_detail',
    deviceClass,
    releaseIdentity: 'release-1',
    value: String(value),
    rating: 'good',
    createdAt: new Date('2026-08-20T04:00:00.000Z'),
  };
}

const approvedControl = {
  operationalEnabled: true,
  governanceApproved: true,
  effectiveEventClasses: ['product_interaction', 'commerce', 'learning', 'performance'],
  rawEventRetentionDays: 30,
} as const;

describe('measurement qualification report', () => {
  it('uses the previous fourteen full Asia/Bangkok calendar days', () => {
    expect(createAsiaBangkokMeasurementWindow(new Date('2026-09-01T03:00:00.000Z'))).toEqual(window);
  });

  it('reconciles eligible payments 1:1 and names missing, duplicate, and unknown identities', () => {
    const report = buildMeasurementQualificationReport({
      window,
      observedAt,
      control: approvedControl,
      payments: [
        payment(),
        payment({ id: 'payment-2', attributedExposureId: null }),
        payment({ id: 'payment-3', attributedExposureId: null }),
      ],
      events: [
        event(),
        event({ id: 'fact-3a', paymentId: 'payment-3', attributedExposureId: null }),
        event({ id: 'fact-3b', paymentId: 'payment-3', attributedExposureId: null }),
        event({ id: 'fact-unknown', paymentId: null, attributedExposureId: null }),
      ],
      webVitals: [],
    });

    expect(report.purchaseReconciliation).toMatchObject({
      eligiblePaymentCount: 3,
      reconciledPaymentCount: 1,
      missing: { count: 1, identities: ['payment-2'] },
      duplicate: { count: 1, identities: ['payment-3'] },
      unknown: { count: 1, identities: ['fact-unknown'] },
    });
    expect(report.qualification.gates.reconciliation.passed).toBe(false);
  });

  it('anchors purchase eligibility to the committed transition and reports later refunds separately', () => {
    const report = buildMeasurementQualificationReport({
      window,
      observedAt,
      control: approvedControl,
      payments: [
        payment({
          id: 'completed-before-window',
          purchaseCompletedAt: new Date('2026-08-17T16:59:59.000Z'),
        }),
        payment(),
        payment({
          id: 'refunded-2',
          attributedExposureId: null,
          status: 'refunded',
          purchaseCompletedAt: new Date('2026-08-21T03:00:00.000Z'),
        }),
      ],
      events: [
        event(),
        event({
          id: 'fact-refunded-2',
          paymentId: 'refunded-2',
          attributedExposureId: null,
          createdAt: new Date('2026-08-21T03:01:00.000Z'),
        }),
      ],
      webVitals: [],
    });

    expect(report.purchaseReconciliation).toMatchObject({
      eligiblePaymentCount: 2,
      reconciledPaymentCount: 2,
    });
    expect(report.diagnostics.refundedPaymentCount).toBe(1);
  });

  it('reports attributed conversion separately from operational unattributed trends', () => {
    const report = buildMeasurementQualificationReport({
      window,
      observedAt,
      control: approvedControl,
      payments: [payment(), payment({ id: 'payment-2', attributedExposureId: null })],
      events: [
        ...Array.from({ length: 100 }, (_, index) => exposure(index + 1)),
        event(),
        event({ id: 'fact-2', paymentId: 'payment-2', attributedExposureId: null }),
      ],
      webVitals: [],
    });

    expect(report.attribution).toMatchObject({
      eligibleViewCount: 100,
      attributedPurchaseCount: 1,
      attributedConversionRate: 0.01,
      unattributedPurchaseCount: 1,
      viewsWithoutAttributedPurchaseCount: 99,
    });
    expect(report.attribution.labels.unattributedPurchase).not.toContain('conversion');
    expect(report.attribution.labels.viewWithoutAttributedPurchase).not.toContain('conversion');
    expect(JSON.stringify(report)).not.toContain('user-1');
  });

  it('builds matured learner observations from workspace start to lesson and course completion', () => {
    const events = [
      event({
        id: 'workspace-1', eventName: 'learning_workspace_started', exposureId: 'workspace-exposure-1',
        attributedExposureId: null, userId: null, courseId: 'course-1', paymentId: null,
        learningEnrollmentId: 'enrollment-1', lessonId: 'lesson-1', source: 'client',
        metadata: null,
        createdAt: new Date('2026-08-20T00:00:00.000Z'),
      }),
      event({
        id: 'lesson-fact-1', eventName: 'lesson_completed', attributedExposureId: null,
        userId: null, paymentId: null, learningFactId: 'progress-1',
        learningEnrollmentId: 'enrollment-1', lessonId: 'lesson-1',
        metadata: null,
        createdAt: new Date('2026-08-23T00:00:00.000Z'),
      }),
      event({
        id: 'course-fact-1', eventName: 'course_completed', attributedExposureId: null,
        userId: null, paymentId: null, learningFactId: 'enrollment-1',
        learningEnrollmentId: 'enrollment-1', lessonId: null,
        metadata: null,
        createdAt: new Date('2026-08-24T00:00:00.000Z'),
      }),
      event({
        id: 'workspace-2', eventName: 'learning_workspace_started', exposureId: 'workspace-exposure-2',
        attributedExposureId: null, userId: null, courseId: 'course-1', paymentId: null,
        learningEnrollmentId: 'enrollment-2', lessonId: 'lesson-2', source: 'client',
        metadata: null,
        createdAt: new Date('2026-08-30T00:00:00.000Z'),
      }),
    ];
    const report = buildMeasurementQualificationReport({
      window,
      observedAt: new Date('2026-09-03T00:00:00.000Z'),
      control: approvedControl,
      payments: [],
      events,
      webVitals: [],
    });

    expect(report.learner).toMatchObject({
      workspaceStartObservationCount: 2,
      startedEnrollmentCount: 2,
      maturedEnrollmentCount: 1,
      pendingObservationCount: 1,
      nextLessonCompletedWithin7DaysCount: 1,
      courseCompletedWithin7DaysCount: 1,
      continuityRate: 1,
    });
  });

  it('evaluates every workspace start but deduplicates learner outcomes by enrollment', () => {
    const report = buildMeasurementQualificationReport({
      window,
      observedAt,
      control: approvedControl,
      payments: [],
      events: [
        event({
          id: 'review-start', eventName: 'learning_workspace_started',
          exposureId: 'review-exposure', attributedExposureId: null, userId: null,
          paymentId: null, learningEnrollmentId: 'enrollment-1', lessonId: 'lesson-review',
          source: 'client', metadata: null,
          createdAt: new Date('2026-08-20T00:00:00.000Z'),
        }),
        event({
          id: 'qualified-start', eventName: 'learning_workspace_started',
          exposureId: 'qualified-exposure', attributedExposureId: null, userId: null,
          paymentId: null, learningEnrollmentId: 'enrollment-1', lessonId: 'lesson-2',
          source: 'client', metadata: null,
          createdAt: new Date('2026-08-22T00:00:00.000Z'),
        }),
        event({
          id: 'qualified-completion', eventName: 'lesson_completed',
          attributedExposureId: null, userId: null, paymentId: null,
          learningFactId: 'progress-2', learningEnrollmentId: 'enrollment-1',
          lessonId: 'lesson-2', metadata: null,
          createdAt: new Date('2026-08-23T00:00:00.000Z'),
        }),
      ],
      webVitals: [],
    });

    expect(report.learner).toMatchObject({
      workspaceStartObservationCount: 2,
      startedEnrollmentCount: 1,
      maturedEnrollmentCount: 1,
      nextLessonCompletedWithin7DaysCount: 1,
      continuityRate: 1,
      medianHoursToNextLessonCompletion: 24,
    });
  });

  it('reports p75 by metric and device and refuses a field decision below the sample floor', () => {
    const webVitals = (['LCP', 'INP', 'CLS'] as const).flatMap((metricName) => (
      (['mobile', 'desktop'] as const).flatMap((deviceClass) => (
        Array.from({ length: 4 }, (_, index) => vital(metricName, deviceClass, index))
      ))
    ));
    const report = buildMeasurementQualificationReport({
      window,
      observedAt,
      control: approvedControl,
      payments: [],
      events: [],
      webVitals,
      minimumWebVitalSampleCount: 5,
    });

    expect(report.webVitals.releaseIdentities).toEqual(['release-1']);
    expect(report.webVitals.series).toHaveLength(6);
    expect(report.webVitals.series[0]).toMatchObject({ sampleCount: 4, decision: 'insufficient_samples' });
    expect(report.webVitals.series.find((series) => (
      series.metricName === 'LCP' && series.deviceClass === 'mobile'
    ))?.p75).toBe(2_002);
  });

  it('shows all metric/device sample counts even before a release has field data', () => {
    const report = buildMeasurementQualificationReport({
      window,
      observedAt,
      control: approvedControl,
      payments: [],
      events: [],
      webVitals: [],
    });

    expect(report.webVitals.releaseIdentities).toEqual([]);
    expect(report.webVitals.series).toHaveLength(6);
    expect(report.webVitals.series.every((series) => (
      series.releaseIdentity === null
      && series.sampleCount === 0
      && series.p75 === null
      && series.decision === 'insufficient_samples'
    ))).toBe(true);
  });

  it('keeps Web Vitals membership on the immutable first-observed timestamp', () => {
    const report = buildMeasurementQualificationReport({
      window,
      observedAt,
      control: approvedControl,
      payments: [],
      events: [],
      webVitals: [{ ...vital('LCP', 'mobile', 1), createdAt: window.end }],
      minimumWebVitalSampleCount: 1,
    });

    expect(report.webVitals.releaseIdentities).toEqual([]);
    expect(report.diagnostics.invalidWebVitalCount).toBe(1);
  });

  it('rejects baseline readiness when schema, eligibility, privacy, release, or reconciliation fails', () => {
    const report = buildMeasurementQualificationReport({
      window,
      observedAt,
      control: {
        operationalEnabled: false,
        governanceApproved: false,
        effectiveEventClasses: [],
        rawEventRetentionDays: null,
      },
      payments: [payment({ id: 'missing-payment' })],
      events: [event({ id: 'privacy-unsafe', privacyUnsafe: true, paymentId: null })],
      webVitals: [vital('LCP', 'mobile', 1), { ...vital('CLS', 'desktop', 1), releaseIdentity: 'release-2' }],
    });

    expect(report.qualification.status).toBe('rejected');
    expect(Object.values(report.qualification.gates).every((gate) => !gate.passed)).toBe(true);
  });

  it('rejects untrusted release sentinels even when the release identity is unique', () => {
    const report = buildMeasurementQualificationReport({
      window,
      observedAt,
      control: approvedControl,
      payments: [],
      events: [],
      webVitals: [{ ...vital('LCP', 'mobile', 1), releaseIdentity: 'unknown-release' }],
      minimumWebVitalSampleCount: 1,
    });

    expect(report.qualification.gates.release).toEqual({
      passed: false,
      reasons: ['release_identity_untrusted'],
    });
  });

  it('rejects malformed or privacy-bearing metadata without echoing its contents', () => {
    const privateMetadata = JSON.stringify({ method: 'stripe', email: 'learner@example.test' });
    const report = buildMeasurementQualificationReport({
      window,
      observedAt,
      control: approvedControl,
      payments: [payment()],
      events: [event({ metadata: privateMetadata })],
      webVitals: [],
    });

    expect(report.qualification.gates.schema.passed).toBe(false);
    expect(report.qualification.gates.privacy.passed).toBe(false);
    expect(report.diagnostics.invalidMetadataCount).toBe(1);
    expect(JSON.stringify(report)).not.toContain('learner@example.test');
  });

  it('caps reconciliation identities while preserving the total count', () => {
    const report = buildMeasurementQualificationReport({
      window,
      observedAt,
      control: approvedControl,
      payments: Array.from({ length: 55 }, (_, index) => payment({ id: `payment-${index}` })),
      events: [],
      webVitals: [],
    });

    expect(report.purchaseReconciliation.missing).toMatchObject({
      count: 55,
      truncated: true,
    });
    expect(report.purchaseReconciliation.missing.identities).toHaveLength(50);
  });

  it('qualifies a complete baseline that passes every gate', () => {
    const webVitals = (['LCP', 'INP', 'CLS'] as const).flatMap((metricName) => (
      (['mobile', 'desktop'] as const).flatMap((deviceClass) => (
        Array.from({ length: 75 }, (_, index) => vital(metricName, deviceClass, index))
      ))
    ));
    const report = buildMeasurementQualificationReport({
      window,
      observedAt,
      control: approvedControl,
      payments: [payment()],
      events: [...Array.from({ length: 100 }, (_, index) => exposure(index + 1)), event()],
      webVitals,
    });

    expect(report.qualification.status).toBe('qualified');
    expect(Object.values(report.qualification.gates).every((entry) => entry.passed)).toBe(true);
  });

  it('merges baseline and learner-tail queries with exact bounds and deduplicated identities', async () => {
    const observedWindows: Record<string, { start: Date; end: Date }> = {};
    const sharedFact = event({ id: 'shared-fact', privacyUnsafe: false });
    const tailCompletion = event({
      id: 'tail-completion',
      eventName: 'course_completed',
      attributedExposureId: null,
      userId: null,
      paymentId: null,
      learningFactId: 'enrollment-1',
      learningEnrollmentId: 'enrollment-1',
      lessonId: null,
      metadata: null,
      createdAt: new Date('2026-09-02T00:00:00.000Z'),
    });
    const queries: MeasurementQualificationQueries = {
      async readPayments(queryWindow) {
        observedWindows.payments = queryWindow;
        return [payment()];
      },
      async readBaselineEvents(queryWindow) {
        observedWindows.baseline = queryWindow;
        return [{ ...sharedFact, privacyUnsafe: 1 }];
      },
      async readLearnerTailEvents(queryWindow) {
        observedWindows.tail = queryWindow;
        return [{ ...tailCompletion, privacyUnsafe: 0 }];
      },
      async readLinkedPurchaseEvents(queryWindow, observedBefore) {
        observedWindows.linked = queryWindow;
        expect(observedBefore).toEqual(observedAt);
        return [{ ...sharedFact, privacyUnsafe: 1 }];
      },
      async readWebVitals(queryWindow) {
        observedWindows.vitals = queryWindow;
        return [];
      },
    };

    const snapshot = await createMeasurementQualificationStore(queries).readSnapshot(window, observedAt);

    expect(observedWindows.baseline).toEqual(window);
    expect(observedWindows.tail).toEqual({
      start: window.end,
      end: new Date('2026-09-07T17:00:00.000Z'),
    });
    expect(observedWindows.linked).toEqual(window);
    expect(snapshot.events.map((row) => row.id)).toEqual(['shared-fact', 'tail-completion']);
    expect(snapshot.events[0]?.privacyUnsafe).toBe(true);
  });
});
