import { describe, expect, it, vi } from 'vitest';
import {
    createMemoryDiagnosticSnapshot,
    MEMORY_DIAGNOSTICS_INTERVAL_MS,
    startMemoryDiagnostics,
} from '@/lib/memory-diagnostics';

const MEBIBYTE = 1024 * 1024;
const memoryUsage = {
    rss: 256 * MEBIBYTE,
    heapTotal: 128 * MEBIBYTE,
    heapUsed: 64 * MEBIBYTE,
    external: 8 * MEBIBYTE,
    arrayBuffers: 2 * MEBIBYTE,
};

describe('memory diagnostics', () => {
    it('reports only aggregate memory and resource counts', () => {
        expect(createMemoryDiagnosticSnapshot(
            memoryUsage,
            ['Timeout', 'TCPSocketWrap', 'Timeout']
        )).toEqual({
            event: 'runtime_memory',
            rssMb: 256,
            heapUsedMb: 64,
            heapTotalMb: 128,
            externalMb: 8,
            arrayBuffersMb: 2,
            activeResources: {
                TCPSocketWrap: 1,
                Timeout: 2,
            },
        });
    });

    it('starts once, emits immediately, and does not keep the process alive', () => {
        const state = { started: false };
        const snapshots: ReturnType<typeof createMemoryDiagnosticSnapshot>[] = [];
        const unref = vi.fn();
        let scheduledCallback: (() => void) | undefined;
        const schedule = vi.fn((callback: () => void, intervalMs: number) => {
            scheduledCallback = callback;
            expect(intervalMs).toBe(MEMORY_DIAGNOSTICS_INTERVAL_MS);
            return { unref };
        });
        const options = {
            state,
            readMemoryUsage: () => memoryUsage,
            readActiveResources: () => ['Timeout'],
            write: (snapshot: ReturnType<typeof createMemoryDiagnosticSnapshot>) => {
                snapshots.push(snapshot);
            },
            schedule,
        };

        expect(startMemoryDiagnostics(options)).toBe(true);
        expect(startMemoryDiagnostics(options)).toBe(false);
        expect(snapshots).toHaveLength(1);
        expect(schedule).toHaveBeenCalledTimes(1);
        expect(unref).toHaveBeenCalledTimes(1);

        scheduledCallback?.();
        expect(snapshots).toHaveLength(2);
    });
});
