import Link from 'next/link';
import { ArrowRight, Check, PlayCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

const VISITOR_FACTS = [
  'บทเรียนทดลองเปิดดูได้โดยไม่ต้องสมัคร',
  'ชำระครั้งเดียว เรียนได้ตลอดชีพ',
  'ใบรับรองเมื่อเรียนครบ',
] as const;

/**
 * The hero's actions. A visitor gets the catalogue, a free lesson and the buying facts; a learner with a
 * course in progress already has "เรียนต่อ" in the bar above, so the hero steps back to one outlined link.
 */
export default function HomeHeroActions({ forVisitor }: { forVisitor: boolean }) {
  return (
    <>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button asChild size="hero" variant={forVisitor ? 'hero' : 'heroOutline'}>
          <Link href="/courses">
            ดูคอร์สทั้งหมด
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
        {forVisitor ? (
          <Button asChild size="hero" variant="heroOutline">
            <Link href="/courses?preview=free">
              <PlayCircle data-icon="inline-start" aria-hidden="true" />
              ทดลองบทเรียนฟรี
            </Link>
          </Button>
        ) : null}
      </div>

      {forVisitor ? (
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {VISITOR_FACTS.map((fact) => (
            <li key={fact} className="flex items-center gap-1.5">
              <Check className="size-4 text-link" aria-hidden="true" />
              {fact}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
