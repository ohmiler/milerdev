import crypto from "crypto";

const libraryId = process.env.BUNNY_LIBRARY_ID!;
const apiKey = process.env.BUNNY_API_KEY!;
const streamTokenKey = process.env.BUNNY_STREAM_TOKEN_KEY || apiKey;
const cdnHostname = process.env.BUNNY_CDN_HOSTNAME!;

type BunnyVideoInfo = {
    videoId: string;
    libraryId?: string;
};

/**
 * Generate a signed URL for Bunny.net video streaming
 * This prevents unauthorized access to videos
 */
export function generateSignedVideoUrl(
    videoId: string,
    expiresInSeconds: number = 3600,
    libraryIdOverride?: string
): string {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const targetLibraryId = libraryIdOverride || libraryId;
    const baseUrl = `https://iframe.mediadelivery.net/embed/${targetLibraryId}/${videoId}`;

    // Create hash for token authentication
    const hashableString = streamTokenKey + videoId + expires;
    const token = crypto.createHash("sha256").update(hashableString).digest("hex");

    return `${baseUrl}?token=${token}&expires=${expires}`;
}

/**
 * Generate a direct video URL (for downloads or direct play)
 */
export function generateDirectVideoUrl(
    videoId: string,
    expiresInSeconds: number = 3600
): string {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const baseUrl = `https://${cdnHostname}/${videoId}/play.mp4`;

    const hashableString = streamTokenKey + videoId + expires;
    const token = crypto.createHash("sha256").update(hashableString).digest("hex");

    return `${baseUrl}?token=${token}&expires=${expires}`;
}

/**
 * Extract Bunny.net video GUID from various URL formats
 * Supports: embed URL, play URL, CDN URL, or raw GUID
 */
export function extractBunnyVideoId(input: string): string | null {
    return extractBunnyVideoInfo(input)?.videoId ?? null;
}

/**
 * Extract Bunny.net video information from various URL formats
 * Supports: embed URL, play URL, CDN URL, or raw GUID
 */
export function extractBunnyVideoInfo(input: string): BunnyVideoInfo | null {
    const value = input.trim();

    // Already a GUID
    if (/^[a-f0-9-]{36}$/i.test(value)) {
        return { videoId: value };
    }

    const embedOrPlayMatch = value.match(/mediadelivery\.net\/(?:embed|play)\/([0-9]+)\/([a-f0-9-]{36})/i);
    if (embedOrPlayMatch) {
        return {
            libraryId: embedOrPlayMatch[1],
            videoId: embedOrPlayMatch[2],
        };
    }

    // Match GUID from URLs like:
    // https://iframe.mediadelivery.net/embed/592809/b7bdef9b-...
    // https://iframe.mediadelivery.net/play/592809/b7bdef9b-...
    // https://vz-xxxxx.b-cdn.net/b7bdef9b-...
    const guidMatch = value.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    return guidMatch ? { videoId: guidMatch[1] } : null;
}

/**
 * Check if a video URL is from Bunny.net
 */
export function isBunnyVideo(url: string): boolean {
    return url.includes('mediadelivery.net') 
        || url.includes('bunnycdn.com') 
        || url.includes('b-cdn.net')
        || /^[a-f0-9-]{36}$/i.test(url.trim());
}

/**
 * Upload video to Bunny.net (for admin use)
 */
export async function createVideoUpload(title: string): Promise<{
    videoId: string;
    uploadUrl: string;
}> {
    const response = await fetch(
        `https://video.bunnycdn.com/library/${libraryId}/videos`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                AccessKey: apiKey,
            },
            body: JSON.stringify({ title }),
        }
    );

    const data = await response.json();

    return {
        videoId: data.guid,
        uploadUrl: `https://video.bunnycdn.com/library/${libraryId}/videos/${data.guid}`,
    };
}
