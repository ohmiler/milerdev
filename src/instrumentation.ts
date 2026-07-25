export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') {
        return;
    }

    const { startMemoryDiagnostics } = await import('@/lib/memory-diagnostics');
    startMemoryDiagnostics();
}
