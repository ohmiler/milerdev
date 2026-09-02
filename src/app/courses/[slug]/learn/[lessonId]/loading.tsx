import MainContent from '@/components/layout/MainContent';
import { Skeleton } from '@/components/ui/skeleton';

export default function LearnLoading() {
  return (
    <MainContent className="min-h-screen bg-[var(--academy-canvas)] text-foreground" aria-busy="true" aria-label="กำลังเตรียมพื้นที่การเรียน">
      <header className="flex h-16 items-center gap-3 border-b bg-background px-4 sm:px-5" data-learning-loading="header">
        <Skeleton className="size-8 rounded-lg" data-learning-loading="curriculum-control" />
        <div className="hidden items-center gap-2 sm:flex" data-learning-loading="brand">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="grid flex-1 gap-1.5">
          <Skeleton className="hidden h-3 w-40 sm:block" />
          <Skeleton className="h-4 w-56 max-w-[55vw]" />
        </div>
        <div className="hidden items-center gap-3 sm:flex" data-learning-loading="progress-summary">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="size-8 rounded-lg lg:h-9 lg:w-32" data-learning-loading="course-exit" />
      </header>

      <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[22.5rem_minmax(0,1fr)]">
        <section className="min-w-0 px-4 py-6 sm:px-6 lg:order-2 lg:px-8 lg:py-10">
          <div className="mx-auto w-full max-w-6xl min-[1800px]:-translate-x-20 min-[2400px]:-translate-x-40" data-learning-loading="lesson-canvas">
            <div className="mb-6 grid gap-3">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-9 w-[min(32rem,80vw)]" />
              <Skeleton className="h-4 w-52" />
            </div>
            <Skeleton className="aspect-video w-full rounded-2xl bg-slate-900/15" />
            <div className="mt-6 flex items-center gap-4 rounded-2xl border bg-background p-5">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="grid flex-1 gap-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-4 w-72 max-w-full" /></div>
              <Skeleton className="hidden h-10 w-44 sm:block" />
            </div>
            <div className="mt-6 rounded-2xl border bg-background p-6">
              <Skeleton className="h-6 w-40" />
              <div className="mt-6 grid gap-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-4/5" /></div>
            </div>
          </div>
        </section>

        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] border-r bg-background p-5 lg:order-1 lg:block" data-learning-loading="curriculum">
          <div className="flex gap-3"><Skeleton className="size-9 rounded-full" /><div className="grid flex-1 gap-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-5 w-full" /></div></div>
          <div className="mt-5 rounded-xl border p-4"><Skeleton className="h-4 w-full" /><Skeleton className="mt-3 h-2 w-full" /></div>
          <Skeleton className="mt-4 h-10 w-full" />
          <div className="mt-6 grid gap-3">{[1, 2, 3, 4, 5].map((number) => <Skeleton className="h-16 w-full rounded-xl" key={number} />)}</div>
        </aside>
      </div>
      <span className="sr-only" role="status">กำลังโหลดบทเรียน กรุณารอสักครู่</span>
    </MainContent>
  );
}
