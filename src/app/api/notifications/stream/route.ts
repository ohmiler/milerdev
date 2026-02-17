import { auth } from '@/lib/auth';
import { notificationPubSub } from '@/lib/notification-pubsub';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/notifications/stream - SSE endpoint for real-time notifications
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return new Response('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;
    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream({
        start(controller) {
            // Send initial connection event
            controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`));

            // Subscribe to notifications for this user
            try {
                unsubscribe = notificationPubSub.subscribe(userId, (notification) => {
                    try {
                        const data = JSON.stringify(notification);
                        controller.enqueue(encoder.encode(`event: notification\ndata: ${data}\n\n`));
                    } catch {
                        // Connection closed
                    }
                });
            } catch {
                // Too many connections — close stream gracefully
                controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Too many connections' })}\n\n`));
                controller.close();
                return;
            }

            // Heartbeat every 30 seconds to keep connection alive
            heartbeatInterval = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(`: heartbeat\n\n`));
                } catch {
                    // Connection closed, cleanup will happen in cancel
                }
            }, 30_000);
        },
        cancel() {
            if (unsubscribe) unsubscribe();
            if (heartbeatInterval) clearInterval(heartbeatInterval);
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
