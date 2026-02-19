import React from 'react';

interface PageHeaderProps {
  badge?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  align?: 'left' | 'center';
}

export default function PageHeader({
  badge,
  title,
  description,
  children,
  align = 'center',
}: PageHeaderProps) {
  const isCenter = align === 'center';

  return (
    <>
    <style>{`
      @keyframes ph-blob {
        0%,100% { transform: translate(0,0) scale(1); }
        33%      { transform: translate(14px,-18px) scale(1.05); }
        66%      { transform: translate(-10px,10px) scale(0.97); }
      }
      @keyframes ph-pulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.45); }
        50%      { box-shadow: 0 0 0 7px rgba(59,130,246,0); }
      }
      @keyframes ph-up {
        from { opacity:0; transform:translateY(18px); }
        to   { opacity:1; transform:translateY(0); }
      }
      .ph-blob1 { animation: ph-blob 12s ease-in-out infinite; }
      .ph-blob2 { animation: ph-blob 17s ease-in-out infinite reverse; }
      .ph-dot   { animation: ph-pulse 2s ease-in-out infinite; }
      .ph-badge {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        animation: ph-up 0.45s ease both;
      }
      .ph-badge:hover { transform:translateY(-2px); box-shadow:0 6px 16px rgba(59,130,246,0.2); }
      .ph-title { animation: ph-up 0.45s 0.1s ease both; }
      .ph-desc  { animation: ph-up 0.45s 0.2s ease both; }
      .ph-actions { animation: ph-up 0.45s 0.3s ease both; }
    `}</style>
    <section style={{
      background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #eff6ff 100%)',
      padding: '80px 0 90px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative blobs */}
      <div className="ph-blob1" style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        top: '-120px',
        right: '-120px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />
      <div className="ph-blob2" style={{
        position: 'absolute',
        width: '380px',
        height: '380px',
        bottom: '-140px',
        left: '-80px',
        background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          maxWidth: isCenter ? '760px' : '100%',
          margin: isCenter ? '0 auto' : undefined,
          textAlign: isCenter ? 'center' : 'left',
        }}>
          {badge && (
            <div className="ph-badge" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
              color: '#2563eb',
              padding: '8px 18px',
              borderRadius: '50px',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '20px',
              border: '1px solid #bfdbfe',
              cursor: 'default',
            }}>
              <span className="ph-dot" style={{
                width: '8px',
                height: '8px',
                background: '#3b82f6',
                borderRadius: '50%',
                flexShrink: 0,
                display: 'inline-block',
              }} />
              {badge}
            </div>
          )}

          <h1 className="ph-title" style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 800,
            color: '#1e293b',
            marginBottom: '16px',
            lineHeight: 1.2,
            letterSpacing: '-0.03em',
          }}>{title}</h1>

          {description && (
            <p className="ph-desc" style={{
              color: '#64748b',
              fontSize: '1.125rem',
              lineHeight: 1.7,
              maxWidth: '600px',
              margin: isCenter ? '0 auto' : undefined,
            }}>{description}</p>
          )}

          {children && (
            <div className="ph-actions" style={{
              marginTop: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCenter ? 'center' : 'flex-start',
              gap: '12px',
              flexWrap: 'wrap',
            }}>{children}</div>
          )}
        </div>
      </div>
    </section>
    </>
  );
}
