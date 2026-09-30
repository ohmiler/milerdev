import { beforeEach, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { POST } from '@/app/api/checkout/review/route';
import { loadOrderReview } from '@/lib/order-review';
import { checkRateLimit } from '@/lib/rate-limit';

vi.mock('@/lib/order-review', () => ({ loadOrderReview: vi.fn(), OrderReviewError: class extends Error {} }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(() => ({ success: true })), rateLimits: { sensitive: {} }, rateLimitResponse: () => new Response(null, { status: 429 }) }));
const request = (body: unknown) => new Request('http://localhost/api/checkout/review', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); vi.mocked(auth).mockResolvedValue({ user: { id: 'member-1' } } as never); vi.mocked(checkRateLimit).mockReturnValue({ success: true } as never); });

it('requires authentication before reading price and ownership', async () => {
  vi.mocked(auth).mockResolvedValue(null as never);
  expect((await POST(request({ courseId: 'course-1' }))).status).toBe(401);
  expect(loadOrderReview).not.toHaveBeenCalled();
});
it.each([{ courseId: 'course-1', amount: 1 }, { courseId: 'course-1', bundleId: 'bundle-1' }, { bundleId: 'bundle-1', couponCode: 'FREE' }, {}, { courseId: 'x'.repeat(37) }])('rejects invalid or client-authored quote data', async (body) => {
  expect((await POST(request(body))).status).toBe(400);
  expect(loadOrderReview).not.toHaveBeenCalled();
});
it('rate limits and uses the authenticated owner for a private no-store review', async () => {
  vi.mocked(checkRateLimit).mockReturnValueOnce({ success: false } as never);
  expect((await POST(request({ courseId: 'course-1' }))).status).toBe(429);
  vi.mocked(loadOrderReview).mockResolvedValue({ action: 'pay' } as never);
  const response = await POST(request({ courseId: 'course-1' }));
  expect(loadOrderReview).toHaveBeenCalledWith('member-1', { courseId: 'course-1' });
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});
