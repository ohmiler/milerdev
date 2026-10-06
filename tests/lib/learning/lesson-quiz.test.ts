import { describe, expect, it } from 'vitest';

import {
  gradeQuiz,
  lessonQuizInputSchema,
  quizAttemptInputSchema,
  toLearnerQuestion,
  type QuizQuestion,
} from '@/lib/learning/lesson-quiz';

const questions: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: 'useEffect ทำงานเมื่อไร',
    options: [
      { id: 'a', text: 'หลัง render', isCorrect: true },
      { id: 'b', text: 'ก่อน render', isCorrect: false },
    ],
    explanation: 'effect ทำงานหลัง commit',
  },
  {
    id: 'q2',
    prompt: 'key ใช้ทำอะไร',
    options: [
      { id: 'c', text: 'ตกแต่ง', isCorrect: false },
      { id: 'd', text: 'ระบุตัวตนของ item', isCorrect: true },
    ],
    explanation: null,
  },
];

describe('lesson quiz grading', () => {
  it('strips answers from what a learner receives', () => {
    const learner = toLearnerQuestion(questions[0]);
    expect(learner).toEqual({
      id: 'q1',
      prompt: 'useEffect ทำงานเมื่อไร',
      options: [{ id: 'a', text: 'หลัง render' }, { id: 'b', text: 'ก่อน render' }],
    });
    expect(JSON.stringify(learner)).not.toContain('isCorrect');
    expect(JSON.stringify(learner)).not.toContain('commit');
  });

  it('scores each question against the stored correct option', () => {
    const grade = gradeQuiz(questions, { q1: 'a', q2: 'c' });
    expect(grade.score).toBe(1);
    expect(grade.total).toBe(2);
    expect(grade.results).toEqual([
      { questionId: 'q1', chosenOptionId: 'a', correctOptionId: 'a', isCorrect: true, explanation: 'effect ทำงานหลัง commit' },
      { questionId: 'q2', chosenOptionId: 'c', correctOptionId: 'd', isCorrect: false, explanation: null },
    ]);
  });

  it('gives no credit for missing answers, unknown options or options of another question', () => {
    const grade = gradeQuiz(questions, { q1: 'd', other: 'a' });
    expect(grade.score).toBe(0);
    expect(grade.results.map((result) => result.chosenOptionId)).toEqual([null, null]);
  });

  it('ignores inherited keys such as __proto__ in submitted answers', () => {
    const answers = JSON.parse('{"__proto__": {"q1": "a"}}') as Record<string, string>;
    expect(gradeQuiz(questions, answers).score).toBe(0);
  });
});

describe('lesson quiz input', () => {
  const question = { prompt: 'คำถาม', options: [{ text: 'ถูก', isCorrect: true }, { text: 'ผิด', isCorrect: false }] };

  it('accepts a single-answer question and trims text', () => {
    const parsed = lessonQuizInputSchema.parse({ questions: [{ ...question, prompt: '  คำถาม  ' }] });
    expect(parsed.questions[0].prompt).toBe('คำถาม');
  });

  it.each([
    ['no correct answer', { ...question, options: question.options.map((option) => ({ ...option, isCorrect: false })) }],
    ['two correct answers', { ...question, options: question.options.map((option) => ({ ...option, isCorrect: true })) }],
    ['one option', { ...question, options: [question.options[0]] }],
    ['seven options', { ...question, options: Array.from({ length: 7 }, (_, i) => ({ text: `${i}`, isCorrect: i === 0 })) }],
    ['a blank option', { ...question, options: [...question.options, { text: '   ', isCorrect: false }] }],
    ['a blank prompt', { ...question, prompt: ' ' }],
    ['an unknown field', { ...question, score: 5 }],
  ])('rejects a question with %s', (_, invalid) => {
    expect(lessonQuizInputSchema.safeParse({ questions: [invalid] }).success).toBe(false);
  });

  it('caps a quiz at 20 questions and an attempt at 20 answers', () => {
    expect(lessonQuizInputSchema.safeParse({ questions: Array.from({ length: 21 }, () => question) }).success).toBe(false);
    const answers = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`q${i}`, 'a']));
    expect(quizAttemptInputSchema.safeParse({ answers }).success).toBe(false);
    expect(quizAttemptInputSchema.safeParse({ answers: { q1: 'a' } }).success).toBe(true);
  });
});
