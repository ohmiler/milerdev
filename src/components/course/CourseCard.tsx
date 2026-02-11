import Link from 'next/link';
import { getExcerpt } from '@/lib/sanitize';

interface Tag {
    id: string;
    name: string;
    slug: string;
}

interface CourseCardProps {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnailUrl: string | null;
    price: number;
    promoPrice?: number | null;
    isPromoActive?: boolean;
    instructorName: string | null;
    lessonCount: number;
    tags?: Tag[];
}

function normalizeUrl(url: string | null): string | null {
    if (!url || url.trim() === '') return null;
    if (url.startsWith('http')) return url;
    return `https://${url}`;
}

export default function CourseCard({
    title,
    slug,
    description,
    thumbnailUrl: rawThumbnailUrl,
    price,
    promoPrice,
    isPromoActive,
    instructorName,
    lessonCount,
    tags,
}: CourseCardProps) {
    const displayPrice = isPromoActive && promoPrice != null ? promoPrice : price;
    const showOriginalPrice = isPromoActive && promoPrice != null && promoPrice < price;
    const discountPercent = showOriginalPrice ? Math.round((1 - displayPrice / price) * 100) : 0;
    const thumbnailUrl = normalizeUrl(rawThumbnailUrl);
    return (
        <Link href={`/courses/${slug}`} className="card block group" style={{
            ...(showOriginalPrice ? { border: '1px solid #7000FF' } : {}),
        }}>
            {/* Thumbnail */}
            <div className="course-thumbnail">
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                }}>
                    {thumbnailUrl ? (
                        <img
                            src={thumbnailUrl}
                            alt={title}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transition: 'transform 0.3s',
                            }}
                            className="group-hover:scale-105"
                        />
                    ) : (
                        <svg style={{ width: '48px', height: '48px', color: 'rgba(255,255,255,0.6)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>

                {/* Discount Badge - Top Left */}
                {showOriginalPrice && (
                    <span style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: '#7000FF',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        zIndex: 2,
                    }}>
                        ลด {discountPercent}%
                    </span>
                )}

                {/* Price Badge - Top Right */}
                {displayPrice === 0 ? (
                    <span className="price-badge free">ฟรี</span>
                ) : showOriginalPrice ? (
                    <span className="price-badge promo" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#7000FF',
                        color: 'white',
                    }}>
                        <span style={{ textDecoration: 'line-through', opacity: 0.7, fontSize: '0.75rem' }}>฿{price.toLocaleString()}</span>
                        <span style={{ fontWeight: 700 }}>฿{displayPrice.toLocaleString()}</span>
                    </span>
                ) : (
                    <span className="price-badge paid">฿{displayPrice.toLocaleString()}</span>
                )}
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
                {tags && tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                        {tags.slice(0, 3).map(tag => (
                            <span
                                key={tag.id}
                                style={{
                                    padding: '2px 10px',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    borderRadius: '50px',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                }}
                            >
                                {tag.name}
                            </span>
                        ))}
                        {tags.length > 3 && (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>+{tags.length - 3}</span>
                        )}
                    </div>
                )}
                <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '8px',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }} className="group-hover:text-blue-600 transition-colors">
                    {title}
                </h3>

                {description && (
                    <p style={{
                        color: '#64748b',
                        fontSize: '0.9375rem',
                        marginBottom: '16px',
                        lineHeight: 1.6,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}>
                        {getExcerpt(description, 120)}
                    </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                        <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{lessonCount} บทเรียน</span>
                    </div>

                    {instructorName && (
                        <span style={{ color: '#94a3b8' }}>โดย {instructorName}</span>
                    )}
                </div>
            </div>
        </Link>
    );
}
