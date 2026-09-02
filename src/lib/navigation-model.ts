export type NavigationMatch = 'exact' | 'section';

export type NavigationDestination<Key extends string = string> = Readonly<{
  key: Key;
  href: string;
  label: string;
  match: NavigationMatch;
}>;

export const MAIN_CONTENT_ID = 'main-content';

export const PUBLIC_NAVIGATION = [
  { key: 'courses', href: '/courses', label: 'คอร์สทั้งหมด', match: 'section' },
  { key: 'blog', href: '/blog', label: 'บทความ', match: 'section' },
  { key: 'about', href: '/about', label: 'เกี่ยวกับเรา', match: 'exact' },
  { key: 'contact', href: '/contact', label: 'ติดต่อ', match: 'exact' },
] as const satisfies readonly NavigationDestination[];

export const LOGIN_NAVIGATION = {
  key: 'login',
  href: '/login',
  label: 'เข้าสู่ระบบ',
  match: 'exact',
} as const satisfies NavigationDestination;

export const REGISTER_NAVIGATION = {
  key: 'register',
  href: '/register',
  label: 'สมัครสมาชิก',
  match: 'exact',
} as const satisfies NavigationDestination;

export const GUEST_NAVIGATION = [LOGIN_NAVIGATION, REGISTER_NAVIGATION] as const;

export const ACCOUNT_NAVIGATION = [
  { key: 'dashboard', href: '/dashboard', label: 'การเรียนของฉัน', match: 'exact' },
  { key: 'payments', href: '/dashboard/payments', label: 'การชำระเงิน', match: 'section' },
  { key: 'certificates', href: '/dashboard/certificates', label: 'ใบรับรอง', match: 'section' },
  { key: 'profile', href: '/profile', label: 'โปรไฟล์', match: 'section' },
  { key: 'settings', href: '/settings', label: 'ตั้งค่าบัญชี', match: 'section' },
] as const satisfies readonly NavigationDestination[];

export type AccountNavigationKey = (typeof ACCOUNT_NAVIGATION)[number]['key'];

export const MEMBER_UTILITY_NAVIGATION = [
  { key: 'announcements', href: '/announcements', label: 'ประกาศ', match: 'exact' },
] as const satisfies readonly NavigationDestination[];

export const ADMIN_NAVIGATION = {
  key: 'admin',
  href: '/admin',
  label: 'Admin Panel',
  match: 'section',
} as const satisfies NavigationDestination;

function normalizePathname(pathname: string) {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '') || '/';
}

export function getNavigationState(
  pathname: string,
  destination: NavigationDestination,
): { active: boolean; ariaCurrent: 'page' | 'location' | undefined } {
  const currentPath = normalizePathname(pathname);
  const destinationPath = normalizePathname(destination.href);
  const isExact = currentPath === destinationPath;
  const isNested = destination.match === 'section'
    && destinationPath !== '/'
    && currentPath.startsWith(`${destinationPath}/`);

  return {
    active: isExact || isNested,
    ariaCurrent: isExact ? 'page' : isNested ? 'location' : undefined,
  };
}

export function getAccountDestination(key: AccountNavigationKey) {
  return ACCOUNT_NAVIGATION.find((destination) => destination.key === key)!;
}
