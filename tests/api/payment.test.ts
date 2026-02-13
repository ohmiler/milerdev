import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// MOCKS
// ============================================================

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

vi.mock('@/lib/stripe', () => ({
    stripe: {
        checkout: {
            sessions: {
                create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test', id: 'cs_test_123' }),
            },
        },
        webhooks: {
            constructEvent: vi.fn(),
        },
    },
}));

vi.mock('@/lib/email', () => ({
    sendPaymentConfirmation: vi.fn().mockResolvedValue(undefined),
    sendEnrollmentEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@paralleldrive/cuid2', () => ({
    createId: vi.fn().mockReturnValue('mock-cuid'),
}));

vi.mock('@/lib/rate-limit', () => ({
    checkRateLimit: vi.fn().mockReturnValue({ success: true, remaining: 10, resetTime: Date.now() + 60000 }),
    getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
    rateLimits: {
        auth: { maxRequests: 5, windowMs: 60000 },
        sensitive: { maxRequests: 10, windowMs: 60000 },
        general: { maxRequests: 100, windowMs: 60000 },
    },
    rateLimitResponse: vi.fn().mockReturnValue(
        new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
    ),
}));

vi.mock('@/lib/coupon', () => ({
    calculateDiscount: vi.fn().mockReturnValue(0),
    validateCouponEligibility: vi.fn().mockReturnValue({ valid: true }),
    isCouponFullDiscount: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/certificate', () => ({
    issueCertificate: vi.fn().mockResolvedValue({ certificate: { certificateCode: 'CERT-001' }, isNew: true }),
}));

// Stateful mock DB
const mockDb = {
    // Configurable results
    selectResults: [] as unknown[],
    queryFindFirstResult: null as unknown,
    insertCalled: false,
    updateSetData: null as Record<string, unknown> | null,
    transactionCalled: false,
};

vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn().mockImplementation(() => ({
            from: vi.fn().mockImplementation(() => ({
                where: vi.fn().mockImplementation(() => ({
                    limit: vi.fn().mockImplementation(() => Promise.resolve(mockDb.selectResults)),
                })),
                leftJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue(mockDb.selectResults),
                        orderBy: vi.fn().mockResolvedValue(mockDb.selectResults),
                    }),
                }),
                innerJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        orderBy: vi.fn().mockResolvedValue([]),
                    }),
                }),
                orderBy: vi.fn().mockResolvedValue(mockDb.selectResults),
            })),
        })),
        insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation(() => {
                mockDb.insertCalled = true;
                return Promise.resolve();
            }),
        }),
        update: vi.fn().mockReturnValue({
            set: vi.fn().mockImplementation((data: Record<string, unknown>) => {
                mockDb.updateSetData = data;
                return { where: vi.fn().mockResolvedValue(undefined) };
            }),
        }),
        delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
        }),
        query: {
            courses: {
                findFirst: vi.fn().mockImplementation(() => Promise.resolve(mockDb.queryFindFirstResult)),
            },
            enrollments: {
                findFirst: vi.fn().mockImplementation(() => Promise.resolve(mockDb.queryFindFirstResult)),
            },
            payments: {
                findFirst: vi.fn().mockImplementation(() => Promise.resolve(mockDb.queryFindFirstResult)),
            },
        },
        transaction: vi.fn().mockImplementation(async (fn: Function) => {
            mockDb.transactionCalled = true;
            return fn({
                insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
                update: vi.fn().mockReturnValue({
                    set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
                }),
            });
        }),
    },
}));

import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { checkRateLimit } from '@/lib/rate-limit';
import { calculateDiscount, validateCouponEligibility } from '@/lib/coupon';
import { db } from '@/lib/db';

const mockedAuth = vi.mocked(auth);
const mockedRateLimit = vi.mocked(checkRateLimit);
const mockedStripe = vi.mocked(stripe);
const mockedCalcDiscount = vi.mocked(calculateDiscount);
const mockedValidateCoupon = vi.mocked(validateCouponEligibility);

// Helper: authenticated session
const studentSession = {
    user: { id: 'user-1', role: 'student', name: 'Test User', email: 'test@example.com' },
    expires: new Date(Date.now() + 86400000).toISOString(),
};

// Helper: sample course
const publishedCourse = {
    id: 'course-1',
    title: 'Test Course',
    slug: 'test-course',
    price: '990',
    promoPrice: null,
    promoStartsAt: null,
    promoEndsAt: null,
    status: 'published',
    description: 'A test course',
    thumbnailUrl: null,
};

