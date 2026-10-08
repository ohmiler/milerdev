'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { ContinueLearning } from '@/lib/learning/dashboard';

/**
 * The member's next lesson at the top of the mobile menu, read when the menu opens. Shows nothing
 * while loading, when no course is in progress, or when the read fails: the menu works without it.
 */
export default function MobileContinueCard({ onNavigate }: { onNavigate: () => void }) {
  const [learning, setLearning] = useState<ContinueLearning | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/learning/continue', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (!controller.signal.aborted) setLearning(data?.learning ?? null); })
      .catch(() => { /* No card; the menu below still works. */ });
    return () => controller.abort();
  }, []);

  if (!learning) return null;
  const starting = learning.continuation === 'start';

  return (
    <section aria-label={starting ? 'เริ่มเรียนคอร์สของคุณ' : 'เรียนต่อจากครั้งก่อน'} className="mx-1 mb-2 grid gap-2 rounded-xl border bg-secondary/40 p-3">
      <p className="grid min-w-0 leading-snug">
        <span className="truncate text-caption text-muted-foreground">{learning.course.title}</span>
        <strong className="truncate text-sm font-semibold">บทที่ {learning.lesson.position} · {learning.lesson.title}</strong>
      </p>
      <Progress value={learning.progress.percent} aria-label={`ความคืบหน้า ${learning.course.title} ${learning.progress.percent}%`} />
      <Button asChild size="sm" className="min-h-11 w-full">
        <Link href={learning.href} onClick={onNavigate}>
          {starting ? 'เริ่มเรียน' : 'เรียนต่อ'}
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}
