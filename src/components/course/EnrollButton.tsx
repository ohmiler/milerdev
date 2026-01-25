'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Modal from '@/components/ui/Modal';

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
  const [modal, setModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

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
      // ถ้าคอร์สมีราคา → ไปหน้า Stripe Checkout
      if (price > 0) {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId }),
        });

        const data = await res.json();

        if (res.ok && data.url) {
          // Redirect ไปหน้า Stripe Checkout
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
        setEnrolled(true);
        // Show success modal
        setModal({
          isOpen: true,
          type: 'success',
          title: 'ลงทะเบียนสำเร็จ!',
          message: 'ยินดีด้วย! คุณลงทะเบียนคอร์สนี้เรียบร้อยแล้ว กดปุ่มด้านล่างเพื่อเริ่มเรียน',
        });
      } else {
        if (data.error === 'คุณลงทะเบียนคอร์สนี้แล้ว') {
          setEnrolled(true);
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
    setModal({ ...modal, isOpen: false });
    if (modal.type === 'success') {
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
          borderRadius: '8px',
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
      ) : (
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
      )}

      <Modal
        isOpen={modal.isOpen}
        onClose={handleModalClose}
        type={modal.type}
        title={modal.title}
      >
        {modal.message}
      </Modal>
    </>
  );
}
