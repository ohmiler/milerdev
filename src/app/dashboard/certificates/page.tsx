'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

interface Certificate {
  id: string;
  certificateCode: string;
  recipientName: string;
  courseTitle: string;
  completedAt: string;
  issuedAt: string;
  courseId: string;
}

export default function UserCertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/certificates')
      .then(res => res.json())
      .then(data => setCerts(data.certificates || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: '#f8fafc', paddingTop: '40px', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 16px' }}>

          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <Link href="/dashboard" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
              ← กลับไปแดชบอร์ด
            </Link>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginTop: '12px' }}>
              ใบรับรองของฉัน
            </h1>
            <p style={{ color: '#64748b', marginTop: '4px' }}>
              รวมใบรับรองที่คุณได้รับจากการเรียนจบคอร์ส
            </p>
          </div>

          {/* Certificates Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>กำลังโหลด...</div>
          ) : certs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'white',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎓</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                ยังไม่มีใบรับรอง
              </h2>
              <p style={{ color: '#64748b', marginBottom: '24px' }}>
                เรียนจบคอร์สเพื่อรับใบรับรอง
              </p>
              <Link
                href="/courses"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: '#2563eb',
                  color: 'white',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                ดูคอร์สทั้งหมด
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {certs.map(cert => (
                <div
                  key={cert.id}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'stretch' }}>
                    {/* Blue accent */}
                    <div style={{
                      width: '6px',
                      background: 'linear-gradient(180deg, #2563eb, #1d4ed8)',
                      flexShrink: 0,
                    }} />

                    <div style={{ flex: 1, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                          {cert.courseTitle}
                        </h3>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.875rem', color: '#64748b' }}>
                          <span>📅 สำเร็จ: {formatDate(cert.completedAt)}</span>
                          <span style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>
                            {cert.certificateCode}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link
                          href={`/certificate/${cert.certificateCode}`}
                          style={{
                            padding: '10px 20px',
                            background: '#2563eb',
                            color: 'white',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ดูใบรับรอง
                        </Link>
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/certificate/${cert.certificateCode}`;
                            navigator.clipboard.writeText(url);
                            alert('คัดลอกลิงก์แล้ว!');
                          }}
                          style={{
                            padding: '10px 16px',
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          แชร์
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
