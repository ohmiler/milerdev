// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import EnrollButton, { COURSE_PAYMENT_CONTRACT } from '@/components/course/EnrollButton';

vi.mock('next/image', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'learner-1' } },
    status: 'authenticated',
  }),
}));
vi.mock('@/components/analytics/analytics-client', () => ({
  trackClientAnalyticsEvent: vi.fn(),
}));
vi.mock('@/components/ui/DialogShell', () => ({
  default: ({
    isOpen,
    title,
    body,
    children,
  }: {
    isOpen: boolean;
    title: ReactNode;
    body: ReactNode;
    children: ReactNode;
  }) => isOpen ? (
    <section role="dialog" aria-label={typeof title === 'string' ? title : 'payment'}>
      {body}
      <footer>{children}</footer>
    </section>
  ) : null,
}));
vi.mock('@/components/ui/Modal', () => ({
  default: ({
    isOpen,
    title,
    children,
    onClose,
  }: {
    isOpen: boolean;
    title?: string;
    children: ReactNode;
    onClose: () => void;
  }) => isOpen ? (
    <section role="dialog" aria-label={title}>
      <p>{children}</p>
      <button type="button" onClick={onClose}>ตกลง</button>
    </section>
  ) : null,
}));

const jsonResponse = (body: unknown, ok = true) => ({
  ok,
  json: vi.fn().mockResolvedValue(body),
}) as unknown as Response;

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const urlOf = (input: RequestInfo | URL) => (
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url
);

