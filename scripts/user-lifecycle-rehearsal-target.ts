export type UserLifecycleRehearsalMode =
    | 'fresh'
    | 'upgrade-base'
    | 'inspect-upgrade'
    | 'verify-upgrade'
    | 'upgrade-lifecycle';

const EXPECTED_DATABASE: Record<UserLifecycleRehearsalMode, string> = {
    fresh: 'milerdev_lifecycle_fresh',
    'upgrade-base': 'milerdev_lifecycle_upgrade',
    'inspect-upgrade': 'milerdev_lifecycle_upgrade',
    'verify-upgrade': 'milerdev_lifecycle_upgrade',
    'upgrade-lifecycle': 'milerdev_lifecycle_upgrade',
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export type UserLifecycleRehearsalTarget = {
    database: string;
    hostname: string;
    port: number;
};

export function classifyUpgradeVerificationCheckpoint({
    activeAdminCount,
    inactiveAdminCount,
    adminLifecycleAuditCount,
}: {
    activeAdminCount: number;
    inactiveAdminCount: number;
    adminLifecycleAuditCount: number;
}): 'ready' | 'complete' | 'invalid' {
    if (activeAdminCount !== 2 || inactiveAdminCount !== 0) return 'invalid';
    if (adminLifecycleAuditCount === 0) return 'ready';
    if (adminLifecycleAuditCount >= 2 && adminLifecycleAuditCount % 2 === 0) {
        return 'complete';
    }
    return 'invalid';
}

export function isUserLifecycleRehearsalMode(
    value: string | undefined,
): value is UserLifecycleRehearsalMode {
    return value === 'fresh'
        || value === 'upgrade-base'
        || value === 'inspect-upgrade'
        || value === 'verify-upgrade'
        || value === 'upgrade-lifecycle';
}

export function parseUserLifecycleRehearsalTarget(
    databaseUrl: string | undefined,
    mode: UserLifecycleRehearsalMode,
): UserLifecycleRehearsalTarget {
    if (!databaseUrl) {
        throw new Error('USER_LIFECYCLE_DATABASE_URL is not set');
    }

    let parsed: URL;
    try {
        parsed = new URL(databaseUrl);
    } catch {
        throw new Error('USER_LIFECYCLE_DATABASE_URL must be a valid MySQL URL');
    }

    if (parsed.protocol !== 'mysql:') {
        throw new Error('Rehearsal requires a MySQL URL');
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!LOCAL_HOSTS.has(hostname)) {
        throw new Error('Rehearsal requires the local MySQL server');
    }

    const port = parsed.port === '' ? 3306 : Number(parsed.port);
    if (port !== 3306) {
        throw new Error('Rehearsal requires local MySQL port 3306');
    }

    const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    if (database !== EXPECTED_DATABASE[mode]) {
        throw new Error('Rehearsal refused a protected or unauthorized schema');
    }

    return { database, hostname, port };
}
