'use client';

import { useState } from 'react';
import BunnyPlayer from '@/components/video/BunnyPlayer';

interface CoursePreviewVideoProps {
  previewVideoUrl: string;
}

export default function CoursePreviewVideo({ previewVideoUrl }: CoursePreviewVideoProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Play Button Overlay */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.3)',
          border: 'none',
          cursor: 'pointer',
          zIndex: 1,
          transition: 'background 0.2s',
        }}
        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'}
        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'}
      >
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          transition: 'transform 0.2s',
        }}
          className="preview-play-btn"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#2563eb">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <span style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontSize: '0.8125rem',
          fontWeight: 600,
          background: 'rgba(0, 0, 0, 0.6)',
          padding: '4px 12px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
        }}>
          ดูตัวอย่างคอร์ส
        </span>
      </button>

      {/* Video Modal */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '900px',
              position: 'relative',
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '-44px',
                right: '0',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '1.25rem',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Player */}
            <BunnyPlayer videoId={previewVideoUrl} autoplay />
          </div>
        </div>
      )}

      <style>{`
        .preview-play-btn:hover {
          transform: scale(1.1);
        }
      `}</style>
    </>
  );
}
