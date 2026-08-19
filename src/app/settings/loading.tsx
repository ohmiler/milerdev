import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <LearnerAccountShell
      current="settings"
      eyebrow="จัดการบัญชี"
      title="ตั้งค่าบัญชี"
      description="จัดการข้อมูลที่แสดงในบัญชีและควบคุมความปลอดภัยของการเข้าสู่ระบบ"
    >
      <div aria-busy="true" aria-label="กำลังโหลดการตั้งค่าบัญชี">
        {[1, 2].map((section) => (
          <Card className="mb-6" key={section}><CardContent className="grid gap-4 p-6"><Skeleton className="h-4 w-24" /><Skeleton className="h-7 w-52 max-w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    </LearnerAccountShell>
  );
}
