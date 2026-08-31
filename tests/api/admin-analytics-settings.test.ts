import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-helpers', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ getClientIP: vi.fn().mockReturnValue('127.0.0.1') }));
vi.mock('@/lib/analytics-control', () => {
  class AnalyticsControlError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  }

  return {
    AnalyticsControlError,
    getAnalyticsControlState: vi.fn(),
    recordAnalyticsGovernanceDecision: vi.fn(),
    setAnalyticsOperationalEnabled: vi.fn(),
  };
});

import {
  AnalyticsControlError,
  recordAnalyticsGovernanceDecision,
  setAnalyticsOperationalEnabled,
} from '@/lib/analytics-control';
import { requireAdmin } from '@/lib/auth-helpers';

const effectiveState = {
  operationalEnabled: true,
  governanceApproved: true,
  effectiveEnabled: true,
  effectiveEventClasses: ['product_interaction'],
  governanceDecision: null,
  revision: 'revision-2',
  observedAt: '2026-08-31T00:00:00.000Z',
  cacheMaxAgeMs: 5_000,
};

function put(body: unknown) {
  return import('@/app/api/admin/settings/route').then(({ PUT }) => PUT(new Request(
    'http://localhost/api/admin/settings',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'user-agent': 'vitest' },
      body: JSON.stringify(body),
    },
  )));
}

describe('admin analytics settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      session: { user: { id: 'admin-1' } },
    } as never);
    vi.mocked(setAnalyticsOperationalEnabled).mockResolvedValue(effectiveState as never);
    vi.mocked(recordAnalyticsGovernanceDecision).mockResolvedValue(effectiveState as never);
  });

  it('updates the kill switch through the audited control boundary and returns read-back state', async () => {
    const response = await put({ key: 'analytics_enabled', value: 'true' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ analyticsControl: effectiveState });
    expect(setAnalyticsOperationalEnabled).toHaveBeenCalledWith({
      enabled: true,
      actorId: 'admin-1',
      auditContext: { ipAddress: '127.0.0.1', userAgent: 'vitest' },
    });
  });

  it('refuses enablement when the governance gate has not been recorded', async () => {
    vi.mocked(setAnalyticsOperationalEnabled).mockRejectedValue(
      new AnalyticsControlError('GOVERNANCE_REQUIRED' as never),
    );

    const response = await put({ key: 'analytics_enabled', value: true });

    expect(response.status).toBe(409);
    expect(recordAnalyticsGovernanceDecision).not.toHaveBeenCalled();
  });

  it('records a structured owner decision instead of accepting free-form JSON', async () => {
    const decision = {
      ownerRole: 'privacy_owner',
      purpose: 'Measure product journeys.',
      lawfulBasisOrConsent: 'Consent required.',
      collectionNotice: 'Privacy notice.',
      rawEventRetentionDays: 30,
      aggregateRetentionDays: 365,
      accessPolicy: 'Named owners only.',
      deletionPolicy: 'Delete raw analytics only.',
      withdrawalPolicy: 'Disable optional collection.',
      approvedEventClasses: ['product_interaction'],
    };

    const response = await put({ key: 'analytics_governance_decision', value: decision });

    expect(response.status).toBe(200);
    expect(recordAnalyticsGovernanceDecision).toHaveBeenCalledWith({
      decision,
      actorId: 'admin-1',
      auditContext: { ipAddress: '127.0.0.1', userAgent: 'vitest' },
    });
  });

  it('rejects non-canonical switch values before storage', async () => {
    const response = await put({ key: 'analytics_enabled', value: 'yes' });

    expect(response.status).toBe(400);
    expect(setAnalyticsOperationalEnabled).not.toHaveBeenCalled();
  });
});
