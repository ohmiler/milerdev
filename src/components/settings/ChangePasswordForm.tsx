'use client';

import { useState } from 'react';

interface PasswordStrength {
    score: number;
    label: string;
    color: string;
}

function getPasswordStrength(password: string): PasswordStrength {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'อ่อน', color: '#ef4444' };
    if (score <= 4) return { score, label: 'ปานกลาง', color: '#f59e0b' };
    return { score, label: 'แข็งแรง', color: '#22c55e' };
}

export default function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const strength = getPasswordStrength(newPassword);
    const passwordsMatch = newPassword === confirmPassword;

    const resetForm = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        setSuccess(false);
        setShowCurrentPassword(false);
        setShowNewPassword(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!passwordsMatch) {
            setError('รหัสผ่านใหม่ไม่ตรงกัน');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                resetForm();
                setSuccess(true);
                // Auto close after 3 seconds
                setTimeout(() => {
                    setIsOpen(false);
                    setSuccess(false);
                }, 3000);
            } else {
                setError(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
            }
        } catch {
            setError('ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่');
        } finally {
            setLoading(false);
        }
    };

    // OAuth user — no password set
    if (!hasPassword) {
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg style={{ width: '20px', height: '20px', color: '#64748b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <div>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>เปลี่ยนรหัสผ่าน</div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>บัญชีนี้ใช้ Google เข้าสู่ระบบ</div>
                    </div>
                </div>
                <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', color: '#64748b' }}>
                    ไม่จำเป็น
                </span>
            </div>
        );
    }

    return (
        <div>
            {/* Toggle Button */}
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (isOpen) resetForm();
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    width: '100%',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                }}
                className="hover:bg-gray-100 transition-colors"
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg style={{ width: '20px', height: '20px', color: '#64748b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <div>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>เปลี่ยนรหัสผ่าน</div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>อัปเดตรหัสผ่านของคุณ</div>
                    </div>
                </div>
                <svg
                    style={{
                        width: '20px',
                        height: '20px',
                        color: '#94a3b8',
                        transition: 'transform 0.2s',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Expandable Form */}
            {isOpen && (
                <div style={{
                    marginTop: '12px',
                    padding: '20px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                }}>
                    {success ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '20px',
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: '#dcfce7',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 12px',
                            }}>
                                <svg style={{ width: '24px', height: '24px', color: '#16a34a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p style={{ fontWeight: 600, color: '#166534' }}>เปลี่ยนรหัสผ่านสำเร็จ!</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Error message */}
                            {error && (
                                <div style={{
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                }}>
                                    {error}
                                </div>
                            )}

                            {/* Current password */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151', fontSize: '0.875rem' }}>
                                    รหัสผ่านปัจจุบัน
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '10px 40px 10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            fontSize: '0.9375rem',
                                            outline: 'none',
                                            background: 'white',
                                        }}
                                        placeholder="กรอกรหัสผ่านปัจจุบัน"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#94a3b8',
                                            padding: '4px',
                                        }}
                                    >
                                        {showCurrentPassword ? (
                                            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* New password */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151', fontSize: '0.875rem' }}>
                                    รหัสผ่านใหม่
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '10px 40px 10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            fontSize: '0.9375rem',
                                            outline: 'none',
                                            background: 'white',
                                        }}
                                        placeholder="กรอกรหัสผ่านใหม่"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#94a3b8',
                                            padding: '4px',
                                        }}
                                    >
                                        {showNewPassword ? (
                                            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                {/* Password strength */}
                                {newPassword && (
                                    <div style={{ marginTop: '8px' }}>
                                        <div style={{
                                            display: 'flex',
                                            gap: '4px',
                                            marginBottom: '4px',
                                        }}>
                                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        flex: 1,
                                                        height: '4px',
                                                        borderRadius: '2px',
                                                        background: i <= strength.score ? strength.color : '#e2e8f0',
                                                        transition: 'background 0.2s',
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: strength.color, fontWeight: 500 }}>
                                            ความแข็งแรง: {strength.label}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Confirm password */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151', fontSize: '0.875rem' }}>
                                    ยืนยันรหัสผ่านใหม่
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: `1px solid ${confirmPassword && !passwordsMatch ? '#ef4444' : '#d1d5db'}`,
                                        borderRadius: '8px',
                                        fontSize: '0.9375rem',
                                        outline: 'none',
                                        background: 'white',
                                    }}
                                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                                />
                                {confirmPassword && !passwordsMatch && (
                                    <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                                        รหัสผ่านไม่ตรงกัน
                                    </span>
                                )}
                            </div>

                            {/* Submit */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        resetForm();
                                    }}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'white',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        color: '#374151',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                    }}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !currentPassword || !newPassword || !confirmPassword || !passwordsMatch}
                                    className="btn btn-primary"
                                    style={{
                                        padding: '10px 20px',
                                        fontSize: '0.875rem',
                                        opacity: (loading || !currentPassword || !newPassword || !confirmPassword || !passwordsMatch) ? 0.6 : 1,
                                        cursor: (loading || !currentPassword || !newPassword || !confirmPassword || !passwordsMatch) ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {loading ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
