import type { ReactNode } from 'react';
import PublicContentHeader from './PublicContentHeader';
import { Card, CardContent } from '@/components/ui/card';

interface LegalDocumentProps { title: string; lede: string; updatedLabel: string; sections: Array<{ id: string; title: string }>; children: ReactNode }
interface LegalSectionProps { id: string; number: string; title: string; children: ReactNode }

export function LegalSection({ id, number, title, children }: LegalSectionProps) {
  return <section className="scroll-mt-24 border-b py-8 first:pt-0 last:border-0 last:pb-0" id={id} aria-labelledby={`${id}-title`}><div className="grid gap-4 sm:grid-cols-[3rem_1fr]"><div className="font-mono text-xs text-primary" aria-hidden="true">{number}</div><div><h2 id={`${id}-title`} className="text-xl font-semibold sm:text-2xl">{title}</h2><div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:hover:underline [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">{children}</div></div></div></section>;
}

export default function LegalDocument({ title, lede, updatedLabel, sections, children }: LegalDocumentProps) {
  return (
    <>
      <PublicContentHeader title={title} lede={lede} evidence={<Card><CardContent className="grid grid-cols-3 gap-3 pt-6 text-center text-sm"><div><dt className="text-xs text-muted-foreground">อัปเดต</dt><dd className="mt-2 font-semibold">1 ม.ค. 2568</dd></div><div><dt className="text-xs text-muted-foreground">หัวข้อ</dt><dd className="mt-2 text-xl font-semibold">{sections.length}</dd></div><div><dt className="text-xs text-muted-foreground">ติดต่อ</dt><dd className="mt-2"><a className="font-semibold text-primary hover:underline" href="mailto:milerdev.official@gmail.com">อีเมลทีม</a></dd></div></CardContent></Card>} />
      <section className="py-14 sm:py-20"><div className="container grid gap-10 lg:grid-cols-[16rem_1fr] lg:items-start lg:gap-14"><aside className="top-24 lg:sticky"><h2 className="text-2xl font-semibold">สารบัญ</h2><nav className="mt-5 space-y-1" aria-label={`สารบัญ${title}`}>{sections.map((section, index) => <a className="flex gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" href={`#${section.id}`} key={section.id}><span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, '0')}</span>{section.title}</a>)}</nav></aside><Card><CardContent className="pt-6"><header className="mb-8 flex flex-wrap justify-between gap-3 border-b pb-5 text-xs text-muted-foreground"><p>{updatedLabel}</p><span>เอกสารสาธารณะของ MilerDev</span></header>{children}</CardContent></Card></div></section>
    </>
  );
}
