import { createId } from '@paralleldrive/cuid2';

function getConfig() {
    const storageApiKey = process.env.BUNNY_STORAGE_API_KEY;
    const storageZone = process.env.BUNNY_STORAGE_ZONE;
    const storageRegion = process.env.BUNNY_STORAGE_REGION || '';
    const cdnUrl = process.env.BUNNY_CDN_URL;

    if (!storageApiKey || !storageZone || !cdnUrl) {
        throw new Error('Missing Bunny Storage environment variables');
    }

    const regionHost = storageRegion
        ? `${storageRegion}.storage.bunnycdn.com`
        : 'storage.bunnycdn.com';

    const normalizedCdnUrl = cdnUrl.startsWith('http') ? cdnUrl : `https://${cdnUrl}`;

    return { storageApiKey, storageZone, regionHost, normalizedCdnUrl };
}

/**
 * Upload a file to Bunny Storage and return the CDN URL + storage path
 */
export async function uploadToBunny(
    file: File,
    folder: string = 'media'
): Promise<{ url: string; filePath: string; fileName: string }> {
    const { storageApiKey, storageZone, regionHost, normalizedCdnUrl } = getConfig();

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${createId()}.${ext}`;
    const filePath = `${folder}/${fileName}`;

    const fileBuffer = await file.arrayBuffer();

    const response = await fetch(
        `https://${regionHost}/${storageZone}/${filePath}`,
        {
            method: 'PUT',
            headers: {
                AccessKey: storageApiKey,
                'Content-Type': 'application/octet-stream',
            },
            body: fileBuffer,
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[BunnyStorage] Upload error:', errorText);
        throw new Error('Failed to upload to Bunny Storage');
    }

    const url = `${normalizedCdnUrl}/${filePath}`;
    return { url, filePath, fileName };
}

/**
 * Delete a file from Bunny Storage by its CDN URL or storage path
 */
export async function deleteFromBunny(urlOrPath: string): Promise<boolean> {
    const { storageApiKey, storageZone, regionHost, normalizedCdnUrl } = getConfig();

    // Extract the storage path from the full CDN URL
    let storagePath = urlOrPath;
    if (urlOrPath.startsWith('http')) {
        storagePath = urlOrPath.replace(normalizedCdnUrl + '/', '');
    }
    // Remove leading slash if present
    storagePath = storagePath.replace(/^\//, '');

    try {
        const response = await fetch(
            `https://${regionHost}/${storageZone}/${storagePath}`,
            {
                method: 'DELETE',
                headers: {
                    AccessKey: storageApiKey,
                },
            }
        );

        if (!response.ok) {
            console.warn('[BunnyStorage] Delete failed:', response.status, await response.text());
            return false;
        }

        return true;
    } catch (error) {
        console.error('[BunnyStorage] Delete error:', error);
        return false;
    }
}
