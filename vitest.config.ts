import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    // Vite 5 expects a directory here; `false` falls back to the repository.
    // Keep test environment discovery away from local application secrets.
    envDir: path.resolve(__dirname, 'tests/fixtures/empty-env'),
    plugins: [react()],
    test: {
        // Let callback tests mock OAuth transport inside the installed Auth.js
        // modules instead of performing provider discovery over the network.
        server: { deps: { inline: [/node_modules[\\/]@auth[\\/]core/] } },
        environment: 'node',
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        // API route tests import heavy modules on first use. On a freshly
        // installed checkout that exceeds the 5s default and fails with a
        // timeout, then passes on rerun. Kept below the 20s used by the MySQL config.
        testTimeout: 15_000,
        include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                '*.config.*',
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
        },
    },
});
