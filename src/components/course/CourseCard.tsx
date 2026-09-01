import Link from 'next/link';
import { ArrowRight, BookOpen, Clock3, PlayCircle, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { getExcerpt } from '@/lib/sanitize';
import type { CourseDecisionFacts } from '@/lib/course-decision-facts';
import CourseArtwork from '@/components/course/CourseArtwork';

interface Tag { id: string; name: string; slug: string }
interface CourseCardProps {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  decisionFacts: CourseDecisionFacts;
  tags?: Tag[];
  outcomes?: string[];
}

function normalizeUrl(url: string | null): string | null {
  if (!url || url.trim() === '') return null;
  return url.startsWith('http') ? url : `https://${url}`;
}

function formatCourseDuration(totalSeconds?: number): string | null {
  if (!totalSeconds || totalSeconds < 60) return null;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours} ชม. ${minutes} นาที`;
  if (hours > 0) return `${hours} ชม.`;
  return `${minutes} นาที`;
}

export default function CourseCard({
  title,
  slug,
  description,
  thumbnailUrl: rawThumbnailUrl,
  decisionFacts,
  tags,
  outcomes,
}: CourseCardProps) {
  const { evidence, price: pricing } = decisionFacts;
  const displayPrice = pricing.effective;
  const showOriginalPrice = pricing.discountPercent !== null;
  const discountPercent = pricing.discountPercent ?? 0;
  const instructorName = evidence.instructorName;
  const lessonCount = evidence.lessonCount;
  const thumbnailUrl = normalizeUrl(rawThumbnailUrl);
  const durationText = formatCourseDuration(evidence.knownDurationSeconds ?? undefined);
  const hasFreePreview = evidence.freePreviewCount > 0;

  return (
    <Link href={`/courses/${slug}`} className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
      <Card className="h-full gap-0 overflow-hidden py-0 transition-[transform,box-shadow] duration-200 group-hover:-translate-y-1 group-hover:shadow-[var(--academy-shadow-card-hover)] motion-reduce:transform-none">
        <div className="relative aspect-[16/9] overflow-hidden bg-[var(--academy-navy)] md:aspect-auto md:min-h-52">
          {thumbnailUrl
            ? <img src={thumbnailUrl} alt={title} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none" />
            : <CourseArtwork title={title} slug={slug} tags={tags} />}
          <div className="absolute top-4 left-4 flex flex-col items-start gap-2">
            {decisionFacts.readiness === 'preparing' ? <Badge variant="secondary">กำลังเตรียมเนื้อหา</Badge> : null}
            {hasFreePreview ? <Badge className="gap-1.5 bg-background/95 text-foreground shadow-sm"><PlayCircle />มีบทเรียนทดลอง</Badge> : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <CardContent className="flex flex-1 flex-col px-5 pt-5 sm:px-6 sm:pt-6">
            {tags?.length ? <div className="mb-4 flex flex-wrap gap-2">{tags.slice(0, 3).map((tag) => <Badge key={tag.id} variant="secondary">{tag.name}</Badge>)}{tags.length > 3 ? <Badge variant="outline">+{tags.length - 3}</Badge> : null}</div> : null}
            <h3 className="line-clamp-3 text-xl leading-snug font-semibold tracking-[-.02em] text-balance group-hover:text-primary">{title}</h3>
            {outcomes?.length ? <ul className="mt-4 flex flex-col gap-2 text-sm leading-6 text-muted-foreground">{outcomes.map((outcome) => <li key={outcome} className="flex gap-2"><span className="text-primary">✓</span>{outcome}</li>)}</ul> : description ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{getExcerpt(description, 120)}</p> : null}
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><BookOpen className="size-3.5" />{lessonCount} บทเรียน</span>
              {durationText ? <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />{durationText}</span> : null}
              {instructorName ? <span className="basis-full">สอนโดย {instructorName}</span> : null}
              {evidence.verifiedReview ? <span className="inline-flex items-center gap-1.5"><Star className="size-3.5 fill-current" />{evidence.verifiedReview.average.toFixed(1)} · {evidence.verifiedReview.count} รีวิว</span> : null}
            </div>
          </CardContent>

          <CardFooter className="mt-5 flex-wrap justify-between gap-x-4 gap-y-3 border-t px-5 py-5 sm:px-6">
            {decisionFacts.readiness === 'preparing' ? (
              <strong className="text-sm text-muted-foreground">ยังไม่เปิดลงทะเบียน</strong>
            ) : (
              <div aria-label={displayPrice === 0 ? 'ราคา ฟรี' : showOriginalPrice ? `ราคาพิเศษ ${pricing.effectiveFormatted} จาก ${pricing.regularFormatted} ลด ${discountPercent}%` : `ราคา ${pricing.effectiveFormatted}`}>
                {displayPrice === 0 ? <strong className="text-xl text-primary">ฟรี</strong> : <div className="flex flex-wrap items-baseline gap-2"><strong className="text-xl">{pricing.effectiveFormatted}</strong>{showOriginalPrice ? <><s className="text-sm text-muted-foreground">{pricing.regularFormatted}</s><Badge variant="destructive">ลด {discountPercent}%</Badge></> : null}</div>}
              </div>
            )}
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">{decisionFacts.actions.discovery.label}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
          </CardFooter>
        </div>
      </Card>
    </Link>
  );
}
