'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';

interface Lesson {
  id: string;
  title: string;
  videoDuration: number | null;
  isFreePreview: boolean | null;
}

interface CourseLessonListProps {
  lessons: Lesson[];
  courseSlug: string;
  courseId: string;
  isEnrolled?: boolean;
}

const INITIAL_SHOW = 10;

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

export default function CourseLessonList({ lessons, courseSlug, isEnrolled = false }: CourseLessonListProps) {
  const session = useSession()?.data;
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const hasMore = lessons.length > INITIAL_SHOW;
  const visibleLessons = showAll ? lessons : lessons.slice(0, INITIAL_SHOW);

  const handleLessonClick = (lesson: Lesson) => {
    if (lesson.isFreePreview || isEnrolled) {
      router.push(`/courses/${courseSlug}/learn/${lesson.id}`);
    } else if (!session) {
      router.push(`/login?callbackUrl=/courses/${courseSlug}`);
    } else {
      setShowModal(true);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} วินาที`;
    if (secs === 0) return `${mins} นาที`;
    return `${mins} นาที ${secs} วินาที`;
  };

  if (lessons.length === 0) {
    return <div className="course-lessons-empty"><p>กำลังเตรียมเนื้อหา โปรดกลับมาตรวจสอบอีกครั้ง</p></div>;
  }

  return (
    <div className="course-lessons">
      <ol className="course-lessons__list">
        {visibleLessons.map((lesson, index) => {
          const canAccess = Boolean(lesson.isFreePreview || isEnrolled);
          const duration = formatDuration(lesson.videoDuration);
          return (
            <li key={lesson.id}>
              <button
                type="button"
                className={`course-lesson-row ${canAccess ? 'is-accessible' : 'is-locked'}`}
                onClick={() => handleLessonClick(lesson)}
                aria-label={`${lesson.title}, ${lesson.isFreePreview ? 'ดูฟรี' : isEnrolled ? 'เปิดบทเรียน' : 'ต้องสมัครเรียนก่อน'}`}
              >
                <span className="course-lesson-row__index">{String(index + 1).padStart(2, '0')}</span>
                <span className="course-lesson-row__content">
                  <strong>{lesson.title}</strong>
                  {duration && <span>{duration}</span>}
                </span>
                {lesson.isFreePreview ? (
                  <span className="course-lesson-row__status is-preview">ดูฟรี</span>
                ) : isEnrolled ? (
                  <span className="course-lesson-row__status">เปิดบทเรียน</span>
                ) : (
                  <span className="course-lesson-row__status is-locked"><LockIcon /> ล็อก</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {hasMore && (
        <button type="button" className="course-lessons__toggle" onClick={() => setShowAll((current) => !current)} aria-expanded={showAll}>
          {showAll ? 'ย่อรายการบทเรียน' : `ดูอีก ${lessons.length - INITIAL_SHOW} บทเรียน`}
        </button>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} type="warning" title="สมัครเรียนเพื่อเปิดบทนี้" buttonText="รับทราบ">
        บทเรียนนี้เปิดสำหรับผู้ที่สมัครคอร์สแล้ว คุณสามารถดูหัวข้อที่เปิดให้ทดลองได้ก่อนตัดสินใจ
      </Modal>
    </div>
  );
}
