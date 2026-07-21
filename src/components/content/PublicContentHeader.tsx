import type { ReactNode } from 'react';
import styles from './public-content.module.css';

interface PublicContentHeaderProps {
  eyebrow: string;
  title: string;
  lede: string;
  evidence: ReactNode;
}

export default function PublicContentHeader({ eyebrow, title, lede, evidence }: PublicContentHeaderProps) {
  return (
    <header className={styles.hero}>
      <div className={['container', styles.heroGrid].join(' ')}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.lede}>{lede}</p>
        </div>
        {evidence}
      </div>
    </header>
  );
}