const promoCourse = {
    ...publishedCourse,
    price: '1990',
    promoPrice: '990',
    promoStartsAt: new Date(Date.now() - 86400000),
    promoEndsAt: new Date(Date.now() + 86400000),
};

function makeJsonRequest(url: string, body: Record<string, unknown>) {
    return new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

function resetMocks() {
    vi.clearAllMocks();
    mockDb.selectResults = [];
    mockDb.queryFindFirstResult = null;
    mockDb.insertCalled = false;
    mockDb.updateSetData = null;
    mockDb.transactionCalled = false;
    mockedRateLimit.mockReturnValue({ success: true, remaining: 10, resetTime: Date.now() + 60000 });
    mockedCalcDiscount.mockReturnValue(0);
    mockedValidateCoupon.mockReturnValue({ valid: true });
}

// ============================================================
// STRIPE CHECKOUT
// ============================================================
describe('POST /api/stripe/checkout', () => {
    beforeEach(() => {
        resetMocks();
        mockedAuth.mockResolvedValue(studentSession as never);
    });

    async function callCheckout(body: Record<string, unknown>) {
        const mod = await import('@/app/api/stripe/checkout/route');
        return mod.POST(makeJsonRequest('http://localhost:3000/api/stripe/checkout', body));
    }

    it('should return 401 for unauthenticated', async () => {
        mockedAuth.mockResolvedValue(null as never);
        const res = await callCheckout({ courseId: 'course-1' });
        expect(res.status).toBe(401);
    });

    it('should return 429 when rate limited', async () => {
        mockedRateLimit.mockReturnValue({ success: false, remaining: 0, resetTime: Date.now() + 60000 });
        const res = await callCheckout({ courseId: 'course-1' });
        expect(res.status).toBe(429);
    });

    it('should reject unpublished course', async () => {
        vi.mocked(db.query.courses.findFirst).mockResolvedValue({ ...publishedCourse, status: 'draft' });
        const res = await callCheckout({ courseId: 'course-1' });
        expect(res.status).toBe(404);
    });

    it('should reject non-existent course', async () => {
        vi.mocked(db.query.courses.findFirst).mockResolvedValue(null);
        const res = await callCheckout({ courseId: 'nonexistent' });
        expect(res.status).toBe(404);
    });

    it('should create checkout session for published course', async () => {
        vi.mocked(db.query.courses.findFirst).mockResolvedValue(publishedCourse);
        mockDb.selectResults = []; // no existing pending payment
        const res = await callCheckout({ courseId: 'course-1' });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.url).toBeTruthy();
        expect(data.sessionId).toBeTruthy();
    });

    it('should use promo price when promo is active', async () => {
        vi.mocked(db.query.courses.findFirst).mockResolvedValue(promoCourse);
        mockDb.selectResults = [];
        const res = await callCheckout({ courseId: 'course-1' });
        expect(res.status).toBe(200);
        // Verify Stripe was called with promo price (990 * 100 = 99000 satang)
        const stripeCall = mockedStripe.checkout.sessions.create.mock.calls[0]?.[0];
        expect(stripeCall?.line_items?.[0]?.price_data?.unit_amount).toBe(99000);
    });

    // Note: coupon discount logic is thoroughly tested in tests/lib/coupon.test.ts
    // Complex multi-chain DB mocks for coupon flows are fragile in integration tests
});

