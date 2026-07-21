import type { ReactNode } from 'react';
import PublicContentHeader from './PublicContentHeader';
import styles from './public-content.module.css';

interface LegalDocumentProps {
  eyebrow: string;
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

export function LegalSection({ id, number, title, children }: LegalSectionProps) {
  return (
    <section className={styles.legalSection} id={id} aria-labelledby={id + '-title'}>
      <div className={styles.legalSectionNumber} aria-hidden="true">{number}</div>
      <div className={styles.legalSectionBody}>
        <h2 id={id + '-title'}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

export default function LegalDocument({
  eyebrow,
  title,
  lede,
  updatedLabel,
  sections,
  children,
}: LegalDocumentProps) {
  return (
    <>
      <PublicContentHeader
        eyebrow={eyebrow}
        title={title}
        lede={lede}
        evidence={(
          <dl className={styles.heroEvidence} aria-label="ข้อมูลเอกสาร">
            <div><dt>อัปเดต</dt><dd>1 ม.ค. 2568</dd></div>
            <div><dt>หัวข้อ</dt><dd>{sections.length}</dd></div>
            <div><dt>ติดต่อ</dt><dd><a href="mailto:milerdev.official@gmail.com">อีเมลทีม</a></dd></div>
          </dl>
        )}
      />
      <section className={styles.legalBody}>
        <div className={['container', styles.legalLayout].join(' ')}>
          <aside className={styles.legalIndex}>
            <p className={styles.sectionLabel}>Document index</p>
            <h2>สารบัญ</h2>
            <nav aria-label={'สารบัญ' + title}>
              {sections.map((section, index) => (
                <a href={'#' + section.id} key={section.id}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>
          <article className={styles.legalDocument}>
            <header className={styles.documentHeader}>
              <p>{updatedLabel}</p>
              <span>เอกสารสาธารณะของ MilerDev</span>
            </header>
            {children}
          </article>
        </div>
      </section>
    </>
  );
}
