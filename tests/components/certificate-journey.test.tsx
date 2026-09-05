/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CertificateCollection from '@/app/dashboard/certificates/CertificateCollection';
import CertificateCard from '@/components/certificate/CertificateCard';
const mocks = vi.hoisted(() => ({ png: vi.fn() }));
vi.mock('html-to-image', () => ({ toPng: mocks.png }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const cert = { certificateCode: 'CERT-TEST-TEST', recipientName: 'ผู้เรียนชื่อยาว', courseTitle: 'หลักสูตรภาษาไทย', completedAt: '2026-08-01', issuedAt: '2026-08-02', revokedAt: null, courseSlug: 'course' };
const collection = { summary: { activeCount: 1, revokedCount: 1, missingCount: 1, hasEnrollment: true }, items: [
  { ...cert, kind: 'active', code: cert.certificateCode }, { ...cert, kind: 'revoked', code: 'CERT-REVOKED' }, { kind: 'missing', courseSlug: 'missing', courseTitle: 'รอใบรับรอง', completedAt: '2026-08-01' },
] };
describe('certificate user journey', () => {
  it('separates all collection states and submits one explicit owner repair', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ collection }) }); vi.stubGlobal('fetch', fetch);
    render(<CertificateCollection />); await screen.findByText('เพิกถอนแล้ว');
    expect(screen.getByText('เรียนจบแล้ว ยังไม่มีใบรับรอง')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /คัดลอกลิงก์ใบรับรอง/ })).toHaveLength(1);
    fetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ result: { kind: 'temporarily_unavailable' } }) });
    fireEvent.click(screen.getByRole('button', { name: 'ตรวจสอบและออกใบรับรอง' }));
    await screen.findByText('ยังออกใบรับรองไม่ได้ กรุณาลองใหม่หรือติดต่อทีมงาน');
    expect(fetch).toHaveBeenLastCalledWith('/api/certificates/repair', expect.objectContaining({ body: JSON.stringify({ courseSlug: 'missing' }) }));
  });
  it('falls back from unavailable Web Share to the canonical verification link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new Error('unavailable')), clipboard: { writeText } });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('image unavailable')));
    render(<CertificateCard cert={cert} />); fireEvent.click(screen.getByRole('button', { name: 'แชร์ลิงก์ตรวจสอบ' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/certificate\/CERT-TEST-TEST$/)));
    expect(screen.getByRole('document').textContent).toContain('สถานะใบรับรองอาจเปลี่ยนแปลง');
  });
  it('keeps an explicit retry and verification action after export fails', async () => {
    mocks.png.mockRejectedValue(new Error('export unavailable'));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('image unavailable')));
    render(<CertificateCard cert={{ ...cert, revokedAt: '2026-08-03' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'ดาวน์โหลด PNG' }));
    await screen.findByText('ยังสร้างไฟล์ดาวน์โหลดไม่ได้ กรุณาลองใหม่');
    expect(screen.getByRole('button', { name: 'ดาวน์โหลด PNG' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('document').textContent).toContain('เพิกถอนแล้ว');
    expect(screen.getByRole('link', { name: /certificate\/CERT/ })).toBeTruthy();
  });
});
