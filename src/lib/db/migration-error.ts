const SAFE_DATABASE_ERROR_CODE = /^(?:ER_[A-Z0-9_]+|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND)$/;

type ErrorRecord = {
    code?: unknown;
    cause?: unknown;
};

function asErrorRecord(value: unknown): ErrorRecord | null {
    return value !== null && typeof value === 'object'
        ? value as ErrorRecord
        : null;
}

export function getSafeMigrationFailureMessage(error: unknown): string {
    let current = asErrorRecord(error);

    for (let depth = 0; current && depth < 3; depth += 1) {
        if (
            typeof current.code === 'string'
            && SAFE_DATABASE_ERROR_CODE.test(current.code)
        ) {
            return `Migration failed (${current.code})`;
        }

        current = asErrorRecord(current.cause);
    }

    return 'Migration failed';
}
