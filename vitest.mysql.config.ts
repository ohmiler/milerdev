import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    envDir: path.resolve(__dirname, 'tests/fixtures/empty-env'),
    test: {
        environment: 'node', include: ['tests/integration/*.mysql.ts'],
        testTimeout: 20_000, hookTimeout: 20_000, fileParallelism: false,
    },
    resolve: { alias: {
        '@': path.resolve(__dirname, 'src'),
        'server-only': path.resolve(__dirname, 'tests/stubs/server-only.ts'),
    } },
});
