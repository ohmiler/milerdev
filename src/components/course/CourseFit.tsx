import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export interface CourseFitContent {
  learningOutcomes: string[] | null;
  targetAudience: string[] | null;
  prerequisites: string[] | null;
  prerequisiteCourse: { title: string; slug: string } | null;
}

export function hasCourseFitContent(content: CourseFitContent): boolean {
  return Boolean(
    content.learningOutcomes?.length
      || content.targetAudience?.length
      || content.prerequisites?.length
      || content.prerequisiteCourse,
  );
}

/**
 * What a learner gets, who the course suits and what to know first, as an admin wrote them
 * (ADR 0005, Phase 2). A group without content is left out rather than filled in.
 */
export default function CourseFit({ content }: { content: CourseFitContent }) {
  const { learningOutcomes, targetAudience, prerequisites, prerequisiteCourse } = content;
  const showPrerequisites = Boolean(prerequisites?.length || prerequisiteCourse);

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {learningOutcomes?.length ? (
        <Card className="gap-3 py-6">
          <CardHeader className="px-6"><h3 className="text-lead font-semibold">สิ่งที่คุณจะได้</h3></CardHeader>
          <CardContent className="px-6">
            <ul className="grid gap-3 text-sm leading-6">
              {learningOutcomes.map((item) => (
                <li key={item} className="flex gap-2.5"><Check className="mt-1 size-4 shrink-0 text-success" aria-hidden="true" />{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      {targetAudience?.length ? (
        <Card className="gap-3 py-6">
          <CardHeader className="px-6"><h3 className="text-lead font-semibold">เหมาะกับ</h3></CardHeader>
          <CardContent className="px-6">
            <ul className="grid list-disc gap-3 pl-5 text-sm leading-6 marker:text-link">
              {targetAudience.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      {showPrerequisites ? (
        <Card className="gap-3 border-warning/30 bg-warning-muted py-6">
          <CardHeader className="px-6"><h3 className="text-lead font-semibold">ควรรู้ก่อนเรียน</h3></CardHeader>
          <CardContent className="grid gap-3 px-6 text-sm leading-6">
            {prerequisites?.length ? (
              <ul className="grid list-disc gap-2 pl-5">
                {prerequisites.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : null}
            {prerequisiteCourse ? (
              <Link href={`/courses/${prerequisiteCourse.slug}`} className="inline-flex items-center gap-1.5 font-semibold text-link hover:underline">
                ยังไม่พร้อม เริ่มที่ {prerequisiteCourse.title}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
