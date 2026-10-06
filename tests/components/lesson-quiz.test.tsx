// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/Toast', () => ({ showToast: vi.fn() }));

import LessonQuizEditor, { toQuizPayload } from '@/components/admin/LessonQuizEditor';
import LessonQuiz from '@/components/course/LessonQuiz';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const questions = [
  { id: 'q1', prompt: 'useEffect ทำงานเมื่อไร', options: [{ id: 'a', text: 'หลัง render' }, { id: 'b', text: 'ก่อน render' }] },
  { id: 'q2', prompt: 'key ใช้ทำอะไร', options: [{ id: 'c', text: 'ตกแต่ง' }, { id: 'd', text: 'ระบุตัวตน' }] },
];
const grade = {
  score: 1,
  total: 2,
  results: [
    { questionId: 'q1', chosenOptionId: 'a', correctOptionId: 'a', isCorrect: true, explanation: 'effect ทำงานหลัง commit' },
    { questionId: 'q2', chosenOptionId: 'c', correctOptionId: 'd', isCorrect: false, explanation: null },
  ],
};

function stubFetch(response: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('LessonQuiz', () => {
  it('submits only once every question is answered and then reveals the result', async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch({ grade });
    render(<LessonQuiz lessonId="lesson-1" questions={questions} lastAttempt={null} canSubmit loginHref="/login" />);

    const submit = screen.getByRole('button', { name: 'ส่งคำตอบ' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    await user.click(screen.getByRole('radio', { name: 'หลัง render' }));
    expect(submit.disabled).toBe(true);
    await user.click(screen.getByRole('radio', { name: 'ตกแต่ง' }));
    await user.click(submit);

    expect(fetchMock).toHaveBeenCalledWith('/api/lessons/lesson-1/quiz/attempts', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ answers: { q1: 'a', q2: 'c' } }),
    }));
    expect(await screen.findByText('ได้ 1 จาก 2 ข้อ')).toBeTruthy();
    expect(screen.getAllByText('คำตอบที่ถูก')).toHaveLength(2);
    expect(screen.getByText('คำตอบของคุณ')).toBeTruthy();
    expect(screen.getByText('effect ทำงานหลัง commit')).toBeTruthy();
    // The result is part of each option's name, so screen readers hear it with the choice.
    expect((screen.getByRole('radio', { name: /^ระบุตัวตน,\s*คำตอบที่ถูก$/ }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByRole('radio', { name: /^ตกแต่ง,\s*คำตอบของคุณ$/ })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'ทำอีกครั้ง' }));
    expect(screen.getByText('ตอบแล้ว 0/2 ข้อ')).toBeTruthy();
    expect(screen.queryByText('คำตอบที่ถูก')).toBeNull();
  });

  it('keeps the answers and offers a retry when grading fails', async () => {
    const user = userEvent.setup();
    stubFetch({ error: 'nope' }, 500);
    render(<LessonQuiz lessonId="lesson-1" questions={questions.slice(0, 1)} lastAttempt={null} canSubmit loginHref="/login" />);

    await user.click(screen.getByRole('radio', { name: 'หลัง render' }));
    await user.click(screen.getByRole('button', { name: 'ส่งคำตอบ' }));

    expect(await screen.findByText('ส่งคำตอบไม่สำเร็จ')).toBeTruthy();
    expect((screen.getByRole('radio', { name: 'หลัง render' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('button', { name: 'ส่งคำตอบ' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('asks a guest to sign in and shows the last score to a returning learner', () => {
    const view = render(<LessonQuiz lessonId="lesson-1" questions={questions} lastAttempt={null} canSubmit={false} loginHref="/login?callbackUrl=%2Fx" />);
    expect(screen.getByRole('link', { name: 'เข้าสู่ระบบเพื่อส่งคำตอบ' }).getAttribute('href')).toBe('/login?callbackUrl=%2Fx');
    expect(screen.queryByRole('button', { name: 'ส่งคำตอบ' })).toBeNull();

    view.rerender(<LessonQuiz lessonId="lesson-1" questions={questions} lastAttempt={{ score: 2, total: 2, submittedAt: '2026-10-06T00:00:00.000Z' }} canSubmit loginHref="/login" />);
    expect(screen.getByText(/ครั้งล่าสุดได้ 2\/2 ข้อ/)).toBeTruthy();
  });
});

describe('LessonQuizEditor', () => {
  const stored = [{
    id: 'q1',
    prompt: 'คำถามเดิม',
    explanation: null,
    options: [{ id: 'o1', text: 'ถูก', isCorrect: true }, { id: 'o2', text: 'ผิด', isCorrect: false }],
  }];

  it('sends stored ids back so edits keep question identity', () => {
    const payload = toQuizPayload([{
      key: 'k', id: 'q1', prompt: 'คำถาม', explanation: '  ',
      options: [{ key: 'k1', id: 'o1', text: 'ก', isCorrect: true }, { key: 'k2', text: 'ข', isCorrect: false }],
    }]);
    expect(payload).toEqual({
      questions: [{ id: 'q1', prompt: 'คำถาม', explanation: null, options: [{ id: 'o1', text: 'ก', isCorrect: true }, { text: 'ข', isCorrect: false }] }],
    });
  });

  it('loads the quiz, blocks an incomplete question and saves a valid one', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ questions: stored })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ questions: stored })));
    vi.stubGlobal('fetch', fetchMock);
    render(<LessonQuizEditor lessonId="lesson-1" />);

    expect(await screen.findByDisplayValue('คำถามเดิม')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'เพิ่มคำถาม' }));
    await user.click(screen.getByRole('button', { name: 'บันทึกแบบทดสอบ' }));
    expect(screen.getByText('กรุณาระบุคำถาม')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getAllByRole('button', { name: 'ลบคำถาม' })[1]);
    await user.click(screen.getByRole('button', { name: 'บันทึกแบบทดสอบ' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('/api/admin/lessons/lesson-1/quiz');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body).questions[0]).toMatchObject({ id: 'q1', options: [{ id: 'o1' }, { id: 'o2' }] });
  });
});
