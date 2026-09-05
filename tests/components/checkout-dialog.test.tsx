// @vitest-environment jsdom

import { createRef, type ReactNode } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CheckoutDialog from '@/components/checkout/CheckoutDialog';
import type { OrderReview } from '@/lib/order-review';

vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/components/ui/DialogShell', () => ({ default: ({ isOpen, title, body, children, onClose }: { isOpen: boolean; title: string; body: ReactNode; children: ReactNode; onClose: () => void }) => isOpen ? <section role="dialog" aria-label={title}><button onClick={onClose}>Close</button>{body}{children}</section> : null }));

const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;
const deferred = () => { let resolve!: (value: Response) => void; const promise = new Promise<Response>((done) => { resolve = done; }); return { promise, resolve }; };
const intent = { paymentId: 'attempt-1', amount: 990.25, itemTitle: 'รายการภาษาไทย', expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() };
const completed = { canSubmitSlip: false, presentation: { payment: { state: 'completed-ready', heading: 'พร้อมเรียน', description: 'ยืนยันแล้ว' } } };
const enrolled = vi.fn();
const close = vi.fn();

function review(type: 'course' | 'bundle', overrides: Partial<OrderReview> = {}): OrderReview {
  return {
    target: { type, id: 'product-1', title: 'รายการภาษาไทย', href: '/courses/thai' },
    price: { original: '990.25', discount: '0.00', amountDue: '990.25', currency: 'THB' },
    coupon: null, action: 'pay',
    access: { ownedCount: 0, totalCount: 1, description: 'ได้รับสิทธิ์เมื่อระบบยืนยันแล้ว' },
    comparison: type === 'bundle' ? { separate: '1500.00', label: 'ประหยัด ฿509.75' } : null,
    ...overrides,
  };
}
function mount(type: 'course' | 'bundle') {
  return render(<CheckoutDialog open onClose={close} target={{ type, id: 'product-1' }} exposureId={null} returnFocusRef={createRef<HTMLButtonElement>()} onEnrolled={enrolled} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe.each(['course', 'bundle'] as const)('%s order review and payment', (type) => {
  const body = type === 'course' ? { courseId: 'product-1' } : { bundleId: 'product-1' };
  const slipEndpoint = type === 'course' ? '/api/slip/verify' : '/api/bundles/slip/verify';
  const stripeEndpoint = type === 'course' ? '/api/stripe/checkout' : '/api/stripe/bundle-checkout';

  it('waits for authoritative review and keeps method actions locked during creation', async () => {
    const pendingReview = deferred();
    const pendingIntent = deferred();
    const fetchMock = vi.fn().mockReturnValueOnce(pendingReview.promise).mockReturnValueOnce(pendingIntent.promise);
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup(); mount(type);
    expect(screen.queryByRole('button', { name: /PromptPay/ })).toBeNull();
    await act(async () => pendingReview.resolve(response({ review: review(type) })));
    expect(await screen.findAllByText('฿990.25')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: /PromptPay/ }));
    expect((screen.getByRole('button', { name: /Stripe/ }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(close).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/promptpay/intents', expect.objectContaining({ body: JSON.stringify({ ...body, expectedAmount: '990.25' }) }));
    await act(async () => pendingIntent.resolve(response(intent, 201)));
    expect(await screen.findByText('attempt-1')).toBeTruthy();
    expect(screen.getByText(/เวลาไทย/)).toBeTruthy();
    expect(screen.getByText(/ข้อมูลส่วนบุคคล/)).toBeTruthy();
  });

  it('retains the exact attempt on close/reopen and retries a rejected slip without another payment', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ review: review(type) })).mockResolvedValueOnce(response(intent, 201))
      .mockResolvedValueOnce(response({ error: 'สลิปไม่ตรงรายการ' }, 400)).mockResolvedValueOnce(response({ success: true })).mockResolvedValueOnce(response(completed));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup(); const mounted = mount(type);
    await user.click(await screen.findByRole('button', { name: /PromptPay/ }));
    await user.click(await screen.findByRole('button', { name: 'ปิดและเก็บรายการไว้' }));
    const props = { onClose: close, target: { type, id: 'product-1' }, exposureId: null, returnFocusRef: createRef<HTMLButtonElement>(), onEnrolled: enrolled };
    mounted.rerender(<CheckoutDialog {...props} open={false} />);
    mounted.rerender(<CheckoutDialog {...props} open />);
    expect(screen.getByText('attempt-1')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Stripe/ })).toBeNull();
    await user.upload(screen.getByLabelText('แนบสลิปการโอนเงิน'), new File(['test'], 'test.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: 'ตรวจสอบและชำระเงิน' }));
    expect(await screen.findByText('สลิปไม่ตรงรายการ')).toBeTruthy();
    expect(enrolled).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'ตรวจสอบและชำระเงิน' }));
    await waitFor(() => expect(enrolled).toHaveBeenCalledTimes(1));
    const calls = fetchMock.mock.calls.filter(([url]) => url === slipEndpoint);
    expect(calls).toHaveLength(2);
    for (const [, options] of calls) expect((options.body as FormData).get('paymentId')).toBe('attempt-1');
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/promptpay/intents')).toHaveLength(1);
  });

  it('blocks duplicate payment and slip submission after a timeout until owner-checked status permits retry', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ review: review(type) })).mockResolvedValueOnce(response(intent, 201))
      .mockResolvedValueOnce(response({ error: 'timeout' }, 503))
      .mockResolvedValueOnce(response({ canSubmitSlip: false, presentation: { payment: { state: 'verifying', heading: 'กำลังตรวจสอบ', description: 'อย่าชำระซ้ำ' } } }))
      .mockResolvedValueOnce(response({ canSubmitSlip: true, presentation: { payment: { state: 'pending', heading: 'รอแนบสลิป', description: 'ใช้รายการเดิม' } } }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup(); mount(type);
    await user.click(await screen.findByRole('button', { name: /PromptPay/ }));
    await user.upload(await screen.findByLabelText('แนบสลิปการโอนเงิน'), new File(['test'], 'test.webp', { type: 'image/webp' }));
    await user.click(screen.getByRole('button', { name: 'ตรวจสอบและชำระเงิน' }));
    await screen.findByText(/ผลการตรวจสอบยังไม่ยืนยัน/);
    expect(screen.queryByRole('button', { name: 'ตรวจสอบและชำระเงิน' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'ตรวจสถานะอีกครั้ง' }));
    expect(await screen.findByText('กำลังตรวจสอบ')).toBeTruthy();
    expect(enrolled).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'ตรวจสถานะอีกครั้ง' }));
    expect(await screen.findByRole('button', { name: 'ตรวจสอบและชำระเงิน' })).toBeTruthy();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/promptpay/intents?paymentId=attempt-1', { cache: 'no-store' });
  });

  it('rejects oversize/unsupported slips, locks verifying, and grants no access while pending', async () => {
    const verification = deferred();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ review: review(type) })).mockResolvedValueOnce(response(intent, 201)).mockReturnValueOnce(verification.promise).mockResolvedValueOnce(response(completed)));
    const user = userEvent.setup({ applyAccept: false }); mount(type);
    await user.click(await screen.findByRole('button', { name: /PromptPay/ }));
    const input = await screen.findByLabelText<HTMLInputElement>('แนบสลิปการโอนเงิน');
    await user.upload(input, new File(['bad'], 'bad.svg', { type: 'image/svg+xml' }));
    expect(await screen.findByText('รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น')).toBeTruthy();
    await user.upload(input, new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }));
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect((screen.getByRole('button', { name: 'ตรวจสอบและชำระเงิน' }) as HTMLButtonElement).disabled).toBe(true);
    await user.upload(input, new File(['test'], 'test.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: 'ตรวจสอบและชำระเงิน' }));
    expect(input.disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'กำลังตรวจสอบสลิป...' }) as HTMLButtonElement).disabled).toBe(true);
    expect(enrolled).not.toHaveBeenCalled();
    await act(async () => verification.resolve(response({ success: true })));
  });

  it('requires a fresh review after Stripe rejects the reviewed price', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ review: review(type) })).mockResolvedValueOnce(response({ error: 'ราคาเปลี่ยนแปลง' }, 409));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup(); mount(type);
    await user.click(await screen.findByRole('button', { name: /Stripe/ }));
    expect(await screen.findByText('ราคาเปลี่ยนแปลง')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /PromptPay/ })).toBeNull();
    expect(fetchMock).toHaveBeenLastCalledWith(stripeEndpoint, expect.objectContaining({ body: JSON.stringify({ ...body, expectedAmount: '990.25' }) }));
    expect(screen.getByRole('button', { name: 'ตรวจสอบรายการใหม่โดยไม่ใช้คูปอง' })).toBeTruthy();
  });

  it('shows expired attempts without a second transfer prompt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ review: review(type) })).mockResolvedValueOnce(response({ ...intent, expiresAt: '2020-01-01T00:00:00.000Z' }, 201)));
    const user = userEvent.setup(); mount(type);
    await user.click(await screen.findByRole('button', { name: /PromptPay/ }));
    expect(await screen.findByText('รายการพร้อมเพย์หมดเวลาแล้ว')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ตรวจสอบและชำระเงิน' })).toBeNull();
    expect(screen.queryByText('เลขบัญชี')).toBeNull();
  });
});

