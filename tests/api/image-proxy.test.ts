import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// MOCKS
// ============================================================

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

// Mock global fetch for proxy tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { auth } from '@/lib/auth';

const mockedAuth = vi.mocked(auth);

const authenticatedSession = {
    user: { id: 'user-1', role: 'student', name: 'Test', email: 'test@example.com' },
    expires: new Date(Date.now() + 86400000).toISOString(),
};

function makeRequest(url: string) {
    return new Request(url, { method: 'GET' });
}

async function callProxy(url: string) {
    const mod = await import('@/app/api/image-proxy/route');
    return mod.GET(makeRequest(url));
}

describe('GET /api/image-proxy', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedAuth.mockResolvedValue(authenticatedSession as never);
    });

    // ---- Auth ----
    it('should return 401 for unauthenticated', async () => {
        mockedAuth.mockResolvedValue(null as never);
        const res = await callProxy('http://localhost:3000/api/image-proxy?url=https://milerdev.b-cdn.net/img.jpg');
        expect(res.status).toBe(401);
    });

    // ---- Missing URL ----
    it('should return 400 for missing url param', async () => {
        const res = await callProxy('http://localhost:3000/api/image-proxy');
        expect(res.status).toBe(400);
    });

    // ---- Host whitelist ----
    it('should return 403 for disallowed host', async () => {
        const res = await callProxy('http://localhost:3000/api/image-proxy?url=https://evil.com/malware.jpg');
        expect(res.status).toBe(403);
    });

    it('should return 403 for internal IP (SSRF)', async () => {
        const res = await callProxy('http://localhost:3000/api/image-proxy?url=http://169.254.169.254/latest/meta-data/');
        expect(res.status).toBe(403);
    });

    // ---- Allowed host ----
    it('should proxy image from allowed host', async () => {
        const fakeBuffer = new ArrayBuffer(100);
        mockFetch.mockResolvedValue({
            ok: true,
            headers: new Map([['content-type', 'image/jpeg'], ['content-length', '100']]),
            arrayBuffer: () => Promise.resolve(fakeBuffer),
        });

        const res = await callProxy('http://localhost:3000/api/image-proxy?url=https://milerdev.b-cdn.net/test.jpg');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    });

    // ---- Content-type validation ----
    it('should return 400 for non-image content-type', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            headers: new Map([['content-type', 'text/html'], ['content-length', '100']]),
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        });

        const res = await callProxy('http://localhost:3000/api/image-proxy?url=https://milerdev.b-cdn.net/page.html');
        expect(res.status).toBe(400);
    });

    // ---- Size limit (content-length header) ----
    it('should return 413 for oversized image (content-length)', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            headers: new Map([['content-type', 'image/png'], ['content-length', String(6 * 1024 * 1024)]]),
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        });

        const res = await callProxy('http://localhost:3000/api/image-proxy?url=https://milerdev.b-cdn.net/huge.png');
        expect(res.status).toBe(413);
    });

    // ---- Size limit (actual buffer) ----
    it('should return 413 for oversized image (actual buffer)', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            headers: new Map([['content-type', 'image/png'], ['content-length', '0']]),
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(6 * 1024 * 1024)),
        });

        const res = await callProxy('http://localhost:3000/api/image-proxy?url=https://milerdev.b-cdn.net/huge2.png');
        expect(res.status).toBe(413);
    });

    // ---- Upstream failure ----
    it('should return 502 for upstream fetch failure', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 404,
            headers: new Map(),
        });

        const res = await callProxy('http://localhost:3000/api/image-proxy?url=https://milerdev.b-cdn.net/missing.jpg');
        expect(res.status).toBe(502);
    });

    // ---- Invalid URL ----
    it('should return 500 for invalid URL', async () => {
        const res = await callProxy('http://localhost:3000/api/image-proxy?url=not-a-url');
        expect(res.status).toBe(500);
    });
});
