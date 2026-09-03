import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <LearnerAccountShell
      current="dashboard"
      title="ภาพรวมการเรียน"
      description="กำลังเตรียมคอร์ส ความคืบหน้า และสิ่งที่ควรทำต่อ"
    >
      <div aria-busy="true" aria-label="กำลังโหลดแดชบอร์ดการเรียน">
        <p className="sr-only">กำลังโหลดแดชบอร์ดการเรียน กรุณารอสักครู่</p>
        <div aria-hidden="true">
          <div className="grid gap-3" data-dashboard-loading="header">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-80 max-w-full" />
            <Skeleton className="h-5 w-[32rem] max-w-full" />
          </div>
          <section className="my-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <Card data-dashboard-loading-stat="true" key={item}><CardContent className="grid gap-3 p-5"><Skeleton className="h-4 w-20" /><Skeleton className="h-9 w-14" /></CardContent></Card>)}
          </section>
          <section className="mt-10" data-dashboard-loading="continuation">
            <div className="mb-5 flex items-end justify-between"><div className="grid gap-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-56" /></div><Skeleton className="h-4 w-28" /></div>
            <Card className="overflow-hidden"><div className="grid lg:grid-cols-2"><Skeleton className="min-h-64 rounded-none" /><CardContent className="grid content-center gap-5 p-7"><Skeleton className="h-6 w-28" /><Skeleton className="h-8 w-72 max-w-full" /><Skeleton className="h-2 w-full" /><Skeleton className="h-5 w-40" /></CardContent></div></Card>
          </section>
          <section className="mt-12" data-dashboard-loading="course-index">
            <div className="mb-5 flex items-end justify-between"><div className="grid gap-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-40" /></div><Skeleton className="h-9 w-32" /></div>
            <div className="grid gap-3">{[1, 2, 3].map((item) => <Card key={item}><CardContent className="grid gap-3 p-5 sm:grid-cols-[2.5rem_minmax(0,1fr)_12rem_auto]"><Skeleton className="h-5 w-6" /><Skeleton className="h-5 w-64 max-w-full" /><Skeleton className="h-2 w-full" /><Skeleton className="h-6 w-16" /></CardContent></Card>)}</div>
          </section>
        </div>
      </div>
    </LearnerAccountShell>
  );
}
