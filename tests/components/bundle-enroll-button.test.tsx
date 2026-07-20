import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BundleEnrollButton, { BUNDLE_PAYMENT_CONTRACT } from '@/components/bundle/BundleEnrollButton';

const push = vi.fn();
const refresh = vi.fn();
const quote = String.fromCharCode(34);

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
      slipEndpoint: '/api/bundles/slip/verify',
      slipFields: {
        file: 'slip',
        bundleId: 'bundleId',
        amount: 'amount',
      },
      allowedSlipTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      maxSlipBytes: 5 * 1024 * 1024,
    });
  });

  it('renders paid and free enrollment as explicit task buttons', () => {
    const paid = renderToStaticMarkup(
      <BundleEnrollButton bundleId={'bundle-1'} bundleSlug={'full-stack'} price={2490} />,
    );
    const free = renderToStaticMarkup(
      <BundleEnrollButton bundleId={'bundle-2'} bundleSlug={'starter'} price={0} />,
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
        price={2490}
        allEnrolled={true}
      />,
    );

    expect(html).toContain(`href=${quote}/dashboard${quote}`);
    expect(html).toContain('ลงทะเบียนครบแล้ว');
    expect(html).not.toContain('<button');
  });
});
