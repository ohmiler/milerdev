import 'server-only';

declare const safeAuthReturnPathBrand: unique symbol;

export type SafeAuthReturnPath = string & {
  readonly [safeAuthReturnPathBrand]: true;
};

export const DEFAULT_AUTH_RETURN_PATH = '/dashboard' as SafeAuthReturnPath;

export type SafeAuthReturn = {
  pathname: SafeAuthReturnPath;
  source: 'validated' | 'fallback';
};

export type AuthEntryPath = '/login' | '/register' | '/forgot-password';

const AUTH_LOOP_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];
const INTERNAL_PATHS = ['/api', '/_next', '/_vercel'];
const INTERNAL_PREFIXES = ['/__nextjs'];
const PRODUCT_ROUTE_PATHS = ['/courses', '/bundles'];
const ENCODED_STRUCTURE = /%(?:0[0-9a-f]|1[0-9a-f]|23|25|2e|2f|5c|7f)/i;
const ASSET_EXTENSION = /\.[a-z0-9]+$/i;
const UNSAFE_AUTH_RETURN_CHARACTERS = /[\\\u0000-\u001F\u007F-\u009F]/;

function fallback(): SafeAuthReturn {
  return { pathname: DEFAULT_AUTH_RETURN_PATH, source: 'fallback' };
}

function matchesPath(pathname: string, blockedPath: string): boolean {
  return pathname === blockedPath || pathname.startsWith(`${blockedPath}/`);
}

export function resolveSafeAuthReturn(value: unknown): SafeAuthReturn {
  if (
    typeof value !== 'string' ||
    value.length > 2_048 ||
    UNSAFE_AUTH_RETURN_CHARACTERS.test(value)
  ) {
    return fallback();
  }

  const [pathname] = value.split(/[?#]/, 1);

  if (
    !pathname ||
    !pathname.startsWith('/') ||
    pathname.startsWith('//') ||
    /%(?![0-9a-f]{2})/i.test(pathname) ||
    ENCODED_STRUCTURE.test(pathname)
  ) {
    return fallback();
  }

  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return fallback();
  }

  const segments = decodedPathname.split('/');
  if (
    UNSAFE_AUTH_RETURN_CHARACTERS.test(decodedPathname) ||
    /[?#]/.test(decodedPathname) ||
    decodedPathname.startsWith('//') ||
    segments.some((segment, index) =>
      index > 0 && index < segments.length - 1 ? segment.length === 0 : false,
    ) ||
    segments.some((segment) => segment === '.' || segment === '..')
  ) {
    return fallback();
  }

  const comparablePathname = decodedPathname.toLowerCase().replace(/\/$/, '') || '/';
  const isProductRoute = PRODUCT_ROUTE_PATHS.some((productPath) =>
    matchesPath(comparablePathname, productPath),
  );
  if (
    [...AUTH_LOOP_PATHS, ...INTERNAL_PATHS].some((blockedPath) =>
      matchesPath(comparablePathname, blockedPath),
    ) ||
    INTERNAL_PREFIXES.some((blockedPrefix) => comparablePathname.startsWith(blockedPrefix)) ||
    (ASSET_EXTENSION.test(comparablePathname) && !isProductRoute)
  ) {
    return fallback();
  }

  return { pathname: pathname as SafeAuthReturnPath, source: 'validated' };
}

export function createAuthReturnHref(entryPath: AuthEntryPath, value: unknown): string {
  const { pathname } = resolveSafeAuthReturn(value);
  return `${entryPath}?callbackUrl=${encodeURIComponent(pathname)}`;
}

export function resolveSafeAuthRedirect(url: unknown, baseUrl: string): string {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return DEFAULT_AUTH_RETURN_PATH;
  }

  let candidate = url;
  if (typeof url === 'string' && UNSAFE_AUTH_RETURN_CHARACTERS.test(url)) {
    candidate = undefined;
  } else if (typeof url === 'string' && !url.startsWith('/')) {
    try {
      const absoluteUrl = new URL(url);
      candidate = absoluteUrl.origin === base.origin ? absoluteUrl.pathname : undefined;
    } catch {
      candidate = undefined;
    }
  }

  const { pathname } = resolveSafeAuthReturn(candidate);
  return new URL(pathname, base.origin).toString();
}
