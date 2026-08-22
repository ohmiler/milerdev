'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ImageUpload from '@/components/admin/ImageUpload';

interface CourseOption {
    id: string;
    title: string;
    price: string;
    status: string;
}

interface BundleCourse {
    courseId: string;
    courseTitle: string;
    coursePrice: string;
}

interface Bundle {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnailUrl: string | null;
    price: string;
    status: string;
    courses: BundleCourse[];
    courseCount: number;
    totalOriginalPrice: number;
    discount: number;
    createdAt: string | null;
}

const defaultForm = {
    title: '',
    slug: '',
    description: '',
    price: '',
    status: 'draft' as string,
    thumbnailUrl: '',
    courseIds: [] as string[],
};

export default function AdminBundlesPage() {
    const [bundlesList, setBundlesList] = useState<Bundle[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchBundles = () => {
        setLoading(true);
        fetch('/api/admin/bundles')
            .then(r => r.json())
            .then(d => setBundlesList(d.bundles || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchBundles();
        fetch('/api/admin/courses')
            .then(r => r.json())
            .then(d => setCourseOptions(d.courses || []))
            .catch(console.error);
    }, []);

    const handleEdit = (bundle: Bundle) => {
        setEditingId(bundle.id);
        setForm({
            title: bundle.title,
            slug: bundle.slug,
            description: bundle.description || '',
            price: bundle.price,
            status: bundle.status,
            thumbnailUrl: bundle.thumbnailUrl || '',
            courseIds: bundle.courses.map(c => c.courseId),
        });
        setShowForm(true);
        setError('');
    };

    const handleNew = () => {
        setEditingId(null);
        setForm(defaultForm);
        setShowForm(true);
        setError('');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('ต้องการลบ Bundle นี้หรือไม่?')) return;
        setDeleting(id);
        try {
            const res = await fetch(`/api/admin/bundles/${id}`, { method: 'DELETE' });
            if (res.ok) fetchBundles();
        } catch (err) {
            console.error(err);
        } finally {
            setDeleting(null);
        }
    };

    const toggleCourse = (courseId: string) => {
        setForm(prev => ({
            ...prev,
            courseIds: prev.courseIds.includes(courseId)
                ? prev.courseIds.filter(id => id !== courseId)
                : [...prev.courseIds, courseId],
        }));
    };

    const selectedCoursesTotal = form.courseIds.reduce((sum, id) => {
        const c = courseOptions.find(o => o.id === id);
        return sum + parseFloat(c?.price || '0');
    }, 0);

    const discountPercent = selectedCoursesTotal > 0 && parseFloat(form.price) > 0
        ? Math.round((1 - parseFloat(form.price) / selectedCoursesTotal) * 100)
        : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const url = editingId ? `/api/admin/bundles/${editingId}` : '/api/admin/bundles';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'เกิดข้อผิดพลาด');
                return;
            }

            setShowForm(false);
            setEditingId(null);
            setForm(defaultForm);
            fetchBundles();
        } catch {
            setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setSaving(false);
        }
    };

    const cardStyle: React.CSSProperties = {
        background: 'var(--card)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        padding: '24px',
    };

    const btnPrimary: React.CSSProperties = {
        background: 'var(--primary)',
        color: 'var(--primary-foreground)',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '8px',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: '0.875rem',
    };

    const btnSecondary: React.CSSProperties = {
        background: 'var(--muted)',
        color: 'var(--muted-foreground)',
        border: '1px solid var(--border)',
        padding: '10px 20px',
        borderRadius: '8px',
        fontWeight: 500,
        cursor: 'pointer',
        fontSize: '0.875rem',
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px 14px',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        fontSize: '0.9375rem',
        outline: 'none',
        boxSizing: 'border-box',
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
                        จัดการ Bundle
                    </h1>
                    <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: '0.875rem' }}>
                        รวมหลายคอร์สเป็นชุดราคาพิเศษ
                    </p>
                </div>
                {!showForm && (
                    <button onClick={handleNew} style={btnPrimary}>
                        + สร้าง Bundle ใหม่
                    </button>
                )}
            </div>

            {/* Form */}
            {showForm && (
                <div style={{ ...cardStyle, marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '20px', color: 'var(--foreground)' }}>
                        {editingId ? 'แก้ไข Bundle' : 'สร้าง Bundle ใหม่'}
                    </h2>

                    {error && (
                        <div style={{ background: 'var(--color-error-soft)', color: 'var(--color-error-strong)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}>
                                    ชื่อ Bundle *
                                </label>
                                <input
                                    style={inputStyle}
                                    value={form.title}
                                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="เช่น Full-Stack Developer Bundle"
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}>
                                    Slug
                                </label>
                                <input
                                    style={inputStyle}
                                    value={form.slug}
                                    onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
                                    placeholder="จะสร้างอัตโนมัติถ้าไม่ระบุ"
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}>
                                รายละเอียด
                            </label>
                            <textarea
                                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                                value={form.description}
                                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="อธิบาย Bundle นี้..."
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}>
                                    ราคา Bundle (บาท) *
                                </label>
                                <input
                                    type="number"
                                    style={inputStyle}
                                    value={form.price}
                                    onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                                    placeholder="0"
                                    required
                                    min="0"
                                    step="0.01"
                                />
                                {selectedCoursesTotal > 0 && parseFloat(form.price) > 0 && (
                                    <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: discountPercent > 0 ? 'var(--color-success-strong)' : 'var(--color-error-strong)' }}>
                                        ราคารวมปกติ: ฿{selectedCoursesTotal.toLocaleString()} → ลด {discountPercent}%
                                    </p>
                                )}
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}>
                                    สถานะ
                                </label>
                                <select
                                    style={inputStyle}
                                    value={form.status}
                                    onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                                >
                                    <option value="draft">แบบร่าง</option>
                                    <option value="published">เผยแพร่</option>
                                    <option value="archived">เก็บถาวร</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}>
                                รูปปก Bundle (แนะนำ 1200 × 630 px)
                            </label>
                            <ImageUpload
                                value={form.thumbnailUrl}
                                onChange={(url) => setForm(prev => ({ ...prev, thumbnailUrl: url }))}
                                folder="bundles"
                            />
                        </div>

                        {/* Course Picker */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: 'var(--foreground)', fontSize: '0.875rem' }}>
                                เลือกคอร์สใน Bundle * (อย่างน้อย 2 คอร์ส)
                            </label>
                            <div style={{
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                maxHeight: '300px',
                                overflowY: 'auto',
                            }}>
                                {courseOptions.map((course) => {
                                    const isSelected = form.courseIds.includes(course.id);
                                    return (
                                        <div
                                            key={course.id}
                                            onClick={() => toggleCourse(course.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 16px',
                                                borderBottom: '1px solid var(--muted)',
                                                cursor: 'pointer',
                                                background: isSelected ? 'var(--secondary)' : 'white',
                                                transition: 'background 0.15s',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '4px',
                                                    border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border)',
                                                    background: isSelected ? 'var(--primary)' : 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    {isSelected && (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary-foreground)" strokeWidth="3">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 500, color: 'var(--foreground)', fontSize: '0.9375rem' }}>
                                                        {course.title}
                                                    </div>
                                                    <div style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
                                                        {course.status === 'published' ? '✅ เผยแพร่' : '📝 แบบร่าง'}
                                                    </div>
                                                </div>
                                            </div>
                                            <span style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.875rem' }}>
                                                ฿{parseFloat(course.price).toLocaleString()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
                                เลือกแล้ว {form.courseIds.length} คอร์ส | ราคารวมปกติ: ฿{selectedCoursesTotal.toLocaleString()}
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }} disabled={saving}>
                                {saving ? 'กำลังบันทึก...' : editingId ? 'อัปเดต Bundle' : 'สร้าง Bundle'}
                            </button>
                            <button
                                type="button"
                                style={btnSecondary}
                                onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm); }}
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Bundle List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted-foreground)' }}>กำลังโหลด...</div>
            ) : bundlesList.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 24px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
                    <h3 style={{ fontWeight: 600, color: 'var(--foreground)', margin: '0 0 8px' }}>ยังไม่มี Bundle</h3>
                    <p style={{ color: 'var(--muted-foreground)', margin: '0 0 20px', fontSize: '0.9375rem' }}>สร้าง Bundle แรกเพื่อขายคอร์สรวมในราคาพิเศษ</p>
                    {!showForm && <button onClick={handleNew} style={btnPrimary}>+ สร้าง Bundle ใหม่</button>}
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {bundlesList.map((bundle) => (
                        <div key={bundle.id} style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>
                                            {bundle.title}
                                        </h3>
                                        <span style={{
                                            padding: '2px 10px',
                                            borderRadius: '50px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            ...(bundle.status === 'published'
                                                ? { background: 'var(--color-success-soft)', color: 'var(--color-success-strong)' }
                                                : bundle.status === 'archived'
                                                    ? { background: 'var(--muted)', color: 'var(--muted-foreground)' }
                                                    : { background: 'var(--color-warning-soft)', color: 'var(--color-warning-strong)' }),
                                        }}>
                                            {bundle.status === 'published' ? 'เผยแพร่' : bundle.status === 'archived' ? 'เก็บถาวร' : 'แบบร่าง'}
                                        </span>
                                    </div>

                                    {bundle.description && (
                                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: '0 0 12px', lineHeight: 1.5 }}>
                                            {bundle.description}
                                        </p>
                                    )}

                                    {/* Courses in bundle */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                                        {bundle.courses.map((c) => (
                                            <span key={c.courseId} style={{
                                                background: 'var(--secondary)',
                                                color: 'var(--primary)',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.8125rem',
                                                fontWeight: 500,
                                            }}>
                                                {c.courseTitle}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Pricing */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9375rem' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--foreground)', fontSize: '1.125rem' }}>
                                            ฿{parseFloat(bundle.price).toLocaleString()}
                                        </span>
                                        <span style={{ textDecoration: 'line-through', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                                            ฿{bundle.totalOriginalPrice.toLocaleString()}
                                        </span>
                                        {bundle.discount > 0 && (
                                            <span style={{ background: 'var(--color-success-soft)', color: 'var(--color-success-strong)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8125rem', fontWeight: 600 }}>
                                                ลด {bundle.discount}%
                                            </span>
                                        )}
                                        <span style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem' }}>
                                            • {bundle.courseCount} คอร์ส
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    <Link href={`/bundles/${bundle.slug}`} target="_blank" style={{
                                        ...btnSecondary,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        fontSize: '0.8125rem',
                                        padding: '8px 14px',
                                    }}>
                                        ดู
                                    </Link>
                                    <button onClick={() => handleEdit(bundle)} style={{ ...btnSecondary, fontSize: '0.8125rem', padding: '8px 14px' }}>
                                        แก้ไข
                                    </button>
                                    <button
                                        onClick={() => handleDelete(bundle.id)}
                                        disabled={deleting === bundle.id}
                                        style={{
                                            ...btnSecondary,
                                            color: 'var(--color-error-strong)',
                                            fontSize: '0.8125rem',
                                            padding: '8px 14px',
                                            opacity: deleting === bundle.id ? 0.5 : 1,
                                        }}
                                    >
                                        ลบ
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
