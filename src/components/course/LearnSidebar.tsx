'use client';

import LessonList from './LessonList';

interface Lesson {
  id: string;
  title: string;
  videoDuration: number | null;
  isFreePreview: boolean | null;
}

interface LearnSidebarProps {
  lessons: Lesson[];
  courseSlug: string;
  currentLessonId: string;
  isEnrolled: boolean;
  onLockedLessonClick: (lessonId: string) => void;
}

export default function LearnSidebar({ 
  lessons, 
  courseSlug, 
  currentLessonId, 
  isEnrolled,
  onLockedLessonClick 
}: LearnSidebarProps) {
  return (
    <div style={{
      padding: '16px',
      height: '100%',
      overflowY: 'auto',
    }}>
      <div style={{
        fontSize: '0.875rem',
        fontWeight: 600,
        color: '#94a3b8',
        marginBottom: '16px',
        padding: '0 16px',
      }}>
        เนื้อหาคอร์ส ({lessons.length} บท)
      </div>
      <LessonList 
        lessons={lessons} 
        courseSlug={courseSlug}
        currentLessonId={currentLessonId}
        isEnrolled={isEnrolled}
        onLockedClick={onLockedLessonClick}
      />
    </div>
  );
}
