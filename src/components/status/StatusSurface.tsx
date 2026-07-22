import type { ReactNode } from 'react';
import styles from './StatusSurface.module.css';

interface StatusSurfaceProps {
  code: string;
  routeLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  note: string;
  children: ReactNode;
}

export default function StatusSurface({
  code,
  routeLabel,
  eyebrow,
  title,
  description,
  note,
  children,
}: StatusSurfaceProps) {
  return (
    <main className={styles.page} data-status-surface={routeLabel}>
      <section className={styles.frame} aria-labelledby="status-surface-title">
        <div className={styles.rail} aria-hidden="true">
          <div className={styles.railHeader}>
            <span>Route status</span>
            <span className={styles.liveMark}>MilerDev</span>
          </div>
          <strong className={styles.code}>{code}</strong>
          <div className={styles.trace}>
            <span>01</span>
            <span className={styles.traceLine} />
            <span>{routeLabel}</span>
          </div>
        </div>

        <div className={styles.content}>
          <p className={styles.eyebrow}><span />{eyebrow}</p>
          <h1 id="status-surface-title">{title}</h1>
          <p className={styles.description}>{description}</p>
          <div className={styles.actions}>{children}</div>
          <p className={styles.note}>{note}</p>
        </div>
      </section>
    </main>
  );
}
