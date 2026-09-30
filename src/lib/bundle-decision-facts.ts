import {
  deriveCourseDecisionFacts,
  type CourseDecisionFacts,
  type CourseDecisionSource,
} from '@/lib/course-decision-facts';

type BundleAcquisitionActionDescriptor = {
  kind: 'enroll-free' | 'start-checkout' | 'unavailable';
  label: string;
  href: null;
};

type LinkedBundleActionDescriptor = {
  kind: 'view-details' | 'continue-learning';
  label: string;
  href: string;
};

export type BundleCourseDecisionSource = {
  id: string;
  title: string;
  slug: string;
  orderIndex: number | null;
  regularPrice: number | string;
  promotion?: CourseDecisionSource['promotion'];
  lessonCount: number;
  knownDurationSeconds?: number | null;
  freePreviewCount?: number | null;
  instructor?: CourseDecisionSource['instructor'];
  verifiedReview?: CourseDecisionSource['verifiedReview'];
  owned?: boolean;
};

export type BundleDecisionSource = {
  slug: string;
  price: number | string;
  courses: BundleCourseDecisionSource[];
};

export type BundlePriceComparison = {
  kind: 'savings' | 'equal' | 'more-expensive';
  amount: number;
  amountFormatted: string;
  percent: number | null;
  label: string;
};

export type BundleDecisionFacts = {
  readiness: 'ready' | 'preparing';
  price: {
    bundle: number;
    bundleFormatted: string;
    separateCurrent: number;
    separateCurrentFormatted: string;
    separateRegular: number;
    separateRegularFormatted: string;
    isFree: boolean;
    comparison: BundlePriceComparison;
  };
  evidence: {
    courseCount: number;
    totalLessons: number;
    knownDurationSeconds: number | null;
    freePreviewCount: number;
  };
  courses: Array<{
    id: string;
    title: string;
    slug: string;
    orderIndex: number;
    readiness: 'ready' | 'preparing';
    lessonCount: number;
    owned: boolean;
    evidence: CourseDecisionFacts['evidence'];
    price: {
      regular: number;
      effective: number;
      regularFormatted: string;
      effectiveFormatted: string;
      hasActiveDiscount: boolean;
    };
  }>;
  ownership: {
    status: 'none' | 'partial' | 'complete';
    ownedCount: number;
    ownedCourses: Array<{ id: string; title: string; slug: string }>;
    disclosure: string | null;
  };
  actions: {
    discovery: LinkedBundleActionDescriptor;
    acquisition: BundleAcquisitionActionDescriptor;
    complete: LinkedBundleActionDescriptor;
  };
};

const thbFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  maximumFractionDigits: 0,
});

function toNonNegativeAmount(value: number | string): number {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new TypeError('Bundle decision facts require a valid non-negative price');
  }
  return amount;
}

function toCurrencyUnits(amount: number): number {
  return Math.round(amount * 100);
}

function fromCurrencyUnits(amount: number): number {
  return amount / 100;
}

function normalizeOrderIndex(orderIndex: number | null, inputIndex: number): number {
  if (orderIndex === null) return inputIndex;
  if (!Number.isInteger(orderIndex) || orderIndex < 0) {
    throw new TypeError('Bundle decision facts require a valid course order');
  }
  return orderIndex;
}

function comparisonFor(bundlePrice: number, separateCurrent: number): BundlePriceComparison {
  const differenceUnits = toCurrencyUnits(separateCurrent) - toCurrencyUnits(bundlePrice);
  const amount = fromCurrencyUnits(Math.abs(differenceUnits));
  const amountFormatted = thbFormatter.format(amount);

  if (differenceUnits > 0) {
    const percent = separateCurrent > 0
      ? Math.round((differenceUnits / toCurrencyUnits(separateCurrent)) * 100)
      : null;
    return {
      kind: 'savings',
      amount,
      amountFormatted,
      percent,
      label: `ประหยัด ${amountFormatted}${percent === null ? '' : ` (${percent}%)`}`,
    };
  }

  if (differenceUnits < 0) {
    return {
      kind: 'more-expensive',
      amount,
      amountFormatted,
      percent: null,
      label: `ซื้อแยกวันนี้ถูกกว่า ${amountFormatted}`,
    };
  }

  return {
    kind: 'equal',
    amount: 0,
    amountFormatted: thbFormatter.format(0),
    percent: null,
    label: 'ราคาเท่ากับซื้อแยกวันนี้',
  };
}

