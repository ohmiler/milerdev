'use client';

import type {
  WebVitalDeviceClass,
  WebVitalName,
  WebVitalRating,
  WebVitalRouteFamily,
} from '@/lib/web-vitals-contract';

const CORE_WEB_VITAL_NAMES = new Set<string>(['LCP', 'INP', 'CLS']);

export type BrowserWebVitalMetric = {
  id: string;
  name: string;
  value: number;
  rating: string;
};

export function normalizeWebVitalRouteFamily(
  pathname: string,
): WebVitalRouteFamily | null {
  const segments = pathname.split('/').filter(Boolean);
  const [first, second, third] = segments;

  if (first === 'admin') return null;
  if (!first) return 'home';
  if (first === 'courses') {
    if (!second) return 'catalog';
    if (third === 'learn') return 'learning';
    if (third === 'payment-success') return 'purchase';
    return 'product_detail';
  }
  if (first === 'bundles') {
    if (!second) return 'catalog';
    if (third === 'payment-success') return 'purchase';
    return 'product_detail';
  }
  if (['login', 'register', 'forgot-password', 'reset-password'].includes(first)) {
    return 'authentication';
  }
  if (['dashboard', 'profile', 'settings'].includes(first)) return 'account';
  if (first === 'certificate') return 'certificate';
  if (['blog', 'announcements'].includes(first)) return 'content';
  if (['about', 'contact', 'faq', 'privacy', 'terms'].includes(first)) return 'legal_support';
  return 'other';
}

function getDeviceClass(): WebVitalDeviceClass {
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}

export function reportWebVitalMetric(metric: BrowserWebVitalMetric): void {
  if (
    typeof window === 'undefined'
    || !CORE_WEB_VITAL_NAMES.has(metric.name)
    || !Number.isFinite(metric.value)
  ) return;

  const routeFamily = normalizeWebVitalRouteFamily(window.location.pathname);
  if (!routeFamily) return;

  const body = JSON.stringify({
    pageLoadId: metric.id,
    metricName: metric.name as WebVitalName,
    routeFamily,
    deviceClass: getDeviceClass(),
    value: metric.value,
    rating: metric.rating as WebVitalRating,
  });
  if (
    typeof navigator.sendBeacon === 'function'
    && navigator.sendBeacon(
      '/api/analytics/web-vitals',
      new Blob([body], { type: 'application/json' }),
    )
  ) return;

  void fetch('/api/analytics/web-vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
