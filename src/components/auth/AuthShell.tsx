import type { ReactNode } from 'react';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import styles from './auth.module.css';

type EvidenceItem = {
  label: string;
  text: string;
};

type AuthShellProps = {
  pageId: string;
  panelMeta: string;
  panelTitle: string;
  panelDescription: string;
  contextMeta: string;
  contextTitle: ReactNode;
  contextDescription: string;
  evidence: EvidenceItem[];
  children: ReactNode;
  variant?: 'login' | 'register' | 'recovery';
};

export default function AuthShell({
  pageId,
  panelMeta,
  panelTitle,
  panelDescription,
  contextMeta,
  contextTitle,
  contextDescription,
  evidence,
  children,
  variant = 'login',
}: AuthShellProps) {
  const titleId = `${pageId}-title`;
  const contextTitleId = `${pageId}-context-title`;

  return (
    <>
      <Navbar />
      <main className={styles.shell}>
        <div className={`${styles.grid} ${styles[variant]}`}>
          <section className={styles.panel} aria-labelledby={titleId}>
            <header className={styles.panelHeader}>
              <p className={styles.meta}>{panelMeta}</p>
              <h1 id={titleId}>{panelTitle}</h1>
              <p>{panelDescription}</p>
            </header>
            {children}
          </section>

          <section className={styles.context} aria-labelledby={contextTitleId}>
            <div className={styles.brand}>
              <Image
                src={'/milerdev-logo-transparent.png'}
                alt={''}
                width={44}
                height={44}
                priority
              />
              <span>MilerDev Learning</span>
            </div>

            <div className={styles.contextCopy}>
              <p className={styles.meta}>{contextMeta}</p>
              <h2 id={contextTitleId}>{contextTitle}</h2>
              <p>{contextDescription}</p>
            </div>

            <ol className={styles.evidence}>
              {evidence.map((item, index) => (
                <li key={item.label}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
