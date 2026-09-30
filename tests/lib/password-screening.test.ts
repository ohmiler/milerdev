import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertPasswordNotCompromised } from '@/lib/password-screening';
const password = 'a unique synthetic passphrase';
const digest = createHash('sha1').update(password).digest('hex').toUpperCase();
const fetchMock = vi.fn();
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('Pwned Passwords range screening', () => {
  it('sends only the prefix with padding, never a password, full digest or identity', async () => {
    fetchMock.mockResolvedValue(new Response(`${digest.slice(5)}:0\r\n${'0'.repeat(35)}:27`));
    await expect(assertPasswordNotCompromised(password)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(`https://api.pwnedpasswords.com/range/${digest.slice(0, 5)}`, expect.objectContaining({
      headers: { 'Add-Padding': 'true', 'User-Agent': 'MilerDev-Password-Screening' },
      cache: 'no-store', redirect: 'error',
    }));
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(password);
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(digest);
  });
  it('rejects a breached suffix and ignores zero-count padding', async () => {
    fetchMock.mockResolvedValue(new Response(`${digest.slice(5).toLowerCase()}:3\r\n`));
    await expect(assertPasswordNotCompromised(password)).rejects.toMatchObject({ kind: 'compromised', status: 400 });
  });
  it('rejects common and service-specific whole passwords locally', async () => {
    for (const value of ['passwordpassword', 'MilerDevMilerDev']) {
      await expect(assertPasswordNotCompromised(value)).rejects.toMatchObject({ kind: 'compromised' });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['', '<html>Unavailable</html>', `${'A'.repeat(35)}:NaN`, `${'A'.repeat(35)}:1\nbad`])('fails closed for an invalid response', async (body) => {
    fetchMock.mockResolvedValue(new Response(body));
    await expect(assertPasswordNotCompromised(password)).rejects.toMatchObject({ kind: 'screening_unavailable', status: 503 });
  });
  it('does not expose upstream errors', async () => {
    fetchMock.mockRejectedValue(new Error(`upstream ${password} ${digest}`));
    await expect(assertPasswordNotCompromised(password)).rejects.toMatchObject({ kind: 'screening_unavailable' });
    try { await assertPasswordNotCompromised(password); } catch (error) {
      expect(String(error)).not.toContain(password);
      expect(String(error)).not.toContain(digest);
    }
  });
  it('times out without approving the password', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('Aborted')));
    }));
    const check = expect(assertPasswordNotCompromised(password)).rejects.toMatchObject({ status: 503 });
    await vi.advanceTimersByTimeAsync(5000);
    await check;
  });
});
