import { NextResponse } from 'next/server';

// Allowed image hosts for proxy (prevent open proxy abuse)
const ALLOWED_HOSTS = [
    'milerdev.b-cdn.net',
    'milerdev.com',
    'www.milerdev.com',
    'localhost',
];

// GET /api/image-proxy?url=<encoded-url>
// Proxies an image from an allowed host and returns it as base64 data URL
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        const parsed = new URL(imageUrl);
        if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
            return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
        }

        const res = await fetch(imageUrl);
        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
        }

        const contentType = res.headers.get('content-type') || 'image/png';
        const buffer = await res.arrayBuffer();
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
