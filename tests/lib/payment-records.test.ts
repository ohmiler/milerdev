import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { loadPaymentRecord, loadPaymentRecords } from '@/lib/payment-records';
import { loadPromptPayPresentation } from '@/lib/promptpay-presentation';

const mocks = vi.hoisted(() => ({ select: vi.fn(), exact: vi.fn(), paymentWhere: vi.fn(), accessWhere: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { select: mocks.select, query: { payments: { findFirst: mocks.exact } } } }));
const attempt = { id: 'attempt-1', userId: 'member-1', courseId: 'course-1', bundleId: null, itemTitle: 'ชื่อเดิม', amount: '990.25', currency: 'THB', method: 'promptpay', status: 'pending', createdAt: new Date(), courseSlug: 'thai', bundleSlug: null };
function setup(rows = [attempt], owned: { courseId: string }[] = [], included: { bundleId: string; courseId: string }[] = []) {
  const query = { leftJoin: () => query, where: mocks.paymentWhere, orderBy: async () => rows };
  mocks.paymentWhere.mockReturnValue(query);
  mocks.accessWhere.mockResolvedValue(owned);
  mocks.select.mockReturnValueOnce({ from: () => query }).mockReturnValueOnce({ from: () => ({ where: mocks.accessWhere }) })
    .mockReturnValueOnce({ from: () => ({ where: async () => included }) });
}
beforeEach(() => { vi.resetAllMocks(); mocks.exact.mockResolvedValue({ id: 'attempt-1' }); });

describe('owner-scoped payment recovery records', () => {
  it('checks exact owner before reading related records and returns immutable item and amount', async () => {
    setup();
    const result = await loadPaymentRecord('member-1', 'attempt-1');
    const dialect = new MySqlDialect();
    expect(dialect.sqlToQuery(mocks.exact.mock.calls[0][0].where).params).toEqual(['attempt-1', 'member-1']);
    expect(dialect.sqlToQuery(mocks.paymentWhere.mock.calls[0][0]).params).toEqual(['member-1']);
    expect(dialect.sqlToQuery(mocks.accessWhere.mock.calls[0][0]).params).toEqual(['member-1']);
    expect(result).toMatchObject({ id: 'attempt-1', canSubmitSlip: true, presentation: { target: { title: 'ชื่อเดิม' }, quote: { amountDue: '990.25' }, recovery: { kind: 'resume' } } });
  });
  it('reveals no facts for a foreign or missing exact attempt', async () => {
    mocks.exact.mockResolvedValue(undefined);
    expect(await loadPaymentRecord('other', 'attempt-1')).toBeNull();
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it.each(['verifying', 'completed', 'failed', 'refunded'])('does not offer another slip for %s', async (status) => {
    setup([{ ...attempt, status }]);
    const [record] = await loadPaymentRecords('member-1');
    expect(record.canSubmitSlip).toBe(false);
    if (status === 'completed') expect(record.presentation.payment.state).toBe('completed-access-pending');
  });
  it('never resumes an expired attempt or offers a duplicate payment', async () => {
    setup([{ ...attempt, createdAt: new Date('2000-01-01') }]);
    expect((await loadPaymentRecords('member-1'))[0]).toMatchObject({ canSubmitSlip: false, presentation: { recovery: { kind: 'contact' }, payment: { preventDuplicatePayment: true } } });
  });
  it('suppresses older pending and failed retry prompts when another same-product attempt is active', async () => {
    setup([{ ...attempt, id: 'new' }, attempt, { ...attempt, id: 'failed', status: 'failed' }]);
    const records = await loadPaymentRecords('member-1');
    expect(records.map((record) => record.canSubmitSlip)).toEqual([true, false, false]);
    expect(records[2].presentation.recovery.kind).toBe('contact');
  });
  it('keeps completed Bundle payment distinct from partial or empty access', async () => {
    setup([{ ...attempt, courseId: null, bundleId: 'bundle-1', status: 'completed' } as unknown as typeof attempt], [{ courseId: 'course-1' }], [{ bundleId: 'bundle-1', courseId: 'course-1' }, { bundleId: 'bundle-1', courseId: 'course-2' }]);
    expect((await loadPaymentRecords('member-1'))[0].presentation).toMatchObject({ payment: { state: 'completed-access-pending' }, access: { state: 'partial', enrolledCount: 1, totalCount: 2 } });
    setup([{ ...attempt, courseId: null, bundleId: 'empty', status: 'completed' } as unknown as typeof attempt]);
    expect((await loadPaymentRecords('member-1'))[0].presentation.payment.state).toBe('completed-access-pending');
  });
  it('hides transfer resumption for a product whose access is already ready', async () => {
    setup([attempt], [{ courseId: 'course-1' }]);
    expect((await loadPaymentRecords('member-1'))[0].canSubmitSlip).toBe(false);
  });
  it('treats pending Stripe as uncertain and avoids prompting another payment', async () => {
    setup([{ ...attempt, method: 'stripe' }]);
    expect((await loadPaymentRecords('member-1'))[0].presentation).toMatchObject({ payment: { preventDuplicatePayment: true }, recovery: { kind: 'contact' } });
  });
  it('filters a non-PromptPay record out of the slip status endpoint', async () => {
    setup([{ ...attempt, method: 'stripe' }]);
    expect(await loadPromptPayPresentation('member-1', 'attempt-1')).toBeNull();
  });
});
