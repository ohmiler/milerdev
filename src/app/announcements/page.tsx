'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  creatorName: string | null;
  createdAt: string;
}

const typeConfig: Record<string, { label: string; bg: string; border: string; color: string; icon: string }> = {
  info: { label: 'ข้อมูล', bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', icon: 'ℹ️' },
  warning: { label: 'แจ้งเตือน', bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: '⚠️' },
  success: { label: 'สำเร็จ', bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', icon: '✅' },
  error: { label: 'สำคัญ', bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: '🚨' },
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/announcements')
      .then(res => res.json())
      .then(data => setAnnouncements(data.announcements || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: '#f8fafc' }}>
        {/* Header */}
        <section style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #faf5ff 100%)',
          padding: '60px 0',
        }}>
          <div className="container">
            <h1 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: '16px',
            }}>
              📢 ประกาศ
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.125rem' }}>
              ข่าวสารและประกาศล่าสุดจากทีมงาน
            </p>
          </div>
        </section>

        <section className="section">
          <div className="container" style={{ maxWidth: '800px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>กำลังโหลด...</div>
            ) : announcements.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '80px 20px',
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                  ยังไม่มีประกาศ
                </h2>
                <p style={{ color: '#64748b' }}>
                  ประกาศจะแสดงที่นี่เมื่อมีข่าวสารใหม่จากทีมงาน
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {announcements.map(announcement => {
                  const config = typeConfig[announcement.type] || typeConfig.info;
                  return (
                    <article
                      key={announcement.id}
                      style={{
                        background: 'white',
                        borderRadius: '16px',
                        border: `1px solid #e2e8f0`,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Type accent bar */}
                      <div style={{ height: '4px', background: config.color }} />

                      <div style={{ padding: '24px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            background: config.bg,
                            color: config.color,
                            borderRadius: '50px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}>
                            {config.icon} {config.label}
                          </span>
                          <span style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>
                            {formatDate(announcement.createdAt)}
                          </span>
                          {announcement.creatorName && (
                            <span style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>
                              โดย {announcement.creatorName}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h2 style={{
                          fontSize: '1.25rem',
                          fontWeight: 600,
                          color: '#1e293b',
                          marginBottom: '12px',
                          lineHeight: 1.5,
                        }}>
                          {announcement.title}
                        </h2>

                        {/* Content */}
                        <div style={{
                          color: '#475569',
                          fontSize: '0.9375rem',
                          lineHeight: 1.7,
                          whiteSpace: 'pre-wrap',
                        }}>
                          {announcement.content}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
