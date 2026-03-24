import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { and, desc, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { analyticsEvents, bundles, courses } from '@/lib/db/schema';
import { isAnalyticsEnabled, parseAnalyticsMetadata } from '@/lib/analytics';

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function toInt(value: unknown): number {
  return typeof value === 'number' ? value : Number(value || 0);
}

type AnalyticsFunnelPayload = {
  enabled: boolean;
  periodMonths: number;
  totals: {
    courseView: number;
    checkoutStart: number;
    paymentSuccess: number;
    lessonCompleted: number;
  };
  uniqueActors: {
    courseView: number;
    checkoutStart: number;
    paymentSuccess: number;
    lessonCompleted: number;
  };
  conversion: {
    viewToCheckout: number;
    checkoutToPayment: number;
    viewToPayment: number;
  };
  timeline: Array<{
    date: string;
    courseView: number;
    checkoutStart: number;
    paymentSuccess: number;
    lessonCompleted: number;
  }>;
  topCourses: Array<{
    courseId: string | null;
    courseTitle: string;
    views: number;
    checkouts: number;
    payments: number;
    viewToCheckout: number;
    checkoutToPayment: number;
  }>;
  topBundles: Array<{
    bundleId: string | null;
    bundleTitle: string;
    views: number;
    checkouts: number;
    payments: number;
    viewToCheckout: number;
    checkoutToPayment: number;
  }>;
  checkoutMethods: Array<{
    method: string;
    count: number;
  }>;
};

interface AnalyticsFunnelCacheEntry {
  expiresAt: number;
  value: AnalyticsFunnelPayload;
}

const ANALYTICS_FUNNEL_CACHE_TTL_MS = 120_000;
const analyticsFunnelCache = new Map<number, AnalyticsFunnelCacheEntry>();

function buildEmptyAnalyticsResponse(periodMonths: number): AnalyticsFunnelPayload {
  return {
    enabled: false,
    periodMonths,
    totals: {
      courseView: 0,
      checkoutStart: 0,
      paymentSuccess: 0,
      lessonCompleted: 0,
    },
    uniqueActors: {
      courseView: 0,
      checkoutStart: 0,
      paymentSuccess: 0,
      lessonCompleted: 0,
    },
    conversion: {
      viewToCheckout: 0,
      checkoutToPayment: 0,
      viewToPayment: 0,
    },
    timeline: [],
    topCourses: [],
    topBundles: [],
    checkoutMethods: [],
  };
}

function getCachedAnalyticsResponse(periodMonths: number): AnalyticsFunnelPayload | null {
  const cached = analyticsFunnelCache.get(periodMonths);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    analyticsFunnelCache.delete(periodMonths);
    return null;
  }

  return cached.value;
}

function setCachedAnalyticsResponse(periodMonths: number, value: AnalyticsFunnelPayload) {
  analyticsFunnelCache.set(periodMonths, {
    value,
    expiresAt: Date.now() + ANALYTICS_FUNNEL_CACHE_TTL_MS,
  });
}

