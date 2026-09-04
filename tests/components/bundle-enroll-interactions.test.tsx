// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BundleEnrollButton, {
  BUNDLE_PAYMENT_CONTRACT,
} from '@/components/bundle/BundleEnrollButton';
import { deriveBundleDecisionFacts } from '@/lib/bundle-decision-facts';

vi.mock('next/image', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'learner-1' } } }),
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

const DECISION_FACTS = deriveBundleDecisionFacts({
  slug: 'full-stack',
  price: 2490,
  courses: [
    {
      id: 'course-1',
      title: 'TypeScript',
      slug: 'typescript',
      orderIndex: 0,
      regularPrice: 1800,
      lessonCount: 8,
    },
    {
      id: 'course-2',
      title: 'Next.js',
      slug: 'nextjs',
      orderIndex: 1,
      regularPrice: 1700,
      lessonCount: 10,
    },
  ],
}, { now: new Date('2026-09-02T05:00:00.000Z') });
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

describe('bundle enrollment interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('rejects an invalid slip type without retaining a previously valid bundle file', async () => {
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >((input) => {
      const url = urlOf(input);
      if (url === BUNDLE_PAYMENT_CONTRACT.intentEndpoint) {
        return Promise.resolve(jsonResponse({ paymentId: 'bundle-payment-1', amount: 2490 }));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup({ applyAccept: false });
    render(
      <BundleEnrollButton
        bundleId="bundle-1"
        bundleSlug="full-stack"
        decisionFacts={DECISION_FACTS}
      />,
    );

    await user.click(screen.getByRole('button', { name: /2,490/ }));
    await user.click(screen.getByRole('radio', { name: /PromptPay/ }));

    const slipInput = await screen.findByLabelText<HTMLInputElement>('แนบสลิปการโอนเงิน');
    const verifyButton = screen.getByRole('button', {
      name: 'ตรวจสอบและชำระเงิน',
    }) as HTMLButtonElement;

    await user.upload(slipInput, new File(['valid-slip'], 'bundle.png', { type: 'image/png' }));
    await waitFor(() => expect(verifyButton.disabled).toBe(false));

    await user.upload(slipInput, new File(['not-an-image'], 'bundle.pdf', { type: 'application/pdf' }));

    expect(await screen.findByText('รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น')).toBeTruthy();
    expect(slipInput.getAttribute('aria-invalid')).toBe('true');
    expect(verifyButton.disabled).toBe(true);
  });

  it('rejects an oversized slip without retaining a previously valid file', async () => {
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >((input) => {
      const url = urlOf(input);
      if (url === BUNDLE_PAYMENT_CONTRACT.intentEndpoint) {
        return Promise.resolve(jsonResponse({ paymentId: 'bundle-payment-1', amount: 2490 }));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(
      <BundleEnrollButton
        bundleId="bundle-1"
        bundleSlug="full-stack"
        decisionFacts={DECISION_FACTS}
      />,
    );

    await user.click(screen.getByRole('button', { name: /2,490/ }));
    await user.click(screen.getByRole('radio', { name: /PromptPay/ }));

    const slipInput = await screen.findByLabelText<HTMLInputElement>('แนบสลิปการโอนเงิน');
    const verifyButton = screen.getByRole('button', {
      name: 'ตรวจสอบและชำระเงิน',
    }) as HTMLButtonElement;

    await user.upload(slipInput, new File(['valid-slip'], 'bundle.png', { type: 'image/png' }));
    await waitFor(() => expect(verifyButton.disabled).toBe(false));

    const oversizedSlip = new File(
      [new Uint8Array(BUNDLE_PAYMENT_CONTRACT.maxSlipBytes + 1)],
      'bundle-too-large.png',
      { type: 'image/png' },
    );
    await user.upload(slipInput, oversizedSlip);

    expect(await screen.findByText('ไฟล์ต้องมีขนาดไม่เกิน 5MB')).toBeTruthy();
    expect(slipInput.getAttribute('aria-invalid')).toBe('true');
    expect(verifyButton.disabled).toBe(true);
  });

  it('keeps the bundle payment attempt retryable when slip verification rejects the HTTP response', async () => {
    let verificationAttempt = 0;
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >((input) => {
      const url = urlOf(input);
      if (url === BUNDLE_PAYMENT_CONTRACT.intentEndpoint) {
        return Promise.resolve(jsonResponse({ paymentId: 'bundle-payment-1', amount: 2490 }));
      }
      if (url === BUNDLE_PAYMENT_CONTRACT.slipEndpoint) {
        verificationAttempt += 1;
        return Promise.resolve(verificationAttempt === 1
          ? jsonResponse({ success: true, error: 'Bundle slip provider rejected the request' }, false)
          : jsonResponse({ success: true, enrolled: ['course-1'] }));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(
      <BundleEnrollButton
        bundleId="bundle-1"
        bundleSlug="full-stack"
        decisionFacts={DECISION_FACTS}
      />,
    );

    await user.click(screen.getByRole('button', { name: /2,490/ }));
    await user.click(screen.getByRole('radio', { name: /PromptPay/ }));

    const slipInput = await screen.findByLabelText<HTMLInputElement>('แนบสลิปการโอนเงิน');
    await user.upload(slipInput, new File(['bundle-slip'], 'bundle.webp', { type: 'image/webp' }));

    const verifyButton = screen.getByRole('button', {
      name: 'ตรวจสอบและชำระเงิน',
    }) as HTMLButtonElement;
    await waitFor(() => expect(verifyButton.disabled).toBe(false));
    await user.click(verifyButton);

    expect(await screen.findByText('Bundle slip provider rejected the request')).toBeTruthy();
    expect(verifyButton.disabled).toBe(false);

    await user.click(verifyButton);
    expect(await screen.findByRole('link', { name: /ไปการเรียนของฉัน/ })).toBeTruthy();

    const verificationCalls = fetchMock.mock.calls.filter(([input]) => (
      urlOf(input) === BUNDLE_PAYMENT_CONTRACT.slipEndpoint
    ));
    expect(verificationCalls).toHaveLength(2);
    for (const [, init] of verificationCalls) {
      const formData = init?.body as FormData;
      expect(formData.get(BUNDLE_PAYMENT_CONTRACT.slipFields.paymentId)).toBe('bundle-payment-1');
      expect(formData.get(BUNDLE_PAYMENT_CONTRACT.slipFields.file)).toBeInstanceOf(File);
    }
  });

  it('shows a bundle Stripe rejection and lets the learner retry checkout', async () => {
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >((input) => {
      const url = urlOf(input);
      if (url === BUNDLE_PAYMENT_CONTRACT.stripeEndpoint) {
        return Promise.resolve(jsonResponse({ error: 'Bundle Stripe temporarily unavailable' }, false));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(
      <BundleEnrollButton
        bundleId="bundle-1"
        bundleSlug="full-stack"
        decisionFacts={DECISION_FACTS}
      />,
    );

    const enrollmentButton = screen.getByRole('button', { name: /2,490/ });
    await user.click(enrollmentButton);
    await user.click(screen.getByRole('radio', { name: /Stripe/ }));

    expect(await screen.findByText('Bundle Stripe temporarily unavailable')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      BUNDLE_PAYMENT_CONTRACT.stripeEndpoint,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ bundleId: 'bundle-1' }),
      }),
    );

    await user.click(screen.getByRole('button', { name: 'ตกลง' }));
    await user.click(enrollmentButton);
    await user.click(screen.getByRole('radio', { name: /Stripe/ }));

    await waitFor(() => {
      const stripeCalls = fetchMock.mock.calls.filter(([input]) => (
        urlOf(input) === BUNDLE_PAYMENT_CONTRACT.stripeEndpoint
      ));
      expect(stripeCalls).toHaveLength(2);
    });
  });

  it('shows the shared current-price comparison before payment method selection', async () => {
    const user = userEvent.setup();
    render(
      <BundleEnrollButton
        bundleId="bundle-1"
        bundleSlug="full-stack"
        decisionFacts={DECISION_FACTS}
      />,
    );

    await user.click(screen.getByRole('button', { name: /2,490/ }));

    const orderReview = screen.getByRole('dialog', { name: 'เลือกช่องทางชำระเงิน' });
    expect(orderReview.textContent).toContain('ตรวจสอบรายการ Bundle');
    expect(orderReview.textContent).toContain('ซื้อแยกวันนี้');
    expect(orderReview.textContent).toContain('฿3,500');
    expect(orderReview.textContent).toContain('ประหยัด ฿1,010 (29%)');
  });

  it('preserves PromptPay intent and slip fields while locking verification', async () => {
    const verifyRequest = deferred<Response>();
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >((input) => {
      const url = urlOf(input);
      if (url === BUNDLE_PAYMENT_CONTRACT.intentEndpoint) {
        return Promise.resolve(jsonResponse({ paymentId: 'bundle-payment-1', amount: 2490 }));
      }
      if (url === BUNDLE_PAYMENT_CONTRACT.slipEndpoint) {
        return verifyRequest.promise;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(
      <BundleEnrollButton
        bundleId="bundle-1"
        bundleSlug="full-stack"
        decisionFacts={DECISION_FACTS}
      />,
    );

    await user.click(screen.getByRole('button', { name: /2,490/ }));
    await user.click(screen.getByRole('radio', { name: /PromptPay/ }));

    const slipInput = await screen.findByLabelText<HTMLInputElement>('แนบสลิปการโอนเงิน');
    expect(fetchMock).toHaveBeenCalledWith(
      BUNDLE_PAYMENT_CONTRACT.intentEndpoint,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ bundleId: 'bundle-1' }),
      }),
    );

    await user.upload(slipInput, new File(['bundle-slip'], 'bundle.webp', { type: 'image/webp' }));

    const verifyButton = screen.getByRole('button', {
      name: 'ตรวจสอบและชำระเงิน',
    }) as HTMLButtonElement;
    await waitFor(() => expect(verifyButton.disabled).toBe(false));
    await user.click(verifyButton);

    expect(verifyButton.disabled).toBe(true);
    expect(verifyButton.getAttribute('aria-busy')).toBe('true');
    const verifyCall = fetchMock.mock.calls.find(([input]) => (
      urlOf(input) === BUNDLE_PAYMENT_CONTRACT.slipEndpoint
    ));
    const formData = verifyCall?.[1]?.body as FormData;
    expect(formData.get(BUNDLE_PAYMENT_CONTRACT.slipFields.file)).toBeInstanceOf(File);
    expect(formData.get(BUNDLE_PAYMENT_CONTRACT.slipFields.paymentId)).toBe('bundle-payment-1');

    await act(async () => {
      verifyRequest.resolve(jsonResponse({ success: true, enrolled: ['course-1'] }));
      await verifyRequest.promise;
    });
  });
});
