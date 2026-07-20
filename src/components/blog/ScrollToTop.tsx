'use client';

import { useEffect, useState } from 'react';
import styles from './BlogControls.module.css';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type={'button'}
      className={styles.scrollTop}
      onClick={() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      }}
      aria-label={'กลับขึ้นด้านบน'}
    >
      <svg viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={2.5} aria-hidden={true}>
        <polyline points={'18 15 12 9 6 15'} />
      </svg>
    </button>
  );
}
