import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-muted/20 py-10 sm:py-14" aria-busy="true" aria-label="กำลังโหลดแดชบอร์ดการเรียน">
        <p className="sr-only">กำลังโหลดแดชบอร์ดการเรียน กรุณารอสักครู่</p>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-hidden="true">
          <header className="flex flex-col gap-6 border-b pb-8 lg:flex-row lg:items-end lg:justify-between" data-dashboard-loading="header">
            <div className="grid flex-1 gap-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-80 max-w-full" /><Skeleton className="h-5 w-[32rem] max-w-full" /></div>
            <div className="flex gap-2" data-dashboard-loading="account-navigation"><Skeleton className="h-9 w-28" /><Skeleton className="h-9 w-28" /><Skeleton className="h-9 w-24" /></div>
          </header>
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
      </main>
      <Footer />
    </>
  );
}
