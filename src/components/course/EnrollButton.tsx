'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface EnrollButtonProps {
  courseId: string;
  courseSlug: string;
  price: number;
}

export default function EnrollButton({ courseId, courseSlug, price }: EnrollButtonProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      setChecking(false);
      return;
    }

    // Check if already enrolled
    fetch(`/api/enrollments/check?courseId=${courseId}`)
      .then((res) => res.json())
      .then((data) => {
        setEnrolled(data.enrolled);
      })
      .catch(console.error)
      .finally(() => setChecking(false));
  }, [session, status, courseId]);

  const handleEnroll = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/courses/${courseSlug}`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });

      const data = await res.json();

      if (res.ok) {
        setEnrolled(true);
        // Show success and redirect
        alert('ลงทะเบียนสำเร็จ! กำลังพาไปหน้าเรียน...');
        router.push(`/courses/${courseSlug}/learn`);
      } else {
        if (data.error === 'คุณลงทะเบียนคอร์สนี้แล้ว') {
          setEnrolled(true);
        } else {
          alert(data.error || 'เกิดข้อผิดพลาด');
        }
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLearn = () => {
    router.push(`/courses/${courseSlug}/learn`);
  };

  if (checking) {
    return (
      <button
        disabled
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          padding: '16px',
          fontSize: '1.125rem',
          background: '#e2e8f0',
          color: '#64748b',
          border: 'none',
          borderRadius: '8px',
          cursor: 'not-allowed',
        }}
      >
        กำลังตรวจสอบ...
      </button>
    );
  }

  if (enrolled) {
    return (
      <button
        onClick={handleGoToLearn}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          padding: '16px',
          fontSize: '1.125rem',
          background: '#16a34a',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        ✓ เข้าเรียน
      </button>
    );
  }

  return (
    <button
      onClick={handleEnroll}
      disabled={loading}
      className="btn btn-primary"
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'center',
        padding: '16px',
        fontSize: '1.125rem',
        opacity: loading ? 0.7 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
      }}
    >
      {loading
        ? 'กำลังดำเนินการ...'
        : price === 0
        ? 'ลงทะเบียนเรียนฟรี'
        : `ซื้อคอร์สนี้ ฿${price.toLocaleString()}`}
    </button>
  );
}
