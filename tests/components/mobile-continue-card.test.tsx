// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import MobileContinueCard from '@/components/layout/MobileContinueCard';

const learning = {
  course: { title: 'HTML & CSS', slug: 'html-css', thumbnailUrl: null },
  lesson: { title: 'Flexbox', position: 4 },
  progress: { completedLessons: 3, totalLessons: 12, percent: 25 },
  continuation: 'resume',
  href: '/courses/html-css/learn',
};

function answer(response: { ok: boolean; body?: unknown } | Error) {
  const fetchMock = response instanceof Error
    ? vi.fn().mockRejectedValue(response)
    : vi.fn().mockResolvedValue({ ok: response.ok, json: () => Promise.resolve(response.body) });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('MobileContinueCard', () => {
  it('shows the next lesson and closes the menu when followed', async () => {
    const fetchMock = answer({ ok: true, body: { learning } });
    const onNavigate = vi.fn();
    render(<MobileContinueCard onNavigate={onNavigate} />);

    const resume = await screen.findByRole('link', { name: 'เรียนต่อ' });
    expect(fetchMock).toHaveBeenCalledWith('/api/learning/continue', expect.anything());
    expect(screen.getByText('บทที่ 4 · Flexbox')).toBeTruthy();
    expect(resume.getAttribute('href')).toBe('/courses/html-css/learn');

    fireEvent.click(resume);
    expect(onNavigate).toHaveBeenCalled();
  });

  it('shows nothing when no course is in progress, or when the read fails', async () => {
    const empty = answer({ ok: true, body: { learning: null } });
    const { container, unmount } = render(<MobileContinueCard onNavigate={vi.fn()} />);
    await waitFor(() => expect(empty).toHaveBeenCalled());
    expect(container.innerHTML).toBe('');
    unmount();

    const failing = answer({ ok: false, body: { learning: null } });
    const second = render(<MobileContinueCard onNavigate={vi.fn()} />);
    await waitFor(() => expect(failing).toHaveBeenCalled());
    expect(second.container.innerHTML).toBe('');
    second.unmount();

    const offline = answer(new Error('offline'));
    const third = render(<MobileContinueCard onNavigate={vi.fn()} />);
    await waitFor(() => expect(offline).toHaveBeenCalled());
    expect(third.container.innerHTML).toBe('');
  });
});
