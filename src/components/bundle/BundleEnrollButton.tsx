'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Modal from '@/components/ui/Modal';

interface BundleEnrollButtonProps {
    bundleId: string;
    price: number;
    bundleSlug: string;
}

type PaymentStep = 'idle' | 'method' | 'transfer' | 'verifying';

export default function BundleEnrollButton({ bundleId, price, bundleSlug }: BundleEnrollButtonProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [enrolled, setEnrolled] = useState(false);
    const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle');
    const [slipFile, setSlipFile] = useState<File | null>(null);
    const [slipPreview, setSlipPreview] = useState<string | null>(null);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [modal, setModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false, type: 'success', title: '', message: '',
    });

    const handleEnroll = async () => {
        if (!session) {
            router.push(`/login?callbackUrl=/bundles/${bundleSlug}`);
            return;
        }

        if (price > 0) {
            setPaymentStep('method');
            return;
        }

        // Free bundle
        setLoading(true);
        try {
            const res = await fetch('/api/bundles/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bundleId }),
            });
            const data = await res.json();

            if (res.ok) {
                setEnrolled(true);
                setModal({ isOpen: true, type: 'success', title: 'ลงทะเบียนสำเร็จ!', message: `คุณลงทะเบียน Bundle เรียบร้อยแล้ว (${data.totalEnrolled} คอร์ส)` });
            } else {
                setModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด', message: data.error || 'ไม่สามารถลงทะเบียนได้' });
            }
        } catch {
            setModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่' });
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setVerifyError('รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setVerifyError('ไฟล์ต้องมีขนาดไม่เกิน 5MB');
            return;
        }
        setSlipFile(file);
        setVerifyError(null);
        const reader = new FileReader();
        reader.onload = (ev) => setSlipPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleSlipVerify = async () => {
        if (!slipFile) return;
        setPaymentStep('verifying');
        setVerifyError(null);

        try {
            const formData = new FormData();
            formData.append('slip', slipFile);
            formData.append('bundleId', bundleId);
            formData.append('amount', price.toString());

            const res = await fetch('/api/bundles/slip/verify', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (data.success) {
                setEnrolled(true);
                setPaymentStep('idle');
                resetSlipState();
                setModal({ isOpen: true, type: 'success', title: 'ชำระเงินสำเร็จ!', message: `ตรวจสอบสลิปเรียบร้อย ลงทะเบียน ${data.enrolled?.length || 0} คอร์สสำเร็จ` });
            } else {
                setPaymentStep('transfer');
                setVerifyError(data.error || 'ไม่สามารถตรวจสอบสลิปได้ กรุณาลองใหม่');
            }
        } catch {
            setPaymentStep('transfer');
            setVerifyError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่');
        }
    };

    const resetSlipState = () => {
        setSlipFile(null);
        setSlipPreview(null);
        setVerifyError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleModalClose = () => {
        setModal({ ...modal, isOpen: false });
        if (modal.type === 'success') router.refresh();
    };

    // Already enrolled
    if (enrolled) {
        return (
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: '#dcfce7', color: '#16a34a', padding: '12px 24px',
                borderRadius: '10px', fontWeight: 600, fontSize: '0.9375rem',
            }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
                </svg>
                ลงทะเบียนสำเร็จ!
            </div>
        );
    }

    return (
        <>
            {/* Main Button */}
            <button
                onClick={handleEnroll}
                disabled={loading}
                style={{
                    background: price === 0
                        ? 'linear-gradient(135deg, #16a34a, #15803d)'
                        : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    color: 'white', border: 'none', padding: '14px 32px',
                    borderRadius: '10px', fontWeight: 700, fontSize: '1rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    transition: 'transform 0.15s, opacity 0.15s',
                    whiteSpace: 'nowrap',
                }}
            >
                {loading ? 'กำลังดำเนินการ...' : price === 0 ? 'ลงทะเบียน Bundle ฟรี' : `ซื้อ Bundle ฿${price.toLocaleString()}`}
            </button>

            {/* Payment Method Selection Modal */}
            {paymentStep === 'method' && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setPaymentStep('idle')}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
                    <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>เลือกช่องทางชำระเงิน</h3>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '24px' }}>
                            ยอดชำระ <strong style={{ color: '#7c3aed', fontSize: '1.1rem' }}>฿{price.toLocaleString()}</strong>
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* PromptPay */}
                            <button
                                onClick={() => setPaymentStep('transfer')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '16px',
                                    padding: '16px 20px', background: 'white', border: '2px solid #e2e8f0',
                                    borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                                    transition: 'all 0.2s', width: '100%',
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = '#faf5ff'; }}
                                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
                            >
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontSize: '1.25rem', flexShrink: 0,
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
                                    </svg>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>โอนเงิน / PromptPay</div>
                                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>โอนเงินแล้วแนบสลิป ตรวจสอบอัตโนมัติ</div>
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={() => setPaymentStep('idle')}
                            style={{ width: '100%', padding: '12px', marginTop: '16px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                            ยกเลิก
                        </button>
                    </div>
                </div>
            )}

            {/* Bank Transfer / Slip Upload Modal */}
            {(paymentStep === 'transfer' || paymentStep === 'verifying') && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => { if (paymentStep !== 'verifying') { setPaymentStep('idle'); resetSlipState(); } }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
                    <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>โอนเงินและแนบสลิป</h3>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '20px' }}>ยอดชำระ <strong style={{ color: '#7c3aed', fontSize: '1.1rem' }}>฿{price.toLocaleString()}</strong></p>

                        {/* Bank Info */}
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ข้อมูลสำหรับโอนเงิน</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.875rem' }}>ธนาคาร</span>
                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{process.env.NEXT_PUBLIC_BANK_NAME || 'กสิกรไทย (KBank)'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.875rem' }}>เลขบัญชี</span>
                                    <span style={{ fontWeight: 600, color: '#1e293b', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{process.env.NEXT_PUBLIC_BANK_ACCOUNT || 'xxx-x-xxxxx-x'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.875rem' }}>ชื่อบัญชี</span>
                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || 'MilerDev'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.875rem' }}>จำนวนเงิน</span>
                                    <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '1.1rem' }}>฿{price.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Upload Area */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                                แนบสลิปการโอนเงิน
                            </label>

                            {!slipPreview ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '32px',
                                        textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: '#f8fafc',
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                                >
                                    <svg style={{ width: '40px', height: '40px', color: '#94a3b8', margin: '0 auto 8px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>คลิกเพื่อเลือกรูปสลิป</p>
                                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '4px 0 0' }}>JPG, PNG, WEBP (ไม่เกิน 5MB)</p>
                                </div>
                            ) : (
                                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                    <img src={slipPreview} alt="สลิป" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', background: '#f8fafc' }} />
                                    <button
                                        onClick={() => resetSlipState()}
                                        style={{
                                            position: 'absolute', top: '8px', right: '8px',
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                        </div>

                        {/* Error */}
                        {verifyError && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#dc2626', fontSize: '0.875rem' }}>
                                {verifyError}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={handleSlipVerify}
                                disabled={!slipFile || paymentStep === 'verifying'}
                                style={{
                                    flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                                    background: !slipFile || paymentStep === 'verifying' ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)',
                                    color: 'white', fontWeight: 600, fontSize: '1rem',
                                    cursor: !slipFile || paymentStep === 'verifying' ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {paymentStep === 'verifying' ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                        กำลังตรวจสอบสลิป...
                                    </span>
                                ) : 'ตรวจสอบและชำระเงิน'}
                            </button>
                            <button
                                onClick={() => { setPaymentStep('method'); resetSlipState(); }}
                                disabled={paymentStep === 'verifying'}
                                style={{
                                    padding: '14px 20px', borderRadius: '10px', border: '1px solid #e2e8f0',
                                    background: 'white', color: '#64748b',
                                    cursor: paymentStep === 'verifying' ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
                                }}
                            >
                                กลับ
                            </button>
                        </div>
                    </div>

                    <style>{`
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )}

            <Modal
                isOpen={modal.isOpen}
                onClose={handleModalClose}
                type={modal.type}
                title={modal.title}
                buttonText={modal.type === 'success' ? 'เรียบร้อย' : 'ตกลง'}
            >
                {modal.message}
            </Modal>
        </>
    );
}
