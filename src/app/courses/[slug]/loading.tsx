import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`course-detail-skeleton ${className}`} aria-hidden="true" />;
}

export default function CourseDetailLoading() {
  return (
    <>
      <Navbar />
      <main className="course-detail-page" aria-busy="true" aria-label="กำลังโหลดรายละเอียดคอร์ส">
        <section className="course-detail-hero course-detail-loading__hero">
          <div className="container course-detail-hero__grid">
            <div className="course-detail-hero__content">
              <Skeleton className="is-breadcrumb" />
              <div className="course-detail-loading__tags"><Skeleton /><Skeleton /></div>
              <Skeleton className="is-title" />
              <Skeleton className="is-lede" />
              <div className="course-detail-loading__facts"><Skeleton /><Skeleton /><Skeleton /></div>
            </div>
          </div>
        </section>
        <section className="course-detail-body">
          <div className="container course-detail-loading__grid">
            <div className="course-detail-loading__main">
              <Skeleton className="is-section-title" />
              <Skeleton className="is-copy" />
              <Skeleton className="is-copy is-short" />
              <Skeleton className="is-section-title" />
              {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="is-lesson" />)}
            </div>
            <div className="course-detail-loading__panel">
              <Skeleton className="is-media" />
              <div><Skeleton className="is-price" /><Skeleton className="is-button" /><Skeleton className="is-copy" /></div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
