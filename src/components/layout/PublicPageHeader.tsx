import styles from './PublicPageHeader.module.css';

interface PublicPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  variant: 'story' | 'task';
}

export default function PublicPageHeader({
  eyebrow,
  title,
  description,
  variant,
}: PublicPageHeaderProps) {
  return (
    <header className={styles.header} data-public-header="" data-variant={variant}>
      <div className={['container', styles.inner].join(' ')}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <div className={styles.grid}>
          <h1>{title}</h1>
          <p className={styles.description}>{description}</p>
        </div>
      </div>
    </header>
  );
}
