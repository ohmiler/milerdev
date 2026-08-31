// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { createProductExposureId, trackClientAnalyticsEvent } = vi.hoisted(() => ({
  createProductExposureId: vi.fn(() => '123e4567-e89b-42d3-a456-426614174000'),
  trackClientAnalyticsEvent: vi.fn(),
}));

vi.mock('@/components/analytics/analytics-client', () => ({
  createProductExposureId,
  trackClientAnalyticsEvent,
}));

import AnalyticsViewEvent, {
  useProductExposureId,
} from '@/components/analytics/AnalyticsViewEvent';

function AttributionConsumer() {
  const exposureId = useProductExposureId();
  return <output>{exposureId ?? 'unattributed'}</output>;
}

describe('product exposure attribution context', () => {
  it('shares the same post-commit exposure identity with checkout consumers', async () => {
    render(
      <AnalyticsViewEvent productType="course" productId="course-1">
        <AttributionConsumer />
      </AnalyticsViewEvent>,
    );

    await waitFor(() => {
      expect(screen.getByText('123e4567-e89b-42d3-a456-426614174000')).toBeTruthy();
    });
    expect(trackClientAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({
      exposureId: '123e4567-e89b-42d3-a456-426614174000',
      courseId: 'course-1',
    }));
  });
});
