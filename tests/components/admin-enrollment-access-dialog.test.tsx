// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminEnrollmentAccessDialog } from '@/components/admin/AdminEnrollmentAccessDialog';

afterEach(cleanup);
it('explains retained history and requires a reason before revoking', () => {
  const confirm = vi.fn();
  render(<AdminEnrollmentAccessDialog open restoring={false} target="Course A" pending={false} onConfirm={confirm} onOpenChange={vi.fn()} />);
  expect(screen.getByText(/ความคืบหน้าและใบรับรองเดิมจะยังคงอยู่/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันถอนสิทธิ์' }));
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('เหตุผลในการเปลี่ยนสิทธิ์'), { target: { value: 'ผู้ดูแลขอถอนสิทธิ์' } });
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันถอนสิทธิ์' }));
  expect(confirm).toHaveBeenCalledWith('ผู้ดูแลขอถอนสิทธิ์');
});
it('offers restoration and blocks duplicate submission while pending', () => {
  const confirm = vi.fn();
  render(<AdminEnrollmentAccessDialog open restoring target="Course A" pending onConfirm={confirm} onOpenChange={vi.fn()} />);
  expect(screen.getByText('ผู้เรียนจะกลับมาเรียนต่อจากความคืบหน้าเดิมได้')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /กำลังดำเนินการ/ }));
  expect(confirm).not.toHaveBeenCalled();
});
