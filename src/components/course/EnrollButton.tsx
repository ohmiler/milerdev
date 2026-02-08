'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Modal from '@/components/ui/Modal';

interface EnrollButtonProps {
  courseId: string;
  courseSlug: string;
  price: number;
  onEnrollmentChange?: (enrolled: boolean) => void;
}

export default function EnrollButton({ courseId, courseSlug, price, onEnrollmentChange }: EnrollButtonProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [modal, setModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const updateEnrolled = useCallback((value: boolean) => {
    setEnrolled(value);
    onEnrollmentChange?.(value);
  }, [onEnrollmentChange]);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      setChecking(false);
      return;
    }

    fetch(`/api/enrollments/check?courseId=${courseId}`)
      .then((res) => res.json())
      .then((data) => {
        updateEnrolled(data.enrolled);
      })
      .catch(console.error)
      .finally(() => setChecking(false));
  }, [session, status, courseId, updateEnrolled]);

  const handleEnroll = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/courses/${courseSlug}`);
      return;
    }

    setLoading(true);

    try {
      // ถ้าคอร์สมีราคา → ไปหน้า Stripe Checkout
      if (price > 0) {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId }),
        });

        const data = await res.json();

        if (res.ok && data.url) {
          window.location.href = data.url;
          return;
        } else {
          setModal({
            isOpen: true,
            type: 'error',
            title: 'เกิดข้อผิดพลาด',
            message: data.error || 'ไม่สามารถสร้างหน้าชำระเงินได้ กรุณาลองใหม่',
          });
          setLoading(false);
          return;
        }
      }

      // ถ้าคอร์สฟรี → ลงทะเบียนเลย
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });

      const data = await res.json();

      if (res.ok) {
        updateEnrolled(true);
        setModal({
          isOpen: true,
          type: 'success',
          title: 'ลงทะเบียนสำเร็จ!',
          message: 'ยินดีด้วย! คุณลงทะเบียนคอร์สนี้เรียบร้อยแล้ว',
        });
      } else {
        if (data.error === 'คุณลงทะเบียนคอร์สนี้แล้ว') {
          updateEnrolled(true);
        } else {
          setModal({
            isOpen: true,
            type: 'error',
            title: 'เกิดข้อผิดพลาด',
            message: data.error || 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่',
          });
        }
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    const wasSuccess = modal.type === 'success';
    setModal({ ...modal, isOpen: false });
    if (wasSuccess) {
      router.push(`/courses/${courseSlug}/learn`);
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
          borderRadius: '12px',
          cursor: 'not-allowed',
        }}
      >
        กำลังตรวจสอบ...
      </button>
    );
  }

  return (
    <>
      {enrolled ? (
        <button
          onClick={handleGoToLearn}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            textAlign: 'center',
            padding: '16px',
            fontSize: '1.125rem',
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
            transition: 'all 0.2s',
          }}
        >
          <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          เข้าเรียน
        </button>
      ) : (
        <button
          onClick={handleEnroll}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            textAlign: 'center',
            padding: '16px',
            fontSize: '1.125rem',
            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            boxShadow: loading ? 'none' : '0 4px 14px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s',
          }}
        >
          {loading ? (
            'กำลังดำเนินการ...'
          ) : price === 0 ? (
            'ลงทะเบียนเรียนฟรี'
          ) : (
            `ซื้อคอร์สนี้ ฿${price.toLocaleString()}`
          )}
        </button>
      )}

      <Modal
        isOpen={modal.isOpen}
        onClose={handleModalClose}
        type={modal.type}
        title={modal.title}
        buttonText={modal.type === 'success' ? 'เริ่มเรียนเลย' : 'ตกลง'}
      >
        {modal.message}
      </Modal>
    </>
  );
}
