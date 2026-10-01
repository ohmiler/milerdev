import type * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { getTagHue } from '@/lib/content/tag-hue';

type TagBadgeProps = Omit<React.ComponentProps<typeof Badge>, 'variant'> & {
  tag: { slug: string; name: string };
};

export default function TagBadge({ tag, children, ...props }: TagBadgeProps) {
  const hue = getTagHue(tag);

  return (
    <Badge variant={hue === 'neutral' ? 'secondary' : hue} data-tag-hue={hue} {...props}>
      {children ?? tag.name}
    </Badge>
  );
}
