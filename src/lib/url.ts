export function normalizeImageUrl(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  if (candidate.startsWith('/') && !candidate.startsWith('//')) {
    return candidate;
  }

  const normalized = candidate.startsWith('//')
    ? `https:${candidate}`
    : /^https?:\/\//i.test(candidate)
      ? candidate
      : `https://${candidate}`;

  try {
    const url = new URL(normalized);
    return url.protocol === 'http:' || url.protocol === 'https:' ? normalized : null;
  } catch {
    return null;
  }
}
