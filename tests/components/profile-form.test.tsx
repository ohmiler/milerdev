/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProfileForm from '@/app/profile/ProfileForm';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const renderForm = () => render(<ProfileForm user={{ name: 'Original', email: 'member@example.test' }} />);
const submit = () => fireEvent.submit(screen.getByLabelText('ชื่อ').closest('form')!);
describe('profile editing', () => {
  it('starts clean, validates whitespace, and discards edits without sending them', () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch); renderForm();
    expect(screen.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByLabelText('ชื่อ'), { target: { value: '   ' } }); submit();
    expect(screen.getByText('ชื่อต้องมีอย่างน้อย 2 ตัวอักษร')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('ชื่อ'));
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิกการแก้ไข' }));
    expect((screen.getByLabelText('ชื่อ') as HTMLInputElement).value).toBe('Original');
  });
  it('locks one pending write and adopts the saved normalized name', async () => {
    let resolve!: (response: unknown) => void;
    const fetch = vi.fn(() => new Promise((done) => { resolve = done; }));
    vi.stubGlobal('fetch', fetch); renderForm();
    fireEvent.change(screen.getByLabelText('ชื่อ'), { target: { value: '  ผู้เรียน ทดสอบ  ' } });
    submit(); submit(); expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('ชื่อ').hasAttribute('disabled')).toBe(true);
    resolve({ ok: true, json: async () => ({ user: { name: 'ผู้เรียน ทดสอบ' } }) });
    await screen.findByText('อัปเดตโปรไฟล์สำเร็จ');
    expect((screen.getByLabelText('ชื่อ') as HTMLInputElement).value).toBe('ผู้เรียน ทดสอบ');
    expect(screen.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/ใบรับรองที่ออกแล้วจะเก็บชื่อ/)).toBeTruthy();
  });
  it.each([429, 500])('retains unsaved changes after HTTP %s and permits explicit retry', async (status) => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({ error: 'ลองใหม่' }) });
    vi.stubGlobal('fetch', fetch); renderForm();
    fireEvent.change(screen.getByLabelText('ชื่อ'), { target: { value: 'Changed' } }); submit();
    await screen.findByRole('alert');
    expect((screen.getByLabelText('ชื่อ') as HTMLInputElement).value).toBe('Changed');
    await waitFor(() => expect(screen.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).hasAttribute('disabled')).toBe(false));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
