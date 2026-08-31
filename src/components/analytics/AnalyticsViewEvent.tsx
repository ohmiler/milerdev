'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  createProductExposureId,
  trackClientAnalyticsEvent,
} from '@/components/analytics/analytics-client';
import type { ClientAnalyticsEvent } from '@/lib/analytics-contract';

const ProductExposureContext = createContext<string | null>(null);

type AnalyticsViewEventProps = {
  productType: 'course' | 'bundle';
  productId: string;
  children?: ReactNode;
};

export function useProductExposureId(): string | null {
  return useContext(ProductExposureContext);
}

export default function AnalyticsViewEvent({
  productType,
  productId,
  children,
}: AnalyticsViewEventProps) {
  const exposureRef = useRef<{ key: string; id: string } | null>(null);
  const deliveredKeyRef = useRef<string | null>(null);
  const [attribution, setAttribution] = useState<{ key: string; id: string } | null>(null);
  const key = `${productType}:${productId}`;

  useEffect(() => {
    if (deliveredKeyRef.current === key) return;

    if (exposureRef.current?.key !== key) {
      exposureRef.current = { key, id: createProductExposureId() };
    }

    const exposureId = exposureRef.current.id;
    const event: ClientAnalyticsEvent = productType === 'course'
      ? {
          eventName: 'course_viewed',
          exposureId,
          courseId: productId,
          placement: 'course_detail',
        }
      : {
          eventName: 'bundle_viewed',
          exposureId,
          bundleId: productId,
          placement: 'bundle_detail',
        };

    deliveredKeyRef.current = key;
    setAttribution({ key, id: exposureId });
    trackClientAnalyticsEvent(event);
  }, [key, productId, productType]);

  const attributedExposureId = attribution?.key === key ? attribution.id : null;
  return (
    <ProductExposureContext.Provider value={attributedExposureId}>
      {children}
    </ProductExposureContext.Provider>
  );
}
