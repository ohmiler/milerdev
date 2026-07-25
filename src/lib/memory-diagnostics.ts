const BYTES_PER_MEBIBYTE = 1024 * 1024;
export const MEMORY_DIAGNOSTICS_INTERVAL_MS = 5 * 60 * 1000;

type MemoryUsage = ReturnType<typeof process.memoryUsage>;
type DiagnosticState = { started: boolean };
type TimerHandle = { unref?: () => void };

export type MemoryDiagnosticSnapshot = {
    event: 'runtime_memory';
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
    arrayBuffersMb: number;
    activeResources: Record<string, number>;
};

type StartMemoryDiagnosticsOptions = {
    state?: DiagnosticState;
    intervalMs?: number;
    readMemoryUsage?: () => MemoryUsage;
    readActiveResources?: () => string[];
    write?: (snapshot: MemoryDiagnosticSnapshot) => void;
    schedule?: (callback: () => void, intervalMs: number) => TimerHandle;
};

const defaultState: DiagnosticState = { started: false };

function toMb(bytes: number): number {
    return Math.round((bytes / BYTES_PER_MEBIBYTE) * 100) / 100;
}

function countActiveResources(resources: string[]): Record<string, number> {
    return resources.sort().reduce<Record<string, number>>((counts, resource) => {
        counts[resource] = (counts[resource] ?? 0) + 1;
        return counts;
    }, {});
}

export function createMemoryDiagnosticSnapshot(
    memoryUsage: MemoryUsage = process.memoryUsage(),
    activeResources: string[] = typeof process.getActiveResourcesInfo === 'function'
        ? process.getActiveResourcesInfo()
        : []
): MemoryDiagnosticSnapshot {
    return {
        event: 'runtime_memory',
        rssMb: toMb(memoryUsage.rss),
        heapUsedMb: toMb(memoryUsage.heapUsed),
        heapTotalMb: toMb(memoryUsage.heapTotal),
        externalMb: toMb(memoryUsage.external),
        arrayBuffersMb: toMb(memoryUsage.arrayBuffers),
        activeResources: countActiveResources([...activeResources]),
    };
}

export function startMemoryDiagnostics(options: StartMemoryDiagnosticsOptions = {}): boolean {
    const state = options.state ?? defaultState;
    if (state.started) return false;
    state.started = true;

    const readMemoryUsage = options.readMemoryUsage ?? process.memoryUsage;
    const readActiveResources = options.readActiveResources ?? (
        typeof process.getActiveResourcesInfo === 'function'
            ? process.getActiveResourcesInfo
            : () => []
    );
    const write = options.write ?? ((snapshot) => console.info(JSON.stringify(snapshot)));
    const emit = () => write(createMemoryDiagnosticSnapshot(
        readMemoryUsage(),
        readActiveResources()
    ));

    emit();
    const timer = (options.schedule ?? ((callback, intervalMs) => setInterval(callback, intervalMs)))(
        emit,
        options.intervalMs ?? MEMORY_DIAGNOSTICS_INTERVAL_MS
    );
    timer.unref?.();
    return true;
}
