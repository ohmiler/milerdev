import { describe, expect, it } from 'vitest';

import {
  deriveBundleDecisionFacts,
  type BundleCourseDecisionSource,
} from '@/lib/bundle-decision-facts';

const NOW = new Date('2026-09-02T05:00:00.000Z');

function course(
  id: string,
  orderIndex: number,
  overrides: Partial<BundleCourseDecisionSource> = {},
): BundleCourseDecisionSource {
  return {
    id,
    title: `Course ${id}`,
    slug: `course-${id}`,
    orderIndex,
    regularPrice: '1000.00',
    lessonCount: 5,
    ...overrides,
  };
}

function bundleFacts(
  price: number | string,
  courses: BundleCourseDecisionSource[] = [course('a', 0), course('b', 1)],
) {
  return deriveBundleDecisionFacts({ slug: 'full-stack', price, courses }, { now: NOW });
}

describe('ProductDecisionFacts for Bundle', () => {
  it('uses current effective Course prices and preserves the authoritative order', () => {
    const facts = bundleFacts('1500.00', [
      course('later', 20, { regularPrice: '1200.00' }),
      course('first', 10, {
        regularPrice: '1000.00',
        promotion: {
          price: '800.00',
          startsAt: new Date('2026-09-01T05:00:00.000Z'),
          endsAt: new Date('2026-09-03T05:00:00.000Z'),
        },
      }),
    ]);

    expect(facts.courses.map((item) => item.id)).toEqual(['first', 'later']);
    expect(facts.courses[0]?.price).toMatchObject({ regular: 1000, effective: 800 });
    expect(facts.price).toMatchObject({
      bundle: 1500,
      separateCurrent: 2000,
      comparison: { kind: 'savings', amount: 500, percent: 25 },
    });
  });

  it('projects truthful evidence for every included Course and the Bundle summary', () => {
    const facts = bundleFacts('1500.00', [
      course('typescript', 0, {
        lessonCount: 6,
        knownDurationSeconds: 5_460,
        freePreviewCount: 2,
        instructor: { name: 'Miler' },
        verifiedReview: { average: '4.8', count: 24 },
      }),
      course('nextjs', 1, {
        lessonCount: 4,
        knownDurationSeconds: 1_800,
        freePreviewCount: 1,
      }),
    ]);

    expect({
      courseEvidence: facts.courses[0]?.evidence,
      bundleEvidence: facts.evidence,
    }).toEqual({
      courseEvidence: {
        lessonCount: 6,
        knownDurationSeconds: 5_460,
        freePreviewCount: 2,
        instructorName: 'Miler',
        verifiedReview: { average: 4.8, count: 24 },
      },
      bundleEvidence: {
        courseCount: 2,
        totalLessons: 10,
        knownDurationSeconds: 7_260,
        freePreviewCount: 3,
      },
    });
  });

  it('keeps the regular total as context while savings use current separate prices', () => {
    const facts = bundleFacts('1500.00', [
      course('typescript', 0, {
        regularPrice: '1000.00',
        promotion: {
          price: '800.00',
          startsAt: new Date('2026-09-01T05:00:00.000Z'),
          endsAt: new Date('2026-09-03T05:00:00.000Z'),
        },
      }),
      course('nextjs', 1, { regularPrice: '1200.00' }),
    ]);

    expect(facts.price).toMatchObject({
      separateCurrent: 2000,
      separateRegular: 2200,
      separateRegularFormatted: '฿2,200',
      comparison: { kind: 'savings', amount: 500, percent: 25 },
    });
  });

  it.each([
    ['savings', '1500.00', 'savings', 500, 25],
    ['equal', '2000.00', 'equal', 0, null],
    ['more expensive', '2400.00', 'more-expensive', 400, null],
  ] as const)('describes a %s comparison truthfully', (_name, price, kind, amount, percent) => {
    const facts = bundleFacts(price);

    expect(facts.price.comparison).toMatchObject({ kind, amount, percent });
    expect(facts.price.comparison.label).toMatch(
      kind === 'savings'
        ? /ประหยัด/
        : kind === 'equal'
          ? /เท่ากับ/
          : /ซื้อแยกวันนี้ถูกกว่า/,
    );
  });

  it('keeps an unready Bundle discoverable without a new enrollment or checkout action', () => {
    const facts = bundleFacts('1500.00', [
      course('ready', 0),
      course('preparing', 1, { lessonCount: 0 }),
    ]);

    expect(facts.readiness).toBe('preparing');
    expect(facts.actions.discovery).toEqual({
      kind: 'view-details',
      label: 'ดูรายละเอียด',
      href: '/bundles/full-stack',
    });
    expect(facts.actions.acquisition).toEqual({
      kind: 'unavailable',
      label: 'ยังไม่เปิดรับสมัคร',
      href: null,
    });
  });

  it('discloses partial ownership without changing the full Bundle price', () => {
    const facts = bundleFacts('1500.00', [
      course('owned', 0, { title: 'TypeScript', owned: true }),
      course('new', 1, { title: 'Next.js' }),
    ]);

    expect(facts.ownership).toMatchObject({
      status: 'partial',
      ownedCount: 1,
      ownedCourses: [{ id: 'owned', title: 'TypeScript', slug: 'course-owned' }],
    });
    expect(facts.ownership.disclosure).toContain('มีสิทธิ์เรียนแล้ว 1 จาก 2 คอร์ส');
    expect(facts.ownership.disclosure).toContain('ราคาชุดไม่หักมูลค่าคอร์สที่มีอยู่');
    expect(facts.ownership.disclosure).toContain(facts.price.bundleFormatted);
    expect(facts.actions.acquisition.kind).toBe('start-checkout');
  });

  it('routes complete owners to learning and does not invent Bundle review evidence', () => {
    const facts = bundleFacts('1500.00', [
      course('a', 0, { owned: true }),
      course('b', 1, { owned: true }),
    ]);

    expect(facts.ownership.status).toBe('complete');
    expect(facts.actions.complete).toEqual({
      kind: 'continue-learning',
      label: 'ไปการเรียนของฉัน',
      href: '/dashboard',
    });
    expect(facts.evidence).not.toHaveProperty('verifiedReview');
    expect(facts).not.toHaveProperty('rating');
  });
});
