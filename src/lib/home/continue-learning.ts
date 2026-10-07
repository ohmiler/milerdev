import 'server-only';

import { auth } from '@/lib/auth';
import { logError } from '@/lib/error-handler';
import { getContinueLearning, type ContinueLearning } from '@/lib/learning/dashboard';

/**
 * What a signed-in member was last learning, for the bar above the Home hero. Visitors, members with
 * nothing in progress, and any read failure all get null: Home then renders as it does for visitors.
 */
export async function getHomeContinueLearning(): Promise<ContinueLearning | null> {
  try {
    const session = await auth();
    const memberId = session?.user?.id;
    if (!memberId) return null;
    return await getContinueLearning(memberId);
  } catch (error) {
    logError(error, { action: 'home.continue_learning.load_failed' });
    return null;
  }
}
