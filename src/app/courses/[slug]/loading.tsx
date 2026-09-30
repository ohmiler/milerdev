import MainContent from '@/components/layout/MainContent';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CourseDetailSection from '@/components/course/CourseDetailSection';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export default function CourseDetailLoading() {
  return (
    <>
      <Navbar />
      <MainContent className="min-h-screen bg-background" aria-busy="true" aria-label="กำลังโหลดรายละเอียดคอร์ส">
        <p className="sr-only" role="status" aria-live="polite">กำลังโหลดรายละเอียดคอร์ส</p>
        <div aria-hidden="true">
          <header className="bg-muted/30">
            <div className="mx-auto grid max-w-[1204px] gap-8 px-5 py-10 sm:px-8 md:grid-cols-[minmax(0,1fr)_20rem] md:gap-9 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-20 lg:py-14">
              <div className="grid content-center gap-6">
                <Skeleton className="h-4 w-60 max-w-full" />
                <div className="flex gap-2"><Skeleton className="h-6 w-20" /><Skeleton className="h-6 w-24" /></div>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
                <div className="flex flex-wrap gap-6">{[1, 2, 3].map(item => <Skeleton className="h-12 w-24" key={item} />)}</div>
              </div>
              <Card className="gap-0 py-0">
                <Skeleton className="aspect-video w-full rounded-none" />
                <CardContent className="grid gap-4 p-6"><Skeleton className="h-5 w-32" /><Skeleton className="h-9 w-28" /><Skeleton className="h-11 w-full" /><Skeleton className="h-16 w-full" /></CardContent>
              </Card>
            </div>
          </header>
          <div className="border-y"><div className="mx-auto flex max-w-[1204px] gap-6 overflow-hidden px-5 py-4 sm:px-8">{[1, 2, 3].map(item => <Skeleton className="h-6 w-24 shrink-0" key={item} />)}</div></div>
          <div className="mx-auto max-w-[1204px] px-5 sm:px-8">
            <CourseDetailSection id="course-overview-loading" eyebrow="ภาพรวมคอร์ส" title="รายละเอียดคอร์ส">
              <div className="grid gap-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-40 w-full" /><Skeleton className="h-24 w-full" /></div>
            </CourseDetailSection>
            <Separator />
            <CourseDetailSection id="course-curriculum-loading" eyebrow="เนื้อหาคอร์ส" title="มองเห็นเส้นทางก่อนเริ่มเรียน">
              <div className="grid gap-2">{[1, 2, 3, 4, 5].map(item => <Skeleton className="h-16 w-full" key={item} />)}</div>
            </CourseDetailSection>
            <Separator />
            <CourseDetailSection id="course-reviews-loading" eyebrow="เสียงจากผู้เรียน" title="รีวิวจากผู้เรียน">
              <Skeleton className="h-44 w-full" />
            </CourseDetailSection>
          </div>
        </div>
      </MainContent>
      <Footer />
    </>
  );
}