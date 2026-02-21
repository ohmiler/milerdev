import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BundleEnrollButton from '@/components/bundle/BundleEnrollButton';
import ProductViewTracker from '@/components/analytics/ProductViewTracker';
import { db } from '@/lib/db';
import { bundles, bundleCourses, courses, enrollments, lessons } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { eq, asc, and, count } from 'drizzle-orm';
import { getExcerpt } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ slug: string }>;
}

function normalizeUrl(url: string | null): string | null {
    if (!url || url.trim() === '') return null;
    if (url.startsWith('http')) return url;
    return `https://${url}`;
}

async function getBundle(slug: string) {
    const [bundle] = await db
        .select()
        .from(bundles)
        .where(eq(bundles.slug, slug))
        .limit(1);

    if (!bundle || bundle.status !== 'published') return null;

    const bCourses = await db
        .select({
            courseId: bundleCourses.courseId,
            orderIndex: bundleCourses.orderIndex,
            courseTitle: courses.title,
            courseSlug: courses.slug,
            coursePrice: courses.price,
            courseThumbnail: courses.thumbnailUrl,
            courseDescription: courses.description,
        })
        .from(bundleCourses)
        .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
        .where(eq(bundleCourses.bundleId, bundle.id))
        .orderBy(asc(bundleCourses.orderIndex));

    // Get lesson counts for each course
    const coursesWithLessons = await Promise.all(
        bCourses.map(async (c) => {
            const [result] = await db
                .select({ lessonCount: count() })
                .from(lessons)
                .where(eq(lessons.courseId, c.courseId));
            return { ...c, lessonCount: result?.lessonCount || 0 };
        })
    );

    const totalOriginalPrice = coursesWithLessons.reduce(
        (sum, c) => sum + parseFloat(c.coursePrice || '0'), 0
    );

    return {
        ...bundle,
        courses: coursesWithLessons,
        courseCount: coursesWithLessons.length,
        totalOriginalPrice,
        discount: totalOriginalPrice > 0
            ? Math.round((1 - parseFloat(bundle.price) / totalOriginalPrice) * 100)
            : 0,
    };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const bundle = await getBundle(slug);
    if (!bundle) return { title: 'ไม่พบ Bundle' };

    const description = bundle.description
        ? getExcerpt(bundle.description, 160)
        : `รวม ${bundle.courseCount} คอร์สในราคาพิเศษ ลด ${bundle.discount}%`;

    const thumbnailUrl = normalizeUrl(bundle.thumbnailUrl);

    return {
        title: bundle.title,
        description,
        alternates: {
            canonical: `/bundles/${slug}`,
        },
        openGraph: {
            type: 'website',
            title: bundle.title,
            description,
            url: `/bundles/${slug}`,
            siteName: 'MilerDev',
            ...(thumbnailUrl && {
                images: [{ url: thumbnailUrl, width: 1200, height: 630, alt: bundle.title }],
            }),
        },
        twitter: {
            card: 'summary_large_image',
            title: bundle.title,
            description,
            ...(thumbnailUrl && { images: [thumbnailUrl] }),
        },
    };
}

