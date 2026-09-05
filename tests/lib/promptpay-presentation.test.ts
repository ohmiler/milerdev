import { beforeEach, expect, it, vi } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { loadPromptPayPresentation } from '@/lib/promptpay-presentation';

const mocks = vi.hoisted(() => ({ payment: vi.fn(), course: vi.fn(), select: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { query: { payments: { findFirst: mocks.payment }, courses: { findFirst: mocks.course } }, select: mocks.select } }));
const attempt = { id: 'attempt-1', userId: 'member-1', courseId: 'course-1', bundleId: null, itemTitle: 'Course', amount: '990.25', currency: 'THB', method: 'promptpay', status: 'pending', createdAt: new Date() };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.payment.mockResolvedValue(attempt);
  mocks.course.mockResolvedValue({ id: 'course-1', slug: 'thai', title: 'Course' });
  mocks.select.mockReturnValue({ from: () => ({ where: async () => [] }) });
});

it('binds status reads to the authenticated owner, exact attempt, and PromptPay method', async () => {
  const result = await loadPromptPayPresentation('member-1', 'attempt-1');
  const sql = new MySqlDialect().sqlToQuery(mocks.payment.mock.calls[0][0].where);
  expect(sql.params).toEqual(['attempt-1', 'member-1', 'promptpay']);
  expect(result?.canSubmitSlip).toBe(true);
  expect(result?.presentation.quote?.amountDue).toBe('990.25');
  expect(result?.presentation.attempt?.id).toBe('attempt-1');
});
it('does not reveal another owner or a missing attempt', async () => {
  mocks.payment.mockResolvedValue(undefined);
  expect(await loadPromptPayPresentation('other-member', 'attempt-1')).toBeNull();
  expect(mocks.course).not.toHaveBeenCalled();
});
it.each(['verifying', 'failed', 'refunded', 'completed'])('never permits another slip for a %s attempt', async (status) => {
  mocks.payment.mockResolvedValue({ ...attempt, status });
  const result = await loadPromptPayPresentation('member-1', 'attempt-1');
  expect(result?.canSubmitSlip).toBe(false);
  if (status === 'completed') expect(result?.presentation.payment.state).toBe('completed-access-pending');
});
it('does not permit resubmitting an expired attempt', async () => {
  mocks.payment.mockResolvedValue({ ...attempt, createdAt: new Date('2000-01-01') });
  expect((await loadPromptPayPresentation('member-1', 'attempt-1'))?.canSubmitSlip).toBe(false);
});
