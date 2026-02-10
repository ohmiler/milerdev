'use client';

import { useRef, useState } from 'react';
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
}

// Generate a consistent color theme based on course ID
function getCourseTheme(courseId: string) {
  const themes = [
    { primary: '#2563eb', secondary: '#1e3a8a', gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', light: '#eff6ff', accent: '#3b82f6', name: 'blue' },
    { primary: '#7c3aed', secondary: '#4c1d95', gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)', light: '#f5f3ff', accent: '#8b5cf6', name: 'purple' },
    { primary: '#059669', secondary: '#064e3b', gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)', light: '#ecfdf5', accent: '#10b981', name: 'green' },
    { primary: '#dc2626', secondary: '#7f1d1d', gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', light: '#fef2f2', accent: '#ef4444', name: 'red' },
    { primary: '#d97706', secondary: '#78350f', gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)', light: '#fffbeb', accent: '#f59e0b', name: 'amber' },
    { primary: '#0891b2', secondary: '#164e63', gradient: 'linear-gradient(135deg, #164e63 0%, #0891b2 100%)', light: '#ecfeff', accent: '#06b6d4', name: 'cyan' },
    { primary: '#be185d', secondary: '#831843', gradient: 'linear-gradient(135deg, #831843 0%, #be185d 100%)', light: '#fdf2f8', accent: '#ec4899', name: 'pink' },
    { primary: '#4f46e5', secondary: '#312e81', gradient: 'linear-gradient(135deg, #312e81 0%, #4f46e5 100%)', light: '#eef2ff', accent: '#6366f1', name: 'indigo' },
  ];

  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = courseId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return themes[Math.abs(hash) % themes.length];
}

export default function CertificateCard({ cert }: { cert: CertificateData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const theme = getCourseTheme(cert.courseId);
  const isRevoked = !!cert.revokedAt;

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
          background: theme.gradient,
          padding: '48px 40px 40px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative elements */}
          <div style={{ position: 'absolute', top: '-30px', left: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', bottom: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', top: '20px', right: '60px', width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

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
          }}>
            <img
              src="/milerdev-logo-transparent.png"
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
          }}>
            Certificate of Completion
          </p>
          <h1 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
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
