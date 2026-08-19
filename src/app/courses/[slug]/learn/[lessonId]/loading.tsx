import { Skeleton } from '@/components/ui/skeleton';

export default function LearnLoading() {
  return (
    <main className="min-h-screen bg-[var(--academy-canvas)] text-foreground" aria-busy="true" aria-label="กำลังเตรียมพื้นที่การเรียน">
      <header className="flex h-16 items-center gap-3 border-b bg-background px-4 sm:px-5">
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="hidden size-8 rounded-lg sm:block" />
        <div className="h-6 w-px bg-border" />
        <div className="grid flex-1 gap-1.5">
          <Skeleton className="hidden h-3 w-40 sm:block" />
          <Skeleton className="h-4 w-56 max-w-[55vw]" />
        </div>
        <Skeleton className="h-8 w-20" />
      </header>

      <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <section className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <div className="mx-auto w-full max-w-6xl">
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

        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] border-l bg-background p-5 lg:block">
          <div className="flex gap-3"><Skeleton className="size-9 rounded-full" /><div className="grid flex-1 gap-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-5 w-full" /></div></div>
          <div className="mt-5 rounded-xl border p-4"><Skeleton className="h-4 w-full" /><Skeleton className="mt-3 h-2 w-full" /></div>
          <Skeleton className="mt-4 h-10 w-full" />
          <div className="mt-6 grid gap-3">{[1, 2, 3, 4, 5].map((number) => <Skeleton className="h-16 w-full rounded-xl" key={number} />)}</div>
        </aside>
      </div>
      <span className="sr-only" role="status">กำลังโหลดบทเรียน กรุณารอสักครู่</span>
    </main>
  );
}
