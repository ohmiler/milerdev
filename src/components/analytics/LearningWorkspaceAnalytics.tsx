'use client';

import { useEffect, useRef } from 'react';
import { useConsentStatus, canSendAnalytics } from '@/components/privacy/consent-client';

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
  const consent = useConsentStatus();
  const exposureRef = useRef<{ lessonId: string; exposureId: string } | null>(null);
  const deliveredLessonRef = useRef<string | null>(null);

  useEffect(() => {
    if (!canSendAnalytics()) { exposureRef.current = null; deliveredLessonRef.current = null; return; }
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
  }, [enabled, lessonId, consent]);

  return null;
}
