import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <LearnerAccountShell
      current="settings"
      title="ตั้งค่าบัญชี"
      description="จัดการข้อมูลที่แสดงในบัญชีและควบคุมความปลอดภัยของการเข้าสู่ระบบ"
    >
      <div aria-busy="true" aria-label="กำลังโหลดการตั้งค่าบัญชี">
        <p className="sr-only" role="status" aria-live="polite">กำลังโหลดการตั้งค่าบัญชี</p>
        <div aria-hidden="true">
        {[1, 2].map((section) => (
          <Card className="mb-6" key={section}><CardHeader><CardTitle><Skeleton className="h-7 w-52 max-w-full" /></CardTitle></CardHeader><CardContent className="grid gap-4"><Skeleton className="h-4 w-24" /><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
        </div>
      </div>
    </LearnerAccountShell>
  );
}
