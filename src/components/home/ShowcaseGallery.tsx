'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';

const SHOWCASE_IMAGES = Array.from({ length: 12 }, (_, i) => ({
  src: `/showcase/${String(i + 1).padStart(2, '0')}-showcase-1024x768.webp`,
  alt: `ภาพบรรยากาศงานบรรยาย MilerDev ${i + 1}`,
}));

export default function ShowcaseGallery() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isLightboxOpen = lightboxIndex !== null;

  const openLightbox = (index: number) => setLightboxIndex(index % SHOWCASE_IMAGES.length);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % SHOWCASE_IMAGES.length : null));
  }, []);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev - 1 + SHOWCASE_IMAGES.length) % SHOWCASE_IMAGES.length : null));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isLightboxOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Tab') {
        const focusable = Array.from(
          lightboxRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      previousFocus?.focus({ preventScroll: true });
    };
  }, [isLightboxOpen, closeLightbox, goNext, goPrev]);

  return (
    <>
      <section className="showcase-gallery-section" aria-labelledby="showcase-gallery-title">
        {/* Header */}
        <div className="container showcase-gallery-head">
          <div className="showcase-gallery-kicker">
            <span style={{ fontSize: '1rem' }}>📸</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary-700)' }}>กิจกรรมและงานบรรยาย</span>
          </div>
          <h2 id="showcase-gallery-title" className="section-title showcase-gallery-title">
            ภาพบรรยากาศจากงานต่างๆ
          </h2>
          <p className="section-copy showcase-gallery-copy">
            บรรยายด้าน Web Development, AI และเส้นทางสายอาชีพ Developer ให้กับนักศึกษาและองค์กรต่าง ๆ
          </p>
        </div>

        {/* Carousel Marquee */}
        <div className="showcase-marquee-wrapper">
          <div className="showcase-marquee-inner">
            {[0, 1].map((copy) => (
              <div key={copy} className="showcase-marquee-track" aria-hidden={copy === 1}>
                {SHOWCASE_IMAGES.map((img, i) => (
                  <button
                    key={`${copy}-${i}`}
                    onClick={() => openLightbox(i)}
                    type="button"
                    className="showcase-card"
                    tabIndex={copy === 0 ? 0 : -1}
                    aria-label={`ดูรูปภาพบรรยากาศงานบรรยาย ${i + 1}`}
                  >
                    <Image
                      src={img.src}
                      alt={copy === 0 ? img.alt : ''}
                      width={400}
                      height={300}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
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
          .showcase-gallery-section {
            padding: 72px 0 64px;
            background: white;
            overflow: hidden;
          }
          .showcase-gallery-head {
            text-align: center;
            margin-bottom: 38px;
          }
          .showcase-gallery-kicker {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: var(--primary-50);
            border: 1px solid var(--primary-200);
            border-radius: 999px;
            padding: 6px 16px;
            margin-bottom: 16px;
          }
          .showcase-gallery-title {
            margin: 0 auto 12px;
            text-wrap: balance;
          }
          .showcase-gallery-copy {
            margin: 0 auto;
            max-width: 56ch;
            text-wrap: pretty;
          }
          .showcase-marquee-wrapper {
            width: 100%;
            overflow: hidden;
            mask-image: linear-gradient(to right, transparent, black 6%, black 94%, transparent);
            -webkit-mask-image: linear-gradient(to right, transparent, black 6%, black 94%, transparent);
          }
          .showcase-marquee-inner {
            display: flex;
            width: max-content;
            animation: showcaseScroll 160s linear infinite;
            will-change: transform;
          }
          .showcase-marquee-track {
            display: flex;
            align-items: center;
            flex-shrink: 0;
            gap: 14px;
            padding: 0 7px;
          }
          .showcase-card {
            flex-shrink: 0;
            width: 344px;
            height: 258px;
            border-radius: 12px;
            overflow: hidden;
            cursor: pointer;
            border: 1px solid rgba(219, 232, 242, 0.9);
            padding: 0;
            background: #f1f5f9;
            position: relative;
            transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          }
          .showcase-card:hover {
            transform: translateY(-3px);
            border-color: rgba(2, 171, 255, 0.38);
            box-shadow: 0 8px 14px rgba(16, 32, 51, 0.1);
          }
          .showcase-card:focus-visible {
            outline: none;
            box-shadow: var(--focus-ring);
            border-color: var(--primary-500);
          }
          .showcase-card-img {
            transition: transform 0.25s ease;
          }
          .showcase-card:hover .showcase-card-img {
            transform: scale(1.035);
          }
          .showcase-card-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(to top, rgba(0,0,0,0.48) 0%, transparent 58%);
            opacity: 0;
            transition: opacity 0.2s ease;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding: 16px;
          }
          .showcase-card:hover .showcase-card-overlay,
          .showcase-card:focus-visible .showcase-card-overlay {
            opacity: 1;
          }
          @keyframes showcaseScroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .showcase-marquee-wrapper:hover .showcase-marquee-inner,
          .showcase-marquee-wrapper:focus-within .showcase-marquee-inner {
            animation-play-state: paused;
          }
          @media (max-width: 640px) {
            .showcase-gallery-section {
              padding: 56px 0 52px;
            }
            .showcase-gallery-head {
              margin-bottom: 30px;
            }
            .showcase-card {
              width: 268px;
              height: 201px;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .showcase-marquee-wrapper {
              overflow-x: auto;
              mask-image: none;
              -webkit-mask-image: none;
            }
            .showcase-marquee-inner {
              animation: none;
            }
            .showcase-marquee-track[aria-hidden="true"] {
              display: none;
            }
            .showcase-card,
            .showcase-card-img,
            .showcase-card-overlay {
              transition: none;
            }
            .showcase-card:hover,
            .showcase-card:hover .showcase-card-img {
              transform: none;
            }
          }
        `}</style>
      </section>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          ref={lightboxRef}
          className="showcase-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="ภาพบรรยากาศจากงานบรรยาย MilerDev"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
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
            ref={closeButtonRef}
            type="button"
            className="showcase-lightbox-button showcase-lightbox-close"
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
              zIndex: 2,
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
            type="button"
            className="showcase-lightbox-button showcase-lightbox-nav showcase-lightbox-nav--prev"
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
              zIndex: 2,
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
            type="button"
            className="showcase-lightbox-button showcase-lightbox-nav showcase-lightbox-nav--next"
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
              zIndex: 2,
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
            .showcase-lightbox-button:focus-visible {
              outline: none;
              box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.34);
            }
            @keyframes lbFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes lbZoomIn {
              from { opacity: 0; transform: scale(0.92); }
              to { opacity: 1; transform: scale(1); }
            }
            @media (prefers-reduced-motion: reduce) {
              .showcase-lightbox {
                animation: none !important;
              }
              .showcase-lightbox * {
                animation: none !important;
                transition: none !important;
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
