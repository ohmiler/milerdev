import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/privacy-consent', () => ({ readBrowserConsent: vi.fn(), saveBrowserConsent: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: () => ({ success: true }), getClientIP: () => '127.0.0.1', rateLimits: { general: {} }, rateLimitResponse: vi.fn() }));
import { auth } from '@/lib/auth';
import { readBrowserConsent, saveBrowserConsent } from '@/lib/privacy-consent';
import { GET, POST } from '@/app/api/privacy/consent/route';

describe('privacy choice endpoint', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('NEXT_PUBLIC_APP_URL', ''); vi.stubEnv('NEXTAUTH_URL', ''); vi.mocked(auth).mockResolvedValue({ user: { id: 'member-1' } } as never); });
  afterEach(() => vi.unstubAllEnvs());
  const request = (body: unknown, origin = 'http://localhost') => new Request('http://localhost/api/privacy/consent', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  it('rejects cross-origin changes and invalid choices before writing', async () => {
    expect((await POST(request({ analytics: true }, 'https://other.example'))).status).toBe(403);
    expect((await POST(request({ analytics: 'true' }))).status).toBe(400);
    expect((await POST(request({ analytics: true, userId: 'victim' }))).status).toBe(400);
    expect(saveBrowserConsent).not.toHaveBeenCalled();
  });
  it('uses authenticated identity, sets an HttpOnly same-site cookie and disables caching', async () => {
    const status = { analytics: false, decided: true as const, expiresAt: new Date(Date.now() + 1000).toISOString() };
    vi.mocked(saveBrowserConsent).mockResolvedValue({ token: 'synthetic-test-token', status });
    const response = await POST(request({ analytics: false }));
    expect(response.status).toBe(200);
    expect(saveBrowserConsent).toHaveBeenCalledWith('member-1', false);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')?.toLowerCase()).toContain('samesite=lax');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual(status);
  });
  it('reads the current choice without exposing the receipt', async () => {
    vi.mocked(readBrowserConsent).mockResolvedValue({ analytics: false, decided: false, expiresAt: null });
    expect(await (await GET()).json()).toEqual({ analytics: false, decided: false, expiresAt: null });
    expect(readBrowserConsent).toHaveBeenCalledWith('member-1');
  });
  it('reports save failures instead of claiming a completed withdrawal', async () => {
    vi.mocked(saveBrowserConsent).mockRejectedValue(new Error('unavailable'));
    expect((await POST(request({ analytics: false }))).status).toBe(503);
  });

  it('accepts only the configured public origin behind a proxy', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://public.example');
    vi.mocked(saveBrowserConsent).mockResolvedValue({ token: 'synthetic-test-token', status: { analytics: false, decided: true, expiresAt: new Date(Date.now() + 1000).toISOString() } });
    expect((await POST(request({ analytics: false }, 'https://public.example'))).status).toBe(200);
    expect((await POST(request({ analytics: false }, 'http://localhost'))).status).toBe(403);
    const forged = request({ analytics: false }, 'https://other.example');
    forged.headers.set('x-forwarded-host', 'other.example');
    expect((await POST(forged)).status).toBe(403);
  });
});
