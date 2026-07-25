import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BundleEnrollButton from '@/components/bundle/BundleEnrollButton';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bundleCourses, bundles, courses, enrollments, lessons } from '@/lib/db/schema';
import { getExcerpt } from '@/lib/sanitize';
import { requirePublishedBundleCourses } from '@/lib/bundle-commerce';
import { and, asc, count, eq } from 'drizzle-orm';
import styles from './bundle-detail.module.css';

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
      courseStatus: courses.status,
    })
    .from(bundleCourses)
    .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
    .where(eq(bundleCourses.bundleId, bundle.id))
    .orderBy(asc(bundleCourses.orderIndex));

  try {
    requirePublishedBundleCourses(bCourses.map((course) => ({
      id: course.courseId,
      status: course.courseStatus,
    })));
  } catch {
    return null;
  }

  const coursesWithLessons = await Promise.all(
    bCourses.map(async (course) => {
      const [result] = await db
        .select({ lessonCount: count() })
        .from(lessons)
        .where(eq(lessons.courseId, course.courseId));
      return { ...course, lessonCount: result?.lessonCount || 0 };
    }),
  );

  const totalOriginalPrice = coursesWithLessons.reduce(
    (sum, course) => sum + parseFloat(course.coursePrice || '0'),
    0,
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
    alternates: { canonical: `/bundles/${slug}` },
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
  const totalLessons = bundle.courses.reduce((sum, course) => sum + course.lessonCount, 0);

  let allEnrolled = false;
  const session = await auth();
  if (session?.user) {
    const checks = await Promise.all(
      bundle.courses.map(async (course) => {
        const [enrollment] = await db
          .select()
          .from(enrollments)
          .where(and(
            eq(enrollments.userId, session.user.id),
            eq(enrollments.courseId, course.courseId),
          ))
          .limit(1);
        return !!enrollment;
      }),
    );
    allEnrolled = checks.every(Boolean);
  }

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.shell}>
            <nav className={styles.breadcrumb} aria-label={'เส้นทางนำทาง'}>
              <Link href={'/'}>หน้าแรก</Link>
              <span aria-hidden={true}>/</span>
              <Link href={'/courses'}>คอร์สทั้งหมด</Link>
              <span aria-hidden={true}>/</span>
              <span>ชุดคอร์ส</span>
            </nav>

            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>LEARNING PATH / {String(bundle.courseCount).padStart(2, '0')} COURSES</p>
                <h1>{bundle.title}</h1>
                {bundle.description ? <p className={styles.lede}>{bundle.description}</p> : null}
              </div>

              <div className={styles.heroEvidence} aria-label={'ข้อมูลชุดคอร์ส'}>
                <div>
                  <span>คอร์ส</span>
                  <strong>{bundle.courseCount}</strong>
                </div>
                <div>
                  <span>บทเรียน</span>
                  <strong>{totalLessons}</strong>
                </div>
                <div>
                  <span>ราคาชุด</span>
                  <strong>{bundlePrice === 0 ? 'ฟรี' : `฿${bundlePrice.toLocaleString()}`}</strong>
                </div>
                <div>
                  <span>ส่วนลด</span>
                  <strong>{bundle.discount > 0 ? `${bundle.discount}%` : '—'}</strong>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className={styles.body}>
          <div className={`${styles.shell} ${styles.bodyGrid}`}>
            <div className={styles.courseColumn}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>COURSE SEQUENCE</p>
                  <h2>เส้นทางการเรียนในชุดนี้</h2>
                </div>
                <p>เรียงตามลำดับที่วางไว้ เปิดดูรายละเอียดแต่ละคอร์สได้ก่อนตัดสินใจ</p>
              </div>

              <ol className={styles.courseList}>
                {bundle.courses.map((course, index) => {
                  const thumbnail = normalizeUrl(course.courseThumbnail);
                  return (
                    <li key={course.courseId}>
                      <Link className={styles.courseCard} href={`/courses/${course.courseSlug}`}>
                        <div
                          className={styles.courseMedia}
                          style={thumbnail ? { backgroundImage: `url(${thumbnail})` } : undefined}
                          aria-hidden={true}
                        >
                          <span>{String(index + 1).padStart(2, '0')}</span>
                        </div>
                        <div className={styles.courseCopy}>
                          <div className={styles.courseMeta}>
                            <span>COURSE {String(index + 1).padStart(2, '0')}</span>
                            <span>{course.lessonCount} บทเรียน</span>
                          </div>
                          <h3>{course.courseTitle}</h3>
                          {course.courseDescription ? (
                            <p>{getExcerpt(course.courseDescription, 120)}</p>
                          ) : null}
                          <div className={styles.courseFooter}>
                            <span>ราคาปกติ ฿{parseFloat(course.coursePrice).toLocaleString()}</span>
                            <strong>ดูรายละเอียด <span aria-hidden={true}>→</span></strong>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>

            <aside className={styles.purchaseRail} aria-label={'สรุปและสมัครชุดคอร์ส'}>
              <div className={styles.purchasePanel}>
                <p className={styles.eyebrow}>BUNDLE SUMMARY</p>
                <h2>เริ่มเส้นทางนี้</h2>

                <div className={styles.priceBlock}>
                  <span>ราคาชุดคอร์ส</span>
                  <strong>{bundlePrice === 0 ? 'ฟรี' : `฿${bundlePrice.toLocaleString()}`}</strong>
                  {bundle.totalOriginalPrice > bundlePrice ? (
                    <p>
                      <span>จาก ฿{bundle.totalOriginalPrice.toLocaleString()}</span>
                      <b>ประหยัด ฿{savings.toLocaleString()} ({bundle.discount}%)</b>
                    </p>
                  ) : null}
                </div>

                <dl className={styles.bundleFacts}>
                  <div><dt>คอร์สทั้งหมด</dt><dd>{bundle.courseCount} คอร์ส</dd></div>
                  <div><dt>เนื้อหาทั้งหมด</dt><dd>{totalLessons} บทเรียน</dd></div>
                  <div><dt>Certificate</dt><dd>ทุกคอร์ส</dd></div>
                  <div><dt>การเข้าถึง</dt><dd>ตลอดชีพ</dd></div>
                </dl>

                <BundleEnrollButton
                  bundleId={bundle.id}
                  price={bundlePrice}
                  bundleSlug={bundle.slug}
                  allEnrolled={allEnrolled}
                />

                <p className={styles.purchaseNote}>ตรวจสอบคอร์สและยอดชำระก่อนยืนยัน ระบบจะเปิดสิทธิ์หลังการชำระเงินได้รับการตรวจสอบแล้ว</p>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