describe('course enrollment interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('locks coupon actions while pending and preserves the coupon enrollment payload', async () => {
    const couponRequest = deferred<Response>();
    const enrollRequest = deferred<Response>();
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >((input) => {
      const url = urlOf(input);
      if (url.startsWith('/api/enrollments/check')) {
        return Promise.resolve(jsonResponse({ enrolled: false }));
      }
      if (url === COURSE_PAYMENT_CONTRACT.couponEndpoint) {
        return couponRequest.promise;
      }
      if (url === COURSE_PAYMENT_CONTRACT.enrollEndpoint) {
        return enrollRequest.promise;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<EnrollButton courseId="course-1" courseSlug="typescript" price={2490} />);

    const enrollmentButton = await screen.findByRole('button', { name: /ซื้อคอร์สนี้/ }) as HTMLButtonElement;
    await waitFor(() => expect(enrollmentButton.disabled).toBe(false));
    await user.click(enrollmentButton);

    const couponInput = screen.getByRole('textbox', { name: 'มีโค้ดส่วนลด?' });
    await user.type(couponInput, 'FREE100');
    const couponButton = screen.getByRole('button', { name: 'ใช้โค้ด' }) as HTMLButtonElement;
    await user.click(couponButton);

    expect(couponButton.disabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      COURSE_PAYMENT_CONTRACT.couponEndpoint,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          code: 'FREE100',
          courseId: 'course-1',
          originalPrice: 2490,
        }),
      }),
    );

    await act(async () => {
      couponRequest.resolve(jsonResponse({
        valid: true,
        couponId: 'coupon-1',
        code: 'FREE100',
        discountAmount: 2490,
        finalPrice: 0,
        description: null,
      }));
      await couponRequest.promise;
    });

    const couponEnrollButton = screen.getByRole('button', {
      name: /ลงทะเบียนเรียนฟรี/,
    }) as HTMLButtonElement;
    await user.click(couponEnrollButton);

    expect(couponEnrollButton.disabled).toBe(true);
    expect(couponEnrollButton.getAttribute('aria-busy')).toBe('true');
    expect(fetchMock).toHaveBeenCalledWith(
      COURSE_PAYMENT_CONTRACT.enrollEndpoint,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ courseId: 'course-1', couponId: 'coupon-1' }),
      }),
    );

    await act(async () => {
      enrollRequest.resolve(jsonResponse({ enrolled: true }));
      await enrollRequest.promise;
    });
  });

  it('shows a Stripe rejection and lets the learner retry checkout', async () => {
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >((input) => {
      const url = urlOf(input);
      if (url.startsWith('/api/enrollments/check')) {
        return Promise.resolve(jsonResponse({ enrolled: false }));
      }
      if (url === COURSE_PAYMENT_CONTRACT.stripeEndpoint) {
        return Promise.resolve(jsonResponse({ error: 'Stripe temporarily unavailable' }, false));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<EnrollButton courseId="course-1" courseSlug="typescript" price={2490} />);

    const enrollmentButton = await screen.findByRole('button', { name: /ซื้อคอร์สนี้/ }) as HTMLButtonElement;
    await waitFor(() => expect(enrollmentButton.disabled).toBe(false));
    await user.click(enrollmentButton);
    await user.click(screen.getByRole('radio', { name: /Stripe/ }));

    expect(await screen.findByText('Stripe temporarily unavailable')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      COURSE_PAYMENT_CONTRACT.stripeEndpoint,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ courseId: 'course-1' }),
      }),
    );

    await user.click(screen.getByRole('button', { name: 'ตกลง' }));
    await user.click(enrollmentButton);
    await user.click(screen.getByRole('radio', { name: /Stripe/ }));

    await waitFor(() => {
      const stripeCalls = fetchMock.mock.calls.filter(([input]) => (
        urlOf(input) === COURSE_PAYMENT_CONTRACT.stripeEndpoint
      ));
      expect(stripeCalls).toHaveLength(2);
    });
  });

  it('rejects an invalid slip type without retaining a previously valid file', async () => {
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >((input) => {
      const url = urlOf(input);
      if (url.startsWith('/api/enrollments/check')) {
        return Promise.resolve(jsonResponse({ enrolled: false }));
      }
      if (url === COURSE_PAYMENT_CONTRACT.intentEndpoint) {
        return Promise.resolve(jsonResponse({ paymentId: 'payment-1', amount: 2490 }));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup({ applyAccept: false });
    render(<EnrollButton courseId="course-1" courseSlug="typescript" price={2490} />);

    const enrollmentButton = await screen.findByRole('button', { name: /ซื้อคอร์สนี้/ }) as HTMLButtonElement;
    await waitFor(() => expect(enrollmentButton.disabled).toBe(false));
    await user.click(enrollmentButton);
    await user.click(screen.getByRole('radio', { name: /PromptPay/ }));

    const slipInput = await screen.findByLabelText<HTMLInputElement>('แนบสลิปการโอนเงิน');
    const verifyButton = screen.getByRole('button', {
      name: 'ตรวจสอบและชำระเงิน',
    }) as HTMLButtonElement;

    await user.upload(slipInput, new File(['valid-slip'], 'slip.png', { type: 'image/png' }));
    await waitFor(() => expect(verifyButton.disabled).toBe(false));

    await user.upload(slipInput, new File(['not-an-image'], 'slip.pdf', { type: 'application/pdf' }));

    expect(await screen.findByText('รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น')).toBeTruthy();
    expect(slipInput.getAttribute('aria-invalid')).toBe('true');
    expect(verifyButton.disabled).toBe(true);
  });

  it('rejects an oversized slip without retaining a previously valid course file', async () => {
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >((input) => {
      const url = urlOf(input);
      if (url.startsWith('/api/enrollments/check')) {
        return Promise.resolve(jsonResponse({ enrolled: false }));
      }
      if (url === COURSE_PAYMENT_CONTRACT.intentEndpoint) {
        return Promise.resolve(jsonResponse({ paymentId: 'payment-1', amount: 2490 }));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<EnrollButton courseId="course-1" courseSlug="typescript" price={2490} />);

    const enrollmentButton = await screen.findByRole('button', { name: /ซื้อคอร์สนี้/ }) as HTMLButtonElement;
    await waitFor(() => expect(enrollmentButton.disabled).toBe(false));
    await user.click(enrollmentButton);
    await user.click(screen.getByRole('radio', { name: /PromptPay/ }));

    const slipInput = await screen.findByLabelText<HTMLInputElement>('แนบสลิปการโอนเงิน');
    const verifyButton = screen.getByRole('button', {
      name: 'ตรวจสอบและชำระเงิน',
    }) as HTMLButtonElement;

    await user.upload(slipInput, new File(['valid-slip'], 'slip.png', { type: 'image/png' }));
    await waitFor(() => expect(verifyButton.disabled).toBe(false));

    const oversizedSlip = new File(
      [new Uint8Array(COURSE_PAYMENT_CONTRACT.maxSlipBytes + 1)],
      'course-too-large.png',
      { type: 'image/png' },
    );
    await user.upload(slipInput, oversizedSlip);

    expect(await screen.findByText('ไฟล์ต้องมีขนาดไม่เกิน 5MB')).toBeTruthy();
    expect(slipInput.getAttribute('aria-invalid')).toBe('true');
    expect(verifyButton.disabled).toBe(true);
  });

  it('keeps the payment attempt retryable when slip verification returns a rejected HTTP response', async () => {
    let verificationAttempt = 0;
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >((input) => {
      const url = urlOf(input);
      if (url.startsWith('/api/enrollments/check')) {
        return Promise.resolve(jsonResponse({ enrolled: false }));
      }
      if (url === COURSE_PAYMENT_CONTRACT.intentEndpoint) {
        return Promise.resolve(jsonResponse({ paymentId: 'payment-1', amount: 2490 }));
      }
      if (url === COURSE_PAYMENT_CONTRACT.slipEndpoint) {
        verificationAttempt += 1;
        return Promise.resolve(verificationAttempt === 1
          ? jsonResponse({ success: true, error: 'Slip provider rejected the request' }, false)
          : jsonResponse({ success: true }));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<EnrollButton courseId="course-1" courseSlug="typescript" price={2490} />);

    const enrollmentButton = await screen.findByRole('button', { name: /ซื้อคอร์สนี้/ }) as HTMLButtonElement;
    await waitFor(() => expect(enrollmentButton.disabled).toBe(false));
    await user.click(enrollmentButton);
    await user.click(screen.getByRole('radio', { name: /PromptPay/ }));

    const slipInput = await screen.findByLabelText<HTMLInputElement>('แนบสลิปการโอนเงิน');
    await user.upload(slipInput, new File(['valid-slip'], 'slip.png', { type: 'image/png' }));

    const verifyButton = screen.getByRole('button', {
      name: 'ตรวจสอบและชำระเงิน',
    }) as HTMLButtonElement;
    await waitFor(() => expect(verifyButton.disabled).toBe(false));
    await user.click(verifyButton);

    expect(await screen.findByText('Slip provider rejected the request')).toBeTruthy();
    expect(verifyButton.disabled).toBe(false);

    await user.click(verifyButton);
    expect(await screen.findByRole('dialog', { name: 'ชำระเงินสำเร็จ!' })).toBeTruthy();

    const verificationCalls = fetchMock.mock.calls.filter(([input]) => (
      urlOf(input) === COURSE_PAYMENT_CONTRACT.slipEndpoint
    ));
    expect(verificationCalls).toHaveLength(2);
    for (const [, init] of verificationCalls) {
      const formData = init?.body as FormData;
      expect(formData.get(COURSE_PAYMENT_CONTRACT.slipFields.paymentId)).toBe('payment-1');
      expect(formData.get(COURSE_PAYMENT_CONTRACT.slipFields.file)).toBeInstanceOf(File);
    }
  });

  it('creates a PromptPay intent, accepts a valid slip, and locks verification while pending', async () => {
    const verifyRequest = deferred<Response>();
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >((input) => {
      const url = urlOf(input);
      if (url.startsWith('/api/enrollments/check')) {
        return Promise.resolve(jsonResponse({ enrolled: false }));
      }
      if (url === COURSE_PAYMENT_CONTRACT.intentEndpoint) {
        return Promise.resolve(jsonResponse({ paymentId: 'payment-1', amount: 2490 }));
      }
      if (url === COURSE_PAYMENT_CONTRACT.slipEndpoint) {
        return verifyRequest.promise;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<EnrollButton courseId="course-1" courseSlug="typescript" price={2490} />);

    const enrollmentButton = await screen.findByRole('button', { name: /ซื้อคอร์สนี้/ }) as HTMLButtonElement;
    await waitFor(() => expect(enrollmentButton.disabled).toBe(false));
    await user.click(enrollmentButton);
    await user.click(screen.getByRole('radio', { name: /PromptPay/ }));

    const slipInput = await screen.findByLabelText<HTMLInputElement>('แนบสลิปการโอนเงิน');
    expect(fetchMock).toHaveBeenCalledWith(
      COURSE_PAYMENT_CONTRACT.intentEndpoint,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ courseId: 'course-1' }),
      }),
    );

    await user.upload(slipInput, new File(['valid-slip'], 'slip.png', { type: 'image/png' }));

    const verifyButton = screen.getByRole('button', {
      name: 'ตรวจสอบและชำระเงิน',
    }) as HTMLButtonElement;
    await waitFor(() => expect(verifyButton.disabled).toBe(false));
    await user.click(verifyButton);

    expect(verifyButton.disabled).toBe(true);
    expect(verifyButton.getAttribute('aria-busy')).toBe('true');
    const verifyCall = fetchMock.mock.calls.find(([input]) => (
      urlOf(input) === COURSE_PAYMENT_CONTRACT.slipEndpoint
    ));
    const formData = verifyCall?.[1]?.body as FormData;
    expect(formData.get(COURSE_PAYMENT_CONTRACT.slipFields.file)).toBeInstanceOf(File);
    expect(formData.get(COURSE_PAYMENT_CONTRACT.slipFields.paymentId)).toBe('payment-1');

    await act(async () => {
      verifyRequest.resolve(jsonResponse({ success: true }));
      await verifyRequest.promise;
    });
  });
});
