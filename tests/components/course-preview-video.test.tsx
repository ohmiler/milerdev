// @vitest-environment jsdom

import { useEffect } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CoursePreviewVideo from '@/components/course/CoursePreviewVideo';

const playerStopped = vi.hoisted(() => vi.fn());
vi.mock('@/components/video/BunnyPlayer', () => ({
  default: function MockPlayer() {
    useEffect(() => () => playerStopped(), []);
    return <iframe title="Preview player" src="about:blank" />;
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('course preview video', () => {
  it('opens on keyboard activation, focuses close, and stops playback on Escape', async () => {
    const user = userEvent.setup();
    render(<CoursePreviewVideo previewVideoUrl="https://example.com/preview" />);
    const trigger = screen.getByRole('button', { name: 'ดูวิดีโอตัวอย่างคอร์ส' });
    expect(screen.queryByTitle('Preview player')).toBeNull();
    trigger.focus();
    await user.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog', { name: 'วิดีโอตัวอย่างคอร์ส' });
    const close = screen.getByRole('button', { name: 'ปิดตัวอย่าง' });
    await waitFor(() => expect(document.activeElement).toBe(close));
    expect(dialog.contains(screen.getByTitle('Preview player'))).toBe(true);
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(screen.queryByTitle('Preview player')).toBeNull();
    expect(playerStopped).toHaveBeenCalledOnce();
  });

  it('closes through the visible control and can open a fresh player again', async () => {
    const user = userEvent.setup();
    render(<CoursePreviewVideo previewVideoUrl="https://example.com/preview" />);
    const trigger = screen.getByRole('button', { name: 'ดูวิดีโอตัวอย่างคอร์ส' });
    await user.click(trigger);
    await user.click(await screen.findByRole('button', { name: 'ปิดตัวอย่าง' }));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(screen.queryByTitle('Preview player')).toBeNull();
    expect(playerStopped).toHaveBeenCalledOnce();
    await user.click(trigger);
    expect(await screen.findByTitle('Preview player')).toBeTruthy();
  });
});
