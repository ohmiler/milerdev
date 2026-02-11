'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

const SHOWCASE_IMAGES = Array.from({ length: 12 }, (_, i) => ({
  src: `/showcase/${String(i + 1).padStart(2, '0')}-showcase-1024x768.webp`,
  alt: `MilerDev Event ${i + 1}`,
}));

export default function ShowcaseGallery() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setLightboxIndex(index % SHOWCASE_IMAGES.length);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % SHOWCASE_IMAGES.length : null));
  }, []);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev - 1 + SHOWCASE_IMAGES.length) % SHOWCASE_IMAGES.length : null));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, goNext, goPrev]);

  // Double the images for seamless loop
  const doubledImages = [...SHOWCASE_IMAGES, ...SHOWCASE_IMAGES];

  return (
    <>
      <section style={{ padding: '80px 0', background: 'white', overflow: 'hidden' }}>
        {/* Header */}
        <div className="container" style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#faf5ff',
            border: '1px solid #e9d5ff',
            borderRadius: '999px',
            padding: '6px 16px',
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '1rem' }}>📸</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#7c3aed' }}>กิจกรรมและงานอีเวนต์</span>
          </div>
          <h2 style={{
            fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '12px',
            lineHeight: 1.3,
          }}>
            ภาพบรรยากาศจากงานต่างๆ
          </h2>
          <p style={{
            color: '#64748b',
            fontSize: '1rem',
            maxWidth: '560px',
            margin: '0 auto',
          }}>
            บรรยากาศการเป็นวิทยากร Workshop และกิจกรรมด้านเทคโนโลยีที่ได้เข้าร่วม
          </p>
        </div>

        {/* Carousel Marquee */}
        <div className="showcase-marquee-wrapper">
          <div className="showcase-marquee-inner">
            {[0, 1].map((copy) => (
              <div key={copy} className="showcase-marquee-track" aria-hidden={copy === 1}>
                {doubledImages.map((img, i) => (
                  <button
                    key={`${copy}-${i}`}
                    onClick={() => openLightbox(i)}
                    className="showcase-card"
                    aria-label={`ดูรูปภาพ ${(i % SHOWCASE_IMAGES.length) + 1}`}
                  >
                    <Image
                      src={img.src}
                      alt={img.alt}
                      width={400}
                      height={300}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.4s',
                      }}
                      className="showcase-card-img"
                    />
                    <div className="showcase-card-overlay">
                      <span style={{
                        color: 'white',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                        คลิกเพื่อดูเต็ม
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <style>{`
          .showcase-marquee-wrapper {
            width: 100%;
            overflow: hidden;
            mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
            -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
          }
          .showcase-marquee-inner {
            display: flex;
            width: max-content;
            animation: showcaseScroll 500s linear infinite;
          }
          .showcase-marquee-track {
            display: flex;
            align-items: center;
            flex-shrink: 0;
            gap: 16px;
            padding: 0 8px;
          }
          .showcase-card {
            flex-shrink: 0;
            width: 360px;
            height: 270px;
            border-radius: 16px;
            overflow: hidden;
            cursor: pointer;
            border: none;
            padding: 0;
            background: #f1f5f9;
            position: relative;
            transition: transform 0.3s, box-shadow 0.3s;
          }
          .showcase-card:hover {
            transform: translateY(-6px) scale(1.02);
            box-shadow: 0 16px 40px rgba(0,0,0,0.15);
          }
          .showcase-card:hover .showcase-card-img {
            transform: scale(1.08);
          }
          .showcase-card-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%);
            opacity: 0;
            transition: opacity 0.3s;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding: 16px;
          }
          .showcase-card:hover .showcase-card-overlay {
            opacity: 1;
          }
          @keyframes showcaseScroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .showcase-marquee-wrapper:hover .showcase-marquee-inner {
            animation-play-state: paused;
          }
          @media (max-width: 640px) {
            .showcase-card {
              width: 280px;
              height: 210px;
            }
          }
        `}</style>
      </section>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'lbFadeIn 0.25s ease',
          }}
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              zIndex: 10,
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            aria-label="ปิด"
          >
            ✕
          </button>

          {/* Counter */}
          <div style={{
            position: 'absolute',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}>
            {lightboxIndex + 1} / {SHOWCASE_IMAGES.length}
          </div>

          {/* Prev button */}
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            style={{
              position: 'absolute',
              left: '16px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              zIndex: 10,
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            aria-label="ก่อนหน้า"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Image */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '85vh',
              width: '1024px',
              aspectRatio: '4 / 3',
              borderRadius: '12px',
              overflow: 'hidden',
              animation: 'lbZoomIn 0.3s ease',
            }}
          >
            <Image
              src={SHOWCASE_IMAGES[lightboxIndex].src}
              alt={SHOWCASE_IMAGES[lightboxIndex].alt}
              fill
              sizes="90vw"
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>

          {/* Next button */}
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            style={{
              position: 'absolute',
              right: '16px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              zIndex: 10,
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            aria-label="ถัดไป"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <style>{`
            @keyframes lbFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes lbZoomIn {
              from { opacity: 0; transform: scale(0.92); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
