import { describe, expect, it } from 'vitest';

import {
  createAnalyticsControlService,
  type AnalyticsControlSnapshot,
  type AnalyticsControlStore,
  type AnalyticsControlWrite,
  type AnalyticsGovernanceDecisionInput,
} from '@/lib/analytics-control';

class RevisionStore implements AnalyticsControlStore {
  snapshot: AnalyticsControlSnapshot = { operational: null, governance: null };

  async read() {
    return structuredClone(this.snapshot);
  }

  async write(input: AnalyticsControlWrite) {
    const record = { value: input.value, updatedAt: input.now };
    if (input.key === 'analytics_enabled') this.snapshot.operational = record;
    else this.snapshot.governance = record;
  }
}

function decision(purpose: string): AnalyticsGovernanceDecisionInput {
  return {
    ownerRole: 'privacy_owner',
    purpose,
    lawfulBasisOrConsent: 'Consent required.',
    collectionNotice: 'Privacy notice.',
    rawEventRetentionDays: 30,
    aggregateRetentionDays: 365,
    accessPolicy: 'Named owners only.',
    deletionPolicy: 'Delete expired raw analytics only.',
    withdrawalPolicy: 'Disable optional collection.',
    approvedEventClasses: ['product_interaction'],
  };
}

describe('analytics control revision', () => {
  it('changes when policy content changes at the same timestamp', async () => {
    const store = new RevisionStore();
    const fixedNow = new Date('2026-08-31T00:00:00.000Z');
    const service = createAnalyticsControlService(store, { now: () => fixedNow });
    const requestContext = {
      actorId: 'admin-1',
      auditContext: { ipAddress: null, userAgent: 'vitest' },
    };

    const first = await service.recordGovernanceDecision({
      decision: decision('Measure product discovery.'),
      ...requestContext,
    });
    const second = await service.recordGovernanceDecision({
      decision: decision('Measure checkout readiness.'),
      ...requestContext,
    });

    expect(second.revision).not.toBe(first.revision);
  });
});