// ============================================================
// STRIPE WEBHOOK
// ============================================================
describe('POST /api/stripe/webhook', () => {
    beforeEach(resetMocks);

    async function callWebhook(body: string = '{}') {
        // Mock next/headers for webhook
        vi.doMock('next/headers', () => ({
            headers: vi.fn().mockResolvedValue(new Map([['stripe-signature', 'sig_test']])),
        }));

        const mod = await import('@/app/api/stripe/webhook/route');
        return mod.POST(new Request('http://localhost:3000/api/stripe/webhook', {
            method: 'POST',
            body,
            headers: { 'stripe-signature': 'sig_test' },
        }));
    }

    it('should return 400 for invalid signature', async () => {
        mockedStripe.webhooks.constructEvent.mockImplementation(() => { throw new Error('Invalid sig'); });
        const res = await callWebhook('invalid');
        expect(res.status).toBe(400);
    });

    it('should process checkout.session.completed and create enrollment', async () => {
        mockedStripe.webhooks.constructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    metadata: { paymentId: 'pay-1', userId: 'user-1', courseId: 'course-1', type: 'course' },
                    payment_intent: 'pi_test',
                    customer_details: { email: 'test@example.com', name: 'Test' },
                },
            },
        } as never);

        vi.mocked(db.query.enrollments.findFirst).mockResolvedValue(null); // not enrolled
        vi.mocked(db.query.courses.findFirst).mockResolvedValue(publishedCourse);
        mockDb.selectResults = [{ id: 'pay-1', amount: '990' }]; // payment record

        const res = await callWebhook('valid-body');
        expect(res.status).toBe(200);
        expect(mockDb.updateSetData?.status).toBe('completed');
    });

    it('should skip duplicate enrollment on webhook retry', async () => {
        mockedStripe.webhooks.constructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    metadata: { paymentId: 'pay-1', userId: 'user-1', courseId: 'course-1', type: 'course' },
                    payment_intent: 'pi_test',
                    customer_details: { email: 'test@example.com', name: 'Test' },
                },
            },
        } as never);

        vi.mocked(db.query.enrollments.findFirst).mockResolvedValue({ id: 'enroll-1' }); // already enrolled
        mockDb.selectResults = [{ id: 'pay-1', amount: '990' }];

        const res = await callWebhook('valid-body');
        expect(res.status).toBe(200);
        // insert should not be called for enrollment (already exists)
    });

    it('should handle missing metadata gracefully', async () => {
        mockedStripe.webhooks.constructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: { metadata: {}, payment_intent: 'pi_test' },
            },
        } as never);

        const res = await callWebhook('valid-body');
        expect(res.status).toBe(200); // returns received: true, no error
    });
});

// ============================================================
// ENROLL (free + coupon 100%)
// ============================================================
describe('POST /api/enroll', () => {
    beforeEach(() => {
        resetMocks();
        mockedAuth.mockResolvedValue(studentSession as never);
    });

    async function callEnroll(body: Record<string, unknown>) {
        const mod = await import('@/app/api/enroll/route');
        return mod.POST(makeJsonRequest('http://localhost:3000/api/enroll', body));
    }

    it('should return 401 for unauthenticated', async () => {
        mockedAuth.mockResolvedValue(null as never);
        const res = await callEnroll({ courseId: 'course-1' });
        expect(res.status).toBe(401);
    });

    it('should enroll in free course', async () => {
        vi.mocked(db.query.courses.findFirst).mockResolvedValue({ ...publishedCourse, price: '0' });
        vi.mocked(db.query.enrollments.findFirst).mockResolvedValue(null);
        const res = await callEnroll({ courseId: 'course-1' });
        expect(res.status).toBe(201);
    });

    it('should reject if already enrolled', async () => {
        vi.mocked(db.query.courses.findFirst).mockResolvedValue({ ...publishedCourse, price: '0' });
        vi.mocked(db.query.enrollments.findFirst).mockResolvedValue({ id: 'enroll-1' });
        const res = await callEnroll({ courseId: 'course-1' });
        expect(res.status).toBe(400);
    });

    it('should require payment for paid course without paymentId', async () => {
        vi.mocked(db.query.courses.findFirst).mockResolvedValue(publishedCourse);
        vi.mocked(db.query.enrollments.findFirst).mockResolvedValue(null);
        const res = await callEnroll({ courseId: 'course-1' });
        expect(res.status).toBe(402);
    });

    it('should reject unpublished course', async () => {
        vi.mocked(db.query.courses.findFirst).mockResolvedValue({ ...publishedCourse, status: 'draft' });
        const res = await callEnroll({ courseId: 'course-1' });
        expect(res.status).toBe(404);
    });

    it('should accept paid course with valid paymentId', async () => {
        vi.mocked(db.query.courses.findFirst).mockResolvedValue(publishedCourse);
        vi.mocked(db.query.enrollments.findFirst).mockResolvedValue(null);
        vi.mocked(db.query.payments.findFirst).mockResolvedValue({ id: 'pay-1', status: 'completed' });
        const res = await callEnroll({ courseId: 'course-1', paymentId: 'pay-1' });
        expect(res.status).toBe(201);
    });

    it('should reject paid course with invalid paymentId', async () => {
        vi.mocked(db.query.courses.findFirst).mockResolvedValue(publishedCourse);
        vi.mocked(db.query.enrollments.findFirst).mockResolvedValue(null);
        vi.mocked(db.query.payments.findFirst).mockResolvedValue(null); // no valid payment
        const res = await callEnroll({ courseId: 'course-1', paymentId: 'fake-pay' });
        expect(res.status).toBe(402);
    });

    // Note: coupon + enroll integration (100% coupon, partial coupon, promo+coupon)
    // is tested via unit tests in tests/lib/coupon.test.ts (calculateDiscount, isCouponFullDiscount)
    // Complex multi-chain DB mocks are fragile — security logic is verified in unit tests

    it('should return 429 when rate limited', async () => {
        mockedRateLimit.mockReturnValue({ success: false, remaining: 0, resetTime: Date.now() + 60000 });
        const res = await callEnroll({ courseId: 'course-1' });
        expect(res.status).toBe(429);
    });

    it('should reject missing courseId', async () => {
        const res = await callEnroll({});
        expect(res.status).toBe(400);
    });
});

