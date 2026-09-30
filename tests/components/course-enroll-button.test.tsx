import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnrollButton, { COURSE_PAYMENT_CONTRACT } from '@/components/course/EnrollButton';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'learner-1' } },
    status: 'authenticated',
  }),
}));

describe('course enrollment purchase contract', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('keeps payment endpoints, slip fields, and upload constraints stable', () => {
    expect(COURSE_PAYMENT_CONTRACT).toEqual({
      enrollEndpoint: '/api/enroll',
      stripeEndpoint: '/api/stripe/checkout',
      couponEndpoint: '/api/coupons/validate',
      intentEndpoint: '/api/promptpay/intents',
      reviewEndpoint: '/api/checkout/review',
      slipEndpoint: '/api/slip/verify',
      slipFields: {
        file: 'slip',
        paymentId: 'paymentId',
      },
      allowedSlipTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      maxSlipBytes: 5 * 1024 * 1024,
    });
  });

  it('renders enrollment checks as a disabled non-submitting action', () => {
    const html = renderToStaticMarkup(
      <EnrollButton courseId={'course-1'} courseSlug={'typescript'} price={2490} />,
    );

    expect(html).toContain('type="button"');
    expect(html).toContain('disabled');
    expect(html).toContain('กำลังตรวจสอบ');
  });
});
