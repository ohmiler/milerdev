function isValidIPv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;

    return parts.every((part) => {
        if (!/^\d{1,3}$/.test(part)) return false;
        const value = Number(part);
        return value >= 0 && value <= 255;
    });
}

function isValidIPv6(ip: string): boolean {
    if (!/^[0-9a-fA-F:]+$/.test(ip)) return false;
    if (ip.includes(':::')) return false;

    const parts = ip.split(':');
    if (ip.includes('::')) {
        if (parts.length > 8) return false;
    } else if (parts.length !== 8) {
        return false;
    }

    return parts.every((part) => part === '' || /^[0-9a-fA-F]{1,4}$/.test(part));
}

function normalizeIP(raw: string | null | undefined): string | null {
    if (!raw) return null;

    const value = raw.trim().replace(/^for=/i, '').replace(/^"|"$/g, '');
    if (!value || value.toLowerCase() === 'unknown') return null;

    const bracketedIPv6 = value.match(/^\[([0-9a-fA-F:]+)\](?::\d+)?$/);
    const withoutBrackets = bracketedIPv6 ? bracketedIPv6[1] : value;
    const ipv4WithPort = withoutBrackets.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
    let candidate = ipv4WithPort ? ipv4WithPort[1] : withoutBrackets;

    if (candidate.toLowerCase().startsWith('::ffff:')) {
        const mapped = candidate.slice(7);
        if (isValidIPv4(mapped)) return mapped;
    }

    if (isValidIPv4(candidate)) return candidate;

    candidate = candidate.toLowerCase();
    return isValidIPv6(candidate) ? candidate : null;
}

export function getClientIPFromHeaders(headers: Pick<Headers, 'get'>): string {
    // Railway and the documented reverse-proxy topology supply X-Real-IP.
    const directIP = normalizeIP(headers.get('x-real-ip'));
    if (directIP) return directIP;

    // A trusted reverse proxy appends its own hop. Use only the right-most valid value.
    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) {
        const forwardedParts = forwarded
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean);

        for (let index = forwardedParts.length - 1; index >= 0; index -= 1) {
            const ip = normalizeIP(forwardedParts[index]);
            if (ip) return ip;
        }
    }

    return 'unknown';
}

export function getClientIP(request: Request): string {
    return getClientIPFromHeaders(request.headers);
}
