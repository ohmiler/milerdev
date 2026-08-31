'use client';

import { useEffect, useRef } from 'react';

import {
  createProductExposureId,
  trackClientAnalyticsEvent,
} from '@/components/analytics/analytics-client';
import type { ClientAnalyticsEvent } from '@/lib/analytics-contract';

type AnalyticsViewEventProps = {
  productType: 'course' | 'bundle';
  productId: string;
};

export default function AnalyticsViewEvent({
  productType,
  productId,
}: AnalyticsViewEventProps) {
  const exposureRef = useRef<{ key: string; id: string } | null>(null);
  const deliveredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${productType}:${productId}`;
    if (deliveredKeyRef.current === key) return;

    if (exposureRef.current?.key !== key) {
      exposureRef.current = { key, id: createProductExposureId() };
    }

    const event: ClientAnalyticsEvent = productType === 'course'
      ? {
          eventName: 'course_viewed',
          exposureId: exposureRef.current.id,
          courseId: productId,
          placement: 'course_detail',
        }
      : {
          eventName: 'bundle_viewed',
          exposureId: exposureRef.current.id,
          bundleId: productId,
          placement: 'bundle_detail',
        };

    deliveredKeyRef.current = key;
    trackClientAnalyticsEvent(event);
  }, [productId, productType]);

  return null;
}
