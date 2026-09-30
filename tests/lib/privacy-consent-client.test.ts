// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setConsentState, saveConsent, refreshConsent, suspendConsent } from '@/components/privacy/consent-client';
import { trackClientAnalyticsEvent } from '@/components/analytics/analytics-client';
import { UNKNOWN_CONSENT } from '@/lib/privacy-consent-contract';

describe('optional browser collection', () => {
  afterEach(() => { setConsentState(UNKNOWN_CONSENT); vi.unstubAllGlobals(); });
  const event = { eventName: 'checkout_opened' as const, courseId: 'course-1', placement: 'course_detail' as const };

  it('does not send before choosing, after refusal or after expiry; never queues old events', () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    vi.stubGlobal('fetch', vi.fn());
    for (const state of [UNKNOWN_CONSENT, { decided: true, analytics: false, expiresAt: new Date(Date.now() + 1000).toISOString() }, { decided: true, analytics: true, expiresAt: new Date(0).toISOString() }]) {
      setConsentState(state); trackClientAnalyticsEvent(event);
    }
    expect(beacon).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    setConsentState({ decided: true, analytics: true, expiresAt: new Date(Date.now() + 60_000).toISOString() });
    expect(beacon).not.toHaveBeenCalled();
    trackClientAnalyticsEvent(event);
    expect(beacon).toHaveBeenCalledOnce();
  });

  it('stops locally during a withdrawal even when saving fails', async () => {
    setConsentState({ decided: true, analytics: true, expiresAt: new Date(Date.now() + 60_000).toISOString() });
    const beacon = vi.fn();
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(saveConsent(false)).rejects.toThrow();
    trackClientAnalyticsEvent(event);
    expect(beacon).not.toHaveBeenCalled();
  });

  it('does not let an old refresh response override a newer refusal', async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done; }))
      .mockResolvedValueOnce(Response.json({ decided: true, analytics: false, expiresAt: new Date(Date.now() + 1000).toISOString() })));
    const refresh = refreshConsent(true);
    await saveConsent(false);
    resolve(Response.json({ decided: true, analytics: true, expiresAt: new Date(Date.now() + 1000).toISOString() }));
    await refresh;
    const beacon = vi.fn(); vi.stubGlobal('navigator', { sendBeacon: beacon });
    trackClientAnalyticsEvent(event);
    expect(beacon).not.toHaveBeenCalled();
  });

  it.each(['identity', 'other-tab'])('does not restore an obsolete grant when %s changes during a save', async (change) => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((done) => { resolve = done; })));
    const beacon = vi.fn();
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    const saving = saveConsent(true);
    const rejected = expect(saving).rejects.toThrow('consent_save_superseded');
    if (change === 'identity') await refreshConsent(true);
    else suspendConsent();
    resolve(Response.json({ decided: true, analytics: true, expiresAt: new Date(Date.now() + 60_000).toISOString() }));
    await rejected;
    trackClientAnalyticsEvent(event);
    expect(beacon).not.toHaveBeenCalled();
  });
});
