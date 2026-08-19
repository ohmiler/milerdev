import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import PaymentsClient from '@/app/dashboard/payments/PaymentsClient';
import CertificatesClient from '@/app/dashboard/certificates/CertificatesClient';
import ProfileForm from '@/app/profile/ProfileForm';
import ChangePasswordForm from '@/components/settings/ChangePasswordForm';
import ProfileLoading from '@/app/profile/loading';
import SettingsLoading from '@/app/settings/loading';

vi.mock('@/components/layout/Navbar', () => ({ default: () => <div data-layout="navbar" /> }));
vi.mock('@/components/layout/Footer', () => ({ default: () => <div data-layout="footer" /> }));

const quote = String.fromCharCode(34);

describe('learner account contracts', () => {
  it('renders a shared, named account index with one current route and a Dashboard return path', () => {
    const html = renderToStaticMarkup(
      <LearnerAccountShell current="payments" title="Payments" description="Description">
        <div>Account content</div>
      </LearnerAccountShell>,
    );

    expect(html).toContain(`aria-label=${quote}เมนูบัญชีผู้เรียน${quote}`);
    expect(html).toContain(`href=${quote}/dashboard${quote}`);
    expect(html).toContain(`href=${quote}/dashboard/certificates${quote}`);
    expect(html).toContain(`href=${quote}/dashboard/payments${quote}`);
    expect(html).toContain(`href=${quote}/profile${quote}`);
    expect(html).toContain(`href=${quote}/settings${quote}`);
    expect(html.match(new RegExp(`aria-current=${quote}page${quote}`, 'g'))).toHaveLength(1);
  });

  it('announces the initial record loading states', () => {
    const payments = renderToStaticMarkup(<PaymentsClient />);
    const certificates = renderToStaticMarkup(<CertificatesClient />);

    expect(payments).toContain(`aria-busy=${quote}true${quote}`);
    expect(certificates).toContain(`aria-busy=${quote}true${quote}`);
    expect(payments).toContain(`aria-live=${quote}polite${quote}`);
    expect(certificates).toContain(`aria-live=${quote}polite${quote}`);
  });

  it('keeps authenticated route loading states inside the shared account system', () => {
    const profile = renderToStaticMarkup(<ProfileLoading />);
    const settings = renderToStaticMarkup(<SettingsLoading />);

    expect(profile).toContain(`aria-label=${quote}กำลังโหลดโปรไฟล์${quote}`);
    expect(settings).toContain(`aria-label=${quote}กำลังโหลดการตั้งค่าบัญชี${quote}`);
    expect(profile).toContain(`aria-busy=${quote}true${quote}`);
    expect(settings).toContain(`aria-busy=${quote}true${quote}`);
  });

  it('retains the payment and certificate API boundaries plus visible failure branches', () => {
    const payments = readFileSync('src/app/dashboard/payments/PaymentsClient.tsx', 'utf8');
    const certificates = readFileSync('src/app/dashboard/certificates/CertificatesClient.tsx', 'utf8');

    expect(payments).toContain("fetch('/api/payments'");
    expect(payments).toContain('if (!response.ok)');
    expect(payments).toContain("verifying: { label:");
    expect(certificates).toContain("fetch('/api/certificates'");
    expect(certificates).toContain('if (!response.ok)');
    expect(certificates).toContain('await navigator.clipboard.writeText(url)');
    expect(certificates).toContain('aria-live="polite"');
  });

  it('keeps profile mutation fields and immutable email semantics', () => {
    const html = renderToStaticMarkup(
      <ProfileForm user={{ id: 'user-1', name: 'Miler', email: 'miler@example.com', avatarUrl: null }} />,
    );
    const source = readFileSync('src/app/profile/ProfileForm.tsx', 'utf8');

    expect(html).toContain(`id=${quote}profile-name${quote}`);
    expect(html).toContain(`id=${quote}profile-email${quote}`);
    expect(html).toContain(' disabled=');
    expect(html).toMatch(new RegExp(`<button[^>]*type=${quote}submit${quote}`));
    expect(source).toContain("fetch('/api/profile'");
    expect(source).toContain("method: 'PUT'");
    expect(source).toContain("'Content-Type': 'application/json'");
  });

  it('keeps password controls collapsed and names the OAuth-only state', () => {
    const password = renderToStaticMarkup(<ChangePasswordForm hasPassword />);
    const oauth = renderToStaticMarkup(<ChangePasswordForm hasPassword={false} />);
    const source = readFileSync('src/components/settings/ChangePasswordForm.tsx', 'utf8');

    expect(password).toContain(`aria-expanded=${quote}false${quote}`);
    expect(password).toContain(`aria-controls=${quote}change-password-panel${quote}`);
    expect(password).not.toContain(`<form`);
    expect(oauth).toContain('GOOGLE LOGIN');
    expect(oauth).not.toContain(`<form`);
    expect(source).toContain("fetch('/api/auth/change-password'");
    expect(source).toContain("method: 'POST'");
    expect(source).toContain('currentPassword, newPassword');
    expect(source).toContain('disabled={isDisabled}');
  });

  it('uses Thai-first task labels across learner account surfaces', () => {
    const sources = [
      'src/components/account/LearnerAccountShell.tsx',
      'src/app/dashboard/page.tsx',
      'src/app/dashboard/payments/PaymentsClient.tsx',
      'src/app/dashboard/certificates/CertificatesClient.tsx',
      'src/app/profile/page.tsx',
      'src/app/settings/page.tsx',
    ].map((path) => readFileSync(path, 'utf8')).join('\n');

    for (const legacyLabel of [
      'ACCOUNT INDEX',
      'Learning dashboard',
      'Payment ledger',
      'Verified credentials',
      'Account identity',
      'Editable information',
    ]) {
      expect(sources).not.toContain(legacyLabel);
    }
  });
});
