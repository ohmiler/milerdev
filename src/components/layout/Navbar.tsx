'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AnnouncementBanner from './AnnouncementBanner';
import PublicNavbar from './PublicNavbar';

export default function Navbar() {
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);

    return (
        <>
            <AnnouncementBanner />
            <PublicNavbar onRequestLogout={() => setShowLogoutDialog(true)} />
            <ConfirmDialog
                isOpen={showLogoutDialog}
                title="ออกจากระบบ"
                message="คุณต้องการออกจากระบบใช่หรือไม่?"
                onConfirm={() => {
                    signOut({ callbackUrl: '/' });
                    setShowLogoutDialog(false);
                }}
                onCancel={() => setShowLogoutDialog(false)}
                confirmText="ออกจากระบบ"
                cancelText="ยกเลิก"
            />
        </>
    );
}
