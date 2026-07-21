import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import TransactionReceipt from '@/components/proof/TransactionReceipt';
import CertificateCard from '@/components/certificate/CertificateCard';

vi.mock('@/components/layout/Navbar', () => ({ default: () => <div data-layout="navbar" /> }));
vi.mock('@/components/layout/Footer', () => ({ default: () => <div data-layout="footer" /> }));

const quote = String.fromCharCode(34);

describe('transaction and credential proof contracts', () => {
  it('renders learning access only after enrollment is confirmed', () => {
    const ready = renderToStaticMarkup(
      <TransactionReceipt
        kind="course"
        title="TypeScript Foundations"
        amount="2490.00"
        orderId="payment-12345678"
        accessReady
        primaryHref="/courses/typescript/learn"
        primaryLabel="เริ่มเรียน"
      />,
    );
    const pending = renderToStaticMarkup(
      <TransactionReceipt
        kind="course"
        title="TypeScript Foundations"
        amount="2490.00"
        orderId="payment-12345678"
        accessReady={false}
      />,
    );

    expect(ready).toContain(`href=${quote}/courses/typescript/learn${quote}`);
    expect(ready).toContain(`data-access=${quote}ready${quote}`);
    expect(pending).not.toContain('/courses/typescript/learn');
    expect(pending).toContain(`data-access=${quote}pending${quote}`);
    expect(pending).toContain(`<button`);
  });

  it('renders bundle evidence as an ordered set of real course links', () => {
    const html = renderToStaticMarkup(
      <TransactionReceipt
        kind="bundle"
        title="Web Developer Path"
        amount="4990.00"
        orderId="payment-bundle"
        accessReady
        primaryHref="/courses/html/learn"
        primaryLabel="เริ่มคอร์สแรก"
        items={[
          { id: 'course-1', title: 'HTML', href: '/courses/html' },
          { id: 'course-2', title: 'TypeScript', href: '/courses/typescript' },
        ]}
      />,
    );

    expect(html).toContain(`<ol`);
    expect(html).toContain(`href=${quote}/courses/html${quote}`);
    expect(html).toContain(`href=${quote}/courses/typescript${quote}`);
  });

  it('preserves Stripe and enrollment fallback controls in both return routes', () => {
    const course = readFileSync('src/app/courses/[slug]/payment-success/page.tsx', 'utf8');
    const bundle = readFileSync('src/app/bundles/[slug]/payment-success/page.tsx', 'utf8');

    for (const source of [course, bundle]) {
      expect(source).toContain('stripe.checkout.sessions.retrieve(sessionId)');
      expect(source).toContain("stripeSession.payment_status !== 'paid'");
      expect(source).toContain("eq(payments.status, 'pending')");
      expect(source).toContain('safeInsertEnrollment');
    }
    expect(course).toContain('meta.userId && meta.userId !== userId');
    expect(course).toContain('meta.courseId && meta.courseId !== courseId');
    expect(course).toContain("meta.type !== 'course'");
    expect(bundle).toContain('meta.userId && meta.userId !== userId');
    expect(bundle).toContain('meta.bundleId && meta.bundleId !== bundleId');
    expect(bundle).toContain("meta.type !== 'bundle'");
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
