'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface BundleEnrollButtonProps {
    bundleId: string;
    price: number;
    bundleSlug: string;
}

export default function BundleEnrollButton({ bundleId, price, bundleSlug }: BundleEnrollButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [enrolled, setEnrolled] = useState(false);
    const [error, setError] = useState('');

    const handleEnroll = async () => {
        setLoading(true);
        setError('');

        try {
            if (price > 0) {
                // TODO: Implement payment flow for bundles (Stripe/PromptPay)
                setError('ระบบชำระเงินสำหรับ Bundle กำลังพัฒนา');
                setLoading(false);
                return;
            }

            // Free bundle — enroll directly
            const res = await fetch('/api/bundles/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bundleId }),
            });

            const data = await res.json();

            if (res.status === 401) {
                router.push(`/login?callbackUrl=/bundles/${bundleSlug}`);
                return;
            }

            if (!res.ok) {
                setError(data.error || 'เกิดข้อผิดพลาด');
                return;
            }

            setEnrolled(true);
            router.refresh();
        } catch {
            setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setLoading(false);
        }
    };

    if (enrolled) {
        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#dcfce7',
                color: '#16a34a',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.9375rem',
            }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="m9 11 3 3L22 4" />
                </svg>
                ลงทะเบียนสำเร็จ!
            </div>
        );
    }

    return (
        <div>
            <button
                onClick={handleEnroll}
                disabled={loading}
                style={{
                    background: price === 0
                        ? 'linear-gradient(135deg, #16a34a, #15803d)'
                        : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    color: 'white',
                    border: 'none',
                    padding: '14px 32px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    transition: 'transform 0.15s, opacity 0.15s',
                    whiteSpace: 'nowrap',
                }}
            >
                {loading ? 'กำลังดำเนินการ...' : price === 0 ? 'ลงทะเบียน Bundle ฟรี' : `ซื้อ Bundle ฿${price.toLocaleString()}`}
            </button>
            {error && (
                <p style={{ color: '#dc2626', fontSize: '0.8125rem', marginTop: '8px' }}>{error}</p>
            )}
        </div>
    );
}
