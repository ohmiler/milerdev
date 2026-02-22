'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false });

interface DocGroup {
    id: string;
    title: string;
}

export default function EditDocPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [groups, setGroups] = useState<DocGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [slugManuallyEdited] = useState(true);

    const [form, setForm] = useState({
        title: '',
        slug: '',
        groupId: '',
        content: '',
        status: 'draft',
        orderIndex: 0,
    });

    useEffect(() => {
        Promise.all([
            fetch(`/api/admin/docs/${id}`).then(r => r.json()),
            fetch('/api/admin/docs/groups').then(r => r.json()),
        ])
            .then(([docData, groupsData]) => {
                if (docData.error) throw new Error(docData.error);
                setGroups(Array.isArray(groupsData) ? groupsData : []);
                setForm({
                    title: docData.title,
                    slug: docData.slug,
                    groupId: docData.groupId,
                    content: docData.content || '',
                    status: docData.status,
                    orderIndex: docData.orderIndex,
                });
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/docs/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
            router.push('/admin/docs');
        } catch (err: any) {
            setError(err.message);
            setSaving(false);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>กำลังโหลด...</div>;
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                <Link href="/admin/docs" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ← กลับ
                </Link>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>แก้ไขบทความ</h1>
            </div>

            {error && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#ef4444', borderRadius: '8px', marginBottom: '20px', fontSize: '0.875rem' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
                    {/* Left: main content */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>ชื่อบทความ *</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    required
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9375rem', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Slug</label>
                                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                    <span style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '0.875rem', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>/docs/</span>
                                    <input
                                        type="text"
                                        value={form.slug}
                                        onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                                        style={{ flex: 1, padding: '10px 12px', border: 'none', background: 'transparent', fontSize: '0.875rem', outline: 'none' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '12px' }}>เนื้อหา</label>
                            <RichTextEditor
                                content={form.content}
                                onChange={(val: string) => setForm(f => ({ ...f, content: val }))}
                            />
                        </div>
                    </div>

                    {/* Right: settings */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px' }}>
                            <button
                                type="submit"
                                disabled={saving}
                                style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9375rem', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, marginBottom: '8px' }}
                            >
                                {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                            </button>
                            {form.status === 'published' && (
                                <Link
                                    href={`/docs/${form.slug}`}
                                    target="_blank"
                                    style={{ display: 'block', textAlign: 'center', padding: '8px', color: '#16a34a', textDecoration: 'none', fontSize: '0.875rem' }}
                                >
                                    ดูหน้าสาธารณะ ↗
                                </Link>
                            )}
                        </div>

                        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>หมวดหมู่ *</label>
                                <select
                                    value={form.groupId}
                                    onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))}
                                    required
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', background: 'white', boxSizing: 'border-box' }}
                                >
                                    {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>สถานะ</label>
                                <select
                                    value={form.status}
                                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', background: 'white', boxSizing: 'border-box' }}
                                >
                                    <option value="draft">แบบร่าง</option>
                                    <option value="published">เผยแพร่</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>ลำดับ (น้อยกว่า = ขึ้นก่อน)</label>
                                <input
                                    type="number"
                                    value={form.orderIndex}
                                    onChange={e => setForm(f => ({ ...f, orderIndex: parseInt(e.target.value) || 0 }))}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
