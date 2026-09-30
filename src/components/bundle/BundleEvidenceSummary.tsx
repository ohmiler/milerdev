import type { BundleDecisionFacts } from '@/lib/bundle-decision-facts';
import { formatCourseDuration } from '@/lib/course-duration';

type BundleEvidenceSummaryProps = {
  evidence: BundleDecisionFacts['evidence'];
};

export default function BundleEvidenceSummary({ evidence }: BundleEvidenceSummaryProps) {
  const durationText = formatCourseDuration(evidence.knownDurationSeconds);
  const items = [
    { label: 'คอร์ส', value: `${evidence.courseCount} คอร์ส` },
    { label: 'บทเรียน', value: `${evidence.totalLessons} บทเรียน` },
    ...(durationText ? [{ label: 'ระยะเวลา', value: durationText }] : []),
    ...(evidence.freePreviewCount > 0
      ? [{ label: 'บททดลอง', value: `ทดลองเรียน ${evidence.freePreviewCount} บท` }]
      : []),
  ];

  return (
    <dl
      className={'grid gap-3 sm:grid-cols-2 lg:grid-cols-4'}
      aria-label={'ข้อมูลชุดคอร์ส'}
    >
      {items.map((item) => (
        <div key={item.label} className={'min-w-0 rounded-lg border bg-background p-4'}>
          <dt className={'text-sm text-muted-foreground'}>{item.label}</dt>
          <dd className={'mt-1 break-words text-lg font-semibold'}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
