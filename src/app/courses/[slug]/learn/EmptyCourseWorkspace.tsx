import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EmptyCourseWorkspaceProps { courseTitle: string; courseSlug: string; paymentSuccess: boolean; }

export default function EmptyCourseWorkspace({ courseTitle, courseSlug, paymentSuccess }: EmptyCourseWorkspaceProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {paymentSuccess && <div className="mx-auto max-w-7xl px-4 pt-4"><Alert className="border-emerald-400/30 bg-emerald-400/10 text-emerald-100"><AlertTitle>✓ สิทธิ์เข้าเรียนพร้อมแล้ว</AlertTitle><AlertDescription className="text-emerald-100/80">ระบบบันทึกคอร์ส {courseTitle} ไว้ในบัญชีของคุณเรียบร้อย</AlertDescription></Alert></div>}
      <header className="border-b border-white/10"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8"><Link className="flex items-center gap-3 font-semibold" href="/dashboard"><span className="flex size-9 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">MD</span>MilerDev Learning</Link><div className="hidden min-w-0 text-center md:block"><span className="block text-[10px] uppercase tracking-[0.2em] text-slate-400">COURSE WORKSPACE</span><strong className="block max-w-md truncate text-sm">{courseTitle}</strong></div><Button asChild variant="secondary"><Link href={'/courses/' + courseSlug}>ดูหน้าคอร์ส →</Link></Button></div></header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-8">
        <Card className="h-fit border-white/10 bg-white/5 text-slate-100"><CardHeader><Badge variant="secondary" className="w-fit">COURSE INDEX</Badge><CardTitle>ลำดับการเรียน</CardTitle></CardHeader><CardContent><div className="flex gap-3 rounded-lg border border-white/10 p-4"><span className="text-xs text-slate-400">00</span><div><strong>ยังไม่มีบทเรียน</strong><p className="text-sm text-slate-400">รอทีมเผยแพร่เนื้อหา</p></div></div></CardContent></Card>
        <section aria-labelledby="empty-course-title"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">LEARNING WORKSPACE / WAITING</p><h1 className="mt-2 text-3xl font-bold tracking-tight" id="empty-course-title">คอร์สนี้ยังไม่มีบทเรียนที่เปิดให้เรียน</h1></div><Badge variant="secondary">00 / 00</Badge></div><Card className="border-white/10 bg-white/5 text-slate-100"><CardContent className="grid gap-6 p-8 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center"><div className="flex aspect-square items-center justify-center rounded-full bg-primary/15 text-3xl text-primary">▶</div><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">CONTENT STATUS</p><h2 className="mt-2 text-2xl font-semibold">ทีมกำลังเตรียมเนื้อหาบทเรียน</h2><p className="mt-3 leading-7 text-slate-400">สิทธิ์เข้าเรียนของคุณยังอยู่ครบ เมื่อมีบทเรียนเผยแพร่ คุณสามารถกลับมาเริ่มเรียนจากแดชบอร์ดได้ทันที</p></div></CardContent></Card><div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link href="/dashboard">กลับไปแดชบอร์ด →</Link></Button><Button asChild variant="secondary"><Link href={'/courses/' + courseSlug}>ดูรายละเอียดคอร์ส</Link></Button><Button asChild variant="ghost"><Link href="/contact">ติดต่อทีม MilerDev</Link></Button></div></section>
      </div>
    </main>
  );
}