it('uses the explicit free-enrollment endpoint only after a server-confirmed 100% coupon', async () => {
  const couponReview = deferred();
  const enrollment = deferred();
  const fetchMock = vi.fn().mockResolvedValueOnce(response({ review: review('course') })).mockReturnValueOnce(couponReview.promise).mockReturnValueOnce(enrollment.promise);
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup(); mount('course');
  await screen.findByRole('button', { name: /Stripe/ });
  await user.type(screen.getByRole('textbox', { name: 'มีโค้ดส่วนลด?' }), 'FREE100');
  await user.click(screen.getByRole('button', { name: 'ใช้โค้ด' }));
  expect((screen.getByRole('button', { name: 'ใช้โค้ด' }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => couponReview.resolve(response({ review: review('course', { coupon: { id: 'coupon-1', code: 'FREE100', description: null }, price: { original: '990.25', discount: '990.25', amountDue: '0.00', currency: 'THB' }, action: 'enroll-free' }) })));
  expect(screen.queryByRole('button', { name: /Stripe/ })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'ลงทะเบียนเรียนฟรี (คูปอง 100%)' }));
  expect(fetchMock).toHaveBeenLastCalledWith('/api/enroll', expect.objectContaining({ body: JSON.stringify({ courseId: 'product-1', couponId: 'coupon-1' }) }));
  expect(enrolled).not.toHaveBeenCalled();
  await act(async () => enrollment.resolve(response({ success: true })));
  expect(enrolled).toHaveBeenCalledTimes(1);
});

