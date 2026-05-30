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
    const [isPaused, setIsPaused] = useState(false);
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

    const total = banners.length;

    const goTo = useCallback((i: number) => {
        if (total === 0) return;
        setCurrent(((i % total) + total) % total);
    }, [total]);

    const next = useCallback(() => goTo(current + 1), [current, goTo]);
    const prev = useCallback(() => goTo(current - 1), [current, goTo]);

    // Auto-play
    useEffect(() => {
        if (isPaused || total <= 1) return;
        const timer = setInterval(next, 4000);
        return () => clearInterval(timer);
    }, [isPaused, next, total]);

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
                <h2 id="affiliate-carousel-title" className="section-title affiliate-title">
                    บริการและสินค้าแนะนำ
                </h2>
                <p className="section-copy affiliate-copy">
                    สนใจสมัครใช้บริการหรือสั่งซื้อ คลิกที่รูปภาพได้เลย
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
                        transition: 'transform 0.4s ease',
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
                                <img
                                    src={banner.imageUrl}
                                    alt={banner.title}
                                    draggable={false}
                                    loading="lazy"
                                    decoding="async"
                                    className="affiliate-image"
                                />
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
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={next}
                            className="affiliate-nav affiliate-nav--next"
                            aria-label="ดูรายการถัดไป"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                    padding: 72px 0 76px;
                    background: #ffffff;
                }
                .affiliate-head {
                    text-align: center;
                    margin-bottom: 34px;
                }
                .affiliate-title {
                    margin-bottom: 10px;
                    text-wrap: balance;
                }
                .affiliate-copy {
                    margin: 0 auto;
                    max-width: 50ch;
                    text-wrap: pretty;
                }
                .affiliate-shell {
                    position: relative;
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 0 16px;
                }
                .affiliate-viewport {
                    overflow: hidden;
                    border-radius: 12px;
                    border: 1px solid var(--gray-200);
                    background: var(--gray-50);
                }
                .affiliate-slide {
                    flex: 0 0 100%;
                    display: block;
                    outline: none;
                }
                .affiliate-slide:focus-visible .affiliate-image {
                    box-shadow: inset 0 0 0 3px rgba(2, 171, 255, 0.5);
                }
                .affiliate-image {
                    width: 100%;
                    display: block;
                    border-radius: 12px;
                }
                .affiliate-nav {
                    position: absolute;
                    top: 50%;
                    width: 44px;
                    height: 44px;
                    border-radius: 999px;
                    background: rgba(255,255,255,0.94);
                    border: 1px solid var(--gray-200);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2;
                    box-shadow: 0 4px 10px rgba(16, 32, 51, 0.12);
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
                    background: #ffffff;
                    border-color: var(--primary-300);
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
                    border-radius: 999px;
                    background: var(--gray-300);
                    transform: scaleX(0.35);
                    transform-origin: center;
                    transition: transform 0.2s ease, background-color 0.2s ease;
                }
                .affiliate-dot__mark[data-active="true"] {
                    background: var(--primary-600);
                    transform: scaleX(1);
                }
                @media (max-width: 640px) {
                    .affiliate-section {
                        padding: 56px 0 60px;
                    }
                    .affiliate-head {
                        margin-bottom: 28px;
                    }
                    .affiliate-shell {
                        padding: 0 16px;
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
