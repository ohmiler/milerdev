import { auth } from '@/lib/auth';
import { notificationPubSub } from '@/lib/notification-pubsub';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NOTIFICATION_STREAM_RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

// GET /api/notifications/stream - SSE endpoint for real-time notifications
export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new Response('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;
    const rateLimit = checkRateLimit(`notifications:stream:${userId}`, NOTIFICATION_STREAM_RATE_LIMIT);
    if (!rateLimit.success) {
        return rateLimitResponse(rateLimit.resetTime);
    }

    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    let closeStream: (() => void) | null = null;
    let closed = false;

    const cleanup = () => {
        if (unsubscribe) {
            const currentUnsubscribe = unsubscribe;
            unsubscribe = null;
            currentUnsubscribe();
        }

        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    };

    const stream = new ReadableStream({
        start(controller) {
            closeStream = () => {
                if (closed) return;
                closed = true;
                cleanup();
                try {
                    controller.close();
                } catch {}
            };

            // Send initial connection event
            try {
                controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`));
            } catch {
                closeStream();
                return;
            }

            // Subscribe to notifications for this user
            try {
                unsubscribe = notificationPubSub.subscribe(userId, (notification) => {
                    try {
                        const data = JSON.stringify(notification);
                        controller.enqueue(encoder.encode(`event: notification\ndata: ${data}\n\n`));
                    } catch {
                        closeStream?.();
                    }
                }, () => {
                    closeStream?.();
                });
            } catch {
                // Too many connections — close stream gracefully
                try {
                    controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Too many connections' })}\n\n`));
                } catch {}
                closeStream();
                return;
            }

            // Heartbeat every 30 seconds to keep connection alive
            heartbeatInterval = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(`: heartbeat\n\n`));
                } catch {
                    closeStream?.();
                }
            }, 30_000);
        },
        cancel() {
            if (closed) return;
            closed = true;
            cleanup();
            closeStream = null;
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
