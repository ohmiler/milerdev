const STRING_BYTES_PER_CODE_UNIT = 2;
const ESTIMATED_ENTRY_OVERHEAD_BYTES = 128;

export function estimateStringCacheEntryBytes(key: string, value: string): number {
    return ESTIMATED_ENTRY_OVERHEAD_BYTES +
        ((key.length + value.length) * STRING_BYTES_PER_CODE_UNIT);
}

type CacheEntry = {
    value: string;
    sizeBytes: number;
};

export class SizeBoundedStringLruCache {
    private readonly entries = new Map<string, CacheEntry>();
    private retainedBytes = 0;

    constructor(private readonly maxBytes: number) {
        if (!Number.isFinite(maxBytes) || maxBytes < 0) {
            throw new RangeError('maxBytes must be a finite non-negative number');
        }
    }

    get size(): number {
        return this.entries.size;
    }

    get sizeBytes(): number {
        return this.retainedBytes;
    }

    get(key: string): string | undefined {
        const entry = this.entries.get(key);
        if (!entry) return undefined;

        this.entries.delete(key);
        this.entries.set(key, entry);
        return entry.value;
    }

    set(key: string, value: string): boolean {
        const existing = this.entries.get(key);
        if (existing) {
            this.entries.delete(key);
            this.retainedBytes -= existing.sizeBytes;
        }

        const sizeBytes = estimateStringCacheEntryBytes(key, value);
        if (sizeBytes > this.maxBytes) return false;

        this.entries.set(key, { value, sizeBytes });
        this.retainedBytes += sizeBytes;
        this.evictToBudget();
        return true;
    }

    private evictToBudget(): void {
        while (this.retainedBytes > this.maxBytes) {
            const oldestKey = this.entries.keys().next().value;
            if (oldestKey === undefined) break;

            const oldest = this.entries.get(oldestKey);
            this.entries.delete(oldestKey);
            if (oldest) this.retainedBytes -= oldest.sizeBytes;
        }
    }
}
