export type AdminNavLink = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
};

export const adminPrimaryLinks: AdminNavLink[] = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard', exact: true },
  { href: '/admin/courses', label: 'Courses', icon: 'courses' },
  { href: '/admin/users', label: 'Students', icon: 'users' },
  { href: '/admin/enrollments', label: 'Enrollments', icon: 'enrollments' },
  { href: '/admin/payments', label: 'Payments', icon: 'payments' },
  { href: '/admin/analytics', label: 'Analytics', icon: 'analytics' },
];

export const adminSecondaryLinkGroups: Array<{ title: string; items: AdminNavLink[] }> = [
  {
    title: 'Content',
    items: [
      { href: '/admin/blog', label: 'Blog', icon: 'blog' },
      { href: '/admin/media', label: 'Media', icon: 'media' },
      { href: '/admin/tags', label: 'Tags', icon: 'tags' },
      { href: '/admin/announcements', label: 'Announcements', icon: 'announcements' },
      { href: '/admin/certificates', label: 'Certificates', icon: 'certificates' },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { href: '/admin/bundles', label: 'Bundles', icon: 'bundles' },
      { href: '/admin/coupons', label: 'Coupons', icon: 'coupons' },
      { href: '/admin/reconciliation', label: 'Reconciliation', icon: 'reconciliation' },
      { href: '/admin/reviews', label: 'Reviews', icon: 'reviews' },
      { href: '/admin/reports', label: 'Reports', icon: 'reports' },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/admin/affiliate-banners', label: 'Banners', icon: 'media' },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: 'logs' },
      { href: '/admin/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

export const adminAllLinks = [
  ...adminPrimaryLinks,
  ...adminSecondaryLinkGroups.flatMap((group) => group.items),
];
