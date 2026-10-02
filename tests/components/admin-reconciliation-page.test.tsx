// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ReconciliationPage from '@/app/admin/reconciliation/page';

const summary = { verifying: 0, failed: 0, pending: 0 };

function makePayments(count: number, status = 'verifying') {
  return Array.from({ length: count }, (_, index) => ({
    id: `payment-${String(index + 1).padStart(3, '0')}`,
    userId: 'user-1',
    courseId: 'course-1',
    bundleId: null,
    amount: '990.00',
    currency: 'THB',
    method: 'promptpay',
    status,
    itemTitle: `คอร์ส ${index + 1}`,
    slipUrl: null,
    retryCount: 0,
    lastRetryAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    userName: `ผู้ซื้อ ${index + 1}`,
    userEmail: `buyer${index + 1}@example.com`,
    courseTitle: null,
    bundleTitle: null,
  }));
}

function okResponse(payments: unknown[], counts = summary) {
  return new Response(JSON.stringify({ payments, summary: counts }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function failedResponse() {
  return new Response(JSON.stringify({ error: 'ไม่สามารถโหลดรายการกระทบยอดได้' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

function rowCheckboxes() {
  return screen.getAllByRole('checkbox', { name: /^เลือกธุรกรรม / });
}

describe('Admin reconciliation queue states', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the load error without a success-toned empty state when the first load fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(failedResponse());

    render(<ReconciliationPage />);

    expect(await screen.findByText('ไม่สามารถโหลดรายการกระทบยอดได้', { selector: '[data-slot="alert-description"]' })).toBeTruthy();
    expect(screen.queryByText(/ไม่พบรายการ/)).toBeNull();
  });

  it('shows the empty state only after a successful empty load', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse([]));

    render(<ReconciliationPage />);

    expect(await screen.findByText('ไม่พบรายการรอตรวจสอบ')).toBeTruthy();
    expect(screen.queryByText('ไม่สามารถโหลดข้อมูลได้')).toBeNull();
  });

  it('marks rows as possibly out of date and disables decisions after a failed refresh', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(okResponse(makePayments(2), { ...summary, verifying: 2 }))
      .mockResolvedValueOnce(failedResponse());

    render(<ReconciliationPage />);
    await screen.findByText('คอร์ส 1');
    fireEvent.click(rowCheckboxes()[0]);

    fireEvent.click(screen.getByRole('button', { name: 'รีเฟรช' }));

    expect(await screen.findByText(/ข้อมูลด้านล่างอาจไม่เป็นปัจจุบัน/)).toBeTruthy();
    expect(screen.getByText('คอร์ส 1')).toBeTruthy();
    for (const button of screen.getAllByRole('button', { name: /^(อนุมัติ|ปฏิเสธ)$/ })) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    expect(screen.queryByRole('button', { name: 'ทำเครื่องหมายว่าล้มเหลว' })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('drops rows from the previous filter when the new filter fails to load', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(okResponse(makePayments(2), { ...summary, verifying: 2 }))
      .mockResolvedValueOnce(failedResponse());

    render(<ReconciliationPage />);
    await screen.findByText('คอร์ส 1');

    fireEvent.click(screen.getByRole('radio', { name: /ล้มเหลว/ }));

    expect(await screen.findByText('ไม่สามารถโหลดรายการกระทบยอดได้', { selector: '[data-slot="alert-description"]' })).toBeTruthy();
    expect(screen.queryByText('คอร์ส 1')).toBeNull();
    expect(screen.queryByText(/ไม่พบรายการ/)).toBeNull();
  });

  it('never lets more than 50 rows be selected', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse(makePayments(60), { ...summary, verifying: 60 }));

    render(<ReconciliationPage />);
    await screen.findByText('คอร์ส 1');

    fireEvent.click(screen.getByRole('checkbox', { name: 'เลือก 50 รายการแรก' }));

    const checked = rowCheckboxes().filter((box) => box.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(50);
    expect(screen.getByText(/เลือกอยู่ 50\/50 รายการ/)).toBeTruthy();
    const unselected = rowCheckboxes().filter((box) => box.getAttribute('aria-checked') !== 'true');
    expect(unselected).toHaveLength(10);
    for (const box of unselected) expect((box as HTMLButtonElement).disabled).toBe(true);
  });

  it('selects every row when there are 50 or fewer, and clears the selection on refresh', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse(makePayments(3), { ...summary, verifying: 3 }));

    render(<ReconciliationPage />);
    await screen.findByText('คอร์ส 1');

    fireEvent.click(screen.getByRole('checkbox', { name: 'เลือกทุกรายการ' }));
    expect(screen.getByText(/เลือกอยู่ 3\/50 รายการ/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'รีเฟรช' }));
    await waitFor(() => expect(screen.getByText(/เลือกอยู่ 0\/50 รายการ/)).toBeTruthy());
  });

  describe('pagination and search', () => {
    const paged = (page: number, total: number, rows: number) => new Response(JSON.stringify({
      payments: makePayments(rows),
      summary: { ...summary, verifying: total },
      pagination: { page, pageSize: 50, total, totalPages: Math.ceil(total / 50) },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    function requestedUrl(fetchMock: { mock: { calls: unknown[][] } }, index: number) {
      return new URL(String(fetchMock.mock.calls[index][0]), 'http://localhost');
    }

    it('shows the visible range against the total and moves between pages', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(paged(1, 120, 50))
        .mockResolvedValueOnce(paged(2, 120, 50));

      render(<ReconciliationPage />);
      await screen.findByText('คอร์ส 1');

      expect(screen.getByText(/แสดง 1–50 จาก 120 รายการ/)).toBeTruthy();
      expect(screen.getByText('หน้า 1/3')).toBeTruthy();
      expect((screen.getByRole('button', { name: /ก่อนหน้า/ }) as HTMLButtonElement).disabled).toBe(true);

      fireEvent.click(screen.getByRole('button', { name: /ถัดไป/ }));

      expect(await screen.findByText(/แสดง 51–100 จาก 120 รายการ/)).toBeTruthy();
      expect(requestedUrl(fetchMock, 1).searchParams.get('page')).toBe('2');
    });

    it('sends the search term and returns to page 1', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(paged(1, 120, 50))
        .mockResolvedValueOnce(paged(2, 120, 50))
        .mockResolvedValueOnce(paged(1, 1, 1));

      render(<ReconciliationPage />);
      await screen.findByText('คอร์ส 1');
      fireEvent.click(screen.getByRole('button', { name: /ถัดไป/ }));
      await screen.findByText(/แสดง 51–100/);

      fireEvent.change(screen.getByLabelText('ค้นหาเลขธุรกรรมหรืออีเมล'), { target: { value: '  buyer1@example.com ' } });
      fireEvent.click(screen.getByRole('button', { name: /ค้นหา/ }));

      await screen.findByText(/ผลค้นหา/);
      const url = requestedUrl(fetchMock, 2);
      expect(url.searchParams.get('q')).toBe('buyer1@example.com');
      expect(url.searchParams.get('page')).toBe('1');
    });

    it('requests every time range for backlog older than 90 days', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(paged(1, 1, 1));

      render(<ReconciliationPage />);
      await screen.findByText('คอร์ส 1');
      fireEvent.change(screen.getByLabelText('ช่วงเวลา'), { target: { value: 'all' } });

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      expect(requestedUrl(fetchMock, 1).searchParams.get('days')).toBe('all');
      expect(await screen.findByText(/ทุกช่วงเวลา/)).toBeTruthy();
    });

    it('moves back when the last items of a later page are resolved', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(paged(1, 51, 50))
        .mockResolvedValueOnce(paged(2, 51, 1))
        .mockResolvedValueOnce(new Response(JSON.stringify({ payments: [], summary, pagination: { page: 3, pageSize: 50, total: 50, totalPages: 1 } }), { status: 200 }))
        .mockResolvedValueOnce(paged(1, 50, 50));

      render(<ReconciliationPage />);
      await screen.findByText('คอร์ส 1');
      fireEvent.click(screen.getByRole('button', { name: /ถัดไป/ }));
      await screen.findByText(/แสดง 51–51 จาก 51/);

      // The page now reports fewer rows than the page we asked for.
      fireEvent.click(screen.getByRole('button', { name: 'รีเฟรช' }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
      expect(requestedUrl(fetchMock, 3).searchParams.get('page')).toBe('1');
    });
  });
});
