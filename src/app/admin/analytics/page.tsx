import { redirect } from 'next/navigation';

export default function DisabledAnalyticsPage() {
  redirect('/admin');
}
