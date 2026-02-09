'use client';

import { useEnrollment } from '@/components/course/CourseDetailClient';
import CourseReviews from '@/components/course/CourseReviews';

interface CourseReviewsWrapperProps {
  courseSlug: string;
}

export default function CourseReviewsWrapper({ courseSlug }: CourseReviewsWrapperProps) {
  const { isEnrolled } = useEnrollment();
  return <CourseReviews courseSlug={courseSlug} isEnrolled={isEnrolled} />;
}
