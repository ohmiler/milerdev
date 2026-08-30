'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toPng } from 'html-to-image';
import styles from './CertificateArtifact.module.css';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface CertificateData {
  certificateCode: string;
  recipientName: string;
  courseTitle: string;
  completedAt: string;
  issuedAt: string | null;
  revokedAt: string | null;
  courseSlug: string | null;
  courseId: string;
  certificateTheme?: string | null;
  certificateHeaderImage?: string | null;
}

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  return {
    r: Number.parseInt(value.substring(0, 2), 16) || 0,
    g: Number.parseInt(value.substring(2, 4), 16) || 0,
    b: Number.parseInt(value.substring(4, 6), 16) || 0,
  };
}

function darken(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - amount;
  const toHex = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
  return `#${toHex(r * factor)}${toHex(g * factor)}${toHex(b * factor)}`;
}

function lighten(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const toHex = (value: number) => Math.max(0, Math.min(255, Math.round(value + (255 - value) * amount))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function buildTheme(color: string) {
  const primary = color.startsWith('#') && color.length === 7 ? color : '#00abff';
  return {
    primary,
    secondary: darken(primary, 0.46),
    accent: lighten(primary, 0.2),
    light: lighten(primary, 0.9),
  };
}

async function toDataUrl(url: string): Promise<string> {
  try {
    if (url.startsWith('/') && !url.startsWith('//')) {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
    if (response.ok) {
      const data = await response.json();
      if (data.dataUrl) return data.dataUrl;
    }
    return url;
  } catch {
    return url;
  }
}

export default function CertificateCard({ cert }: { cert: CertificateData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState('/milerdev-logo-transparent.png');
  const [headerDataUrl, setHeaderDataUrl] = useState<string | null>(cert.certificateHeaderImage || null);
  const theme = buildTheme(cert.certificateTheme || '#00abff');
  const isRevoked = Boolean(cert.revokedAt);
  const documentStyle = {
    '--certificate-primary': theme.primary,
    '--certificate-secondary': theme.secondary,
    '--certificate-accent': theme.accent,
    '--certificate-light': theme.light,
  } as CSSProperties;

  useEffect(() => {
    toDataUrl('/milerdev-logo-transparent.png').then(setLogoDataUrl);
    if (cert.certificateHeaderImage) {
      toDataUrl(cert.certificateHeaderImage).then(setHeaderDataUrl);
    }
  }, [cert.certificateHeaderImage]);

  const completedDate = new Date(cert.completedAt).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const issuedDate = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    : completedDate;

  async function handleDownload() {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    setFeedback(null);

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `certificate-${cert.certificateCode}.png`;
      link.href = dataUrl;
      link.click();
      setFeedback({ tone: 'success', message: 'เตรียมไฟล์ใบรับรองสำหรับดาวน์โหลดแล้ว' });
    } catch (error) {
      console.error('Download error:', error);
      setFeedback({ tone: 'error', message: 'ยังสร้างไฟล์ดาวน์โหลดไม่ได้ กรุณาลองใหม่' });
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    setFeedback(null);
    try {
      await navigator.clipboard.writeText(window.location.href);
      setFeedback({ tone: 'success', message: 'คัดลอกลิงก์ตรวจสอบใบรับรองแล้ว' });
    } catch {
      setFeedback({ tone: 'error', message: 'คัดลอกลิงก์ไม่ได้ กรุณาคัดลอกจากแถบที่อยู่ของเบราว์เซอร์' });
    }
  }

  return (
    <>
      <div
        className={`${styles.certificateDocument} ${isRevoked ? styles.certificateRevoked : ''}`}
        data-certificate-status={isRevoked ? 'revoked' : 'valid'}
        ref={cardRef}
        role="document"
        aria-labelledby="certificate-document-title"
        style={documentStyle}
      >
        {isRevoked && <div className={styles.revokedWatermark}>REVOKED / เพิกถอนแล้ว</div>}

        <header className={styles.certificateMasthead}>
          {headerDataUrl && (
            // A plain image is required because html-to-image exports the rendered node directly.
            <img className={styles.certificateHeaderImage} src={headerDataUrl} alt="" />
          )}
          <div className={styles.certificateBrand}>
            <img src={logoDataUrl} alt="MilerDev" />
            <span>MilerDev Learning</span>
          </div>
          <div className={styles.certificateHeading}>
            <p>Certificate of Completion</p>
            <strong id="certificate-document-title">ใบรับรองการสำเร็จหลักสูตร</strong>
          </div>
          <span className={styles.certificateSerial}>NO. {cert.certificateCode}</span>
        </header>

        <div className={styles.certificateBody}>
          <p className={styles.certificateIntro}>เอกสารฉบับนี้รับรองว่า</p>
          <h2>{cert.recipientName}</h2>
          <p className={styles.certificateIntro}>ได้สำเร็จหลักสูตร</p>
          <h3>{cert.courseTitle}</h3>

          <div className={styles.certificateRule} aria-hidden="true" />

          <dl className={styles.certificateDetails}>
            <div><dt>วันที่สำเร็จ</dt><dd>{completedDate}</dd></div>
            <div><dt>วันที่ออกใบรับรอง</dt><dd>{issuedDate}</dd></div>
            <div><dt>สถานะเอกสาร</dt><dd>{isRevoked ? 'เพิกถอนแล้ว' : 'ตรวจสอบได้'}</dd></div>
          </dl>
        </div>

        <footer className={styles.certificateFooter}>
          <div>
            <span>ISSUED BY</span>
            <strong>MilerDev</strong>
          </div>
          <div>
            <span>VERIFICATION CODE</span>
            <strong>{cert.certificateCode}</strong>
          </div>
        </footer>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3" aria-label="เครื่องมือใบรับรอง">
        <Button type="button" onClick={handleDownload} disabled={downloading}>
          {downloading ? <><Spinner data-icon="inline-start" />กำลังสร้างไฟล์...</> : 'ดาวน์โหลด PNG'}
        </Button>
        <Button variant="outline" type="button" onClick={handleShare}>คัดลอกลิงก์</Button>
        {cert.courseSlug && <Button asChild variant="outline"><Link href={`/courses/${cert.courseSlug}`}>ดูรายละเอียดคอร์ส</Link></Button>}
      </div>

      {feedback ? (
        <Alert
          className="mx-auto mt-3 max-w-xl"
          variant={feedback.tone === 'error' ? 'destructive' : 'default'}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
