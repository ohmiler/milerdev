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

  it('renders linked notifications as links and marks them read without replacing navigation semantics', async () => {
    const onMarkAsRead = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <UserNavigationMenus
        session={{
          user: { id: 'learner-1', name: 'Learner', email: 'learner@example.com' },
          expires: '2099-01-01T00:00:00.000Z',
        } as Session}
        isAdmin={false}
        pathname="/"
        unreadCount={1}
        notifications={[{
          id: 'notification-1',
          title: 'Course ready',
          message: 'Start learning now',
          type: 'success',
          link: '/courses/typescript',
          isRead: false,
          createdAt: '2026-08-30T00:00:00.000Z',
        }]}
        onMarkAsRead={onMarkAsRead}
        onDeleteRead={vi.fn().mockResolvedValue(undefined)}
        onLogout={vi.fn()}
        onNotificationsOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'การแจ้งเตือน' }));

    const notificationLink = await screen.findByRole('link', { name: /Course ready/ });
    expect(notificationLink.getAttribute('href')).toBe('/courses/typescript');

    notificationLink.addEventListener('click', (event) => event.preventDefault(), { once: true });
    await user.click(notificationLink);
    expect(onMarkAsRead).toHaveBeenCalledWith(['notification-1']);
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
        unreadCount={0}
        notifications={[]}
        onMarkAsRead={vi.fn().mockResolvedValue(undefined)}
        onDeleteRead={vi.fn().mockResolvedValue(undefined)}
        onLogout={vi.fn()}
        onNotificationsOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Learner/ }));

    expect(await screen.findByRole('menu')).toBeTruthy();
    expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
  });
});
