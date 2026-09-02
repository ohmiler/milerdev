// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@/components/analytics/LearningWorkspaceAnalytics', () => ({ default: () => null }));
vi.mock('@/components/course/LearningCurriculum', () => ({ default: () => null }));
vi.mock('@/components/course/LearningNavbar', () => ({ default: () => null }));
vi.mock('@/components/ui/Toast', () => ({ showToast: vi.fn() }));
vi.mock('@/components/video/BunnyPlayer', () => ({
  default: ({
    lessonTitle,
    resumeAtSeconds,
    onTimeUpdate,
    onPause,
    onEnded,
    onResume,
  }: {
    lessonTitle?: string;
    resumeAtSeconds?: number;
    onTimeUpdate?: (seconds: number, duration: number) => void;
    onPause?: () => void;
    onEnded?: () => void;
    onResume?: (seconds: number) => void;
  }) => (
    <div data-testid="player" data-lesson-title={lessonTitle} data-resume-at={resumeAtSeconds}>
      <button type="button" onClick={() => onTimeUpdate?.(42, 120)}>emit time</button>
      <button type="button" onClick={() => onPause?.()}>emit pause</button>
      <button type="button" onClick={() => onEnded?.()}>emit ended</button>
      <button type="button" onClick={() => onResume?.(42)}>emit resume</button>
    </div>
  ),
}));

import LearnPageClient from '@/components/course/LearnPageClient';

function renderWorkspace(currentProgress = { completed: false, watchTimeSeconds: 37 }) {
  return render(
    <LearnPageClient
      course={{ id: 'course-1', slug: 'typescript', title: 'TypeScript' }}
      currentLesson={{
        id: 'lesson-1',
        title: 'บทที่หนึ่ง',
        content: null,
        videoUrl: 'https://iframe.mediadelivery.net/embed/123/video-one',
        videoDuration: 120,
        isFreePreview: false,
      }}
      allLessons={[
        { id: 'lesson-1', title: 'บทที่หนึ่ง', videoDuration: 120, isFreePreview: false },
      ]}
      prevLesson={null}
      nextLesson={null}
      currentIndex={0}
      isEnrolled
      canTrackProgress
      completedLessonIds={currentProgress.completed ? ['lesson-1'] : []}
      currentProgress={currentProgress}
    />,
  );
}

describe('learning progress save recovery', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows pending truth and sends one positive completion request for duplicate ended events', async () => {
    let resolveResponse!: (response: Response) => void;
    const response = new Promise<Response>((resolve) => { resolveResponse = resolve; });
    vi.mocked(fetch).mockReturnValue(response);
    renderWorkspace();

    fireEvent.click(screen.getByRole('button', { name: 'emit ended' }));
    fireEvent.click(screen.getByRole('button', { name: 'emit ended' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(screen.getByRole('heading', { name: 'กำลังบันทึกบทเรียน…' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'เรียนจบบทนี้แล้ว' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'เรียนครบแล้ว · กำลังทบทวน' })).toBeNull();

    resolveResponse(new Response(JSON.stringify({ success: true }), { status: 200 }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'เรียนครบแล้ว · กำลังทบทวน' })).toBeTruthy());
    expect(fetch).toHaveBeenCalledOnce();
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)).toMatchObject({
      lessonId: 'lesson-1',
      completed: true,
    });
  });

  it('keeps a failed completion visible and retries from the inline action', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    renderWorkspace();

    fireEvent.click(screen.getByRole('button', { name: 'emit ended' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'ยังบันทึกบทนี้ไม่ได้' })).toBeTruthy());
    expect(screen.queryByRole('heading', { name: 'เรียนจบบทนี้แล้ว' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'ลองบันทึกอีกครั้ง' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'เรียนครบแล้ว · กำลังทบทวน' })).toBeTruthy());
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('claims resume only from the trusted callback and exposes watch-position retry', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    renderWorkspace();

    expect(screen.getByTestId('player').getAttribute('data-lesson-title')).toBe('บทที่หนึ่ง');
    expect(screen.getByTestId('player').getAttribute('data-resume-at')).toBe('37');
    expect(screen.queryByText('กลับมาเรียนต่อที่ 00:42')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'emit resume' }));
    expect(screen.getByText('กลับมาเรียนต่อที่ 00:42')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'emit time' }));
    fireEvent.click(screen.getByRole('button', { name: 'emit pause' }));
    await waitFor(() => expect(screen.getByText('ยังบันทึกตำแหน่งล่าสุดไม่ได้')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'ลองบันทึกตำแหน่งอีกครั้ง' }));
    await waitFor(() => expect(screen.queryByText('ยังบันทึกตำแหน่งล่าสุดไม่ได้')).toBeNull());
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
