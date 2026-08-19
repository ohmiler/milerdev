import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <LearnerAccountShell
      current="profile"
      eyebrow="ข้อมูลผู้เรียน"
      title="โปรไฟล์ของฉัน"
      description="ข้อมูลระบุตัวตนสำหรับบัญชีผู้เรียนและชื่อที่ใช้ในประสบการณ์เรียนของคุณ"
    >
      <div aria-busy="true" aria-label="กำลังโหลดโปรไฟล์">
        <Card><CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <Skeleton className="size-24 rounded-full" />
          <div className="grid flex-1 gap-3">
            <Skeleton className="h-7 w-52 max-w-full" />
            <Skeleton className="h-4 w-36 max-w-full" />
          </div>
        </CardContent></Card>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Card key={item}><CardContent className="grid gap-3 p-4"><Skeleton className="h-4 w-20" /><Skeleton className="h-7 w-28" /></CardContent></Card>
          ))}
        </div>

        <Card className="mt-8"><CardContent className="grid gap-5 p-6"><Skeleton className="h-7 w-48" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
      </div>
    </LearnerAccountShell>
  );
}
