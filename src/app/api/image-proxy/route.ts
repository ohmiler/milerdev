import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Allowed image hosts for proxy (prevent open proxy abuse / SSRF)
const ALLOWED_HOSTS = [
    'milerdev.b-cdn.net',
    'milerdev.com',
    'www.milerdev.com',
    'localhost',
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB max

// GET /api/image-proxy?url=<encoded-url>
// Proxies an image from an allowed host and returns it as base64 data URL
export async function GET(request: Request) {
    // Require authentication to prevent anonymous abuse
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        const parsed = new URL(imageUrl);

        // Only allow HTTPS in production (prevent HTTP downgrade / internal network access)
        if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
            return NextResponse.json({ error: 'Only HTTPS URLs allowed' }, { status: 403 });
        }

        if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
            return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
        }

        const res = await fetch(imageUrl);
        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
        }

        // Validate content-type is actually an image
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
            return NextResponse.json({ error: 'Not an image' }, { status: 400 });
        }

        // Enforce size limit
        const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
        if (contentLength > MAX_IMAGE_SIZE) {
            return NextResponse.json({ error: 'Image too large' }, { status: 413 });
        }

        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > MAX_IMAGE_SIZE) {
            return NextResponse.json({ error: 'Image too large' }, { status: 413 });
        }

        const base64 = Buffer.from(buffer).toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;

        return NextResponse.json({ dataUrl }, {
            headers: {
                'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            },
        });
    } catch {
        return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
    }
}
