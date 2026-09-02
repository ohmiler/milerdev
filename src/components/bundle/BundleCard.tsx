import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { BundleDecisionFacts } from '@/lib/bundle-decision-facts';

type BundleCardProps = {
  title: string;
  description: string | null;
  decisionFacts: BundleDecisionFacts;
};

export default function BundleCard({ title, description, decisionFacts }: BundleCardProps) {
  const { comparison } = decisionFacts.price;

  return (
    <Link
      href={decisionFacts.actions.discovery.href}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      <Card className="h-full">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge>Bundle · {decisionFacts.evidence.courseCount} คอร์ส</Badge>
            {decisionFacts.readiness === 'preparing' ? (
              <Badge variant="secondary">กำลังเตรียมเนื้อหา</Badge>
            ) : (
              <Badge variant={comparison.kind === 'savings' ? 'destructive' : 'outline'}>
                {comparison.label}
              </Badge>
            )}
          </div>
          <CardTitle className="mt-3 text-2xl group-hover:text-primary">{title}</CardTitle>
          {description ? (
            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 border-y py-4 text-sm">
            {decisionFacts.courses.slice(0, 2).map((course, index) => (
              <p key={course.id}>{String(index + 1).padStart(2, '0')} · {course.title}</p>
            ))}
            {decisionFacts.courses.length > 2 ? (
              <p className="text-muted-foreground">+{decisionFacts.courses.length - 2} คอร์ส</p>
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="flex-wrap justify-between gap-4">
          <div className="flex flex-col gap-1">
            <strong className="text-2xl">
              {decisionFacts.price.isFree ? 'ฟรี' : decisionFacts.price.bundleFormatted}
            </strong>
            <span className="text-xs text-muted-foreground">
              ซื้อแยกวันนี้ {decisionFacts.price.separateCurrentFormatted}
            </span>
          </div>
          <span className="text-sm font-semibold text-primary">
            {decisionFacts.actions.discovery.label} <span aria-hidden="true">→</span>
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
