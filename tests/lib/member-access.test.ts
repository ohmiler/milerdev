import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

import { requireMember } from '@/lib/member-access';

describe('requireMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((href: string) => {
      throw new Error(`REDIRECT:${href}`);
    });
  });

  it('redirects an unauthenticated private request with its exact safe return path', async () => {
    authMock.mockResolvedValue(null);

    await expect(requireMember('/dashboard/payments')).rejects.toThrow(
      'REDIRECT:/login?callbackUrl=%2Fdashboard%2Fpayments',
    );
    expect(redirectMock).toHaveBeenCalledOnce();
  });

  it('returns only the member identity needed by downstream private reads', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'user-1',
        name: 'Miler',
        email: 'private@example.com',
        role: 'admin',
        sessionVersion: 9,
      },
    });

    await expect(requireMember('/dashboard')).resolves.toEqual({
      id: 'user-1',
      name: 'Miler',
    });
  });
});