export function deriveBundleDecisionFacts(
  source: BundleDecisionSource,
  options: { now: Date },
): BundleDecisionFacts {
  const bundlePrice = toNonNegativeAmount(source.price);
  if (!Number.isFinite(options.now.getTime())) {
    throw new TypeError('Bundle decision facts require a valid current time');
  }

  const orderedSources = source.courses
    .map((course, inputIndex) => ({
      course: { ...course, orderIndex: normalizeOrderIndex(course.orderIndex, inputIndex) },
      inputIndex,
    }))
    .sort((left, right) => (
      left.course.orderIndex - right.course.orderIndex || left.inputIndex - right.inputIndex
    ));

  const courses = orderedSources.map(({ course }) => {
    const decisionFacts = deriveCourseDecisionFacts({
      slug: course.slug,
      regularPrice: course.regularPrice,
      promotion: course.promotion,
      lessonCount: course.lessonCount,
      knownDurationSeconds: course.knownDurationSeconds,
      freePreviewCount: course.freePreviewCount,
      instructor: course.instructor,
      verifiedReview: course.verifiedReview,
    }, options);

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      orderIndex: course.orderIndex,
      readiness: decisionFacts.readiness,
      lessonCount: decisionFacts.evidence.lessonCount,
      owned: course.owned === true,
      evidence: decisionFacts.evidence,
      price: {
        regular: decisionFacts.price.regular,
        effective: decisionFacts.price.effective,
        regularFormatted: decisionFacts.price.regularFormatted,
        effectiveFormatted: decisionFacts.price.effectiveFormatted,
        hasActiveDiscount: decisionFacts.price.discountPercent !== null,
      },
    };
  });

  const separateCurrentUnits = courses.reduce(
    (total, course) => total + toCurrencyUnits(course.price.effective),
    0,
  );
  const separateCurrent = fromCurrencyUnits(separateCurrentUnits);
  const separateRegular = fromCurrencyUnits(courses.reduce(
    (total, course) => total + toCurrencyUnits(course.price.regular),
    0,
  ));
  const comparison = comparisonFor(bundlePrice, separateCurrent);
  const readiness = courses.length > 0 && courses.every((course) => course.readiness === 'ready')
    ? 'ready'
    : 'preparing';
  const ownedCourses = courses
    .filter((course) => course.owned)
    .map(({ id, title, slug }) => ({ id, title, slug }));
  const ownershipStatus = ownedCourses.length === 0
    ? 'none'
    : ownedCourses.length === courses.length
      ? 'complete'
      : 'partial';
  const bundleFormatted = thbFormatter.format(bundlePrice);
  const acquisition = readiness === 'preparing'
    ? { kind: 'unavailable', label: 'ยังไม่เปิดรับสมัคร', href: null } as const
    : bundlePrice === 0
      ? { kind: 'enroll-free', label: 'ลงทะเบียน Bundle ฟรี', href: null } as const
      : { kind: 'start-checkout', label: `ซื้อ Bundle ${bundleFormatted}`, href: null } as const;

  return {
    readiness,
    price: {
      bundle: bundlePrice,
      bundleFormatted,
      separateCurrent,
      separateCurrentFormatted: thbFormatter.format(separateCurrent),
      separateRegular,
      separateRegularFormatted: thbFormatter.format(separateRegular),
      isFree: bundlePrice === 0,
      comparison,
    },
    evidence: {
      courseCount: courses.length,
      totalLessons: courses.reduce((total, course) => total + course.lessonCount, 0),
      knownDurationSeconds: courses.reduce(
        (total, course) => total + (course.evidence.knownDurationSeconds ?? 0),
        0,
      ) || null,
      freePreviewCount: courses.reduce(
        (total, course) => total + course.evidence.freePreviewCount,
        0,
      ),
    },
    courses,
    ownership: {
      status: ownershipStatus,
      ownedCount: ownedCourses.length,
      ownedCourses,
      disclosure: ownershipStatus === 'partial'
        ? `คุณมีสิทธิ์เรียนแล้ว ${ownedCourses.length} จาก ${courses.length} คอร์ส (${ownedCourses.map((course) => course.title).join(', ')}) ราคาชุดไม่หักมูลค่าคอร์สที่มีอยู่ ยอดยังเป็น ${bundleFormatted}`
        : null,
    },
    actions: {
      discovery: {
        kind: 'view-details',
        label: 'ดูรายละเอียด',
        href: `/bundles/${source.slug}`,
      },
      acquisition,
      complete: {
        kind: 'continue-learning',
        label: 'ไปการเรียนของฉัน',
        href: '/dashboard',
      },
    },
  };
}
