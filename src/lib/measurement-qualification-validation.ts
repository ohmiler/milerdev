import type {
  MeasurementEventRow,
  MeasurementPaymentRow,
  MeasurementWindow,
} from '@/lib/measurement-qualification-contract';

export function isWithin(
  value: Date | null,
  start: Date,
  end: Date,
): value is Date {
  return Boolean(value && value >= start && value < end);
}

function hasExactlyOneProduct(row: { courseId: string | null; bundleId: string | null }) {
  return Boolean(row.courseId) !== Boolean(row.bundleId);
}

function parseExactMetadata(
  metadata: string | null,
  key: string,
  allowedValues: readonly string[],
): string | null {
  if (!metadata) return null;
  try {
    const value: unknown = JSON.parse(metadata);
    if (!value || Array.isArray(value) || typeof value !== 'object') return null;
    const entries = Object.entries(value);
    if (entries.length !== 1 || entries[0]?.[0] !== key) return null;
    const entryValue = entries[0][1];
    return typeof entryValue === 'string' && allowedValues.includes(entryValue)
      ? entryValue
      : null;
  } catch {
    return null;
  }
}

export function hasValidEventMetadata(row: MeasurementEventRow): boolean {
  if (row.eventName === 'course_viewed') {
    return parseExactMetadata(row.metadata, 'placement', ['course_detail']) === 'course_detail';
  }
  if (row.eventName === 'bundle_viewed') {
    return parseExactMetadata(row.metadata, 'placement', ['bundle_detail']) === 'bundle_detail';
  }
  if (row.eventName === 'purchase_completed') {
    return parseExactMetadata(
      row.metadata,
      'method',
      ['stripe', 'promptpay', 'bank_transfer'],
    ) !== null;
  }
  return row.metadata === null;
}

export function isEligiblePayment(
  row: MeasurementPaymentRow,
  window: MeasurementWindow,
): boolean {
  const amount = Number(row.amount);
  return (row.status === 'completed' || row.status === 'refunded')
    && row.currency === 'THB'
    && Boolean(row.userId)
    && hasExactlyOneProduct(row)
    && Number.isFinite(amount)
    && amount > 0
    && isWithin(row.purchaseCompletedAt, window.start, window.end);
}

export function isProductExposure(row: MeasurementEventRow): boolean {
  if (!row.createdAt || !row.exposureId || row.source !== 'client' || !hasValidEventMetadata(row)) {
    return false;
  }
  if (row.attributedExposureId || row.userId || row.paymentId || row.enrollmentId) return false;
  if (row.learningFactId || row.learningEnrollmentId || row.lessonId) return false;
  return row.eventName === 'course_viewed'
    ? Boolean(row.courseId) && !row.bundleId
    : row.eventName === 'bundle_viewed' && Boolean(row.bundleId) && !row.courseId;
}

export function isPurchaseFact(row: MeasurementEventRow): boolean {
  return row.eventName === 'purchase_completed'
    && row.source === 'server'
    && Boolean(row.userId)
    && Boolean(row.paymentId)
    && hasExactlyOneProduct(row)
    && !row.exposureId
    && !row.enrollmentId
    && !row.learningFactId
    && !row.learningEnrollmentId
    && !row.lessonId
    && hasValidEventMetadata(row);
}

export function isWorkspaceStart(row: MeasurementEventRow): boolean {
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
    && !row.learningFactId
    && hasValidEventMetadata(row);
}

export function isLessonCompletion(row: MeasurementEventRow): boolean {
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
    && !row.exposureId
    && hasValidEventMetadata(row);
}

export function isCourseCompletion(row: MeasurementEventRow): boolean {
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
    && !row.exposureId
    && hasValidEventMetadata(row);
}

export function isStructurallyValidEvent(row: MeasurementEventRow): boolean {
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

export function paymentTargetMatchesEvent(
  payment: MeasurementPaymentRow,
  fact: MeasurementEventRow,
) {
  return payment.userId === fact.userId
    && payment.courseId === fact.courseId
    && payment.bundleId === fact.bundleId
    && Boolean(fact.createdAt && fact.createdAt >= payment.purchaseCompletedAt)
    && payment.method === parseExactMetadata(
      fact.metadata,
      'method',
      ['stripe', 'promptpay', 'bank_transfer'],
    );
}

export function exposureTargetMatchesPayment(
  exposure: MeasurementEventRow,
  payment: MeasurementPaymentRow,
) {
  return exposure.courseId === payment.courseId && exposure.bundleId === payment.bundleId;
}
