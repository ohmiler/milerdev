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
    instructorName,
    lessonCount,
    tags,
}: CourseCardProps) {
    const thumbnailUrl = normalizeUrl(rawThumbnailUrl);
    return (
        <Link href={`/courses/${slug}`} className="card block group">
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

                {/* Price Badge */}
                {price === 0 ? (
                    <span className="price-badge free">ฟรี</span>
                ) : (
                    <span className="price-badge paid">฿{price.toLocaleString()}</span>
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
