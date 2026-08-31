// @vitest-environment jsdom

import { cleanup, render, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createProductExposureId, trackClientAnalyticsEvent } = vi.hoisted(() => ({
  createProductExposureId: vi.fn(),
  trackClientAnalyticsEvent: vi.fn(),
}));

vi.mock('@/components/analytics/analytics-client', () => ({
  createProductExposureId,
  trackClientAnalyticsEvent,
}));

import AnalyticsViewEvent from '@/components/analytics/AnalyticsViewEvent';

describe('AnalyticsViewEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createProductExposureId
      .mockReturnValueOnce('123e4567-e89b-42d3-a456-426614174000')
      .mockReturnValueOnce('123e4567-e89b-42d3-b456-426614174001');
  });

  afterEach(() => {
    cleanup();
  });

  it('does not create or deliver an exposure during server rendering', () => {
    renderToString(<AnalyticsViewEvent productType="course" productId="course-1" />);

    expect(createProductExposureId).not.toHaveBeenCalled();
    expect(trackClientAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('creates one random identity after commit and reuses it across rerenders', async () => {
    const view = render(<AnalyticsViewEvent productType="course" productId="course-1" />);

    await waitFor(() => expect(trackClientAnalyticsEvent).toHaveBeenCalledWith({
      eventName: 'course_viewed',
      courseId: 'course-1',
      placement: 'course_detail',
      exposureId: '123e4567-e89b-42d3-a456-426614174000',
    }));

    view.rerender(<AnalyticsViewEvent productType="course" productId="course-1" />);

    expect(createProductExposureId).toHaveBeenCalledTimes(1);
    expect(trackClientAnalyticsEvent).toHaveBeenCalledTimes(1);
  });
});
