import type { ReactNode } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import styles from './LearnerAccount.module.css';

type AccountRoute = 'certificates' | 'payments' | 'profile' | 'settings';

interface LearnerAccountShellProps {
  children: ReactNode;
  current: AccountRoute;
  eyebrow: string;
  title: string;
  description: string;
}

const accountLinks: Array<{ key: AccountRoute | 'dashboard'; href: string; label: string; index: string }> = [
  { key: 'dashboard', href: '/dashboard', label: 'ภาพรวมการเรียน', index: '00' },
  { key: 'certificates', href: '/dashboard/certificates', label: 'ใบรับรอง', index: '01' },
  { key: 'payments', href: '/dashboard/payments', label: 'การชำระเงิน', index: '02' },
  { key: 'profile', href: '/profile', label: 'โปรไฟล์', index: '03' },
  { key: 'settings', href: '/settings', label: 'ตั้งค่าบัญชี', index: '04' },
];

export default function LearnerAccountShell({ children, current, eyebrow, title, description }: LearnerAccountShellProps) {
  return (
    <>
      <Navbar />
      <main className={styles.account}>
        <div className={`container ${styles.container}`}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h1>{title}</h1>
              <p className={styles.description}>{description}</p>
            </div>
            <p className={styles.context}>
              LEARNER ACCOUNT<br />
              <span>ข้อมูลของคุณในที่เดียว</span>
            </p>
          </header>

          <div className={styles.workspace}>
            <nav className={styles.index} aria-label="เมนูบัญชีผู้เรียน">
              <p className={styles.indexLabel}>ACCOUNT INDEX</p>
              {accountLinks.map((item) => {
                const isCurrent = item.key === current;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={isCurrent ? styles.indexLinkCurrent : styles.indexLink}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    <span>{item.index}</span>
                    {item.label}
                    <span aria-hidden="true">{isCurrent ? '●' : '↗'}</span>
                  </Link>
                );
              })}
            </nav>
            <div className={styles.content}>{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
