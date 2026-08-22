'use client';

import { useState, useEffect } from 'react';
import ImageUpload from '@/components/admin/ImageUpload';

interface Banner {
    id: string;
    title: string;
    imageUrl: string;
    linkUrl: string;
    orderIndex: number;
    isActive: boolean;
    createdAt: string | null;
}

const defaultForm = {
    title: '',
    imageUrl: '',
    linkUrl: '',
    orderIndex: 0,
    isActive: true,
};

export default function AdminAffiliateBannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchBanners = () => {
        setLoading(true);
        fetch('/api/admin/affiliate-banners')
            .then(r => r.json())
            .then(d => setBanners(d.banners || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchBanners(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const url = editingId
                ? `/api/admin/affiliate-banners/${editingId}`
                : '/api/admin/affiliate-banners';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'เกิดข้อผิดพลาด');
            }

            setShowForm(false);
            setEditingId(null);
            setForm(defaultForm);
            fetchBanners();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (banner: Banner) => {
        setForm({
            title: banner.title,
            imageUrl: banner.imageUrl,
            linkUrl: banner.linkUrl,
            orderIndex: banner.orderIndex,
            isActive: banner.isActive,
        });
        setEditingId(banner.id);
        setShowForm(true);
        setError('');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('ต้องการลบ Banner นี้?')) return;
        setDeleting(id);
        try {
            await fetch(`/api/admin/affiliate-banners/${id}`, { method: 'DELETE' });
            fetchBanners();
        } catch {
            // ignore
        } finally {
            setDeleting(null);
        }
    };

    const handleToggleActive = async (banner: Banner) => {
        await fetch(`/api/admin/affiliate-banners/${banner.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !banner.isActive }),
        });
        fetchBanners();
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px 14px',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        fontSize: '0.9375rem',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontWeight: 600,
        marginBottom: '6px',
        color: 'var(--foreground)',
        fontSize: '0.875rem',
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
                        Affiliate Banners
                    </h1>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                        จัดการ Banner โฆษณาสินค้าและบริการแนะนำ
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultForm); setError(''); }}
                    style={{
                        padding: '10px 20px',
                        background: 'var(--primary)',
                        color: 'var(--primary-foreground)',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    + เพิ่ม Banner
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div style={{
                    background: 'var(--card)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    padding: '24px',
                    marginBottom: '24px',
                }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>
                        {editingId ? 'แก้ไข Banner' : 'เพิ่ม Banner ใหม่'}
                    </h2>

                    {error && (
                        <div style={{ background: 'var(--color-error-soft)', color: 'var(--color-error-strong)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={labelStyle}>ชื่อ Banner *</label>
                            <input
                                type="text"
                                required
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                style={inputStyle}
                                placeholder="เช่น Lention USB-C Hub"
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>รูปภาพ Banner (1200 x 500 px)*</label>
                            <ImageUpload
                                value={form.imageUrl}
                                onChange={(url: string) => setForm({ ...form, imageUrl: url })}
                                folder="affiliate-banners"
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>ลิงก์ Affiliate *</label>
                            <input
                                type="url"
                                required
                                value={form.linkUrl}
                                onChange={e => setForm({ ...form, linkUrl: e.target.value })}
                                style={inputStyle}
                                placeholder="https://example.com/affiliate-link"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={labelStyle}>ลำดับ</label>
                                <input
                                    type="number"
                                    value={form.orderIndex}
                                    onChange={e => setForm({ ...form, orderIndex: parseInt(e.target.value) || 0 })}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>สถานะ</label>
                                <select
                                    value={form.isActive ? 'active' : 'inactive'}
                                    onChange={e => setForm({ ...form, isActive: e.target.value === 'active' })}
                                    style={inputStyle}
                                >
                                    <option value="active">แสดง</option>
                                    <option value="inactive">ซ่อน</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm); }}
                                style={{
                                    padding: '10px 20px',
                                    background: 'var(--muted)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                }}
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    padding: '10px 20px',
                                    background: 'var(--primary)',
                                    color: 'var(--primary-foreground)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    opacity: saving ? 0.7 : 1,
                                }}
                            >
                                {saving ? 'กำลังบันทึก...' : editingId ? 'อัพเดท' : 'สร้าง'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Banner List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-foreground)' }}>กำลังโหลด...</div>
            ) : banners.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    background: 'var(--card)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🖼️</div>
                    <h3 style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '8px' }}>ยังไม่มี Banner</h3>
                    <p style={{ color: 'var(--muted-foreground)' }}>เพิ่ม Banner แรกเพื่อโปรโมทสินค้าและบริการ</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {banners.map(banner => (
                        <div
                            key={banner.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                background: 'var(--card)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                padding: '16px',
                                flexWrap: 'wrap',
                            }}
                        >
                            {/* Preview image */}
                            <img
                                src={banner.imageUrl}
                                alt={banner.title}
                                style={{
                                    width: '160px',
                                    height: '90px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                    background: 'var(--muted)',
                                    flexShrink: 0,
                                }}
                            />

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <div style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '4px' }}>
                                    {banner.title}
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                                    <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                                        {banner.linkUrl.length > 50 ? banner.linkUrl.slice(0, 50) + '...' : banner.linkUrl}
                                    </a>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '50px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        background: banner.isActive ? 'var(--color-success-soft)' : 'var(--muted)',
                                        color: banner.isActive ? 'var(--color-success-strong)' : 'var(--muted-foreground)',
                                    }}>
                                        {banner.isActive ? 'แสดง' : 'ซ่อน'}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                        ลำดับ: {banner.orderIndex}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                <button
                                    onClick={() => handleToggleActive(banner)}
                                    style={{
                                        padding: '6px 12px',
                                        background: banner.isActive ? 'var(--color-warning-soft)' : 'var(--color-success-soft)',
                                        color: banner.isActive ? 'var(--color-warning-strong)' : 'var(--color-success-strong)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                    }}
                                >
                                    {banner.isActive ? 'ซ่อน' : 'แสดง'}
                                </button>
                                <button
                                    onClick={() => handleEdit(banner)}
                                    style={{
                                        padding: '6px 12px',
                                        background: 'var(--secondary)',
                                        color: 'var(--primary)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                    }}
                                >
                                    แก้ไข
                                </button>
                                <button
                                    onClick={() => handleDelete(banner.id)}
                                    disabled={deleting === banner.id}
                                    style={{
                                        padding: '6px 12px',
                                        background: 'var(--color-error-soft)',
                                        color: 'var(--color-error-strong)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        opacity: deleting === banner.id ? 0.5 : 1,
                                    }}
                                >
                                    ลบ
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
