import type { ReactNode } from 'react';

import PublicPageHeader from '@/components/layout/PublicPageHeader';

interface PublicContentHeaderProps { title: string; lede: string; evidence: ReactNode }

export default function PublicContentHeader({ title, lede, evidence }: PublicContentHeaderProps) {
  return (
    <PublicPageHeader
      title={title}
      description={lede}
      evidence={evidence}
      variant="catalog"
    />
  );
}
