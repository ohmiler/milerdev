import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

describe('Next.js production cache configuration', () => {
    it('disables the default in-memory server cache', () => {
        expect(nextConfig.cacheMaxMemorySize).toBe(0);
    });
});
