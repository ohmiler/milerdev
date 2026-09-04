import type { ReactNode } from 'react';
import PublicContentHeader from './PublicContentHeader';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface LegalDocumentProps {
  title: string;
  lede: string;
  updatedLabel: string;
  sections: Array<{ id: string; title: string }>;
  children: ReactNode;
}

interface LegalSectionProps {
  id: string;
  number: string;
  title: string;
  children: ReactNode;
}

interface LegalTableOfContentsProps {
  title: string;
  sections: LegalDocumentProps['sections'];
  mobile?: boolean;
}

function LegalTableOfContents({ title, sections, mobile = false }: LegalTableOfContentsProps) {
  const links = sections.map((section, index) => (
    <a
      className={'flex gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground'}
      href={`#${section.id}`}
      key={section.id}
    >
      <span className={'font-mono text-xs text-primary'}>{String(index + 1).padStart(2, '0')}</span>
      {section.title}
    </a>
  ));

  if (mobile) {
    return (
      <Accordion type={'single'} collapsible className={'lg:hidden'}>
        <AccordionItem value={'legal-table-of-contents'}>
          <AccordionTrigger className={'items-center'} aria-label={'สารบัญบนมือถือ'}>
            <span className={'flex items-center gap-3'}>
              สารบัญ
              <Badge variant={'secondary'}>{sections.length} หัวข้อ</Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <nav className={'flex flex-col gap-1'} aria-label={`สารบัญ${title}บนมือถือ`}>
              {links}
            </nav>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <aside className={'top-24 hidden lg:sticky lg:block'}>
      <h2 className={'text-2xl font-semibold'}>สารบัญ</h2>
      <nav className={'mt-5 flex flex-col gap-1'} aria-label={`สารบัญ${title}`}>
        {links}
      </nav>
    </aside>
  );
}

export function LegalSection({ id, number, title, children }: LegalSectionProps) {
  return (
    <section
      className={'scroll-mt-24 border-b py-8 outline-none first:pt-0 last:border-0 last:pb-0 focus-visible:ring-[3px] focus-visible:ring-ring/50'}
      id={id}
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
    >
      <div className={'grid gap-4 sm:grid-cols-[3rem_1fr]'}>
        <div className={'font-mono text-xs text-primary'} aria-hidden={true}>{number}</div>
        <div>
          <h2 id={`${id}-title`} className={'text-xl font-semibold sm:text-2xl'}>{title}</h2>
          <div className={'mt-4 flex flex-col gap-4 text-sm leading-7 text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:hover:underline [&_li]:pl-1 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5'}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LegalDocument({ title, lede, updatedLabel, sections, children }: LegalDocumentProps) {
  return (
    <>
      <PublicContentHeader
        title={title}
        lede={lede}
        evidence={(
          <Card>
            <CardContent className={'grid grid-cols-3 gap-3 pt-6 text-center text-sm'}>
              <dl><dt className={'text-xs text-muted-foreground'}>อัปเดต</dt><dd className={'mt-2 font-semibold'}>{updatedLabel}</dd></dl>
              <dl><dt className={'text-xs text-muted-foreground'}>หัวข้อ</dt><dd className={'mt-2 text-xl font-semibold'}>{sections.length}</dd></dl>
              <dl><dt className={'text-xs text-muted-foreground'}>ติดต่อ</dt><dd className={'mt-2'}><a className={'font-semibold text-primary hover:underline'} href={'mailto:milerdev.official@gmail.com'}>อีเมลทีม</a></dd></dl>
            </CardContent>
          </Card>
        )}
      />
      <section className={'py-14 sm:py-20'}>
        <div className={'container flex flex-col gap-6 lg:grid lg:grid-cols-[16rem_1fr] lg:items-start lg:gap-14'}>
          <LegalTableOfContents title={title} sections={sections} mobile />
          <LegalTableOfContents title={title} sections={sections} />
          <Card>
            <CardContent className={'pt-6'}>
              <header className={'mb-8 flex flex-wrap justify-between gap-3 border-b pb-5 text-xs text-muted-foreground'}>
                <p>{updatedLabel}</p>
                <span>เอกสารสาธารณะของ MilerDev</span>
              </header>
              {children}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
