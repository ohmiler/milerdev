'use client';

import Link from 'next/link';
import type { ComponentProps, MouseEvent } from 'react';

import type { ClientAnalyticsEvent } from '@/lib/analytics-contract';
import { trackClientAnalyticsEvent } from '@/components/analytics/analytics-client';

type Props = ComponentProps<typeof Link> & {
  analyticsEvent: ClientAnalyticsEvent;
};

export default function TrackedAnalyticsLink({
  analyticsEvent,
  onClick,
  ...props
}: Props) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    trackClientAnalyticsEvent(analyticsEvent);
    onClick?.(event);
  };

  return <Link {...props} onClick={handleClick} />;
}
