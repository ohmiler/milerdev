import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

/**
 * Admin check for admin server pages and the admin layout.
 *
 * A layout does not gate its route segments: the router renders the page segment on its own,
 * and a layout's redirect does not stop the page from rendering into the RSC payload. Every
 * admin server page must therefore call this itself, before it reads any data. `cache` lets
 * the layout and the page share one session lookup per request.
 */
export const requireAdminPage = cache(async () => {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== 'admin') {
    redirect('/login?error=unauthorized');
  }

  return session.user;
});
