'use client';

import { useEffect } from 'react';

interface Props {
  slug: string;
}

export default function BlogViewTracker({ slug }: Props) {
  useEffect(() => {
    fetch(`/api/blog/${encodeURIComponent(slug)}/view`, { method: 'POST' }).catch(() => {});
  }, [slug]);

  return null;
}
