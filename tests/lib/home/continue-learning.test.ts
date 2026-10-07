import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getContinueLearning: vi.fn(), logError: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/learning/dashboard', () => ({ getContinueLearning: mocks.getContinueLearning }));
vi.mock('@/lib/error-handler', () => ({ logError: mocks.logError }));

import { getHomeContinueLearning } from '@/lib/home/continue-learning';

describe('Home continue bar data', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('reads nothing for a visitor', async () => {
    mocks.auth.mockResolvedValue(null);

    expect(await getHomeContinueLearning()).toBeNull();
    expect(mocks.getContinueLearning).not.toHaveBeenCalled();
  });

  it("reads the signed-in member's own progress", async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'member-1' } });
    mocks.getContinueLearning.mockResolvedValue({ continuation: 'resume' });

    expect(await getHomeContinueLearning()).toEqual({ continuation: 'resume' });
    expect(mocks.getContinueLearning).toHaveBeenCalledWith('member-1');
  });

  it('falls back to the visitor Home when the read fails', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'member-1' } });
    mocks.getContinueLearning.mockRejectedValue(new Error('database unavailable'));

    expect(await getHomeContinueLearning()).toBeNull();
    expect(mocks.logError).toHaveBeenCalledWith(expect.any(Error), { action: 'home.continue_learning.load_failed' });
  });
});
