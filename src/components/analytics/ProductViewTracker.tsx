'use client';

import { useEffect, useRef } from 'react';
import { trackClientAnalyticsEvent } from '@/lib/analytics-client';

interface ProductViewTrackerProps {
  itemType: 'course' | 'bundle';
  courseId?: string;
  bundleId?: string;
}

export default function ProductViewTracker({ itemType, courseId, bundleId }: ProductViewTrackerProps) {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (hasTrackedRef.current) {
      return;
    }

    hasTrackedRef.current = true;

    trackClientAnalyticsEvent({
      eventName: 'course_view',
      courseId,
      bundleId,
      metadata: {
        itemType,
      },
    });
  }, [itemType, courseId, bundleId]);

  return null;
}
