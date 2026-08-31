import type { Page } from '@playwright/test';

export type RequiredE2EProvider =
  | 'stripe'
  | 'slipok'
  | 'bunny'
  | 'google'
  | 'resend'
  | 'smtp';

export type RequiredE2ERequestDecision = 'allow' | 'mock-provider' | 'block';

export type RequiredE2ENetworkObservations = {
  providerRequests: string[];
  blockedRequests: string[];
};

export function requiredE2EProviderForUrl(
  requestUrl: string,
): RequiredE2EProvider | null;

export function classifyRequiredE2ERequest(
  requestUrl: string,
  appBaseUrl: string,
): RequiredE2ERequestDecision;

export function installRequiredE2EProviderMocks(
  page: Page,
  appBaseUrl: string,
): Promise<RequiredE2ENetworkObservations>;

export function installRequiredE2EServerProviderMocks(): void;
