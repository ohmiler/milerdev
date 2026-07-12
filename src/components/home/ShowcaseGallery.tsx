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
        <div className="container showcase-gallery-layout">
          <header className="showcase-gallery-head">
            <h2 id="showcase-gallery-title" className="section-title showcase-gallery-title">
              ภาพบรรยากาศจากงานต่างๆ
            </h2>
            <div className="showcase-gallery-summary">
              <p className="section-copy showcase-gallery-copy">
                งานบรรยายด้าน Web Development, AI และเส้นทางอาชีพ Developer สำหรับนักศึกษาและองค์กร
              </p>
              <span className="showcase-gallery-count">12 PHOTOGRAPHS</span>
            </div>
          </header>

          <div className="showcase-contact-sheet" aria-label="ภาพบรรยากาศจากงานบรรยาย MilerDev">
            {SHOWCASE_IMAGES.map((img, i) => (
              <button
                key={img.src}
                onClick={() => openLightbox(i)}
                type="button"
                className="showcase-card"
                aria-label={`ดูรูปภาพบรรยากาศงานบรรยาย ${i + 1}`}
              >
                <span className="showcase-card-media">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    width={640}
                    height={480}
                    sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 25vw"
                    className="showcase-card-img"
                  />
                </span>
                <span className="showcase-card-meta" aria-hidden="true">
                  <span className="showcase-card-index">{String(i + 1).padStart(2, '0')}</span>
                  <span>ดูภาพเต็ม ↗</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <style>{`
          .showcase-gallery-section {
            padding: clamp(64px, 8vw, 104px) 0;
            background: var(--surface-subtle);
            border-bottom: 1px solid var(--line);
          }
          .showcase-gallery-layout {
            display: grid;
            gap: clamp(40px, 5vw, 64px);
          }
          .showcase-gallery-head {
            display: grid;
            grid-template-columns: repeat(12, minmax(0, 1fr));
            align-items: end;
          }
          .showcase-gallery-title {
            grid-column: 1 / span 8;
            max-width: 20ch;
            margin: 0;
            padding-right: clamp(24px, 4vw, 64px);
            font-size: clamp(2rem, 4vw, 3.5rem);
            line-height: 1.15;
            letter-spacing: -0.03em;
            text-wrap: balance;
          }
          .showcase-gallery-summary {
            grid-column: 9 / -1;
            display: grid;
            gap: 20px;
          }
          .showcase-gallery-copy {
            max-width: 42ch;
            margin: 0;
            color: var(--ink-soft);
            line-height: var(--leading-thai);
            text-wrap: pretty;
          }
          .showcase-gallery-count {
            color: var(--accent-strong);
            font-family: var(--font-code);
            font-size: 0.6875rem;
            font-weight: 700;
            letter-spacing: 0.06em;
          }
          .showcase-contact-sheet {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            border-top: 1px solid var(--line-strong);
            border-left: 1px solid var(--line);
          }
          .showcase-card {
            display: grid;
            min-width: 0;
            padding: 0;
            border: 0;
            border-right: 1px solid var(--line);
            border-bottom: 1px solid var(--line);
            border-radius: 0;
            background: var(--surface);
            color: var(--ink);
            cursor: pointer;
            text-align: left;
            transition: background-color 160ms ease-out;
          }
          .showcase-card:hover {
            background: var(--accent-soft);
          }
          .showcase-card:focus-visible {
            position: relative;
            z-index: 1;
            outline: none;
            box-shadow: var(--focus-ring);
          }
          .showcase-card-media {
            display: block;
            aspect-ratio: 4 / 3;
            overflow: hidden;
            border-bottom: 1px solid var(--line);
            background: var(--surface-subtle);
          }
          .showcase-card-img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
          }
          .showcase-card:hover .showcase-card-img {
            transform: scale(1.015);
          }
          .showcase-card-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            min-height: 44px;
            padding: 0 14px;
            color: var(--ink-soft);
            font-size: 0.75rem;
            font-weight: 650;
          }
          .showcase-card-index {
            color: var(--accent-strong);
            font-family: var(--font-code);
            font-size: 0.6875rem;
          }
          @media (max-width: 900px) {
            .showcase-gallery-title {
              grid-column: 1 / span 7;
            }
            .showcase-gallery-summary {
              grid-column: 8 / -1;
            }
            .showcase-contact-sheet {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
          @media (max-width: 640px) {
            .showcase-gallery-section {
              padding: 56px 0;
            }
            .showcase-gallery-head {
              grid-template-columns: 1fr;
              gap: 18px;
            }
            .showcase-gallery-title,
            .showcase-gallery-summary {
              grid-column: 1;
            }
            .showcase-gallery-title {
              padding-right: 0;
            }
            .showcase-gallery-summary {
              gap: 14px;
            }
            .showcase-contact-sheet {
              grid-template-columns: 1fr;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .showcase-card,
            .showcase-card-img {
              transition: none;
            }
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
