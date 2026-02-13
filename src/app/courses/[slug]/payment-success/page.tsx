import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { courses, enrollments, payments } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { safeInsertEnrollment } from '@/lib/db/safe-insert';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

function normalizeUrl(url: string | null): string | null {
  if (!url || url.trim() === '') return null;
  if (url.startsWith('http')) return url;
  return `https://${url}`;
}

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

async function getPaymentStatus(slug: string, userId: string) {
  // Get course
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);

  if (!course) return null;

  // Check if already enrolled
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, course.id)
      )
    )
    .limit(1);

  // Get latest payment for this course
  const [payment] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        eq(payments.courseId, course.id)
      )
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);

  return {
    course,
    isEnrolled: !!enrollment,
    payment,
  };
}

// Verify Stripe session and fulfill payment + enrollment if webhook hasn't done it yet
async function verifyAndFulfill(sessionId: string | undefined, userId: string, courseId: string, paymentId: string | undefined) {
  if (!sessionId) return;

  try {
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    if (stripeSession.payment_status !== 'paid') return;

    // Update payment status if still pending
    if (paymentId) {
      await db
        .update(payments)
        .set({
          status: 'completed',
          stripePaymentId: stripeSession.payment_intent as string,
        })
        .where(and(eq(payments.id, paymentId), eq(payments.status, 'pending')));
    }

    // Create enrollment (safe — handles duplicates)
    await safeInsertEnrollment(userId, courseId);
  } catch (error) {
    console.error('Stripe session verification fallback failed:', error);
  }
}

export default async function PaymentSuccessPage({ params, searchParams }: Props) {
  const session = await auth();

  if (!session?.user) {
    const { slug } = await params;
    redirect(`/login?callbackUrl=/courses/${slug}/payment-success`);
  }

  const { slug } = await params;
  const data = await getPaymentStatus(slug, session.user.id);

  if (!data) {
    redirect('/courses');
  }

  const { course, isEnrolled, payment } = data;
  const { session_id } = await searchParams;

  // If not enrolled yet, try to verify with Stripe and fulfill
  if (!isEnrolled) {
    await verifyAndFulfill(session_id, session.user.id, course.id, payment?.id);
  }

  // Re-check enrollment after potential fulfillment
  let enrolled = isEnrolled;
  if (!enrolled) {
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, session.user.id), eq(enrollments.courseId, course.id)))
      .limit(1);
    enrolled = !!enrollment;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '48px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}>
        {/* Success Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg style={{ width: '40px', height: '40px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: 700,
          color: '#0f172a',
          marginBottom: '8px',
        }}>
          ชำระเงินสำเร็จ! 🎉
        </h1>

        <p style={{
          color: '#64748b',
          fontSize: '1rem',
          marginBottom: '24px',
        }}>
          ขอบคุณสำหรับการสั่งซื้อ
        </p>

        {/* Course Info */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          textAlign: 'left',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}>
            {normalizeUrl(course.thumbnailUrl) && (
              <img
                src={normalizeUrl(course.thumbnailUrl)!}
                alt={course.title}
                width={60}
                height={40}
                style={{
                  objectFit: 'cover',
                  borderRadius: '6px',
                }}
              />
            )}
            <div>
              <h3 style={{ fontWeight: 600, color: '#0f172a', fontSize: '1rem' }}>
                {course.title}
              </h3>
              <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.875rem' }}>
                ฿{payment ? parseFloat(payment.amount.toString()).toLocaleString() : parseFloat(course.price.toString()).toLocaleString()}
              </p>
            </div>
          </div>

          {payment && (
            <div style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: '12px',
              fontSize: '0.875rem',
              color: '#64748b',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>หมายเลขคำสั่งซื้อ:</span>
                <span style={{ fontFamily: 'monospace' }}>{payment.id.slice(0, 8)}...</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>สถานะ:</span>
                <span style={{ color: '#16a34a', fontWeight: 500 }}>✓ ชำระเงินแล้ว</span>
              </div>
            </div>
          )}
        </div>

        {/* Enrollment Status */}
        <div style={{
          background: enrolled ? '#dcfce7' : '#fef3c7',
          color: enrolled ? '#166534' : '#92400e',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}>
          {enrolled ? (
            <>✓ คุณได้ลงทะเบียนเรียนคอร์สนี้เรียบร้อยแล้ว</>
          ) : (
            <>⏳ กำลังดำเนินการลงทะเบียน กรุณารอสักครู่...</>
          )}
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link
            href={`/courses/${slug}/learn`}
            style={{
              display: 'block',
              padding: '14px 24px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '1rem',
              transition: 'transform 0.2s',
            }}
          >
            🎓 เริ่มเรียนเลย
          </Link>

          <Link
            href="/dashboard"
            style={{
              display: 'block',
              padding: '12px 24px',
              background: '#f1f5f9',
              color: '#475569',
              textDecoration: 'none',
              borderRadius: '10px',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            ไปยังแดชบอร์ด
          </Link>
        </div>

        {/* Help Text */}
        <p style={{
          marginTop: '24px',
          fontSize: '0.75rem',
          color: '#94a3b8',
        }}>
          หากมีปัญหาใดๆ กรุณาติดต่อ support@milerdev.com
        </p>
      </div>
    </div>
  );
}
