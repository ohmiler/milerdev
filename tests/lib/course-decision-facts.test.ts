import { describe, expect, it } from 'vitest';

import { deriveCourseDecisionFacts } from '@/lib/course-decision-facts';

const NOW = new Date('2026-09-01T05:00:00.000Z');

function courseSource(overrides: Partial<Parameters<typeof deriveCourseDecisionFacts>[0]> = {}) {
  return {
    slug: 'typescript-foundations',
    regularPrice: '1990.00',
    lessonCount: 12,
    ...overrides,
  };
}

describe('ProductDecisionFacts for Course', () => {
  it.each([
    ['exact start', new Date('2026-09-01T05:00:00.000Z'), new Date('2026-09-02T05:00:00.000Z')],
    ['exact end', new Date('2026-08-31T05:00:00.000Z'), new Date('2026-09-01T05:00:00.000Z')],
  ])('uses the promotional price at the inclusive %s boundary', (_name, startsAt, endsAt) => {
    const facts = deriveCourseDecisionFacts(
      courseSource({ promotion: { price: '1490.00', startsAt, endsAt } }),
      { now: NOW },
    );

    expect(facts.promotion.status).toBe('active');
    expect(facts.price).toMatchObject({
      regular: 1990,
      effective: 1490,
      discountPercent: 25,
    });
  });

  it.each([
    ['future', new Date('2026-09-02T05:00:00.000Z'), null, 'future'],
    ['expired', null, new Date('2026-08-31T05:00:00.000Z'), 'expired'],
  ] as const)('ignores a %s promotion', (_name, startsAt, endsAt, status) => {
    const facts = deriveCourseDecisionFacts(
      courseSource({ promotion: { price: '1490.00', startsAt, endsAt } }),
      { now: NOW },
    );

    expect(facts.promotion.status).toBe(status);
    expect(facts.price.effective).toBe(1990);
  });

  it('supports an active promotion that makes the course free', () => {
    const facts = deriveCourseDecisionFacts(
      courseSource({ promotion: { price: '0.00' } }),
      { now: NOW },
    );

    expect(facts.price).toMatchObject({ effective: 0, isFree: true, discountPercent: 100 });
    expect(facts.actions.visitor.kind).toBe('enroll-free');
    expect(facts.actions.member.kind).toBe('enroll-free');
  });

  it('does not turn an invalid authoritative price into a free-course action', () => {
    expect(() => deriveCourseDecisionFacts(
      courseSource({ promotion: { price: 'not-a-price' } }),
      { now: NOW },
    )).toThrowError('Course decision facts require a valid non-negative price');
  });

  it('keeps a zero-lesson course discoverable without a new enrollment or checkout action', () => {
    const facts = deriveCourseDecisionFacts(courseSource({ lessonCount: 0 }), { now: NOW });

    expect(facts.readiness).toBe('preparing');
    expect(facts.actions.discovery).toEqual({
      kind: 'view-details',
      label: 'ดูรายละเอียด',
      href: '/courses/typescript-foundations',
    });
    expect([
      facts.actions.visitor.kind,
      facts.actions.member.kind,
      facts.actions.buyer.kind,
      facts.actions.learner.kind,
    ]).toEqual(['unavailable', 'unavailable', 'review-payment', 'continue-learning']);
  });

  it('returns state-aware actions without granting access from presentation', () => {
    const facts = deriveCourseDecisionFacts(courseSource(), { now: NOW });

    expect(facts.actions.visitor).toMatchObject({ kind: 'start-checkout', href: null });
    expect(facts.actions.member).toMatchObject({ kind: 'start-checkout', href: null });
    expect(facts.actions.buyer).toEqual({
      kind: 'review-payment',
      label: 'ตรวจสอบการชำระเงิน',
      href: '/dashboard/payments',
    });
    expect(facts.actions.learner).toEqual({
      kind: 'continue-learning',
      label: 'เข้าเรียน / เรียนต่อ',
      href: '/courses/typescript-foundations/learn',
    });
  });

  it('includes only explicit linked instructor and verified review evidence', () => {
    const facts = deriveCourseDecisionFacts(
      courseSource({
        instructor: { name: '  Miler  ' },
        verifiedReview: { average: '4.8', count: 24 },
      }),
      { now: NOW },
    );
    const missingEvidence = deriveCourseDecisionFacts(
      courseSource({
        instructor: { name: '   ' },
        verifiedReview: { average: 5, count: 0 },
      }),
      { now: NOW },
    );

    expect(facts.evidence.instructorName).toBe('Miler');
    expect(facts.evidence.verifiedReview).toEqual({ average: 4.8, count: 24 });
    expect(missingEvidence.evidence.instructorName).toBeNull();
    expect(missingEvidence.evidence.verifiedReview).toBeNull();
  });
});

it('preserves satang in shared price presentation', () => {
  const facts = deriveCourseDecisionFacts(courseSource({ regularPrice: '490.25' }), { now: NOW });
  expect(facts.price.effectiveFormatted).toBe('฿490.25');
  expect(facts.price.regularFormatted).toBe('฿490.25');
});