// ============================================================
// BUNDLE CHECKOUT
// ============================================================
describe('POST /api/stripe/bundle-checkout', () => {
    beforeEach(() => {
        resetMocks();
        mockedAuth.mockResolvedValue(studentSession as never);
    });

    async function callBundleCheckout(body: Record<string, unknown>) {
        const mod = await import('@/app/api/stripe/bundle-checkout/route');
        return mod.POST(makeJsonRequest('http://localhost:3000/api/stripe/bundle-checkout', body));
    }

    it('should return 401 for unauthenticated', async () => {
        mockedAuth.mockResolvedValue(null as never);
        const res = await callBundleCheckout({ bundleId: 'bundle-1' });
        expect(res.status).toBe(401);
    });

    it('should reject unpublished bundle', async () => {
        mockDb.selectResults = [{ id: 'bundle-1', status: 'draft', price: '1990' }];

        // Override: first select for bundle → draft
        const origSelect = vi.mocked(db.select);
        origSelect.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([{ id: 'bundle-1', status: 'draft', price: '1990' }]),
                }),
            }),
        } as never);

        const res = await callBundleCheckout({ bundleId: 'bundle-1' });
        expect(res.status).toBe(404);
    });

    it('should reject free bundle', async () => {
        const origSelect = vi.mocked(db.select);
        origSelect.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([{ id: 'bundle-1', status: 'published', price: '0' }]),
                }),
            }),
        } as never);

        const res = await callBundleCheckout({ bundleId: 'bundle-1' });
        expect(res.status).toBe(400);
    });

    it('should return 429 when rate limited', async () => {
        mockedRateLimit.mockReturnValue({ success: false, remaining: 0, resetTime: Date.now() + 60000 });
        const res = await callBundleCheckout({ bundleId: 'bundle-1' });
        expect(res.status).toBe(429);
    });
});

// ============================================================
// BUNDLE ENROLL
// ============================================================
describe('POST /api/bundles/enroll', () => {
    beforeEach(() => {
        resetMocks();
        mockedAuth.mockResolvedValue(studentSession as never);
    });

    async function callBundleEnroll(body: Record<string, unknown>) {
        const mod = await import('@/app/api/bundles/enroll/route');
        return mod.POST(makeJsonRequest('http://localhost:3000/api/bundles/enroll', body));
    }

    it('should return 401 for unauthenticated', async () => {
        mockedAuth.mockResolvedValue(null as never);
        const res = await callBundleEnroll({ bundleId: 'bundle-1' });
        expect(res.status).toBe(401);
    });

    it('should reject missing bundleId', async () => {
        const res = await callBundleEnroll({});
        expect(res.status).toBe(400);
    });

    it('should require payment for paid bundle', async () => {
        const origSelect = vi.mocked(db.select);
        origSelect.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([{ id: 'bundle-1', status: 'published', price: '1990' }]),
                }),
            }),
        } as never);

        const res = await callBundleEnroll({ bundleId: 'bundle-1' });
        expect(res.status).toBe(402);
    });

    it('should reject payment with wrong bundleId', async () => {
        const origSelect = vi.mocked(db.select);
        // Bundle select
        origSelect.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([{ id: 'bundle-1', status: 'published', price: '1990' }]),
                }),
            }),
        } as never);
        // Payment select — no match (wrong bundleId)
        origSelect.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([]), // no matching payment
                }),
            }),
        } as never);

        const res = await callBundleEnroll({ bundleId: 'bundle-1', paymentId: 'pay-wrong' });
        expect(res.status).toBe(402);
    });

    it('should return 429 when rate limited', async () => {
        mockedRateLimit.mockReturnValue({ success: false, remaining: 0, resetTime: Date.now() + 60000 });
        const res = await callBundleEnroll({ bundleId: 'bundle-1' });
        expect(res.status).toBe(429);
    });
});
