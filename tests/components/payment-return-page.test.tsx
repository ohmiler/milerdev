import { beforeEach, expect, it, vi } from 'vitest';
import PaymentReturnPage from '@/components/proof/PaymentReturnPage';
import { createAuthReturnHref, resolveSafeAuthRedirect } from '@/lib/safe-auth-return';
const mocks = vi.hoisted(() => ({ member: vi.fn(), load: vi.fn(), redirect: vi.fn() }));
vi.mock('@/lib/member-access', () => ({ requireMember: mocks.member }));
vi.mock('@/lib/payment-return', () => ({ isStripeReturnId: (id: unknown) => typeof id === 'string' && /^cs_[a-zA-Z0-9_-]{1,240}$/.test(id), loadPaymentReturn: mocks.load }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect, notFound: () => { throw new Error('not found'); } }));
beforeEach(() => { vi.resetAllMocks(); mocks.redirect.mockImplementation(() => { throw new Error('redirect'); }); });
it.each(['course', 'bundle'] as const)('preserves the exact %s return through canonicalization and auth', async (type) => {
  const path = `/${type === 'course' ? 'courses' : 'bundles'}/thai/payment-success/cs_test_original`;
  await expect(PaymentReturnPage({ type, params: Promise.resolve({ slug: 'thai' }), searchParams: Promise.resolve({ session_id: 'cs_test_original' }) })).rejects.toThrow('redirect');
  expect(mocks.redirect).toHaveBeenCalledWith(path);
  expect(createAuthReturnHref('/login', path)).toContain(encodeURIComponent(path));
  expect(resolveSafeAuthRedirect(path, 'https://example.test')).toBe(`https://example.test${path}`);
  expect(mocks.load).not.toHaveBeenCalled();
  mocks.member.mockRejectedValue(new Error('login'));
  await expect(PaymentReturnPage({ type, params: Promise.resolve({ slug: 'thai', sessionId: 'cs_test_original' }) })).rejects.toThrow('login');
  expect(mocks.member).toHaveBeenCalledWith(path);
  expect(mocks.load).not.toHaveBeenCalled();
});
it('does not turn arbitrary query values into a redirect', async () => {
  mocks.member.mockRejectedValue(new Error('login'));
  await expect(PaymentReturnPage({ type: 'course', params: Promise.resolve({ slug: 'thai' }), searchParams: Promise.resolve({ session_id: '//evil.test' }) })).rejects.toThrow('login');
  expect(mocks.redirect).not.toHaveBeenCalled();
  expect(mocks.member).toHaveBeenCalledWith('/courses/thai/payment-success');
});
