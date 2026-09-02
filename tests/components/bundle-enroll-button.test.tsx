import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BundleEnrollButton, { BUNDLE_PAYMENT_CONTRACT } from '@/components/bundle/BundleEnrollButton';
import { deriveBundleDecisionFacts } from '@/lib/bundle-decision-facts';

const push = vi.fn();
const refresh = vi.fn();
const quote = String.fromCharCode(34);

function decisionFacts(options: {
  price?: number;
  ready?: boolean;
  ownership?: 'none' | 'partial' | 'complete';
} = {}) {
  const ownership = options.ownership ?? 'none';
  return deriveBundleDecisionFacts({
    slug: 'full-stack',
    price: options.price ?? 2490,
    courses: [
      {
        id: 'course-1',
        title: 'TypeScript',
        slug: 'typescript',
        orderIndex: 0,
        regularPrice: 1800,
        lessonCount: 8,
        owned: ownership === 'partial' || ownership === 'complete',
      },
      {
        id: 'course-2',
        title: 'Next.js',
        slug: 'nextjs',
        orderIndex: 1,
        regularPrice: 1700,
        lessonCount: options.ready === false ? 0 : 10,
        owned: ownership === 'complete',
      },
    ],
  }, { now: new Date('2026-09-02T05:00:00.000Z') });
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'learner-1' } } }),
}));

describe('bundle enrollment purchase contract', () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
  });

  it('keeps the server-authorized endpoints and slip constraints stable', () => {
    expect(BUNDLE_PAYMENT_CONTRACT).toEqual({
      enrollEndpoint: '/api/bundles/enroll',
      stripeEndpoint: '/api/stripe/bundle-checkout',
      intentEndpoint: '/api/promptpay/intents',
      slipEndpoint: '/api/bundles/slip/verify',
      slipFields: {
        file: 'slip',
        paymentId: 'paymentId',
      },
      allowedSlipTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      maxSlipBytes: 5 * 1024 * 1024,
    });
  });

  it('renders paid and free enrollment as explicit task buttons', () => {
    const paid = renderToStaticMarkup(
      <BundleEnrollButton bundleId={'bundle-1'} bundleSlug={'full-stack'} decisionFacts={decisionFacts()} />,
    );
    const free = renderToStaticMarkup(
      <BundleEnrollButton bundleId={'bundle-2'} bundleSlug={'starter'} decisionFacts={decisionFacts({ price: 0 })} />,
    );

    expect(paid).toContain('<button');
    expect(paid).toContain(`type=${quote}button${quote}`);
    expect(paid).toContain('ซื้อ Bundle ฿2,490');
    expect(free).toContain('ลงทะเบียน Bundle ฟรี');
  });

  it('routes learners with all entitlements to the dashboard', () => {
    const html = renderToStaticMarkup(
      <BundleEnrollButton
        bundleId={'bundle-1'}
        bundleSlug={'full-stack'}
        decisionFacts={decisionFacts({ ownership: 'complete' })}
      />,
    );

    expect(html).toContain(`href=${quote}/dashboard${quote}`);
    expect(html).toContain('ลงทะเบียนครบแล้ว');
    expect(html).not.toContain('<button');
  });

  it('disables enrollment when any bundled course is not ready', () => {
    const html = renderToStaticMarkup(
      <BundleEnrollButton
        bundleId={'bundle-1'}
        bundleSlug={'full-stack'}
        decisionFacts={decisionFacts({ ready: false })}
      />,
    );

    expect(html).toContain('Bundle นี้กำลังเตรียมเนื้อหา');
    expect(html).toContain('disabled');
    expect(html).not.toContain('ซื้อ Bundle');
  });

  it('discloses partial ownership and preserves the full Bundle price', () => {
    const html = renderToStaticMarkup(
      <BundleEnrollButton
        bundleId={'bundle-1'}
        bundleSlug={'full-stack'}
        decisionFacts={decisionFacts({ ownership: 'partial' })}
      />,
    );

    expect(html).toContain('มีบางคอร์สอยู่ในบัญชีแล้ว');
    expect(html).toContain('ราคาชุดไม่หักมูลค่าคอร์สที่มีอยู่');
    expect(html).toContain('ซื้อ Bundle ฿2,490');
  });
});
