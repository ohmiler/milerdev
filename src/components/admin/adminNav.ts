export type AdminNavLink = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
};

export const adminPrimaryLinks: AdminNavLink[] = [
  { href: '/admin', label: 'ภาพรวม', icon: 'dashboard', exact: true },
  { href: '/admin/courses', label: 'คอร์ส', icon: 'courses' },
  { href: '/admin/users', label: 'ผู้เรียน', icon: 'users' },
  { href: '/admin/enrollments', label: 'การลงทะเบียน', icon: 'enrollments' },
  { href: '/admin/payments', label: 'การชำระเงิน', icon: 'payments' },
  { href: '/admin/analytics', label: 'ข้อมูลวิเคราะห์', icon: 'analytics' },
];

export const adminSecondaryLinkGroups: Array<{ title: string; items: AdminNavLink[] }> = [
  {
    title: 'เนื้อหา',
    items: [
      { href: '/admin/blog', label: 'บทความ', icon: 'blog' },
      { href: '/admin/media', label: 'สื่อ', icon: 'media' },
      { href: '/admin/tags', label: 'แท็ก', icon: 'tags' },
      { href: '/admin/announcements', label: 'ประกาศ', icon: 'announcements' },
      { href: '/admin/certificates', label: 'ใบรับรอง', icon: 'certificates' },
    ],
  },
  {
    title: 'การขาย',
    items: [
      { href: '/admin/bundles', label: 'ชุดคอร์ส', icon: 'bundles' },
      { href: '/admin/coupons', label: 'คูปอง', icon: 'coupons' },
      { href: '/admin/reconciliation', label: 'กระทบยอด', icon: 'reconciliation' },
      { href: '/admin/reviews', label: 'รีวิว', icon: 'reviews' },
      { href: '/admin/reports', label: 'รายงาน', icon: 'reports' },
    ],
  },
  {
    title: 'ระบบ',
    items: [
      { href: '/admin/affiliate-banners', label: 'แบนเนอร์', icon: 'media' },
      { href: '/admin/audit-logs', label: 'บันทึกกิจกรรม', icon: 'logs' },
      { href: '/admin/settings', label: 'ตั้งค่า', icon: 'settings' },
    ],
  },
];

export const adminAllLinks = [
  ...adminPrimaryLinks,
  ...adminSecondaryLinkGroups.flatMap((group) => group.items),
];

export function isAdminNavActive(pathname: string, link: AdminNavLink) {
  if (link.exact) return pathname === link.href;
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export function getAdminNavTitle(pathname: string) {
  const exactMatch = adminAllLinks.find((link) => pathname === link.href);
  return exactMatch?.label || adminAllLinks.find((link) => isAdminNavActive(pathname, link))?.label || 'ผู้ดูแลระบบ';
}
