'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

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
}

export default function CourseLessonList({ lessons, courseSlug, courseId }: CourseLessonListProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Check enrollment status
      fetch(`/api/enrollments/check?courseId=${courseId}`)
        .then(res => res.json())
        .then(data => {
          setIsEnrolled(data.enrolled || false);
        })
        .catch(console.error);
    }
  }, [status, session, courseId]);

  const handleLessonClick = (lesson: Lesson) => {
    // If free preview or enrolled, go to lesson
    if (lesson.isFreePreview || isEnrolled) {
      router.push(`/courses/${courseSlug}/learn/${lesson.id}`);
    } else if (!session) {
      // Not logged in - redirect to login
      router.push(`/login?callbackUrl=/courses/${courseSlug}`);
    } else {
      // Logged in but not enrolled - show message
      alert('กรุณาลงทะเบียนคอร์สก่อนเพื่อดูบทเรียนนี้');
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
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        background: '#f8fafc',
        borderRadius: '12px',
        color: '#64748b',
      }}>
        <p>กำลังเตรียมเนื้อหา...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {lessons.map((lesson, index) => {
        const canAccess = lesson.isFreePreview || isEnrolled;
        
        return (
          <div
            key={lesson.id}
            onClick={() => handleLessonClick(lesson)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px 20px',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              cursor: canAccess ? 'pointer' : 'not-allowed',
              opacity: canAccess ? 1 : 0.7,
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              if (canAccess) {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.15)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Number Badge */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: canAccess ? '#eff6ff' : '#f1f5f9',
              color: canAccess ? '#2563eb' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '0.875rem',
              flexShrink: 0,
            }}>
              {index + 1}
            </div>

            {/* Lesson Info */}
            <div style={{ flex: 1 }}>
              <h4 style={{ 
                fontWeight: 500, 
                color: canAccess ? '#1e293b' : '#64748b',
                marginBottom: '4px',
              }}>
                {lesson.title}
              </h4>
              {formatDuration(lesson.videoDuration) && (
                <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  ⏱️ {formatDuration(lesson.videoDuration)}
                </span>
              )}
            </div>

            {/* Badge / Lock */}
            {lesson.isFreePreview ? (
              <span style={{
                fontSize: '0.75rem',
                background: '#dcfce7',
                color: '#16a34a',
                padding: '4px 12px',
                borderRadius: '50px',
                fontWeight: 500,
              }}>
                ดูฟรี
              </span>
            ) : isEnrolled ? (
              <span style={{
                fontSize: '0.75rem',
                background: '#eff6ff',
                color: '#2563eb',
                padding: '4px 12px',
                borderRadius: '50px',
                fontWeight: 500,
              }}>
                ดูได้
              </span>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#94a3b8',
              }}>
                <svg 
                  style={{ width: '18px', height: '18px' }} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                  />
                </svg>
                <span style={{ fontSize: '0.75rem' }}>ล็อก</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
