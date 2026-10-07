import Link from 'next/link';
import { Star } from 'lucide-react';

import SectionHeader from '@/components/layout/SectionHeader';
import type { HomeReview } from '@/lib/home/proof';

/** Verified learner reviews. Home leaves this section out when there are none. */
export default function HomeReviews({ reviews }: { reviews: HomeReview[] }) {
  return (
    <section
      data-home-section="reviews"
      className="bg-muted/30 py-16 sm:py-20 lg:py-24"
      aria-labelledby="home-reviews-title"
    >
      <div className="container">
        <div data-reveal>
          <SectionHeader
            id="home-reviews-title"
            eyebrow="รีวิวจากผู้เรียน"
            title="ผู้เรียนพูดถึงคอร์สว่าอย่างไร"
            description="รีวิวที่ยืนยันแล้ว พร้อมชื่อคอร์สที่เรียน"
          />
        </div>

        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {reviews.map((review, index) => (
            <li key={review.id} className="flex" data-reveal data-delay={String(index * 55)}>
              <figure className="flex flex-1 flex-col gap-4 rounded-2xl border bg-card p-6">
                <span role="img" aria-label={`${review.rating} จาก 5 ดาว`} className="flex gap-0.5 text-[var(--color-warning-strong)]">
                  {Array.from({ length: 5 }, (_, star) => (
                    <Star key={star} className={star < review.rating ? 'size-4 fill-current' : 'size-4'} aria-hidden="true" />
                  ))}
                </span>
                <blockquote className="line-clamp-5 text-pretty leading-7">“{review.comment}”</blockquote>
                <figcaption className="mt-auto text-sm">
                  <strong className="block font-semibold wrap-anywhere">{review.reviewerName}</strong>
                  <Link href={`/courses/${review.courseSlug}`} className="text-muted-foreground underline-offset-4 hover:text-link hover:underline">
                    {review.courseTitle}
                  </Link>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
