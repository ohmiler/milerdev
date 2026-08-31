import { describe, expect, it } from 'vitest';

import {
  ANALYTICS_CONTROL_CACHE_MAX_AGE_MS,
  AnalyticsControlError,
  createAnalyticsControlService,
  type AnalyticsControlSnapshot,
  type AnalyticsControlStore,
  type AnalyticsControlWrite,
  type AnalyticsGovernanceDecisionInput,
} from '@/lib/analytics-control';

const auditContext = { ipAddress: '127.0.0.1', userAgent: 'vitest' };

const governanceDecision: AnalyticsGovernanceDecisionInput = {
  ownerRole: 'privacy_owner',
  purpose: 'Measure whether published product journeys help visitors make informed choices.',
  lawfulBasisOrConsent: 'Consent is required before optional collection.',
  collectionNotice: 'The privacy notice describes optional product analytics.',
  rawEventRetentionDays: 30,
  aggregateRetentionDays: 365,
  accessPolicy: 'Named product and privacy owners only.',
  deletionPolicy: 'Delete expired raw events without deleting business records.',
  withdrawalPolicy: 'Disable collection immediately and honor the published withdrawal path.',
  approvedEventClasses: ['product_interaction'],
};

class MemoryAnalyticsControlStore implements AnalyticsControlStore {
  snapshot: AnalyticsControlSnapshot = { operational: null, governance: null };
  reads = 0;
  writes: AnalyticsControlWrite[] = [];

  async read(): Promise<AnalyticsControlSnapshot> {
    this.reads += 1;
    return structuredClone(this.snapshot);
  }

  async write(input: AnalyticsControlWrite): Promise<void> {
    this.writes.push(structuredClone(input));
    const record = { value: input.value, updatedAt: input.now };
    if (input.key === 'analytics_enabled') this.snapshot.operational = record;
    else this.snapshot.governance = record;
  }
}

describe('analytics control service', () => {
  it('defaults to disabled and refreshes cached state within the declared bound', async () => {
    const store = new MemoryAnalyticsControlStore();
    let now = new Date('2026-08-31T00:00:00.000Z');
    const service = createAnalyticsControlService(store, { now: () => now });

    const first = await service.getState();
    await service.getState();

    expect(first).toMatchObject({
      operationalEnabled: false,
      effectiveEnabled: false,
      governanceApproved: false,
      cacheMaxAgeMs: ANALYTICS_CONTROL_CACHE_MAX_AGE_MS,
    });
    expect(store.reads).toBe(1);

    now = new Date(now.getTime() + ANALYTICS_CONTROL_CACHE_MAX_AGE_MS + 1);
    await service.getState();
    expect(store.reads).toBe(2);
  });

  it('rejects enabling before an owner records a complete governance decision', async () => {
    const store = new MemoryAnalyticsControlStore();
    const service = createAnalyticsControlService(store);

    await expect(service.setOperationalEnabled({
      enabled: true,
      actorId: 'admin-1',
      auditContext,
    })).rejects.toMatchObject({ code: 'GOVERNANCE_REQUIRED' });

    expect(store.writes).toHaveLength(0);
  });

  it('audits governance and switch changes, invalidates cache, and reads effective state back', async () => {
    const store = new MemoryAnalyticsControlStore();
    let now = new Date('2026-08-31T01:00:00.000Z');
    const service = createAnalyticsControlService(store, { now: () => now });

    const disabled = await service.getState();
    await service.recordGovernanceDecision({
      decision: governanceDecision,
      actorId: 'admin-1',
      auditContext,
    });
    now = new Date('2026-08-31T01:00:01.000Z');
    const enabled = await service.setOperationalEnabled({
      enabled: true,
      actorId: 'admin-1',
      auditContext,
    });

    expect(enabled).toMatchObject({
      operationalEnabled: true,
      governanceApproved: true,
      effectiveEnabled: true,
      effectiveEventClasses: ['product_interaction'],
    });
    expect(enabled.revision).not.toBe(disabled.revision);
    expect(store.writes).toEqual([
      expect.objectContaining({
        key: 'analytics_governance_decision',
        type: 'json',
        actorId: 'admin-1',
        auditContext,
      }),
      expect.objectContaining({
        key: 'analytics_enabled',
        value: 'true',
        type: 'boolean',
        actorId: 'admin-1',
        auditContext,
      }),
    ]);
    expect(store.reads).toBeGreaterThanOrEqual(4);

    now = new Date('2026-08-31T01:00:02.000Z');
    const stopped = await service.setOperationalEnabled({
      enabled: false,
      actorId: 'admin-1',
      auditContext,
    });
    expect(stopped).toMatchObject({ operationalEnabled: false, effectiveEnabled: false });
  });

  it('applies independent governance gates per event class', async () => {
    const store = new MemoryAnalyticsControlStore();
    const service = createAnalyticsControlService(store);

    await service.recordGovernanceDecision({
      decision: governanceDecision,
      actorId: 'admin-1',
      auditContext,
    });
    await service.setOperationalEnabled({ enabled: true, actorId: 'admin-1', auditContext });

    await expect(service.isEventEnabled('course_viewed')).resolves.toBe(true);
    await expect(service.isEventEnabled('purchase_completed')).resolves.toBe(false);
  });

  it('rejects incomplete or extensible governance records', async () => {
    const store = new MemoryAnalyticsControlStore();
    const service = createAnalyticsControlService(store);

    await expect(service.recordGovernanceDecision({
      decision: { ...governanceDecision, arbitraryApproval: true } as AnalyticsGovernanceDecisionInput,
      actorId: 'admin-1',
      auditContext,
    })).rejects.toBeInstanceOf(AnalyticsControlError);
    expect(store.writes).toHaveLength(0);
  });
});
