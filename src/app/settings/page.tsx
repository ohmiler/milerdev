import { permanentRedirect } from 'next/navigation';

// Account settings now live on /profile ("บัญชีของฉัน"). Old links and bookmarks land there.
export default function SettingsPage() {
  permanentRedirect('/profile');
}
