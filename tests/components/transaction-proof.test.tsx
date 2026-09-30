import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { paymentRecord } from '../fixtures/payment-record';
import TransactionReceipt from '@/components/proof/TransactionReceipt';
import CertificateCard from '@/components/certificate/CertificateCard';

vi.mock('@/components/layout/Navbar', () => ({ default: () => <div data-layout="navbar" /> }));
vi.mock('@/components/layout/Footer', () => ({ default: () => <div data-layout="footer" /> }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const quote = String.fromCharCode(34);

describe('transaction and credential proof contracts', () => {
  it.each(['pending', 'verifying', 'completed', 'failed', 'refunded'] as const)('renders exact payment evidence for %s without treating access as payment confirmation', (status) => {
    const record = paymentRecord({ status });
    const html = renderToStaticMarkup(<TransactionReceipt record={record} />);
    expect(html).toContain('attempt-1');
    expect(html).toContain('ชื่อสินค้าตอนชำระเงิน');
    expect(html).toContain('990.25');
    expect(html).toContain(record.presentation.payment.label);
    expect(html).toContain('ยังไม่มีสิทธิ์เรียน');
    expect(html).not.toContain('พร้อมเริ่มเรียน');
    if (status === 'completed') expect(html).toContain('อย่าชำระซ้ำ');
  });

  it('only announces ready after both payment and access are confirmed', () => {
    const html = renderToStaticMarkup(<TransactionReceipt record={paymentRecord({ status: 'completed' }, 1)} />);
    expect(html).toContain('ชำระแล้ว พร้อมเริ่มเรียน');
    expect(html).toContain('สิทธิ์เรียนพร้อมแล้ว');
  });

  it('keeps revoked certificate status in the document and names client actions', () => {
    const html = renderToStaticMarkup(
      <CertificateCard cert={{
        certificateCode: 'CERT-001',
        recipientName: 'Miler Dev',
        courseTitle: 'TypeScript Foundations',
        completedAt: '2026-07-21T00:00:00.000Z',
        issuedAt: '2026-07-21T00:00:00.000Z',
        revokedAt: '2026-07-22T00:00:00.000Z',
        courseSlug: 'typescript',
        courseId: 'course-1',
      }} />,
    );

    expect(html).toContain(`data-certificate-status=${quote}revoked${quote}`);
    expect(html).toContain(`<button`);
    expect(html).toContain(`href=${quote}/courses/typescript${quote}`);
  });
});
