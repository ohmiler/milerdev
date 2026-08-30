import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <LearnerAccountShell
      current="profile"
      title="โปรไฟล์ของฉัน"
      description="ข้อมูลระบุตัวตนสำหรับบัญชีผู้เรียนและชื่อที่ใช้ในประสบการณ์เรียนของคุณ"
    >
      <div aria-busy="true" aria-label="กำลังโหลดโปรไฟล์">
        <p className="sr-only" role="status" aria-live="polite">กำลังโหลดโปรไฟล์</p>
        <div aria-hidden="true">
        <Card>
          <CardHeader><CardTitle className="sr-only">กำลังโหลดข้อมูลโปรไฟล์</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Skeleton className="size-24 rounded-full" />
            <div className="grid flex-1 gap-3">
              <Skeleton className="h-7 w-52 max-w-full" />
              <Skeleton className="h-4 w-36 max-w-full" />
            </div>
          </CardContent>
        </Card>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Card key={item} size="sm"><CardHeader><CardDescription><Skeleton className="h-4 w-20" /></CardDescription><CardTitle><Skeleton className="h-7 w-28" /></CardTitle></CardHeader></Card>
          ))}
        </div>

        <Card className="mt-8"><CardHeader><CardTitle><Skeleton className="h-7 w-48" /></CardTitle></CardHeader><CardContent className="grid gap-5"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
        </div>
      </div>
    </LearnerAccountShell>
  );
}
