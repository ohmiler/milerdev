import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { BundleDecisionFacts } from '@/lib/bundle-decision-facts';
import { formatCourseDuration } from '@/lib/course-duration';
import { getExcerpt } from '@/lib/sanitize';

type BundleCourseRowProps = {
  course: BundleDecisionFacts['courses'][number];
  description: string | null;
  thumbnailUrl: string | null;
  position: number;
};

function normalizeUrl(url: string | null): string | null {
  if (!url || url.trim() === '') return null;
  return url.startsWith('http') ? url : `https://${url}`;
}

export default function BundleCourseRow({
  course,
  description,
  thumbnailUrl: rawThumbnailUrl,
  position,
}: BundleCourseRowProps) {
  const thumbnailUrl = normalizeUrl(rawThumbnailUrl);
  const durationText = formatCourseDuration(course.evidence.knownDurationSeconds);
  const review = course.evidence.verifiedReview;

  return (
    <Card className={'h-full gap-0 overflow-hidden py-0 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none'}>
      <Link
        className={'grid h-full min-w-0 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 sm:grid-cols-[12rem_minmax(0,1fr)]'}
        href={`/courses/${course.slug}`}
      >
        <div className={'relative aspect-[16/9] overflow-hidden bg-[var(--academy-navy)] sm:aspect-auto sm:min-h-52'}>
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={course.title}
              width={640}
              height={360}
              sizes={'(min-width: 1024px) 12rem, 100vw'}
              loading={'lazy'}
              decoding={'async'}
              className={'size-full object-cover'}
            />
          ) : null}
          <Badge className={'absolute top-4 left-4'}>
            {String(position).padStart(2, '0')}
          </Badge>
        </div>

        <div className={'flex min-w-0 flex-col'}>
          <CardHeader className={'pt-5'}>
            <div className={'flex flex-wrap gap-2'}>
              <Badge variant={course.readiness === 'ready' ? 'outline' : 'secondary'}>
                {course.readiness === 'ready' ? 'พร้อมเรียน' : 'กำลังเตรียมเนื้อหา'}
              </Badge>
              {course.owned ? <Badge variant={'secondary'}>มีสิทธิ์เรียนแล้ว</Badge> : null}
              {course.evidence.freePreviewCount > 0 ? (
                <Badge variant={'secondary'}>ทดลองเรียน {course.evidence.freePreviewCount} บท</Badge>
              ) : null}
            </div>
            <CardTitle>
              <h3 className={'break-words text-xl leading-snug font-semibold tracking-tight'}>
                {course.title}
              </h3>
            </CardTitle>
            {description ? (
              <CardDescription className={'line-clamp-2 break-words leading-6'}>
                {getExcerpt(description, 120)}
              </CardDescription>
            ) : null}
          </CardHeader>

          <CardContent className={'flex flex-1 flex-wrap content-start gap-x-4 gap-y-2 text-xs text-muted-foreground'}>
            <span>{course.evidence.lessonCount} บทเรียน</span>
            {durationText ? <span>{durationText}</span> : null}
            {course.evidence.instructorName ? (
              <span>สอนโดย {course.evidence.instructorName}</span>
            ) : null}
            {review ? <span>★ {review.average.toFixed(1)} · {review.count} รีวิว</span> : null}
          </CardContent>

          <CardFooter className={'mt-5 flex-wrap justify-between gap-3 border-t py-5 text-sm'}>
            <span className={'flex flex-wrap items-baseline gap-2'}>
              <span>ราคาปัจจุบัน</span>
              <strong>{course.price.effectiveFormatted}</strong>
              {course.price.hasActiveDiscount ? (
                <s className={'text-muted-foreground'}>{course.price.regularFormatted}</s>
              ) : null}
            </span>
            <strong className={'text-primary'}>ดูรายละเอียด <span aria-hidden={true}>→</span></strong>
          </CardFooter>
        </div>
      </Link>
    </Card>
  );
}
