'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { CircleCheck, CircleX, ClipboardCheck, LoaderCircle, RotateCcw } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldLegend, FieldSet } from '@/components/ui/field';
import type { LearnerQuizQuestion, QuizAttemptSummary, QuizGrade } from '@/lib/learning/lesson-quiz';
import { cn } from '@/lib/utils';

interface LessonQuizProps {
  lessonId: string;
  questions: LearnerQuizQuestion[];
  lastAttempt: QuizAttemptSummary | null;
  canSubmit: boolean;
  loginHref: string;
}

export default function LessonQuiz({ lessonId, questions, lastAttempt, canSubmit, loginHref }: LessonQuizProps) {
  const headingId = useId();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<QuizGrade | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const answeredCount = questions.filter((question) => answers[question.id]).length;
  const allAnswered = answeredCount === questions.length;
  const resultsById = new Map(grade?.results.map((result) => [result.questionId, result]));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/lessons/${lessonId}/quiz/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.grade) throw new Error('grade failed');
      setGrade(data.grade);
    } catch {
      setError('ยังตรวจคำตอบไม่ได้ กรุณาลองส่งอีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setAnswers({});
    setGrade(null);
    setError('');
  };

  return (
    <Card className="mt-6" aria-labelledby={headingId}>
      <CardHeader>
        <CardTitle id={headingId} className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
            <ClipboardCheck className="size-4" />
          </span>
          แบบทดสอบท้ายบท
        </CardTitle>
        <CardDescription>
          ทบทวนความเข้าใจ {questions.length} ข้อ ไม่มีผลกับการเรียนจบหรือใบรับรอง ทำซ้ำได้ไม่จำกัด
          {lastAttempt && !grade ? ` · ครั้งล่าสุดได้ ${lastAttempt.score}/${lastAttempt.total} ข้อ` : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-6">
          {questions.map((question, questionIndex) => {
            const result = resultsById.get(question.id);
            return (
              <FieldSet key={question.id} className="gap-3">
                <FieldLegend className="text-base leading-7 font-semibold whitespace-pre-line">
                  {questionIndex + 1}. {question.prompt}
                </FieldLegend>
                <div className="grid gap-2">
                  {question.options.map((option) => {
                    const chosen = answers[question.id] === option.id;
                    const isCorrectOption = result?.correctOptionId === option.id;
                    const isWrongChoice = Boolean(result) && chosen && !isCorrectOption;
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm leading-6 transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                          chosen && !result && 'border-primary bg-primary/5',
                          isCorrectOption && 'border-[var(--color-success-strong)] bg-[var(--color-success-soft)]',
                          isWrongChoice && 'border-destructive bg-destructive/5',
                          result && 'cursor-default',
                        )}
                      >
                        <input
                          type="radio"
                          name={`quiz-${question.id}`}
                          value={option.id}
                          checked={chosen}
                          disabled={Boolean(grade) || submitting}
                          onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                          className="mt-1 size-4 shrink-0 accent-primary"
                        />
                        <span className="min-w-0 flex-1 wrap-anywhere">{option.text}</span>
                        {isCorrectOption ? (
                          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--color-success-strong)]">
                            <CircleCheck className="size-4" aria-hidden="true" /><span className="sr-only">, </span>คำตอบที่ถูก
                          </span>
                        ) : isWrongChoice ? (
                          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-destructive">
                            <CircleX className="size-4" aria-hidden="true" /><span className="sr-only">, </span>คำตอบของคุณ
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
                {result?.explanation ? (
                  <p className="rounded-xl bg-muted/50 px-3 py-2.5 text-sm leading-6 whitespace-pre-line text-muted-foreground">
                    <strong className="font-semibold text-foreground">คำอธิบาย: </strong>{result.explanation}
                  </p>
                ) : null}
              </FieldSet>
            );
          })}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>ส่งคำตอบไม่สำเร็จ</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
              {grade
                ? <strong className="text-base text-foreground">ได้ {grade.score} จาก {grade.total} ข้อ</strong>
                : `ตอบแล้ว ${answeredCount}/${questions.length} ข้อ`}
            </p>
            {grade ? (
              <Button type="button" variant="outline" onClick={retry}>
                <RotateCcw data-icon="inline-start" aria-hidden="true" />ทำอีกครั้ง
              </Button>
            ) : canSubmit ? (
              <Button type="submit" disabled={!allAnswered || submitting}>
                {submitting ? <LoaderCircle className="animate-spin motion-reduce:animate-none" data-icon="inline-start" aria-hidden="true" /> : null}
                {submitting ? 'กำลังตรวจ...' : 'ส่งคำตอบ'}
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href={loginHref}>เข้าสู่ระบบเพื่อส่งคำตอบ</Link>
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
