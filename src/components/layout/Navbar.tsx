'use client';

import { useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AnnouncementAlert from './AnnouncementAlert';
import PublicNavigationBar from './PublicNavigationBar';

export default function Navbar() {
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const logoutReturnFocusRef = useRef<HTMLElement | null>(null);

    return (
        <>
            <AnnouncementAlert />
            <PublicNavigationBar
                onRequestLogout={(returnFocus) => {
                    logoutReturnFocusRef.current = returnFocus;
                    setShowLogoutDialog(true);
                }}
            />
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
                returnFocusRef={logoutReturnFocusRef}
            />
        </>
    );
}
