import { describe, expect, it } from 'vitest';
import {
    estimateStringCacheEntryBytes,
    SizeBoundedStringLruCache,
} from '@/lib/size-bounded-lru-cache';

describe('SizeBoundedStringLruCache', () => {
    it('evicts the least recently used entry to remain inside the byte budget', () => {
        const entryBytes = estimateStringCacheEntryBytes('a', '1');
        const cache = new SizeBoundedStringLruCache(entryBytes * 2);

        cache.set('a', '1');
        cache.set('b', '2');
        expect(cache.get('a')).toBe('1');

        cache.set('c', '3');

        expect(cache.get('a')).toBe('1');
        expect(cache.get('b')).toBeUndefined();
        expect(cache.get('c')).toBe('3');
        expect(cache.sizeBytes).toBeLessThanOrEqual(entryBytes * 2);
    });

    it('updates byte accounting when replacing an existing entry', () => {
        const cache = new SizeBoundedStringLruCache(1024);

        cache.set('key', 'short');
        cache.set('key', 'a longer replacement');

        expect(cache.size).toBe(1);
        expect(cache.sizeBytes).toBe(
            estimateStringCacheEntryBytes('key', 'a longer replacement')
        );
    });

    it('bypasses an entry larger than the entire budget', () => {
        const cache = new SizeBoundedStringLruCache(150);

        expect(cache.set('large', 'x'.repeat(100))).toBe(false);
        expect(cache.get('large')).toBeUndefined();
        expect(cache.size).toBe(0);
        expect(cache.sizeBytes).toBe(0);
    });
});
