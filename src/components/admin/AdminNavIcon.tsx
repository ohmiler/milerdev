import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  ClipboardCheck,
  CreditCard,
  FileBarChart,
  FileText,
  Image,
  LayoutDashboard,
  RefreshCw,
  Settings,
  Star,
  Tags,
  TicketPercent,
  Users,
  type LucideIcon,
} from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  analytics: BarChart3,
  announcements: Bell,
  blog: FileText,
  bundles: Boxes,
  certificates: Award,
  coupons: TicketPercent,
  courses: BookOpen,
  dashboard: LayoutDashboard,
  enrollments: ClipboardCheck,
  logs: FileBarChart,
  media: Image,
  payments: CreditCard,
  reconciliation: RefreshCw,
  reports: FileBarChart,
  reviews: Star,
  settings: Settings,
  tags: Tags,
  users: Users,
};

export default function AdminNavIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = icons[name] || LayoutDashboard;
  return <Icon aria-hidden="true" size={size} strokeWidth={1.9} />;
}
