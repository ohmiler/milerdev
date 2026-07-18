'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';

const SHOWCASE_LABELS = [
  'เวทีแบ่งปันประสบการณ์',
  'เวิร์กช็อปในห้องเรียน',
  'วงสนทนาเรื่องเส้นทางนักพัฒนา',
  'บรรยายเรื่องการสร้างซอฟต์แวร์',
  'เบื้องหลังการเตรียมเนื้อหา',
  'พื้นที่บันทึกบทเรียนออนไลน์',
] as const;

const SHOWCASE_IMAGES = SHOWCASE_LABELS.map((label, i) => ({
  src: `/showcase/${String(i + 1).padStart(2, '0')}-showcase-1024x768.webp`,
  alt: `ภาพบรรยากาศการสอนและแบ่งปันความรู้ของ MilerDev ${i + 1}`,
  label,
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
            <p className="showcase-gallery-kicker">บรรยากาศจากห้องเรียนและเวทีจริง</p>
            <h2 id="showcase-gallery-title" className="showcase-gallery-title">
              การสอนที่เกิดขึ้นนอกหน้าจอ
            </h2>
            <div className="showcase-gallery-summary">
              <p className="showcase-gallery-copy">
                ภาพคัดเลือกจากการสอน Web Development, AI และเส้นทางอาชีพ Developer ให้กับนักศึกษาและทีมงานในองค์กร
              </p>
              <p className="showcase-gallery-hint">เปิดดูภาพขนาดเต็ม</p>
            </div>
          </header>

          <div className="showcase-contact-sheet" aria-label="ภาพบรรยากาศจากงานบรรยาย MilerDev">
            {SHOWCASE_IMAGES.slice(0, 5).map((img, i) => (
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
                <span className="showcase-card-meta" aria-hidden="true">{img.label}</span>
              </button>
            ))}
          </div>
        </div>

        <style>{`
          .showcase-gallery-section {
            padding: clamp(64px, 7vw, 88px) 0;
            color-scheme: light;
            background: var(--color-background);
            color: var(--color-text-primary);
          }
          .showcase-gallery-layout {
            display: grid;
            gap: clamp(32px, 4vw, 48px);
          }
          .showcase-gallery-head {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(280px, 0.5fr);
            gap: clamp(30px, 6vw, 72px);
            align-items: end;
          }
          .showcase-gallery-kicker {
            grid-column: 1 / -1;
            margin: 0 0 -18px;
            color: var(--color-accent-pressed);
            font-size: 0.9rem;
            font-weight: 720;
          }
          .showcase-gallery-title {
            max-width: 14ch;
            margin: 0;
            font-size: clamp(2.35rem, 4vw, 4.1rem);
            font-weight: 750;
            line-height: 1.08;
            letter-spacing: -0.045em;
            color: var(--color-text-primary);
            text-wrap: balance;
          }
          .showcase-gallery-summary {
            display: grid;
            gap: 14px;
          }
          .showcase-gallery-copy {
            max-width: 42ch;
            margin: 0;
            color: var(--color-text-secondary);
            line-height: 1.8;
            text-wrap: pretty;
          }
          .showcase-gallery-hint {
            margin: 0;
            color: var(--color-accent-pressed);
            font-size: 0.82rem;
            font-weight: 700;
          }
          .showcase-contact-sheet {
            display: grid;
            grid-template-columns: repeat(12, minmax(0, 1fr));
            grid-auto-flow: dense;
            align-items: start;
            gap: 20px;
          }
          .showcase-card {
            display: grid;
            grid-column: span 3;
            align-content: start;
            min-width: 0;
            overflow: hidden;
            padding: 0;
            border: 0;
            border-radius: 0;
            background: var(--color-surface);
            color: var(--color-text-primary);
            cursor: pointer;
            text-align: left;
            box-shadow: none;
            transition: background-color 180ms ease-out;
          }
          .showcase-card:first-child {
            grid-column: span 6;
            grid-row: span 2;
            grid-template-rows: minmax(0, 1fr) auto;
            align-self: stretch;
            align-content: stretch;
          }
          .showcase-card:nth-child(2),
          .showcase-card:nth-child(3),
          .showcase-card:nth-child(4),
          .showcase-card:nth-child(5) {
            grid-column: span 3;
          }
          .showcase-card:hover {
            z-index: 1;
            background: var(--color-surface-hover);
          }
          .showcase-card:focus-visible {
            position: relative;
            z-index: 1;
            outline: none;
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 46%, transparent);
          }
          .showcase-card-media {
            display: block;
            aspect-ratio: 4 / 3;
            overflow: hidden;
            border: 1px solid var(--color-border);
            background: var(--color-surface-hover);
          }
          .showcase-card:first-child .showcase-card-media {
            min-height: 0;
            aspect-ratio: auto;
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
            display: block;
            min-height: 44px;
            padding: 12px 2px;
            color: var(--color-text-secondary);
            font-size: 0.82rem;
            font-weight: 680;
            line-height: 1.55;
          }
          @media (max-width: 900px) {
            .showcase-contact-sheet {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .showcase-card,
            .showcase-card:first-child,
            .showcase-card:nth-child(2),
            .showcase-card:nth-child(3),
            .showcase-card:nth-child(4),
            .showcase-card:nth-child(5) {
              grid-column: span 1;
              grid-row: auto;
            }
            .showcase-card:first-child {
              grid-column: 1 / -1;
            }
            .showcase-card:first-child .showcase-card-media {
              min-height: 0;
              aspect-ratio: 16 / 9;
            }
          }
          @media (max-width: 640px) {
            .showcase-gallery-section {
              padding: 48px 0 64px;
            }
            .showcase-gallery-head {
              grid-template-columns: 1fr;
              gap: 18px;
            }
            .showcase-gallery-title,
            .showcase-gallery-summary,
            .showcase-gallery-kicker {
              grid-column: 1;
            }
            .showcase-gallery-kicker {
              margin-bottom: 0;
            }
            .showcase-gallery-summary {
              gap: 14px;
            }
            .showcase-contact-sheet {
              display: flex;
              gap: 12px;
              overflow-x: auto;
              padding: 0 14px 14px;
              margin-inline: -14px;
              scroll-snap-type: x mandatory;
              scrollbar-color: var(--color-border) var(--color-background);
            }
            .showcase-card,
            .showcase-card:first-child {
              flex: 0 0 min(86vw, 340px);
              grid-column: auto;
              scroll-snap-align: start;
            }
            .showcase-card:first-child .showcase-card-media {
              aspect-ratio: 4 / 3;
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
