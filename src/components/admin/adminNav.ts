export type AdminNavLink = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
};

export const adminPrimaryLinks: AdminNavLink[] = [
  { href: '/admin', label: 'แดชบอร์ด', icon: 'dashboard', exact: true },
  { href: '/admin/courses', label: 'คอร์ส', icon: 'courses' },
  { href: '/admin/blog', label: 'บทความ', icon: 'blog' },
  { href: '/admin/users', label: 'ผู้ใช้', icon: 'users' },
  { href: '/admin/payments', label: 'การชำระเงิน', icon: 'payments' },
  { href: '/admin/enrollments', label: 'การลงทะเบียน', icon: 'enrollments' },
];

export const adminSecondaryLinkGroups: Array<{ title: string; items: AdminNavLink[] }> = [
  {
    title: 'Growth & Commerce',
    items: [
      { href: '/admin/bundles', label: 'Bundle', icon: 'bundles' },
      { href: '/admin/coupons', label: 'คูปอง', icon: 'coupons' },
      { href: '/admin/reconciliation', label: 'Reconcile', icon: 'reconciliation' },
      { href: '/admin/reviews', label: 'รีวิว', icon: 'reviews' },
      { href: '/admin/reports', label: 'รายงาน', icon: 'reports' },
    ],
  },
  {
    title: 'Content & Assets',
    items: [
      { href: '/admin/docs', label: 'คลังความรู้', icon: 'docs' },
      { href: '/admin/media', label: 'ไฟล์สื่อ', icon: 'media' },
      { href: '/admin/tags', label: 'แท็ก', icon: 'tags' },
      { href: '/admin/announcements', label: 'ประกาศ', icon: 'announcements' },
      { href: '/admin/affiliate-banners', label: 'Affiliate Banners', icon: 'media' },
      { href: '/admin/certificates', label: 'ใบรับรอง', icon: 'certificates' },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/admin/audit-logs', label: 'บันทึกระบบ', icon: 'logs' },
      { href: '/admin/settings', label: 'ตั้งค่า', icon: 'settings' },
    ],
  },
];

export const adminAllLinks = [
  ...adminPrimaryLinks,
  ...adminSecondaryLinkGroups.flatMap((group) => group.items),
];
