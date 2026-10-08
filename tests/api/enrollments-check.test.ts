import { beforeEach, describe, expect, it, vi } from 'vitest';

const { auth, limit, getCourseLearning, logError } = vi.hoisted(() => ({
  auth: vi.fn(),
  limit: vi.fn(),
  getCourseLearning: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth }));
vi.mock('@/lib/db', () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit }) }) }) },
}));
vi.mock('@/lib/learning/dashboard', () => ({ getCourseLearning }));
vi.mock('@/lib/error-handler', () => ({ logError }));

import { GET } from '@/app/api/enrollments/check/route';

const check = () => GET(new Request('http://localhost/api/enrollments/check?courseId=course-1'));
const learning = {
  progress: { completedLessons: 3, totalLessons: 12, percent: 25 },
  continuation: 'resume',
  completed: false,
  nextLesson: { title: 'Flexbox', position: 4 },
};

describe('GET /api/enrollments/check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ user: { id: 'member-1' } });
  });

  it('adds the learner\'s own progress in the course when they are enrolled', async () => {
    limit.mockResolvedValue([{ id: 'enrollment-1', userId: 'member-1', courseId: 'course-1' }]);
    getCourseLearning.mockResolvedValue(learning);

    const body = await (await check()).json();

    expect(getCourseLearning).toHaveBeenCalledWith('member-1', 'course-1');
    expect(body).toMatchObject({ enrolled: true, learning });
  });

  it('reads no progress for a member who is not enrolled', async () => {
    limit.mockResolvedValue([]);

    const body = await (await check()).json();

    expect(getCourseLearning).not.toHaveBeenCalled();
    expect(body).toMatchObject({ enrolled: false, learning: null });
  });

  it('still answers "enrolled" when the progress read fails, and logs it', async () => {
    limit.mockResolvedValue([{ id: 'enrollment-1', userId: 'member-1', courseId: 'course-1' }]);
    getCourseLearning.mockRejectedValue(new Error('database down'));

    const response = await check();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ enrolled: true, learning: null });
    expect(logError).toHaveBeenCalledWith(expect.any(Error), { action: 'enrollments.check.learning_failed' });
  });

  it('reads nothing for a visitor', async () => {
    auth.mockResolvedValue(null);

    expect(await (await check()).json()).toEqual({ enrolled: false, authenticated: false });
    expect(getCourseLearning).not.toHaveBeenCalled();
  });
});
