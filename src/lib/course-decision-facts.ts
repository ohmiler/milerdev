export type CourseActorState = 'visitor' | 'member' | 'buyer' | 'learner';

type LinkedCourseActionDescriptor = {
  kind: 'view-details' | 'review-payment' | 'continue-learning';
  label: string;
  href: string;
};

type CourseAcquisitionActionDescriptor = {
  kind: 'enroll-free' | 'start-checkout' | 'unavailable';
  label: string;
  href: null;
};

export type CourseActionDescriptor =
  | LinkedCourseActionDescriptor
  | CourseAcquisitionActionDescriptor;

export type VerifiedCourseReviewSummary = {
  average: number | string;
  count: number;
};

export type CourseDecisionSource = {
  slug: string;
  regularPrice: number | string;
  promotion?: {
    price: number | string;
    startsAt?: Date | null;
    endsAt?: Date | null;
  } | null;
  lessonCount: number;
  knownDurationSeconds?: number | null;
  freePreviewCount?: number | null;
  instructor?: { name: string | null } | null;
  verifiedReview?: VerifiedCourseReviewSummary | null;
};

export type CourseDecisionFacts = {
  readiness: 'ready' | 'preparing';
  price: {
    regular: number;
    effective: number;
    regularFormatted: string;
    effectiveFormatted: string;
    isFree: boolean;
    discountPercent: number | null;
  };
  promotion: {
    status: 'none' | 'future' | 'active' | 'expired' | 'inactive';
    isActive: boolean;
    endsAt: string | null;
    label: string | null;
  };
  evidence: {
    lessonCount: number;
    knownDurationSeconds: number | null;
    freePreviewCount: number;
    instructorName: string | null;
    verifiedReview: { average: number; count: number } | null;
  };
  actions: {
    discovery: LinkedCourseActionDescriptor;
    visitor: CourseAcquisitionActionDescriptor;
    member: CourseAcquisitionActionDescriptor;
    buyer: LinkedCourseActionDescriptor;
    learner: LinkedCourseActionDescriptor;
  };
};

const thbFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function toNonNegativeAmount(value: number | string): number {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new TypeError('Course decision facts require a valid non-negative price');
  }
  return amount;
}

function toCount(value: number | null | undefined): number {
  return Number.isFinite(value) && Number(value) > 0 ? Math.floor(Number(value)) : 0;
}

function toTimestamp(value: Date | null | undefined): number | null {
  if (!value) return null;
  const timestamp = value.getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

function toIsoString(value: Date | null | undefined): string | null {
  const timestamp = toTimestamp(value);
  return timestamp !== null && Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : null;
}

function getPromotionStatus(
  promotion: CourseDecisionSource['promotion'],
  nowTimestamp: number,
): CourseDecisionFacts['promotion']['status'] {
  if (!promotion) return 'none';

  const startsAt = toTimestamp(promotion.startsAt);
  const endsAt = toTimestamp(promotion.endsAt);
  if (
    (startsAt !== null && !Number.isFinite(startsAt)) ||
    (endsAt !== null && !Number.isFinite(endsAt))
  ) {
    return 'inactive';
  }
  if (endsAt !== null && endsAt < nowTimestamp) return 'expired';
  if (startsAt !== null && startsAt > nowTimestamp) return 'future';
  return 'active';
}

function getVerifiedReview(
  review: VerifiedCourseReviewSummary | null | undefined,
): CourseDecisionFacts['evidence']['verifiedReview'] {
  if (!review) return null;
  const average = typeof review.average === 'number' ? review.average : Number(review.average);
  const count = toCount(review.count);
  if (!Number.isFinite(average) || average < 1 || average > 5 || count === 0) return null;
  return { average, count };
}

function unavailableAction(): CourseAcquisitionActionDescriptor {
  return { kind: 'unavailable', label: 'ยังไม่เปิดรับสมัคร', href: null };
}

export function deriveCourseDecisionFacts(
  source: CourseDecisionSource,
  options: { now: Date },
): CourseDecisionFacts {
  const regularPrice = toNonNegativeAmount(source.regularPrice);
  const nowTimestamp = options.now.getTime();
  if (!Number.isFinite(nowTimestamp)) {
    throw new TypeError('Course decision facts require a valid current time');
  }

  const promotionStatus = getPromotionStatus(source.promotion, nowTimestamp);
  const isPromotionActive = promotionStatus === 'active';
  const effectivePrice = isPromotionActive && source.promotion
    ? toNonNegativeAmount(source.promotion.price)
    : regularPrice;
  const discountPercent =
    isPromotionActive && regularPrice > 0 && effectivePrice < regularPrice
      ? Math.round((1 - effectivePrice / regularPrice) * 100)
      : null;
  const promotionEndsAt = isPromotionActive ? toIsoString(source.promotion?.endsAt) : null;
  const lessonCount = toCount(source.lessonCount);
  const readiness = lessonCount > 0 ? 'ready' : 'preparing';
  const courseHref = `/courses/${source.slug}`;
  const unavailable = unavailableAction();
  const acquisitionAction: CourseAcquisitionActionDescriptor = effectivePrice === 0
    ? { kind: 'enroll-free', label: 'ลงทะเบียนเรียนฟรี', href: null }
    : { kind: 'start-checkout', label: 'สมัครคอร์สนี้', href: null };

  return {
    readiness,
    price: {
      regular: regularPrice,
      effective: effectivePrice,
      regularFormatted: thbFormatter.format(regularPrice),
      effectiveFormatted: thbFormatter.format(effectivePrice),
      isFree: effectivePrice === 0,
      discountPercent,
    },
    promotion: {
      status: promotionStatus,
      isActive: isPromotionActive,
      endsAt: promotionEndsAt,
      label: discountPercent === null
        ? null
        : `โปรโมชั่น ลด ${discountPercent}%${promotionEndsAt ? ` ถึง ${new Date(promotionEndsAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' })}` : ''}`,
    },
    evidence: {
      lessonCount,
      knownDurationSeconds: toCount(source.knownDurationSeconds) || null,
      freePreviewCount: Math.min(toCount(source.freePreviewCount), lessonCount),
      instructorName: source.instructor?.name?.trim() || null,
      verifiedReview: getVerifiedReview(source.verifiedReview),
    },
    actions: {
      discovery: { kind: 'view-details', label: 'ดูรายละเอียด', href: courseHref },
      visitor: readiness === 'ready' ? acquisitionAction : unavailable,
      member: readiness === 'ready' ? acquisitionAction : unavailable,
      buyer: { kind: 'review-payment', label: 'ตรวจสอบการชำระเงิน', href: '/dashboard/payments' },
      learner: { kind: 'continue-learning', label: 'เข้าเรียน / เรียนต่อ', href: `${courseHref}/learn` },
    },
  };
}
