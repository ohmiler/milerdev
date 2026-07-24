export type AdminUserLifecycleStatus = 'active' | 'inactive';
export type AdminUserLifecycleAction = 'deactivate' | 'reactivate';

export type AuthoritativeLifecycleUser = {
    id: string;
    name: string | null;
    role: 'student' | 'instructor' | 'admin';
    lifecycleStatus: AdminUserLifecycleStatus;
    deactivatedAt: string | Date | null;
};

export const lifecycleDeactivationDialog = {
    title: 'ปิดใช้งานบัญชี',
    message: 'บัญชีนี้จะเข้าสู่ระบบไม่ได้และเซสชันเดิมจะสิ้นสุด แต่ข้อมูลการลงทะเบียน ความคืบหน้า การชำระเงิน และใบรับรองจะยังคงอยู่',
    confirmText: 'ยืนยันปิดใช้งาน',
} as const;

export function buildAdminUsersSearchParams({
    page,
    role,
    status,
    search,
    sortBy,
    sortOrder,
}: {
    page: number;
    role: string;
    status: 'all' | 'active' | 'inactive';
    search?: string;
    sortBy: string;
    sortOrder: string;
}): URLSearchParams {
    return new URLSearchParams({
        page: String(page),
        role,
        status,
        ...(search ? { search } : {}),
        sortBy,
        sortOrder,
    });
}

export function getLifecyclePresentation(status: AdminUserLifecycleStatus) {
    return status === 'active'
        ? {
            badgeLabel: 'ใช้งาน',
            action: 'deactivate' as const,
            actionLabel: 'ปิดใช้งาน',
            tone: 'success' as const,
        }
        : {
            badgeLabel: 'ปิดใช้งาน',
            action: 'reactivate' as const,
            actionLabel: 'เปิดใช้งาน',
            tone: 'warning' as const,
        };
}

export function applyAuthoritativeLifecycleState<T extends { id: string }>(
    current: T[],
    authoritative: AuthoritativeLifecycleUser[],
): Array<T & Partial<AuthoritativeLifecycleUser>> {
    const byId = new Map(authoritative.map((user) => [user.id, user]));
    return current.map((user) => ({
        ...user,
        ...(byId.get(user.id) ?? {}),
    }));
}

export function lifecycleMutationFeedback(
    action: AdminUserLifecycleAction,
    changedCount: number,
    skippedCount: number,
): string {
    if (changedCount === 0) {
        return 'สถานะบัญชีเป็นปัจจุบันอยู่แล้ว ไม่มีรายการเปลี่ยนแปลง';
    }
    const actionLabel = action === 'deactivate' ? 'ปิดใช้งาน' : 'เปิดใช้งาน';
    return `${actionLabel}สำเร็จ ${changedCount} บัญชี${skippedCount > 0 ? ` และข้าม ${skippedCount} บัญชีที่มีสถานะนี้อยู่แล้ว` : ''}`;
}
