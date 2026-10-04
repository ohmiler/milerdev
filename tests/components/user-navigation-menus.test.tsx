// @vitest-environment jsdom

import type { Session } from 'next-auth';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import UserNavigationMenus from '@/components/layout/UserNavigationMenus';

describe('user navigation menus', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps body scrolling available when the account menu opens', async () => {
    const user = userEvent.setup();

    render(
      <UserNavigationMenus
        session={{
          user: { id: 'learner-1', name: 'Learner', email: 'learner@example.com' },
          expires: '2099-01-01T00:00:00.000Z',
        } as Session}
        isAdmin={false}
        pathname="/"
        onLogout={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'การแจ้งเตือน' })).toBeNull();
    await user.click(screen.getByRole('button', { name: /Learner/ }));

    expect(await screen.findByRole('menu')).toBeTruthy();
    expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
  });
});
