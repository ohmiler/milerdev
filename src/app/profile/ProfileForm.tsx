'use client';

import { useState } from 'react';

interface User {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
}

interface ProfileFormProps {
    user: User;
}

export default function ProfileForm({ user }: ProfileFormProps) {
    const [formData, setFormData] = useState({
        name: user.name || '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage(null);

        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'อัพเดทโปรไฟล์สำเร็จ' });
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.error || 'เกิดข้อผิดพลาด' });
            }
        } catch {
            setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
                แก้ไขข้อมูล
            </h3>

            {message && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    background: message.type === 'success' ? '#dcfce7' : '#fef2f2',
                    color: message.type === 'success' ? '#16a34a' : '#dc2626',
                }}>
                    {message.text}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>
                        ชื่อ
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            outline: 'none',
                        }}
                        placeholder="ชื่อของคุณ"
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>
                        อีเมล
                    </label>
                    <input
                        type="email"
                        value={user.email}
                        disabled
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            background: '#f8fafc',
                            color: '#64748b',
                        }}
                    />
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                        อีเมลไม่สามารถเปลี่ยนแปลงได้
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{ alignSelf: 'flex-start', opacity: isSubmitting ? 0.7 : 1 }}
                >
                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </button>
            </div>
        </form>
    );
}
