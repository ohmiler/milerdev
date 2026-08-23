export const DEFAULT_CERTIFICATE_COLOR = '#2563eb';

const HTML_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isHtmlCertificateColor(value: string): boolean {
  return HTML_COLOR_PATTERN.test(value);
}

export function normalizeCertificateColor(value: string | null | undefined): string {
  const candidate = value?.trim();
  return candidate && isHtmlCertificateColor(candidate)
    ? candidate.toLowerCase()
    : DEFAULT_CERTIFICATE_COLOR;
}
