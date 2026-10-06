import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  submit: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/learning/lesson-quiz-store', () => ({ submitLessonQuizAttempt: mocks.submit }));

import { POST } from '@/app/api/lessons/[lessonId]/quiz/attempts/route';

const params = (lessonId = 'lesson-1') => ({ params: Promise.resolve({ lessonId }) });
const post = (body: unknown) => new Request('http://localhost/api/lessons/lesson-1/quiz/attempts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const grade = { score: 1, total: 1, results: [{ questionId: 'q1', chosenOptionId: 'a', correctOptionId: 'a', isCorrect: true, explanation: null }] };

describe('POST /api/lessons/[lessonId]/quiz/attempts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: `member-${Math.random()}` } });
  });

  it('requires a signed-in member and never grades for a guest', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await POST(post({ answers: { q1: 'a' } }), params())).status).toBe(401);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it.each([
    ['malformed JSON', '{'],
    ['answers that are not strings', { answers: { q1: 1 } }],
    ['extra fields such as a client score', { answers: { q1: 'a' }, score: 10 }],
  ])('rejects %s', async (_, body) => {
    expect((await POST(post(body), params())).status).toBe(400);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('grades for the session member, not for an id in the body', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'member-7' } });
    mocks.submit.mockResolvedValue({ status: 'graded', grade });

    const response = await POST(post({ answers: { q1: 'a' } }), params());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ grade });
    expect(mocks.submit).toHaveBeenCalledWith({ userId: 'member-7', lessonId: 'lesson-1', answers: { q1: 'a' } });
  });

  it.each([
    ['forbidden', 403],
    ['not_found', 404],
    ['no_quiz', 404],
  ] as const)('maps %s to %s without a grade', async (status, code) => {
    mocks.submit.mockResolvedValue({ status });
    const response = await POST(post({ answers: { q1: 'a' } }), params());
    expect(response.status).toBe(code);
    expect(await response.json()).not.toHaveProperty('grade');
  });
});