export default async function BundleDetailPage({ params }: Props) {
    const { slug } = await params;
    const bundle = await getBundle(slug);

    if (!bundle) notFound();

    const bundlePrice = parseFloat(bundle.price);
    const savings = bundle.totalOriginalPrice - bundlePrice;

    // Check if user is already enrolled in all bundle courses
    let allEnrolled = false;
    const session = await auth();
    if (session?.user) {
        const checks = await Promise.all(
            bundle.courses.map(async (c) => {
                const [enrollment] = await db
                    .select()
                    .from(enrollments)
                    .where(and(eq(enrollments.userId, session.user.id), eq(enrollments.courseId, c.courseId)))
                    .limit(1);
                return !!enrollment;
            })
        );
        allEnrolled = checks.every(Boolean);
    }

    return (
        <>
            <Navbar />
            <ProductViewTracker itemType="bundle" bundleId={bundle.id} />
            <main style={{ paddingTop: 0 }}>
                {/* Header */}
                <section style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #7c3aed 100%)',
                    padding: '60px 0',
                    color: 'white',
                }}>
                    <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
                        <div style={{ marginBottom: '16px', fontSize: '0.875rem', opacity: 0.8 }}>
                            <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>หน้าแรก</Link>
                            {' / '}
                            <Link href="/courses" style={{ color: 'white', textDecoration: 'none' }}>คอร์สทั้งหมด</Link>
                            {' / '}
                            <span>Bundle</span>
                        </div>

                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(255,255,255,0.15)',
                            padding: '6px 16px',
                            borderRadius: '50px',
                            fontSize: '0.875rem',
                            marginBottom: '16px',
                        }}>
                            📦 Bundle • {bundle.courseCount} คอร์ส
                        </div>

                        <h1 style={{
                            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                            fontWeight: 700,
                            marginBottom: '16px',
                            lineHeight: 1.3,
                        }}>
                            {bundle.title}
                        </h1>

                        {bundle.description && (
                            <p style={{
                                fontSize: '1.125rem',
                                opacity: 0.9,
                                marginBottom: '24px',
                                lineHeight: 1.7,
                                maxWidth: '700px',
                            }}>
                                {bundle.description}
                            </p>
                        )}

                        {/* Pricing */}
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '16px',
                        }}>
                            <span style={{ fontSize: '2rem', fontWeight: 700 }}>
                                {bundlePrice === 0 ? 'ฟรี' : `฿${bundlePrice.toLocaleString()}`}
                            </span>
                            {bundle.totalOriginalPrice > bundlePrice && (
                                <>
                                    <span style={{ fontSize: '1.25rem', textDecoration: 'line-through', opacity: 0.6 }}>
                                        ฿{bundle.totalOriginalPrice.toLocaleString()}
                                    </span>
                                    <span style={{
                                        background: '#fbbf24',
                                        color: '#1e1b4b',
                                        padding: '4px 12px',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '0.9375rem',
                                    }}>
                                        ลด {bundle.discount}% • ประหยัด ฿{savings.toLocaleString()}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* Content */}
                <section className="section">
                    <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
                        <div style={{ display: 'grid', gap: '32px' }}>

                            {/* Courses in Bundle */}
                            <div>
                                <h2 style={{ fontSize: '1.375rem', fontWeight: 600, color: '#1e293b', marginBottom: '20px' }}>
                                    คอร์สใน Bundle นี้ ({bundle.courseCount} คอร์ส)
                                </h2>

                                <div style={{ display: 'grid', gap: '16px' }}>
                                    {bundle.courses.map((course, index) => (
                                        <Link
                                            key={course.courseId}
                                            href={`/courses/${course.courseSlug}`}
                                            style={{ textDecoration: 'none', color: 'inherit' }}
                                        >
                                            <div style={{
                                                background: 'white',
                                                borderRadius: '12px',
                                                border: '1px solid #e2e8f0',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                transition: 'box-shadow 0.2s, transform 0.2s',
                                            }}
                                            className="bundle-course-card"
                                            >
                                                {/* Thumbnail */}
                                                <div style={{
                                                    width: '180px',
                                                    minHeight: '120px',
                                                    flexShrink: 0,
                                                    background: normalizeUrl(course.courseThumbnail)
                                                        ? `url(${normalizeUrl(course.courseThumbnail)}) center/cover`
                                                        : 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                                                    position: 'relative',
                                                }}>
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '8px',
                                                        left: '8px',
                                                        background: 'rgba(0,0,0,0.6)',
                                                        color: 'white',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                    }}>
                                                        {index + 1}/{bundle.courseCount}
                                                    </div>
                                                </div>

                                                {/* Info */}
                                                <div style={{ padding: '16px 20px', flex: 1 }}>
                                                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#1e293b', margin: '0 0 6px' }}>
                                                        {course.courseTitle}
                                                    </h3>
                                                    {course.courseDescription && (
                                                        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 10px', lineHeight: 1.5 }}>
                                                            {getExcerpt(course.courseDescription, 100)}
                                                        </p>
                                                    )}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8125rem', color: '#94a3b8' }}>
                                                        <span>{course.lessonCount} บทเรียน</span>
                                                        <span>•</span>
                                                        <span style={{ textDecoration: 'line-through' }}>
                                                            ฿{parseFloat(course.coursePrice).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Price Comparison + CTA */}
                            <div style={{
                                background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                                borderRadius: '16px',
                                padding: '32px',
                                textAlign: 'center',
                            }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#166534', margin: '0 0 20px' }}>
                                    ซื้อ Bundle คุ้มกว่า!
                                </h3>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '4px' }}>ซื้อแยก</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626', textDecoration: 'line-through' }}>
                                            ฿{bundle.totalOriginalPrice.toLocaleString()}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '1.5rem', color: '#64748b', alignSelf: 'center' }}>→</div>
                                    <div>
                                        <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '4px' }}>ซื้อ Bundle</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
                                            ฿{bundlePrice.toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '4px' }}>ประหยัด</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>
                                            ฿{savings.toLocaleString()} ({bundle.discount}%)
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '20px', color: '#475569', fontSize: '0.875rem' }}>
                                    <span>📚 {bundle.courseCount} คอร์ส</span>
                                    <span>📖 {bundle.courses.reduce((s, c) => s + c.lessonCount, 0)} บทเรียน</span>
                                    <span>🎓 Certificate ทุกคอร์ส</span>
                                    <span>♾️ เข้าถึงตลอดชีพ</span>
                                </div>

                                <BundleEnrollButton bundleId={bundle.id} price={bundlePrice} bundleSlug={bundle.slug} allEnrolled={allEnrolled} />
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />

            <style>{`
                .bundle-course-card:hover {
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                    transform: translateY(-2px);
                }
                @media (max-width: 640px) {
                    .bundle-course-card {
                        flex-direction: column !important;
                    }
                    .bundle-course-card > div:first-child {
                        width: 100% !important;
                        min-height: 160px !important;
                    }
                }
            `}</style>
        </>
    );
}
