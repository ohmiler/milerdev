import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import CourseCoverImage from '@/components/course/CourseCoverImage';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { resolveCoverImage } from '@/lib/courses/cover-image';
import type { ContinueLearning } from '@/lib/learning/dashboard';

/** Above the Home hero for a signed-in learner: the lesson to pick up next, one tap away. */
export default function ContinueLearningBar({ learning }: { learning: ContinueLearning }) {
  const cover = resolveCoverImage(learning.course.thumbnailUrl);
  const { completedLessons, totalLessons, percent } = learning.progress;
  const starting = learning.continuation === 'start';

  return (
    <section aria-label={starting ? 'เริ่มเรียนคอร์สของคุณ' : 'เรียนต่อจากครั้งก่อน'} className="border-b bg-secondary/40">
      <div className="container flex flex-col gap-3 py-3.5 md:flex-row md:items-center md:gap-5">
        <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
          {cover ? (
            <CourseCoverImage
              cover={cover}
              alt=""
              width={192}
              height={108}
              sizes="96px"
              className="aspect-video w-18 shrink-0 rounded-lg bg-navy object-cover md:w-24"
            />
          ) : null}
          <p className="grid min-w-0 leading-snug">
            <span className="truncate text-caption text-muted-foreground">
              {starting ? 'เริ่มเรียน' : 'เรียนต่อจากครั้งก่อน'} · {learning.course.title}
            </span>
            <strong className="truncate font-semibold">บทที่ {learning.lesson.position} · {learning.lesson.title}</strong>
          </p>
        </div>
        <div className="grid gap-1.5 md:w-56">
          <p className="flex justify-between text-caption text-muted-foreground tabular-nums">
            <span>เรียนไปแล้ว {completedLessons} จาก {totalLessons} บท</span>
            <strong className="text-foreground">{percent}%</strong>
          </p>
          <Progress value={percent} aria-label={`ความคืบหน้า ${learning.course.title}`} />
        </div>
        <Button asChild className="min-h-11">
          <Link href={learning.href}>
            {starting ? 'เริ่มเรียน' : 'เรียนต่อ'}
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
