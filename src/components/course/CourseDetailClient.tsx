'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import EnrollButton from '@/components/course/EnrollButton';
import CourseLessonList from '@/components/course/CourseLessonList';

// Shared enrollment context
const EnrollmentContext = createContext<{
  isEnrolled: boolean;
  setIsEnrolled: (v: boolean) => void;
}>({ isEnrolled: false, setIsEnrolled: () => {} });

export function useEnrollment() {
  return useContext(EnrollmentContext);
}

// Provider that wraps the course detail section
export function CourseDetailProvider({ children }: { children: React.ReactNode }) {
  const [isEnrolled, setIsEnrolled] = useState(false);
  return (
    <EnrollmentContext.Provider value={{ isEnrolled, setIsEnrolled }}>
      {children}
    </EnrollmentContext.Provider>
  );
}

// ---

interface Lesson {
  id: string;
  title: string;
  videoDuration: number | null;
  isFreePreview: boolean | null;
}

interface CourseDetailClientProps {
  courseId: string;
  courseSlug: string;
  lessons?: Lesson[];
  price?: number;
  renderMode?: 'lessons' | 'button';
}

export default function CourseDetailClient({
  courseId,
  courseSlug,
  lessons,
  price = 0,
  renderMode,
}: CourseDetailClientProps) {
  const { isEnrolled, setIsEnrolled } = useEnrollment();

  const handleEnrollmentChange = useCallback((enrolled: boolean) => {
    setIsEnrolled(enrolled);
  }, [setIsEnrolled]);

  // Render only the enroll button (for sidebar)
  if (renderMode === 'button') {
    return (
      <EnrollButton
        courseId={courseId}
        courseSlug={courseSlug}
        price={price}
        onEnrollmentChange={handleEnrollmentChange}
      />
    );
  }

  // Render the lesson list (for main content)
  if (lessons) {
    return (
      <CourseLessonList
        lessons={lessons}
        courseSlug={courseSlug}
        courseId={courseId}
        isEnrolled={isEnrolled}
      />
    );
  }

  return null;
}
