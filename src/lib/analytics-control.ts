import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import {
  CLIENT_ANALYTICS_EVENT_NAMES,
  SERVER_ANALYTICS_EVENT_NAMES,
  type ClientAnalyticsEvent,
  type ServerAnalyticsEventName,
} from '@/lib/analytics-contract';
import { db } from '@/lib/db';
import { auditLogs, settings } from '@/lib/db/schema';

export const ANALYTICS_CONTROL_CACHE_MAX_AGE_MS = 5_000;

export const ANALYTICS_EVENT_CLASSES = [
  'product_interaction',
  'account_lifecycle',
  'commerce',
  'enrollment',
] as const;

export type AnalyticsEventClass = typeof ANALYTICS_EVENT_CLASSES[number];
type AnalyticsEventName = ClientAnalyticsEvent['eventName'] | ServerAnalyticsEventName;

const ANALYTICS_ENABLED_KEY = 'analytics_enabled' as const;
const ANALYTICS_GOVERNANCE_KEY = 'analytics_governance_decision' as const;
const ANALYTICS_CONTROL_KEYS = [ANALYTICS_ENABLED_KEY, ANALYTICS_GOVERNANCE_KEY] as const;

const policyText = z.string().trim().min(1).max(1_000);
const analyticsActorIdSchema = z.string().trim().min(1).max(36);

export const analyticsGovernanceDecisionInputSchema = z.object({
  ownerRole: z.enum(['product_owner', 'privacy_owner']),
  purpose: policyText,
  lawfulBasisOrConsent: policyText,
  collectionNotice: policyText,
  rawEventRetentionDays: z.number().int().min(1).max(3_650),
  aggregateRetentionDays: z.number().int().min(1).max(3_650),
  accessPolicy: policyText,
  deletionPolicy: policyText,
  withdrawalPolicy: policyText,
  approvedEventClasses: z.array(z.enum(ANALYTICS_EVENT_CLASSES)).min(1).max(ANALYTICS_EVENT_CLASSES.length)
    .refine((values) => new Set(values).size === values.length, 'Event classes must be unique'),
}).strict();

const storedGovernanceDecisionSchema = analyticsGovernanceDecisionInputSchema.extend({
  version: z.literal(1),
  status: z.literal('approved'),
  decidedBy: analyticsActorIdSchema,
  decidedAt: z.string().datetime(),
}).strict();

export type AnalyticsGovernanceDecisionInput = z.infer<typeof analyticsGovernanceDecisionInputSchema>;
export type AnalyticsGovernanceDecision = z.infer<typeof storedGovernanceDecisionSchema>;

const eventClassByName: Record<AnalyticsEventName, AnalyticsEventClass> = {
  home_primary_cta_clicked: 'product_interaction',
  course_viewed: 'product_interaction',
  bundle_viewed: 'product_interaction',
  checkout_opened: 'product_interaction',
  registration_completed: 'account_lifecycle',
  payment_initiated: 'commerce',
  purchase_completed: 'commerce',
  free_enrollment_completed: 'enrollment',
};

for (const eventName of [...CLIENT_ANALYTICS_EVENT_NAMES, ...SERVER_ANALYTICS_EVENT_NAMES]) {
  if (!eventClassByName[eventName]) throw new Error(`Missing analytics event class for ${eventName}`);
}

export interface AnalyticsControlRecord {
  value: string | null;
  updatedAt: Date | null;
}

export interface AnalyticsControlSnapshot {
  operational: AnalyticsControlRecord | null;
  governance: AnalyticsControlRecord | null;
}

