'use client';

import { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';

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

// Generate a full theme from any hex color
function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) || 0,
    g: parseInt(h.substring(2, 4), 16) || 0,
    b: parseInt(h.substring(4, 6), 16) || 0,
  };
}

function darken(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - amount;
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r * f)}${toHex(g * f)}${toHex(b * f)}`;
}

function lighten(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n + (255 - n) * amount))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function buildTheme(color: string) {
  const primary = color.startsWith('#') && color.length === 7 ? color : '#2563eb';
  const secondary = darken(primary, 0.4);
  const accent = lighten(primary, 0.2);
  const light = lighten(primary, 0.9);
  return {
    primary,
    secondary,
    accent,
    light,
    gradient: `linear-gradient(135deg, ${secondary} 0%, ${primary} 100%)`,
  };
}

// Convert an image URL to a data URL for html-to-image compatibility
async function toDataUrl(url: string): Promise<string> {
  try {
    // For same-origin images (e.g. /milerdev-logo-transparent.png), fetch directly
    if (url.startsWith('/') && !url.startsWith('//')) {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    // For cross-origin images (e.g. Bunny CDN), use server-side proxy to bypass CORS/CSP
    const proxyRes = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
    if (proxyRes.ok) {
      const data = await proxyRes.json();
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
  const [logoDataUrl, setLogoDataUrl] = useState<string>('/milerdev-logo-transparent.png');
  const [headerDataUrl, setHeaderDataUrl] = useState<string | null>(cert.certificateHeaderImage || null);
  const theme = buildTheme(cert.certificateTheme || '#2563eb');
  const isRevoked = !!cert.revokedAt;

  // Pre-cache images as data URLs for download compatibility
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

  const handleDownload = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
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
    } catch (err) {
      console.error('Download error:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลด');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {/* Certificate Card */}
      <div
        ref={cardRef}
        style={{
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 4px 40px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          border: isRevoked ? '2px solid #fecaca' : `2px solid ${theme.accent}33`,
          opacity: isRevoked ? 0.7 : 1,
        }}
      >
        {/* Header */}
        <div style={{
          background: headerDataUrl ? undefined : theme.gradient,
          padding: '48px 40px 40px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Header background image (using img tag for download compatibility) */}
          {headerDataUrl && (
            <img
              src={headerDataUrl}
              alt=""
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 0,
              }}
            />
          )}
          {/* Decorative elements (only show when no custom image) */}
          {!headerDataUrl && (
            <>
              <div style={{ position: 'absolute', top: '-30px', left: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ position: 'absolute', bottom: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ position: 'absolute', top: '20px', right: '60px', width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
            </>
          )}

          {/* Logo */}
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 20px',
            borderRadius: '16px',
            overflow: 'hidden',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
          }}>
            <img
              src={logoDataUrl}
              alt="MilerDev"
              style={{ width: '52px', height: '52px', objectFit: 'contain' }}
            />
          </div>

          <p style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.75rem',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            marginBottom: '8px',
            fontWeight: 500,
            position: 'relative',
            zIndex: 1,
          }}>
            Certificate of Completion
          </p>
          <h1 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 600, margin: 0, position: 'relative', zIndex: 1 }}>
            ใบรับรองสำเร็จหลักสูตร
          </h1>
        </div>

        {/* Body */}
        <div style={{ padding: '48px 40px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '4px' }}>มอบให้แก่</p>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '32px',
            lineHeight: 1.3,
          }}>
            {cert.recipientName}
          </h2>

          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '4px' }}>สำเร็จหลักสูตร</p>
          <h3 style={{
            fontSize: '1.375rem',
            fontWeight: 600,
            color: theme.primary,
            marginBottom: '32px',
            lineHeight: 1.4,
          }}>
            {cert.courseTitle}
          </h3>

          {/* Decorative line with accent */}
          <div style={{
            width: '80px',
            height: '3px',
            background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent})`,
            margin: '0 auto 32px',
            borderRadius: '2px',
          }} />

          {/* Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '24px',
            maxWidth: '500px',
            margin: '0 auto',
          }}>
            <div>
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '4px' }}>วันที่สำเร็จ</p>
              <p style={{ fontWeight: 600, color: '#334155' }}>{completedDate}</p>
            </div>
            <div>
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '4px' }}>วันที่ออกใบรับรอง</p>
              <p style={{ fontWeight: 600, color: '#334155' }}>{issuedDate}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          background: '#f8fafc',
          padding: '20px 40px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '2px' }}>รหัสใบรับรอง</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 700, color: theme.primary, fontSize: '0.9375rem' }}>
              {cert.certificateCode}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '2px' }}>ออกโดย</p>
            <p style={{ fontWeight: 600, color: '#334155', fontSize: '0.9375rem' }}>MilerDev</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ textAlign: 'center', marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            padding: '12px 24px',
            background: theme.primary,
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.9375rem',
            cursor: downloading ? 'wait' : 'pointer',
            opacity: downloading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {downloading ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลดใบรับรอง'}
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('คัดลอกลิงก์แล้ว!');
          }}
          style={{
            padding: '12px 24px',
            background: 'white',
            color: '#334155',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            fontWeight: 500,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          แชร์ลิงก์
        </button>
        {cert.courseSlug && (
          <a
            href={`/courses/${cert.courseSlug}`}
            style={{
              padding: '12px 24px',
              background: 'white',
              color: '#334155',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              fontWeight: 500,
              fontSize: '0.9375rem',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            ดูรายละเอียดคอร์ส
          </a>
        )}
      </div>
    </>
  );
}
