import type {
  WebVitalDeviceClass,
  WebVitalName,
} from '@/lib/web-vitals-contract';

export const MEASUREMENT_DAY_MS = 24 * 60 * 60 * 1_000;
export const LEARNER_OBSERVATION_DAYS = 7;

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
  purchaseCompletedAt: Date;
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
  metadata: string | null;
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
  createdAt: Date;
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
