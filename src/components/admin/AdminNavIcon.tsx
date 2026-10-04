import {
  Award,
  BookOpen,
  Boxes,
  ClipboardCheck,
  CreditCard,
  FileBarChart,
  Image,
  LayoutDashboard,
  RefreshCw,
  Settings,
  Star,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  bundles: Boxes,
  certificates: Award,
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
