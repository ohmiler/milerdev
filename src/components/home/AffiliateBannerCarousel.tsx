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
    const [isHovered, setIsHovered] = useState(false);
    const startXRef = useRef(0);
    const draggingRef = useRef(false);

    useEffect(() => {
        fetch('/api/affiliate-banners')
            .then(res => res.json())
            .then(data => setBanners(data.banners || []))
            .catch(() => {});
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
        if (isHovered || total <= 1) return;
        const timer = setInterval(next, 4000);
        return () => clearInterval(timer);
    }, [isHovered, next, total]);

    // Swipe handlers
    const onPointerDown = (e: React.PointerEvent) => {
        draggingRef.current = true;
        startXRef.current = e.clientX;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
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
        <section style={{ padding: '80px 0', background: 'white' }}>
            <div className="container" style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{
                    fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
                    fontWeight: 700,
                    color: '#1e293b',
                    marginBottom: '12px',
                }}>
                    บริการและสินค้าแนะนำ
                </h2>
                <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>
                    สนใจสมัครใช้บริการหรือสั่งซื้อ คลิกที่รูปภาพได้เลย
                </p>
            </div>

            {/* Slider */}
            <div
                style={{
                    position: 'relative',
                    maxWidth: '900px',
                    margin: '0 auto',
                    padding: '0 16px',
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Track */}
                <div
                    style={{ overflow: 'hidden', borderRadius: '16px' }}
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
                                style={{
                                    flex: '0 0 100%',
                                    display: 'block',
                                }}
                            >
                                <img
                                    src={banner.imageUrl}
                                    alt={banner.title}
                                    draggable={false}
                                    style={{
                                        width: '100%',
                                        display: 'block',
                                        borderRadius: '16px',
                                    }}
                                />
                            </a>
                        ))}
                    </div>
                </div>

                {/* Nav Arrows */}
                {total > 1 && (
                    <>
                        <button
                            onClick={prev}
                            style={{
                                position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)',
                                width: '44px', height: '44px', borderRadius: '50%',
                                background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                zIndex: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            }}
                            aria-label="Previous"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <button
                            onClick={next}
                            style={{
                                position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)',
                                width: '44px', height: '44px', borderRadius: '50%',
                                background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                zIndex: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            }}
                            aria-label="Next"
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
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                    {banners.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            style={{
                                width: current === i ? '24px' : '8px',
                                height: '8px',
                                borderRadius: '50px',
                                background: current === i ? '#2563eb' : '#cbd5e1',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                padding: 0,
                            }}
                            aria-label={`Slide ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