export interface AnalyticsAuditContext {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AnalyticsControlWrite {
  key: typeof ANALYTICS_ENABLED_KEY | typeof ANALYTICS_GOVERNANCE_KEY;
  value: string;
  type: 'boolean' | 'json';
  description: string;
  actorId: string;
  auditContext: AnalyticsAuditContext;
  now: Date;
}

export interface AnalyticsControlStore {
  read(): Promise<AnalyticsControlSnapshot>;
  write(input: AnalyticsControlWrite): Promise<void>;
}

export interface AnalyticsControlState {
  operationalEnabled: boolean;
  governanceApproved: boolean;
  effectiveEnabled: boolean;
  effectiveEventClasses: AnalyticsEventClass[];
  governanceDecision: AnalyticsGovernanceDecision | null;
  revision: string;
  observedAt: string;
  cacheMaxAgeMs: number;
}

type AnalyticsControlErrorCode =
  | 'INVALID_GOVERNANCE_DECISION'
  | 'GOVERNANCE_REQUIRED'
  | 'READBACK_FAILED';

export class AnalyticsControlError extends Error {
  constructor(public readonly code: AnalyticsControlErrorCode) {
    super(code);
    this.name = 'AnalyticsControlError';
  }
}

function parseStoredDecision(record: AnalyticsControlRecord | null): AnalyticsGovernanceDecision | null {
  if (!record?.value) return null;

  try {
    const parsedJson: unknown = JSON.parse(record.value);
    const parsed = storedGovernanceDecisionSchema.safeParse(parsedJson);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function fingerprint(value: string | null | undefined): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < (value?.length ?? 0); index += 1) {
    hash ^= value?.charCodeAt(index) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function createState(snapshot: AnalyticsControlSnapshot, observedAt: Date): AnalyticsControlState {
  const operationalEnabled = snapshot.operational?.value?.trim().toLowerCase() === 'true';
  const governanceDecision = parseStoredDecision(snapshot.governance);
  const effectiveEventClasses = operationalEnabled && governanceDecision
    ? [...governanceDecision.approvedEventClasses]
    : [];
  const operationalVersion = snapshot.operational?.updatedAt?.toISOString() ?? 'missing';
  const governanceVersion = snapshot.governance?.updatedAt?.toISOString() ?? 'missing';
  const governanceFingerprint = fingerprint(snapshot.governance?.value);

  return {
    operationalEnabled,
    governanceApproved: Boolean(governanceDecision),
    effectiveEnabled: effectiveEventClasses.length > 0,
    effectiveEventClasses,
    governanceDecision,
    revision: `operational:${operationalVersion}:${operationalEnabled};governance:${governanceVersion}:${governanceFingerprint}`,
    observedAt: observedAt.toISOString(),
    cacheMaxAgeMs: ANALYTICS_CONTROL_CACHE_MAX_AGE_MS,
  };
}

function assertActorId(actorId: string): void {
  if (!analyticsActorIdSchema.safeParse(actorId).success) {
    throw new AnalyticsControlError('READBACK_FAILED');
  }
}

export function createAnalyticsControlService(
  store: AnalyticsControlStore,
  options: { now?: () => Date } = {},
) {
  const now = options.now ?? (() => new Date());
  let cache: { state: AnalyticsControlState; expiresAt: number } | null = null;

  async function getState(readOptions: { fresh?: boolean } = {}): Promise<AnalyticsControlState> {
    const observedAt = now();
    if (!readOptions.fresh && cache && cache.expiresAt > observedAt.getTime()) {
      return cache.state;
    }

    const state = createState(await store.read(), observedAt);
    cache = {
      state,
      expiresAt: observedAt.getTime() + ANALYTICS_CONTROL_CACHE_MAX_AGE_MS,
    };
    return state;
  }

  function invalidate(): void {
    cache = null;
  }

  async function recordGovernanceDecision(input: {
    decision: AnalyticsGovernanceDecisionInput;
    actorId: string;
    auditContext: AnalyticsAuditContext;
  }): Promise<AnalyticsControlState> {
    assertActorId(input.actorId);
    const decision = analyticsGovernanceDecisionInputSchema.safeParse(input.decision);
    if (!decision.success) throw new AnalyticsControlError('INVALID_GOVERNANCE_DECISION');

    const changedAt = now();
    const storedDecision: AnalyticsGovernanceDecision = {
      ...decision.data,
      version: 1,
      status: 'approved',
      decidedBy: input.actorId,
      decidedAt: changedAt.toISOString(),
    };
    await store.write({
      key: ANALYTICS_GOVERNANCE_KEY,
      value: JSON.stringify(storedDecision),
      type: 'json',
      description: 'Approved analytics data-governance decision',
      actorId: input.actorId,
      auditContext: input.auditContext,
      now: changedAt,
    });
    invalidate();

    const readBack = await getState({ fresh: true });
    if (readBack.governanceDecision?.decidedAt !== storedDecision.decidedAt) {
      throw new AnalyticsControlError('READBACK_FAILED');
    }
    return readBack;
  }

  async function setOperationalEnabled(input: {
    enabled: boolean;
    actorId: string;
    auditContext: AnalyticsAuditContext;
  }): Promise<AnalyticsControlState> {
    assertActorId(input.actorId);
    if (input.enabled && !(await getState({ fresh: true })).governanceApproved) {
      throw new AnalyticsControlError('GOVERNANCE_REQUIRED');
    }

    const changedAt = now();
    await store.write({
      key: ANALYTICS_ENABLED_KEY,
      value: String(input.enabled),
      type: 'boolean',
      description: 'Global optional analytics kill switch',
      actorId: input.actorId,
      auditContext: input.auditContext,
      now: changedAt,
    });
    invalidate();

    const readBack = await getState({ fresh: true });
    if (
      readBack.operationalEnabled !== input.enabled
      || (input.enabled && !readBack.effectiveEnabled)
    ) {
      throw new AnalyticsControlError('READBACK_FAILED');
    }
    return readBack;
  }

  async function isEventEnabled(eventName: AnalyticsEventName): Promise<boolean> {
    const state = await getState();
    return state.operationalEnabled
      && state.effectiveEventClasses.includes(eventClassByName[eventName]);
  }

  return { getState, invalidate, isEventEnabled, recordGovernanceDecision, setOperationalEnabled };
}

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function writeSettingWithAudit(tx: DatabaseTransaction, input: AnalyticsControlWrite) {
  const [existing] = await tx
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, input.key))
    .limit(1)
    .for('update');

  if (existing) {
    await tx.update(settings).set({
      value: input.value,
      type: input.type,
      description: input.description,
      updatedAt: input.now,
      updatedBy: input.actorId,
    }).where(eq(settings.key, input.key));
  } else {
    await tx.insert(settings).values({
      key: input.key,
      value: input.value,
      type: input.type,
      description: input.description,
      updatedAt: input.now,
      updatedBy: input.actorId,
    });
  }

  await tx.insert(auditLogs).values({
    userId: input.actorId,
    action: existing ? 'update' : 'create',
    entityType: 'setting',
    entityId: input.key,
    oldValue: existing?.value ?? null,
    newValue: input.value,
    ipAddress: input.auditContext.ipAddress,
    userAgent: input.auditContext.userAgent,
    createdAt: input.now,
  });
}

const drizzleAnalyticsControlStore: AnalyticsControlStore = {
  async read() {
    const rows = await db
      .select({ key: settings.key, value: settings.value, updatedAt: settings.updatedAt })
      .from(settings)
      .where(inArray(settings.key, [...ANALYTICS_CONTROL_KEYS]));
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return {
      operational: byKey.get(ANALYTICS_ENABLED_KEY) ?? null,
      governance: byKey.get(ANALYTICS_GOVERNANCE_KEY) ?? null,
    };
  },
  write(input) {
    return db.transaction((tx) => writeSettingWithAudit(tx, input));
  },
};

export const analyticsControl = createAnalyticsControlService(drizzleAnalyticsControlStore);

export function getAnalyticsControlState(options?: { fresh?: boolean }) {
  return analyticsControl.getState(options);
}

export function isAnalyticsEventEnabled(eventName: AnalyticsEventName) {
  return analyticsControl.isEventEnabled(eventName);
}

export function recordAnalyticsGovernanceDecision(input: {
  decision: AnalyticsGovernanceDecisionInput;
  actorId: string;
  auditContext: AnalyticsAuditContext;
}) {
  return analyticsControl.recordGovernanceDecision(input);
}

export function setAnalyticsOperationalEnabled(input: {
  enabled: boolean;
  actorId: string;
  auditContext: AnalyticsAuditContext;
}) {
  return analyticsControl.setOperationalEnabled(input);
}

export function resetAnalyticsControlCache(): void {
  analyticsControl.invalidate();
}
