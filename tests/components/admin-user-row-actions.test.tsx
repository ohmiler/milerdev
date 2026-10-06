// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminUserRowActions } from '@/components/admin/AdminUserRowActions';

function renderActions(lifecycleStatus: 'active' | 'inactive', pending = false) {
  const handlers = { onEdit: vi.fn(), onResetPassword: vi.fn(), onLifecycle: vi.fn() };
  render(
    <AdminUserRowActions
      user={{ id: 'user-1', name: 'ผู้เรียน ทดสอบ', email: 'learner@example.com', lifecycleStatus }}
      pending={pending}
      {...handlers}
    />,
  );
  return handlers;
}

describe('AdminUserRowActions', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows one button in the row and keeps the password and account status in the menu', async () => {
    const user = userEvent.setup();
    const handlers = renderActions('active');

    // Only the edit button and the menu trigger sit in the row; no red button.
    expect(screen.getAllByRole('button').map((button) => button.getAttribute('aria-label') ?? button.textContent)).toEqual(['แก้ไข', 'จัดการเพิ่มเติม: ผู้เรียน ทดสอบ']);
    await user.click(screen.getByRole('button', { name: 'แก้ไข' }));
    expect(handlers.onEdit).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'จัดการเพิ่มเติม: ผู้เรียน ทดสอบ' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'ดูประวัติผู้เรียน' }).getAttribute('href')).toBe('/admin/users/user-1');
    const deactivate = within(menu).getByRole('menuitem', { name: 'ปิดใช้งานบัญชี' });
    expect(deactivate.getAttribute('data-variant')).toBe('destructive');
    await user.click(deactivate);
    expect(handlers.onLifecycle).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'จัดการเพิ่มเติม: ผู้เรียน ทดสอบ' }));
    await user.click(within(await screen.findByRole('menu')).getByRole('menuitem', { name: 'ตั้งรหัสผ่านใหม่' }));
    expect(handlers.onResetPassword).toHaveBeenCalledOnce();
  });

  it('offers reactivation, not in red, for an inactive account', async () => {
    const user = userEvent.setup();
    renderActions('inactive');

    await user.click(screen.getByRole('button', { name: 'จัดการเพิ่มเติม: ผู้เรียน ทดสอบ' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).queryByRole('menuitem', { name: 'ปิดใช้งานบัญชี' })).toBeNull();
    expect(within(menu).getByRole('menuitem', { name: 'เปิดใช้งานบัญชี' }).getAttribute('data-variant')).toBe('default');
  });

  it('locks the menu while the account status is being saved', () => {
    renderActions('active', true);
    expect((screen.getByRole('button', { name: 'จัดการเพิ่มเติม: ผู้เรียน ทดสอบ' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
