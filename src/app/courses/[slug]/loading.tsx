import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CourseDetailLoading() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background" aria-busy="true" aria-label="กำลังโหลดรายละเอียดคอร์ส">
        <p className="sr-only" role="status" aria-live="polite">กำลังโหลดรายละเอียดคอร์ส</p>
        <div aria-hidden="true">
        <header className="border-b bg-muted/30">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:px-8 lg:py-16">
            <div className="grid content-center gap-5">
              <Skeleton className="h-4 w-64 max-w-full" />
              <div className="flex gap-2"><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-6 w-24 rounded-full" /></div>
              <Skeleton className="h-12 w-[42rem] max-w-full" />
              <Skeleton className="h-6 w-[34rem] max-w-full" />
              <div className="flex flex-wrap gap-8">{[1, 2, 3].map((item) => <Skeleton className="h-10 w-24" key={item} />)}</div>
            </div>
            <Card className="overflow-hidden">
              <Skeleton className="aspect-video w-full rounded-none" />
              <CardContent className="grid gap-4 p-6"><Skeleton className="h-5 w-32" /><Skeleton className="h-9 w-28" /><Skeleton className="h-10 w-full" /><Skeleton className="h-4 w-full" /></CardContent>
            </Card>
          </div>
        </header>
        <div className="border-b"><div className="mx-auto flex max-w-5xl gap-6 px-4 py-4 sm:px-6 lg:px-8">{[1, 2, 3, 4].map((item) => <Skeleton className="h-4 w-24" key={item} />)}</div></div>
        <section className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-56" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-5/6" /></div>
          <div className="flex flex-col gap-4"><Skeleton className="h-8 w-52" />{[1, 2, 3, 4].map((item) => <Skeleton className="h-16 w-full" key={item} />)}</div>
        </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