// GET /api/admin/analytics/funnel - Product funnel analytics dashboard data
export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const requestedMonths = parseInt(searchParams.get('period') || '6', 10);
    const periodMonths = Number.isNaN(requestedMonths)
      ? 6
      : Math.min(24, Math.max(1, requestedMonths));

    const cachedResponse = getCachedAnalyticsResponse(periodMonths);
    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
    }

    const enabled = await isAnalyticsEnabled();
    if (!enabled) {
      const response = buildEmptyAnalyticsResponse(periodMonths);
      setCachedAnalyticsResponse(periodMonths, response);
      return NextResponse.json(response);
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    const [[totalsRow], timeline, topCoursesRaw, topBundlesRaw, checkoutMetadataRows] = await Promise.all([
      db
        .select({
          courseView: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsEvents.eventName} = 'course_view' THEN 1 ELSE 0 END), 0)`,
          checkoutStart: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsEvents.eventName} = 'checkout_start' THEN 1 ELSE 0 END), 0)`,
          paymentSuccess: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsEvents.eventName} = 'payment_success' THEN 1 ELSE 0 END), 0)`,
          lessonCompleted: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsEvents.eventName} = 'lesson_completed' THEN 1 ELSE 0 END), 0)`,
          uniqueCourseView: sql<number>`COUNT(DISTINCT CASE WHEN ${analyticsEvents.eventName} = 'course_view' THEN COALESCE(${analyticsEvents.userId}, ${analyticsEvents.ipAddress}) END)`,
          uniqueCheckoutStart: sql<number>`COUNT(DISTINCT CASE WHEN ${analyticsEvents.eventName} = 'checkout_start' THEN COALESCE(${analyticsEvents.userId}, ${analyticsEvents.ipAddress}) END)`,
          uniquePaymentSuccess: sql<number>`COUNT(DISTINCT CASE WHEN ${analyticsEvents.eventName} = 'payment_success' THEN COALESCE(${analyticsEvents.userId}, ${analyticsEvents.ipAddress}) END)`,
          uniqueLessonCompleted: sql<number>`COUNT(DISTINCT CASE WHEN ${analyticsEvents.eventName} = 'lesson_completed' THEN COALESCE(${analyticsEvents.userId}, ${analyticsEvents.ipAddress}) END)`,
        })
        .from(analyticsEvents)
        .where(gte(analyticsEvents.createdAt, startDate)),
      db
        .select({
          date: sql<string>`DATE_FORMAT(${analyticsEvents.createdAt}, '%Y-%m-%d')`,
          courseView: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsEvents.eventName} = 'course_view' THEN 1 ELSE 0 END), 0)`,
          checkoutStart: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsEvents.eventName} = 'checkout_start' THEN 1 ELSE 0 END), 0)`,
          paymentSuccess: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsEvents.eventName} = 'payment_success' THEN 1 ELSE 0 END), 0)`,
          lessonCompleted: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsEvents.eventName} = 'lesson_completed' THEN 1 ELSE 0 END), 0)`,
        })
        .from(analyticsEvents)
        .where(gte(analyticsEvents.createdAt, startDate))
        .groupBy(sql`DATE_FORMAT(${analyticsEvents.createdAt}, '%Y-%m-%d')`)
        .orderBy(sql`DATE_FORMAT(${analyticsEvents.createdAt}, '%Y-%m-%d')`),
      db
        .select({
          courseId: analyticsEvents.courseId,
          courseTitle: courses.title,
          views: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsEvents.eventName} = 'course_view' THEN 1 ELSE 0 END), 0)`,
          checkouts: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsEvents.eventName} = 'checkout_start' THEN 1 ELSE 0 END), 0)`,
          payments: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsEvents.eventName} = 'payment_success' THEN 1 ELSE 0 END), 0)`,
        })
        .from(analyticsEvents)
        .leftJoin(courses, eq(analyticsEvents.courseId, courses.id))
        .where(and(gte(analyticsEvents.createdAt, startDate), isNotNull(analyticsEvents.courseId)))
        .groupBy(analyticsEvents.courseId, courses.title)
        .orderBy(desc(sql`COALESCE(SUM(CASE WHEN ${analyticsEvents.eventName} = 'course_view' THEN 1 ELSE 0 END), 0)`))
        .limit(10),
      db
        .select({
          bundleId: analyticsEvents.bundleId,
          bundleTitle: bundles.title,
          views: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsEvents.eventName} = 'course_view' THEN 1 ELSE 0 END), 0)`,
          checkouts: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsEvents.eventName} = 'checkout_start' THEN 1 ELSE 0 END), 0)`,
          payments: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsEvents.eventName} = 'payment_success' THEN 1 ELSE 0 END), 0)`,
        })
        .from(analyticsEvents)
        .leftJoin(bundles, eq(analyticsEvents.bundleId, bundles.id))
        .where(and(gte(analyticsEvents.createdAt, startDate), isNotNull(analyticsEvents.bundleId)))
        .groupBy(analyticsEvents.bundleId, bundles.title)
        .orderBy(desc(sql`COALESCE(SUM(CASE WHEN ${analyticsEvents.eventName} = 'course_view' THEN 1 ELSE 0 END), 0)`))
        .limit(10),
      db
        .select({ metadata: analyticsEvents.metadata })
        .from(analyticsEvents)
        .where(
          and(
            gte(analyticsEvents.createdAt, startDate),
            eq(analyticsEvents.eventName, 'checkout_start')
          )
        ),
    ]);

    const checkoutMethodMap = new Map<string, number>();
    for (const row of checkoutMetadataRows) {
      const metadata = parseAnalyticsMetadata(row.metadata);
      const paymentMethod =
        typeof metadata?.paymentMethod === 'string' && metadata.paymentMethod.trim()
          ? metadata.paymentMethod.trim()
          : 'unknown';

      checkoutMethodMap.set(paymentMethod, (checkoutMethodMap.get(paymentMethod) || 0) + 1);
    }

    const checkoutMethods = [...checkoutMethodMap.entries()]
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count);

    const totals = {
      courseView: toInt(totalsRow?.courseView),
      checkoutStart: toInt(totalsRow?.checkoutStart),
      paymentSuccess: toInt(totalsRow?.paymentSuccess),
      lessonCompleted: toInt(totalsRow?.lessonCompleted),
    };

    const uniqueActors = {
      courseView: toInt(totalsRow?.uniqueCourseView),
      checkoutStart: toInt(totalsRow?.uniqueCheckoutStart),
      paymentSuccess: toInt(totalsRow?.uniquePaymentSuccess),
      lessonCompleted: toInt(totalsRow?.uniqueLessonCompleted),
    };

    const response: AnalyticsFunnelPayload = {
      enabled: true,
      periodMonths,
      totals,
      uniqueActors,
      conversion: {
        viewToCheckout: toPercent(totals.checkoutStart, totals.courseView),
        checkoutToPayment: toPercent(totals.paymentSuccess, totals.checkoutStart),
        viewToPayment: toPercent(totals.paymentSuccess, totals.courseView),
      },
      timeline: timeline.map((item) => ({
        date: item.date,
        courseView: toInt(item.courseView),
        checkoutStart: toInt(item.checkoutStart),
        paymentSuccess: toInt(item.paymentSuccess),
        lessonCompleted: toInt(item.lessonCompleted),
      })),
      topCourses: topCoursesRaw.map((item) => {
        const views = toInt(item.views);
        const checkouts = toInt(item.checkouts);
        const payments = toInt(item.payments);
        return {
          courseId: item.courseId,
          courseTitle: item.courseTitle || 'ไม่ระบุคอร์ส',
          views,
          checkouts,
          payments,
          viewToCheckout: toPercent(checkouts, views),
          checkoutToPayment: toPercent(payments, checkouts),
        };
      }),
      topBundles: topBundlesRaw.map((item) => {
        const views = toInt(item.views);
        const checkouts = toInt(item.checkouts);
        const payments = toInt(item.payments);
        return {
          bundleId: item.bundleId,
          bundleTitle: item.bundleTitle || 'ไม่ระบุ Bundle',
          views,
          checkouts,
          payments,
          viewToCheckout: toPercent(checkouts, views),
          checkoutToPayment: toPercent(payments, checkouts),
        };
      }),
      checkoutMethods,
    };

    setCachedAnalyticsResponse(periodMonths, response);

    return NextResponse.json(response);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching analytics funnel data:' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Analytics' }, { status: 500 });
  }
}
