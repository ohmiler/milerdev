import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import CourseArtwork from '@/components/course/CourseArtwork';
import CourseCoverImage from '@/components/course/CourseCoverImage';
import type { CourseDecisionFacts } from '@/lib/commerce/course-decision-facts';
import { resolveCoverImage } from '@/lib/courses/cover-image';
import { formatCourseDuration } from '@/lib/courses/duration';

interface HomeCourseRowProps {
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  decisionFacts: CourseDecisionFacts;
}

/** A compact course link for courses outside the Home learning path. */
export default function HomeCourseRow({ title, slug, thumbnailUrl: rawThumbnailUrl, decisionFacts }: HomeCourseRowProps) {
  const cover = resolveCoverImage(rawThumbnailUrl);
  const { evidence, price, readiness } = decisionFacts;
  const duration = formatCourseDuration(evidence.knownDurationSeconds);
  const meta = [`${evidence.lessonCount} บทเรียน`, duration, evidence.freePreviewCount > 0 ? `ทดลองฟรี ${evidence.freePreviewCount} บท` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      href={`/courses/${slug}`}
      className="group flex items-center gap-4 rounded-2xl border bg-card p-3 pr-5 transition-colors hover:border-link/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      <div className="relative aspect-[16/9] w-28 shrink-0 overflow-hidden rounded-xl bg-navy">
        {cover
          ? <CourseCoverImage cover={cover} alt="" width={224} height={126} sizes="7rem" className="size-full object-cover" />
          : <CourseArtwork title={title} slug={slug} compact />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold leading-snug group-hover:text-link">{title}</span>
        <span className="text-sm text-muted-foreground">{meta}</span>
      </div>
      <span className="hidden shrink-0 font-semibold sm:block">
        {readiness === 'preparing' ? 'ยังไม่เปิด' : price.effective === 0 ? 'ฟรี' : price.effectiveFormatted}
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  );
}
