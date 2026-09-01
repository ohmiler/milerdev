// @vitest-environment jsdom

import { cleanup, render, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createAnalyticsExposureId, trackClientAnalyticsEvent } = vi.hoisted(() => ({
  createAnalyticsExposureId: vi.fn(),
  trackClientAnalyticsEvent: vi.fn(),
}));

vi.mock('@/components/analytics/analytics-client', () => ({
  createAnalyticsExposureId,
  trackClientAnalyticsEvent,
}));

import LearningWorkspaceAnalytics from '@/components/analytics/LearningWorkspaceAnalytics';

describe('LearningWorkspaceAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAnalyticsExposureId.mockReturnValue('123e4567-e89b-42d3-a456-426614174000');
  });

  afterEach(() => cleanup());

  it('does not create a workspace exposure during server rendering', () => {
    renderToString(<LearningWorkspaceAnalytics lessonId={'lesson-1'} enabled />);

    expect(createAnalyticsExposureId).not.toHaveBeenCalled();
    expect(trackClientAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('delivers one exposure after an enrolled workspace commits', async () => {
    const view = render(<LearningWorkspaceAnalytics lessonId={'lesson-1'} enabled />);

    await waitFor(() => expect(trackClientAnalyticsEvent).toHaveBeenCalledWith({
      eventName: 'learning_workspace_started',
      exposureId: '123e4567-e89b-42d3-a456-426614174000',
      lessonId: 'lesson-1',
      placement: 'learning_workspace',
    }));

    view.rerender(<LearningWorkspaceAnalytics lessonId={'lesson-1'} enabled />);
    expect(trackClientAnalyticsEvent).toHaveBeenCalledTimes(1);
  });

  it('does not deliver an exposure for a free preview without enrollment', async () => {
    render(<LearningWorkspaceAnalytics lessonId={'lesson-1'} enabled={false} />);

    await Promise.resolve();
    expect(createAnalyticsExposureId).not.toHaveBeenCalled();
    expect(trackClientAnalyticsEvent).not.toHaveBeenCalled();
  });
});
