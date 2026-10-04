// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AdminError from '@/app/admin/error';

describe('admin error boundary', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('offers a retry and a way back to the dashboard without exposing error details', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const retry = vi.fn();

    render(<AdminError error={new Error('stats.verified is null')} retry={retry} />);

    fireEvent.click(screen.getByRole('button', { name: 'ลองใหม่อีกครั้ง' }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'กลับไปภาพรวม' }).getAttribute('href')).toBe('/admin');
    expect(screen.queryByText(/stats\.verified/)).toBeNull();
  });
});
