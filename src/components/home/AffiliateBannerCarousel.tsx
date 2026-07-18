'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Banner {
    id: string;
    title: string;
    imageUrl: string;
    linkUrl: string;
}

export default function AffiliateBannerCarousel() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [current, setCurrent] = useState(0);
    const [imageStatus, setImageStatus] = useState<Record<string, 'loaded' | 'failed'>>({});
    const [isPaused, setIsPaused] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const startXRef = useRef(0);
    const draggingRef = useRef(false);

    useEffect(() => {
        const controller = new AbortController();

        fetch('/api/affiliate-banners', { signal: controller.signal })
            .then(res => {
                if (!res.ok) {
                    throw new Error('Failed to load affiliate banners');
                }
                return res.json();
            })
            .then(data => {
                setBanners(Array.isArray(data.banners) ? data.banners : []);
            })
            .catch((error: unknown) => {
                const isAbortError = typeof error === 'object'
                    && error !== null
                    && 'name' in error
                    && error.name === 'AbortError';

                if (isAbortError) return;
                setBanners([]);
            });

        return () => controller.abort();
    }, []);

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const syncPreference = () => setPrefersReducedMotion(media.matches);

        syncPreference();
        media.addEventListener('change', syncPreference);
        return () => media.removeEventListener('change', syncPreference);
    }, []);

    const total = banners.length;

    const goTo = useCallback((i: number) => {
        if (total === 0) return;
        setCurrent(((i % total) + total) % total);
    }, [total]);

    const next = useCallback(() => goTo(current + 1), [current, goTo]);
    const prev = useCallback(() => goTo(current - 1), [current, goTo]);

    // Auto-play
    useEffect(() => {
        if (isPaused || prefersReducedMotion || total <= 1) return;
        const timer = setInterval(next, 4000);
        return () => clearInterval(timer);
    }, [isPaused, next, prefersReducedMotion, total]);

    // Swipe handlers
    const onPointerDown = (e: React.PointerEvent) => {
        draggingRef.current = true;
        startXRef.current = e.clientX;
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onPointerUp = (e: React.PointerEvent) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        const diff = e.clientX - startXRef.current;
        if (diff > 50) prev();
        else if (diff < -50) next();
    };

    if (total === 0) return null;

    return (
        <section className="affiliate-section" aria-labelledby="affiliate-carousel-title">
            <div className="container affiliate-head">
                <p className="affiliate-kicker">เครื่องมือและบริการที่เราใช้อยู่</p>
                <h2 id="affiliate-carousel-title" className="section-title affiliate-title">
                    เครื่องมือและบริการที่เราเลือกใช้
                </h2>
                <p className="section-copy affiliate-copy">
                    ลิงก์บางรายการเป็น affiliate link ซึ่งอาจทำให้ MilerDev ได้รับค่าตอบแทน โดยไม่มีค่าใช้จ่ายเพิ่มสำหรับคุณ
                </p>
            </div>

            {/* Slider */}
            <div
                className="affiliate-shell"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onFocus={() => setIsPaused(true)}
                onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                        setIsPaused(false);
                    }
                }}
            >
                {/* Track */}
                <div
                    className="affiliate-viewport"
                    onPointerDown={onPointerDown}
                    onPointerUp={onPointerUp}
                    onDragStart={(e) => e.preventDefault()}
                >
                    <div style={{
                        display: 'flex',
                        transform: `translateX(-${current * 100}%)`,
                        transition: prefersReducedMotion ? 'none' : 'transform 0.4s ease',
                    }}>
                        {banners.map((banner) => (
                            <a
                                key={banner.id}
                                href={banner.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="affiliate-slide"
                                aria-label={`${banner.title} เปิดในแท็บใหม่`}
                            >
                                <span
                                    className="affiliate-fallback"
                                    aria-hidden="true"
                                    data-hidden={imageStatus[banner.id] === 'loaded' ? 'true' : undefined}
                                >
                                    <span>เครื่องมือที่ MilerDev เลือกใช้</span>
                                    <strong>{banner.title}</strong>
                                    <span>เปิดรายละเอียดในแท็บใหม่ →</span>
                                </span>
                                {imageStatus[banner.id] !== 'failed' && (
                                    <img
                                        src={banner.imageUrl}
                                        alt={banner.title}
                                        draggable={false}
                                        loading="lazy"
                                        decoding="async"
                                        className="affiliate-image"
                                        onLoad={() => setImageStatus((status) => ({ ...status, [banner.id]: 'loaded' }))}
                                        onError={() => setImageStatus((status) => ({ ...status, [banner.id]: 'failed' }))}
                                    />
                                )}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Nav Arrows */}
                {total > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={prev}
                            className="affiliate-nav affiliate-nav--prev"
                            aria-label="ดูรายการก่อนหน้า"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={next}
                            className="affiliate-nav affiliate-nav--next"
                            aria-label="ดูรายการถัดไป"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </>
                )}
            </div>

            {/* Dots */}
            {total > 1 && (
                <div className="affiliate-dots" aria-label="เลือกรายการแนะนำ">
                    {banners.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            type="button"
                            className="affiliate-dot"
                            aria-label={`ดูรายการที่ ${i + 1}`}
                            aria-current={current === i ? 'true' : undefined}
                        >
                            <span
                                aria-hidden="true"
                                className="affiliate-dot__mark"
                                data-active={current === i ? 'true' : undefined}
                            />
                        </button>
                    ))}
                </div>
            )}
            <style>{`
                .affiliate-section {
                    position: relative;
                    overflow: hidden;
                    padding: clamp(88px, 10vw, 148px) 0;
                    color-scheme: light;
                    background: var(--color-background);
                    color: var(--color-text-primary);
                }
                .affiliate-section::before {
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 24%;
                    height: 14px;
                    background: var(--color-accent-pressed);
                    content: '';
                }
                .affiliate-head {
                    display: grid;
                    grid-template-columns: minmax(0, 0.8fr) minmax(320px, 0.6fr);
                    gap: clamp(32px, 7vw, 96px);
                    align-items: end;
                    margin-bottom: 38px;
                    text-align: left;
                }
                .affiliate-kicker {
                    grid-column: 1;
                    margin: 0 0 12px;
                    color: var(--color-accent-pressed);
                    font-size: 0.9rem;
                    font-weight: 720;
                }
                .affiliate-title {
                    grid-column: 1;
                    margin: 0;
                    max-width: 14ch;
                    font-size: clamp(2.8rem, 5.8vw, 6.1rem);
                    font-weight: 770;
                    line-height: 1.02;
                    letter-spacing: -0.055em;
                    text-wrap: balance;
                }
                .affiliate-copy {
                    grid-column: 2;
                    grid-row: 1 / span 2;
                    align-self: end;
                    margin: 0;
                    max-width: 44ch;
                    color: var(--color-text-secondary);
                    line-height: 1.8;
                    text-wrap: pretty;
                }
                .affiliate-shell {
                    position: relative;
                    max-width: 1180px;
                    margin: 0 auto;
                    padding: 0 40px;
                }
                .affiliate-viewport {
                    overflow: hidden;
                    border: 1px solid var(--color-border);
                    border-radius: 0;
                    background: var(--color-surface);
                    box-shadow: 14px 14px 0 var(--color-accent-soft);
                }
                .affiliate-slide {
                    flex: 0 0 100%;
                    display: block;
                    position: relative;
                    aspect-ratio: 16 / 5;
                    overflow: hidden;
                    background: var(--color-accent-soft);
                    outline: none;
                }
                .affiliate-fallback {
                    position: absolute;
                    inset: 0;
                    display: grid;
                    align-content: center;
                    justify-items: start;
                    gap: 8px;
                    padding: clamp(28px, 6vw, 72px);
                    background: var(--color-accent-soft);
                    color: var(--color-text-secondary);
                    transition: opacity 160ms ease;
                }
                .affiliate-fallback::after {
                    position: absolute;
                    right: 8%;
                    bottom: -28%;
                    width: 34%;
                    aspect-ratio: 1;
                    background: var(--color-accent);
                    content: '';
                    transform: rotate(18deg);
                }
                .affiliate-fallback[data-hidden="true"] {
                    opacity: 0;
                }
                .affiliate-fallback strong {
                    position: relative;
                    z-index: 1;
                    max-width: 22ch;
                    color: var(--color-text-primary);
                    font-size: clamp(1.5rem, 3.2vw, 3.4rem);
                    line-height: 1.12;
                }
                .affiliate-fallback span {
                    position: relative;
                    z-index: 1;
                    font-size: 0.82rem;
                    font-weight: 680;
                }
                .affiliate-slide:focus-visible .affiliate-image {
                    box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--color-accent) 50%, transparent);
                }
                .affiliate-image {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    display: block;
                    border-radius: 0;
                    object-fit: cover;
                }
                .affiliate-nav {
                    position: absolute;
                    top: 50%;
                    width: 44px;
                    height: 44px;
                    border-radius: 0;
                    background: color-mix(in srgb, var(--color-surface) 94%, transparent);
                    border: 1px solid var(--color-border);
                    color: var(--color-text-secondary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2;
                    box-shadow: 4px 4px 0 color-mix(in srgb, var(--color-text-primary) 12%, transparent);
                    transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
                }
                .affiliate-nav--prev {
                    left: 24px;
                    transform: translateY(-50%);
                }
                .affiliate-nav--next {
                    right: 24px;
                    transform: translateY(-50%);
                }
                .affiliate-nav:hover {
                    background: var(--color-surface);
                    border-color: var(--color-accent);
                }
                .affiliate-nav:focus-visible {
                    outline: none;
                    box-shadow: var(--focus-ring);
                }
                .affiliate-nav--prev:hover {
                    transform: translate(-2px, -50%);
                }
                .affiliate-nav--next:hover {
                    transform: translate(2px, -50%);
                }
                .affiliate-dots {
                    display: flex;
                    justify-content: center;
                    gap: 8px;
                    margin-top: 18px;
                }
                .affiliate-dot {
                    min-width: 44px;
                    min-height: 44px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    padding: 0;
                    border-radius: 999px;
                }
                .affiliate-dot:focus-visible {
                    outline: none;
                    box-shadow: var(--focus-ring);
                }
                .affiliate-dot__mark {
                    width: 24px;
                    height: 8px;
                    border-radius: 0;
                    background: var(--color-border);
                    transform: scaleX(0.35);
                    transform-origin: center;
                    transition: transform 0.2s ease, background-color 0.2s ease;
                }
                .affiliate-dot__mark[data-active="true"] {
                    background: var(--color-accent-pressed);
                    transform: scaleX(1);
                }
                @media (max-width: 640px) {
                    .affiliate-section {
                        padding: 72px 0;
                    }
                    .affiliate-head {
                        grid-template-columns: 1fr;
                        gap: 14px;
                        margin-bottom: 28px;
                    }
                    .affiliate-kicker,
                    .affiliate-title,
                    .affiliate-copy {
                        grid-column: 1;
                        grid-row: auto;
                    }
                    .affiliate-shell {
                        padding: 0 20px 10px 14px;
                    }
                    .affiliate-slide {
                        aspect-ratio: 4 / 3;
                    }
                    .affiliate-fallback {
                        padding: 24px;
                    }
                    .affiliate-nav {
                        width: 40px;
                        height: 40px;
                    }
                    .affiliate-nav--prev {
                        left: 20px;
                    }
                    .affiliate-nav--next {
                        right: 20px;
                    }
                }
                @media (prefers-reduced-motion: reduce) {
                    .affiliate-nav,
                    .affiliate-dot__mark {
                        transition: none;
                    }
                }
            `}</style>
        </section>
    );
}
