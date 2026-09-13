'use client';

import { useSyncExternalStore } from 'react';
import { UNKNOWN_CONSENT, type ConsentStatus } from '@/lib/privacy-consent-contract';

let state: ConsentStatus = UNKNOWN_CONSENT;
let revision = 0;
let initialReadComplete = false;
let pageVitalsEligible = false;
let saving = false;
let suspended = false;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => state;

export function setConsentState(value: ConsentStatus) {
  state = value;
  listeners.forEach((listener) => listener());
}

export function canSendAnalytics() {
  return state.decided && state.analytics && !!state.expiresAt && Date.parse(state.expiresAt) > Date.now();
}

export function canSendPageVitals() {
  return pageVitalsEligible && canSendAnalytics();
}

export function useConsentStatus() {
  return useSyncExternalStore(subscribe, snapshot, () => UNKNOWN_CONSENT);
}

export function suspendConsent() {
  ++revision;
  suspended = true;
  setConsentState(UNKNOWN_CONSENT);
}

export async function refreshConsent(reset = false) {
  // Identity changes and cross-tab changes invalidate even an in-flight save.
  if (reset) {
    ++revision;
    setConsentState(UNKNOWN_CONSENT);
  }
  if (saving) return;
  if (reset) suspended = false;
  if (suspended) return;
  const current = ++revision;
  if (reset) setConsentState(UNKNOWN_CONSENT);
  try {
    const response = await fetch('/api/privacy/consent', { cache: 'no-store' });
    if (!response.ok) { if (current === revision) setConsentState(UNKNOWN_CONSENT); return; }
    const value = await response.json() as ConsentStatus;
    if (current === revision && typeof value.analytics === 'boolean' && typeof value.decided === 'boolean'
      && (value.expiresAt === null || typeof value.expiresAt === 'string')) {
      if (!initialReadComplete) {
        initialReadComplete = true;
        pageVitalsEligible = value.analytics;
      }
      setConsentState(value);
    }
  } catch { if (current === revision) setConsentState(UNKNOWN_CONSENT); }
}

export async function saveConsent(analytics: boolean) {
  if (saving) throw new Error('consent_save_pending');
  const current = ++revision;
  saving = true;
  suspended = true;
  initialReadComplete = true;
  pageVitalsEligible = false; // This page started before this grant; no buffered pre-consent metrics.
  setConsentState(UNKNOWN_CONSENT);
  try {
    const response = await fetch('/api/privacy/consent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analytics }),
    });
    if (!response.ok) throw new Error('consent_save_failed');
    const value = await response.json() as ConsentStatus;
    if (current !== revision) throw new Error('consent_save_superseded');
    suspended = false;
    setConsentState(value);
  } finally { saving = false; }
}

export function openConsentSettings() {
  window.dispatchEvent(new Event('milerdev:consent-settings'));
}