it.each(['คูปองนี้หมดอายุแล้ว', 'คูปองนี้ไม่สามารถใช้กับคอร์สนี้ได้'])('keeps invalid coupons accessible: %s', async (error) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ review: review('course') })).mockResolvedValueOnce(response({ error }, 400)));
  const user = userEvent.setup(); mount('course');
  await screen.findByRole('button', { name: /Stripe/ });
  const input = screen.getByRole('textbox', { name: 'มีโค้ดส่วนลด?' });
  await user.type(input, 'INVALID');
  await user.click(screen.getByRole('button', { name: 'ใช้โค้ด' }));
  expect(await screen.findByText(error)).toBeTruthy();
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(screen.queryByRole('button', { name: /Stripe/ })).toBeNull();
});

it('does not claim learning access from a successful slip response while access is still pending', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ review: review('course') })).mockResolvedValueOnce(response(intent, 201))
    .mockResolvedValueOnce(response({ success: true, alreadyFulfilled: true }))
    .mockResolvedValueOnce(response({ canSubmitSlip: false, presentation: { payment: { state: 'completed-access-pending', heading: 'ชำระแล้ว กำลังเปิดสิทธิ์', description: 'อย่าชำระซ้ำ' } } })));
  const user = userEvent.setup(); mount('course');
  await user.click(await screen.findByRole('button', { name: /PromptPay/ }));
  await user.upload(await screen.findByLabelText('แนบสลิปการโอนเงิน'), new File(['test'], 'test.png', { type: 'image/png' }));
  await user.click(screen.getByRole('button', { name: 'ตรวจสอบและชำระเงิน' }));
  expect(await screen.findByText('ชำระแล้ว กำลังเปิดสิทธิ์')).toBeTruthy();
  expect(enrolled).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'ตรวจสอบและชำระเงิน' })).toBeNull();
});
