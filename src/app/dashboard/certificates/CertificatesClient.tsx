'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '@/components/account/LearnerAccount.module.css';

interface Certificate {
  id: string;
  certificateCode: string;
  recipientName: string;
  courseTitle: string;
  completedAt: string;
  issuedAt: string;
  courseId: string;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function CertificatesClient() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [copyState, setCopyState] = useState<{ id: string; status: 'success' | 'error' } | null>(null);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCertificates() {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch('/api/certificates', { signal: controller.signal });
        if (!response.ok) throw new Error('Certificate request failed');
        const data = await response.json();
        setCertificates(Array.isArray(data.certificates) ? data.certificates : []);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadCertificates();
    return () => controller.abort();
  }, [reloadKey]);

  async function copyCertificateLink(certificate: Certificate) {
    try {
      const url = `${window.location.origin}/certificate/${certificate.certificateCode}`;
      await navigator.clipboard.writeText(url);
      setCopyState({ id: certificate.id, status: 'success' });
    } catch {
      setCopyState({ id: certificate.id, status: 'error' });
    }
  }

  if (loading) {
    return (
      <section className={styles.state} aria-live="polite" aria-busy="true">
        <div className={styles.stateInner}>
          <p className={styles.stateCode}>SYNCING CREDENTIALS</p>
          <h2>กำลังโหลดใบรับรอง</h2>
          <div className={styles.loadingBar} aria-hidden="true" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.state} role="alert">
        <div className={styles.stateInner}>
          <p className={styles.stateCode}>CREDENTIALS UNAVAILABLE</p>
          <h2>ยังดึงใบรับรองไม่ได้</h2>
          <p>ตรวจสอบการเชื่อมต่อหรือสถานะการเข้าสู่ระบบ แล้วลองโหลดข้อมูลอีกครั้ง</p>
          <button className={styles.primaryAction} type="button" onClick={retry}>ลองใหม่</button>
        </div>
      </section>
    );
  }

  if (certificates.length === 0) {
    return (
      <section className={styles.state}>
        <div className={styles.stateInner}>
          <p className={styles.stateCode}>NO CREDENTIALS YET</p>
          <h2>ยังไม่มีใบรับรอง</h2>
          <p>เรียนบทเรียนให้ครบตามเงื่อนไขของคอร์ส แล้วใบรับรองที่ออกให้จะถูกรวมไว้ที่นี่</p>
          <Link className={styles.primaryAction} href="/courses">เลือกคอร์สเรียน</Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="certificate-records-title">
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.sectionLabel}>Verified credentials</p>
          <h2 id="certificate-records-title">ใบรับรองทั้งหมด</h2>
        </div>
        <p className={styles.sectionNote}>{certificates.length} ใบ</p>
      </div>

      <div className={styles.records}>
        {certificates.map((certificate, index) => {
          const feedback = copyState?.id === certificate.id ? copyState.status : null;
          return (
            <article className={`${styles.record} ${styles.certificateRecord}`} key={certificate.id}>
              <span className={styles.recordIndex}>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3 className={styles.recordTitle}>{certificate.courseTitle}</h3>
                <div className={styles.recordMeta}>
                  <span>เรียนจบ {formatDate(certificate.completedAt)}</span>
                  <span className={styles.recordCode}>{certificate.certificateCode}</span>
                </div>
              </div>
              <div className={styles.actions}>
                <Link className={styles.primaryAction} href={`/certificate/${certificate.certificateCode}`}>
                  ดูใบรับรอง
                </Link>
                <button
                  className={styles.secondaryAction}
                  type="button"
                  onClick={() => copyCertificateLink(certificate)}
                  aria-label={`คัดลอกลิงก์ใบรับรอง ${certificate.courseTitle}`}
                >
                  {feedback === 'success' ? 'คัดลอกแล้ว' : feedback === 'error' ? 'คัดลอกไม่สำเร็จ' : 'คัดลอกลิงก์'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <p className={styles.fieldHint} aria-live="polite">
        {copyState?.status === 'success' ? 'คัดลอกลิงก์ใบรับรองไปยังคลิปบอร์ดแล้ว' : copyState?.status === 'error' ? 'ไม่สามารถคัดลอกลิงก์ได้ กรุณาเปิดใบรับรองแล้วคัดลอกที่อยู่จากเบราว์เซอร์' : ''}
      </p>
    </section>
  );
}
