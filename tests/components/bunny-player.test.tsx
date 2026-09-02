// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/bunny-player-adapter', () => ({ connectBunnyPlayer: vi.fn() }));

import BunnyPlayer from '@/components/video/BunnyPlayer';
import { connectBunnyPlayer } from '@/lib/bunny-player-adapter';

describe('BunnyPlayer trusted adapter lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('connects only Bunny embeds and cleans up when the lesson URL changes', async () => {
    const disconnect = vi.fn();
    vi.mocked(connectBunnyPlayer).mockReturnValue({ disconnect });
    const callbacks = {
      onTimeUpdate: vi.fn(),
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onEnded: vi.fn(),
      onError: vi.fn(),
      onResume: vi.fn(),
    };
    const view = render(
      <BunnyPlayer
        videoId="https://iframe.mediadelivery.net/embed/123/video-one"
        lessonTitle="บทที่หนึ่ง"
        resumeAtSeconds={42}
        {...callbacks}
      />,
    );

    await waitFor(() => expect(connectBunnyPlayer).toHaveBeenCalledOnce());
    expect(connectBunnyPlayer).toHaveBeenCalledWith(expect.objectContaining({
      frame: expect.objectContaining({
        src: 'https://iframe.mediadelivery.net/embed/123/video-one',
      }),
      resumeAtSeconds: 42,
      callbacks: expect.any(Object),
    }));
    expect(screen.getByTitle('วิดีโอบทเรียน บทที่หนึ่ง')).toBeTruthy();

    view.rerender(
      <BunnyPlayer
        videoId="https://www.youtube.com/watch?v=video-two"
        lessonTitle="บทที่สอง"
        {...callbacks}
      />,
    );
    expect(disconnect).toHaveBeenCalledOnce();
    expect(connectBunnyPlayer).toHaveBeenCalledOnce();
    expect(screen.getByTitle('วิดีโอบทเรียน บทที่สอง')).toBeTruthy();
  });

  it('turns trusted player errors into an inline reload action', async () => {
    vi.mocked(connectBunnyPlayer).mockReturnValue({ disconnect: vi.fn() });
    render(
      <BunnyPlayer
        videoId="https://iframe.mediadelivery.net/embed/123/video-one"
        lessonTitle="บทที่หนึ่ง"
      />,
    );
    await waitFor(() => expect(connectBunnyPlayer).toHaveBeenCalledOnce());
    const input = vi.mocked(connectBunnyPlayer).mock.calls[0][0];

    act(() => input.callbacks.onError?.());
    const retry = screen.getByRole('button', { name: 'ลองโหลดวิดีโออีกครั้ง' });
    const firstFrame = screen.getByTitle('วิดีโอบทเรียน บทที่หนึ่ง');
    fireEvent.click(retry);
    expect(screen.getByTitle('วิดีโอบทเรียน บทที่หนึ่ง')).not.toBe(firstFrame);
  });

  it('offers the same reload action when the iframe stays slow', async () => {
    vi.useFakeTimers();
    vi.mocked(connectBunnyPlayer).mockReturnValue({ disconnect: vi.fn() });
    render(
      <BunnyPlayer
        videoId="https://iframe.mediadelivery.net/embed/123/video-one"
        lessonTitle="บทที่หนึ่ง"
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(8_000);
    });
    expect(screen.getByRole('button', { name: 'ลองโหลดวิดีโออีกครั้ง' })).toBeTruthy();
  });
});
