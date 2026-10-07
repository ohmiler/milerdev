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
        {/* The same order as the page: the next step, then the member's courses with their covers. */}
        <div aria-hidden="true">
          <section data-dashboard-loading="continuation">
            <div className="grid gap-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-56" /></div>
            <Card className="mt-5 overflow-hidden py-0"><div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><Skeleton className="order-last h-36 rounded-none sm:h-auto sm:min-h-64 lg:order-first" /><CardContent className="grid content-center gap-5 py-7"><Skeleton className="h-6 w-28" /><Skeleton className="h-8 w-72 max-w-full" /><Skeleton className="h-2 w-full" /><Skeleton className="h-9 w-48" /></CardContent></div></Card>
          </section>
          <section className="mt-12" data-dashboard-loading="course-index">
            <div className="mb-5 flex items-end justify-between"><Skeleton className="h-8 w-40" /><Skeleton className="h-9 w-32" /></div>
            <div className="grid gap-3">{[1, 2, 3].map((item) => <Card key={item} size="sm"><CardContent className="flex items-center gap-4"><Skeleton className="aspect-video w-24 shrink-0 sm:w-28" /><div className="grid flex-1 gap-3"><Skeleton className="h-5 w-64 max-w-full" /><Skeleton className="h-2 w-full" /></div></CardContent></Card>)}</div>
          </section>
        </div>
      </div>
    </LearnerAccountShell>
  );
}
