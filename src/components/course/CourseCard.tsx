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
    outcomes?: string[];
    totalDurationSeconds?: number;
    hasFreePreview?: boolean;
    variant?: 'default' | 'featured';
}

function normalizeUrl(url: string | null): string | null {
    if (!url || url.trim() === '') return null;
    if (url.startsWith('http')) return url;
    return `https://${url}`;
}

function formatCourseDuration(totalSeconds?: number): string | null {
    if (!totalSeconds || totalSeconds < 60) return null;

    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) return `${hours} ชม. ${minutes} นาที`;
    if (hours > 0) return `${hours} ชม.`;
    return `${minutes} นาที`;
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
    outcomes,
    totalDurationSeconds,
    hasFreePreview = false,
    variant = 'default',
}: CourseCardProps) {
    const displayPrice = isPromoActive && promoPrice != null ? promoPrice : price;
    const showOriginalPrice = isPromoActive && promoPrice != null && promoPrice < price;
    const discountPercent = showOriginalPrice ? Math.round((1 - displayPrice / price) * 100) : 0;
    const thumbnailUrl = normalizeUrl(rawThumbnailUrl);
    const durationText = formatCourseDuration(totalDurationSeconds);
    return (
        <Link
            href={`/courses/${slug}`}
            className={`card course-card course-card--${variant} block group${showOriginalPrice ? ' course-card--promo' : ''}`}
        >
            {/* Thumbnail */}
            <div className="course-thumbnail">
                <div className="course-thumbnail__inner">
                    {thumbnailUrl ? (
                        <img
                            src={thumbnailUrl}
                            alt={title}
                            className="course-card__image"
                        />
                    ) : (
                        <svg className="course-thumbnail__placeholder" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>

                {/* Discount Badge - Top Left */}
                {showOriginalPrice && (
                    <span className="course-discount-badge">
                        ลด {discountPercent}%
                    </span>
                )}

                {/* Price marker — anchored to the thumbnail boundary */}
                {displayPrice === 0 ? (
                    <span className="price-badge free">
                        <span className="price-badge__label">ราคา</span>
                        <span className="price-badge__value">ฟรี</span>
                    </span>
                ) : showOriginalPrice ? (
                    <span className="price-badge promo">
                        <span className="price-badge__label">ราคาพิเศษ</span>
                        <span className="price-badge__prices">
                            <span className="price-badge__was">฿{price.toLocaleString()}</span>
                            <span className="price-badge__value">฿{displayPrice.toLocaleString()}</span>
                        </span>
                    </span>
                ) : (
                    <span className="price-badge paid">
                        <span className="price-badge__label">ราคา</span>
                        <span className="price-badge__value">฿{displayPrice.toLocaleString()}</span>
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="course-card__content">
                {tags && tags.length > 0 && (
                    <div className="course-card__tags">
                        {tags.slice(0, 3).map(tag => (
                            <span
                                key={tag.id}
                                className="course-tag-badge"
                            >
                                {tag.name}
                            </span>
                        ))}
                        {tags.length > 3 && (
                            <span className="course-card__tag-more">+{tags.length - 3}</span>
                        )}
                    </div>
                )}
                <h3 className="course-card__title">
                    {title}
                </h3>

                {outcomes && outcomes.length > 0 ? (
                    <ul className="cc-outcomes">
                        {outcomes.map((outcome, i) => (
                            <li key={i}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                {outcome}
                            </li>
                        ))}
                    </ul>
                ) : description ? (
                    <p className="course-card__description">
                        {getExcerpt(description, 120)}
                    </p>
                ) : null}

                <div className="course-card__meta">
                    <div className="course-card__facts" aria-label="ข้อมูลคอร์ส">
                        <span className="course-card__lessons">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{lessonCount} บทเรียน</span>
                        </span>
                        {durationText && (
                            <span className="course-card__duration">{durationText}</span>
                        )}
                        {hasFreePreview && (
                            <span className="course-card__preview">มีบทเรียนทดลอง</span>
                        )}
                    </div>

                    {instructorName && (
                        <span className="course-card__instructor">สอนโดย {instructorName}</span>
                    )}
                </div>

                <span className="cc-cta">
                    {hasFreePreview ? 'ทดลองบทเรียนฟรี' : 'ดูรายละเอียดคอร์ส'}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
                </span>
            </div>
        </Link>
    );
}
