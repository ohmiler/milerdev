// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useReportWebVitals } = vi.hoisted(() => ({
  useReportWebVitals: vi.fn(),
}));

vi.mock('next/web-vitals', () => ({ useReportWebVitals }));

import WebVitalsReporter from '@/components/analytics/WebVitalsReporter';
import {
  initializeWebVitalsPageLoadContext,
  normalizeWebVitalRouteFamily,
  reportWebVitalMetric,
} from '@/components/analytics/web-vitals-client';

describe('WebVitalsReporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/courses/typescript/learn/lesson-1');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });
    initializeWebVitalsPageLoadContext('release-1');
  });

  afterEach(() => cleanup());

  it('keeps the Next.js callback stable across renders', () => {
    const view = render(<WebVitalsReporter releaseIdentity={'release-1'} />);
    view.rerender(<WebVitalsReporter releaseIdentity={'release-1'} />);

    expect(useReportWebVitals).toHaveBeenCalledTimes(2);
    expect(useReportWebVitals.mock.calls[0][0]).toBe(useReportWebVitals.mock.calls[1][0]);
  });

  it('sends only a coarse privacy-minimized Core Web Vital payload', async () => {
    reportWebVitalMetric({
      id: 'v4-1720000000000-123456789',
      name: 'LCP',
      value: 1_900,
      rating: 'good',
    });

    expect(navigator.sendBeacon).toHaveBeenCalledOnce();
    const [endpoint, body] = vi.mocked(navigator.sendBeacon).mock.calls[0];
    expect(endpoint).toBe('/api/analytics/web-vitals');
    const payload = await (body as Blob).text();
    expect(JSON.parse(payload)).toEqual({
      pageLoadId: 'v4-1720000000000-123456789',
      metricName: 'LCP',
      routeFamily: 'learning',
      deviceClass: 'mobile',
      releaseIdentity: 'release-1',
      value: 1_900,
      rating: 'good',
    });
    expect(payload).not.toContain('/courses/typescript');
  });

  it('keeps page-load dimensions stable across callback updates', async () => {
    const metric = {
      id: 'v4-1720000000000-stable-context',
      name: 'CLS',
      value: 0.08,
      rating: 'good',
    };

    reportWebVitalMetric(metric);
    window.history.replaceState({}, '', '/blog/privacy-update');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1_024 });
    reportWebVitalMetric({ ...metric, value: 0.12, rating: 'needs-improvement' });

    const calls = vi.mocked(navigator.sendBeacon).mock.calls;
    const firstPayload = JSON.parse(await (calls[0][1] as Blob).text());
    const updatedPayload = JSON.parse(await (calls[1][1] as Blob).text());

    expect(firstPayload).toMatchObject({ routeFamily: 'learning', deviceClass: 'mobile' });
    expect(updatedPayload).toMatchObject({ routeFamily: 'learning', deviceClass: 'mobile' });
  });

  it('ignores non-Core metrics and normalizes dynamic routes without retaining the path', () => {
    reportWebVitalMetric({
      id: 'v4-1720000000000-123456789',
      name: 'FCP',
      value: 100,
      rating: 'good',
    });

    expect(navigator.sendBeacon).not.toHaveBeenCalled();
    expect(normalizeWebVitalRouteFamily('/courses/typescript/learn/lesson-1')).toBe('learning');
    expect(normalizeWebVitalRouteFamily('/bundles/frontend/payment-success')).toBe('purchase');
    expect(normalizeWebVitalRouteFamily('/admin/users')).toBeNull();
  });
});
