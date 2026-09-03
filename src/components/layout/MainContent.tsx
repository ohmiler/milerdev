import type { ComponentPropsWithoutRef } from 'react';

import { MAIN_CONTENT_ID } from '@/lib/navigation-model';

export default function MainContent(props: ComponentPropsWithoutRef<'main'>) {
  return <main {...props} id={MAIN_CONTENT_ID} tabIndex={-1} />;
}
