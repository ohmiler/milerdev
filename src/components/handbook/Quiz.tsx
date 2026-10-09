'use client';

import { useId, useState } from 'react';

import { cn } from '@/lib/utils';

interface QuizProps {
  question: string;
  options: string[];
  /** Index of the correct option in `options`. */
  answer: number;
  /** Shown after a correct pick: why it is right. */
  correct: string;
  /** Shown after a wrong pick: a hint, not the answer. */
  incorrect: string;
}

export function Quiz({ question, options, answer, correct, incorrect }: QuizProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const questionId = useId();
  const isCorrect = picked === answer;

  return (
    <div role="group" aria-labelledby={questionId} className="my-6 flex flex-col gap-3">
      <p id={questionId} className="m-0 font-semibold">{question}</p>
      {options.map((option, index) => {
        const chosen = picked === index;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={chosen}
            onClick={() => setPicked(index)}
            className={cn(
              'min-h-12 w-full rounded-xl border px-4 py-2.5 text-left leading-7 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
              !chosen && 'bg-card hover:bg-muted',
              chosen && index === answer && 'border-2 border-[var(--color-success-strong)] bg-[var(--color-success-soft)]',
              chosen && index !== answer && 'border-2 border-[var(--color-error-strong)] bg-[var(--color-error-soft)]',
            )}
          >
            {option}
          </button>
        );
      })}
      <p role="status" className={cn('m-0 min-h-7 leading-7', isCorrect ? 'text-[var(--color-success-strong)]' : 'text-[var(--color-error-strong)]')}>
        {picked === null ? '' : isCorrect ? correct : incorrect}
      </p>
    </div>
  );
}
