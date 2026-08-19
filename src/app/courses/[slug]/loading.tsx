import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CourseDetailLoading() {
  return (
    <><Navbar /><main className="min-h-screen bg-background" aria-busy="true" aria-label="กำลังโหลดรายละเอียดคอร์ส">
      <header className="border-b bg-muted/30"><div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:px-8 lg:py-16">
        <div className="grid content-start gap-5"><Skeleton className="h-4 w-64 max-w-full" /><div className="flex gap-2"><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-6 w-24 rounded-full" /></div><Skeleton className="h-12 w-[42rem] max-w-full" /><Skeleton className="h-6 w-[34rem] max-w-full" /><div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(item=><Skeleton className="h-20 w-full" key={item} />)}</div></div>
        <Card className="overflow-hidden"><Skeleton className="aspect-video w-full rounded-none" /><CardContent className="grid gap-4 p-6"><Skeleton className="h-9 w-32" /><Skeleton className="h-10 w-full" /><Skeleton className="h-4 w-full" /></CardContent></Card>
      </div></header>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="max-w-4xl space-y-5"><Skeleton className="h-8 w-56" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-8 w-44" />{[1,2,3,4].map(item=><Skeleton className="h-14 w-full" key={item} />)}</div></section>
    </main><Footer /></>
  );
}
