'use client';

import { useEffect, useRef } from 'react';

import {
  createAnalyticsExposureId,
  trackClientAnalyticsEvent,
} from '@/components/analytics/analytics-client';

export default function LearningWorkspaceAnalytics({
  lessonId,
  enabled,
}: {
  lessonId: string;
  enabled: boolean;
}) {
  const exposureRef = useRef<{ lessonId: string; exposureId: string } | null>(null);
  const deliveredLessonRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || deliveredLessonRef.current === lessonId) return;
    if (exposureRef.current?.lessonId !== lessonId) {
      exposureRef.current = { lessonId, exposureId: createAnalyticsExposureId() };
    }

    deliveredLessonRef.current = lessonId;
    trackClientAnalyticsEvent({
      eventName: 'learning_workspace_started',
      exposureId: exposureRef.current.exposureId,
      lessonId,
      placement: 'learning_workspace',
    });
  }, [enabled, lessonId]);

  return null;
}
