import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { createAuthReturnHref } from '@/lib/safe-auth-return';

export type MemberAccess = Readonly<{
  id: string;
  name: string | null;
}>;

export const requireMember = cache(async (returnPath: string): Promise<MemberAccess> => {
  const session = await auth();
  const memberId = session?.user?.id;

  if (!memberId) {
    redirect(createAuthReturnHref('/login', returnPath));
  }

  return {
    id: memberId,
    name: session.user.name?.trim() || null,
  };
});
