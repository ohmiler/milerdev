import { z } from 'zod';

// Practice quizzes after a lesson. Grading happens on the server only, and a learner never
// receives isCorrect before submitting. A quiz never gates completion or certificates.

export const QUIZ_LIMITS = {
  questions: 20,
  minOptions: 2,
  maxOptions: 6,
  prompt: 2000,
  option: 500,
  explanation: 2000,
} as const;

export type QuizOption = { id: string; text: string; isCorrect: boolean };
export type QuizQuestion = { id: string; prompt: string; options: QuizOption[]; explanation: string | null };

export type LearnerQuizQuestion = { id: string; prompt: string; options: { id: string; text: string }[] };
export type QuizAttemptSummary = { score: number; total: number; submittedAt: string };
export type LearnerQuiz = { questions: LearnerQuizQuestion[]; lastAttempt: QuizAttemptSummary | null };
export type QuizQuestionResult = {
  questionId: string;
  chosenOptionId: string | null;
  correctOptionId: string | null;
  isCorrect: boolean;
  explanation: string | null;
};
export type QuizGrade = { score: number; total: number; results: QuizQuestionResult[] };

/** The learner's view of a question: the options without their answers. */
export function toLearnerQuestion(question: Pick<QuizQuestion, 'id' | 'prompt' | 'options'>): LearnerQuizQuestion {
  return {
    id: question.id,
    prompt: question.prompt,
    options: question.options.map((option) => ({ id: option.id, text: option.text })),
  };
}

/** Grades answers against the stored questions. Unknown questions and options score nothing. */
export function gradeQuiz(questions: QuizQuestion[], answers: Record<string, string>): QuizGrade {
  const results = questions.map((question): QuizQuestionResult => {
    const correct = question.options.find((option) => option.isCorrect) ?? null;
    const chosen = Object.hasOwn(answers, question.id)
      && question.options.some((option) => option.id === answers[question.id])
      ? answers[question.id]
      : null;
    return {
      questionId: question.id,
      chosenOptionId: chosen,
      correctOptionId: correct?.id ?? null,
      isCorrect: chosen !== null && chosen === correct?.id,
      explanation: question.explanation,
    };
  });
  return { score: results.filter((result) => result.isCorrect).length, total: results.length, results };
}

const rowId = z.string().min(1).max(36);

export const quizQuestionInputSchema = z.object({
  id: rowId.optional(),
  prompt: z.string().trim().min(1, 'กรุณาระบุคำถาม').max(QUIZ_LIMITS.prompt),
  options: z.array(z.object({
    id: rowId.optional(),
    text: z.string().trim().min(1, 'กรุณากรอกตัวเลือกให้ครบ').max(QUIZ_LIMITS.option),
    isCorrect: z.boolean(),
  }).strict())
    .min(QUIZ_LIMITS.minOptions, `แต่ละคำถามต้องมีอย่างน้อย ${QUIZ_LIMITS.minOptions} ตัวเลือก`)
    .max(QUIZ_LIMITS.maxOptions, `แต่ละคำถามมีได้ไม่เกิน ${QUIZ_LIMITS.maxOptions} ตัวเลือก`)
    .refine((options) => options.filter((option) => option.isCorrect).length === 1, 'แต่ละคำถามต้องมีคำตอบที่ถูกต้อง 1 ข้อ'),
  explanation: z.string().trim().max(QUIZ_LIMITS.explanation).nullable().optional(),
}).strict();

export const lessonQuizInputSchema = z.object({
  questions: z.array(quizQuestionInputSchema).max(QUIZ_LIMITS.questions, `แบบทดสอบมีได้ไม่เกิน ${QUIZ_LIMITS.questions} ข้อ`),
}).strict();

export const quizAttemptInputSchema = z.object({
  answers: z.record(rowId, rowId).refine(
    (answers) => Object.keys(answers).length <= QUIZ_LIMITS.questions,
    'Too many answers',
  ),
}).strict();

export type LessonQuizInput = z.infer<typeof lessonQuizInputSchema>;
