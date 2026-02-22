'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface DocGroup {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    orderIndex: number;
}

interface Doc {
    id: string;
    title: string;
    slug: string;
    status: string;
    orderIndex: number;
    viewCount: number;
    group: DocGroup;
    createdAt: string;
}

export default function AdminDocsPage() {
    const [docs, setDocs] = useState<Doc[]>([]);
    const [groups, setGroups] = useState<DocGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');

    // Group modal state
    const [groupModalOpen, setGroupModalOpen] = useState(false);
    const [groupForm, setGroupForm] = useState({ id: '', title: '', slug: '', description: '', orderIndex: 0 });
    const [groupError, setGroupError] = useState('');
    const [groupSaving, setGroupSaving] = useState(false);
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([
            fetch('/api/admin/docs').then(r => r.json()),
            fetch('/api/admin/docs/groups').then(r => r.json()),
        ])
            .then(([docsData, groupsData]) => {
                setDocs(Array.isArray(docsData) ? docsData : []);
                setGroups(Array.isArray(groupsData) ? groupsData : []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleToggleStatus = async (doc: Doc) => {
        const newStatus = doc.status === 'published' ? 'draft' : 'published';
        try {
            const res = await fetch(`/api/admin/docs/${doc.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: doc.title, slug: doc.slug, groupId: doc.group.id, status: newStatus, orderIndex: doc.orderIndex }),
            });
            if (res.ok) {
                setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: newStatus } : d));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteDoc = async (id: string, title: string) => {
        if (!confirm(`ลบบทความ "${title}" ใช่ไหม? ไม่สามารถกู้คืนได้`)) return;
        try {
            await fetch(`/api/admin/docs/${id}`, { method: 'DELETE' });
            setDocs(prev => prev.filter(d => d.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const openNewGroupModal = () => {
        setGroupForm({ id: '', title: '', slug: '', description: '', orderIndex: 0 });
        setGroupError('');
        setSlugManuallyEdited(false);
        setGroupModalOpen(true);
    };

    const openEditGroupModal = (group: DocGroup) => {
        setGroupForm({ id: group.id, title: group.title, slug: group.slug, description: group.description || '', orderIndex: group.orderIndex });
        setGroupError('');
        setSlugManuallyEdited(true);
        setGroupModalOpen(true);
    };

    const handleDeleteGroup = async (id: string, title: string) => {
        if (!confirm(`ลบหมวดหมู่ "${title}" ใช่ไหม? บทความทั้งหมดในหมวดหมู่นี้จะถูกลบด้วย`)) return;
        try {
            const res = await fetch(`/api/admin/docs/groups/${id}`, { method: 'DELETE' });
            if (res.ok) load();
        } catch (err) {
            console.error(err);
        }
    };

    const handleGroupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGroupSaving(true);
        setGroupError('');
        try {
            const url = groupForm.id ? `/api/admin/docs/groups/${groupForm.id}` : '/api/admin/docs/groups';
            const method = groupForm.id ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(groupForm),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
            setGroupModalOpen(false);
            load();
        } catch (err: any) {
            setGroupError(err.message);
        } finally {
            setGroupSaving(false);
        }
    };

    const generateSlug = (title: string) =>
        title.toLowerCase().replace(/[^a-z0-9\s-]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 200);

    const filtered = docs.filter(d => {
        const matchStatus = statusFilter === 'all' || d.status === statusFilter;
        const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.slug.includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const publishedCount = docs.filter(d => d.status === 'published').length;
    const draftCount = docs.filter(d => d.status === 'draft').length;

    return (
        <div>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>
                    คลังความรู้ ({docs.length})
                </h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={openNewGroupModal}
                        style={{
                            padding: '10px 16px', background: 'white', color: '#475569',
                            border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem',
                        }}
                    >
                        + หมวดหมู่ใหม่
                    </button>
                    <Link
                        href="/admin/docs/new"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            padding: '10px 16px', background: '#2563eb', color: 'white',
                            borderRadius: '8px', textDecoration: 'none', fontWeight: 500, fontSize: '0.875rem',
                        }}
                    >
                        + บทความใหม่
                    </Link>
                </div>
            </div>

            {/* Categories Section */}
            {groups.length > 0 && (
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>หมวดหมู่ ({groups.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '16px 20px' }}>
                        {groups.map(group => (
                            <div key={group.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem' }}>
                                <span style={{ color: '#475569', fontWeight: 500 }}>{group.title}</span>
                                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>#{group.orderIndex}</span>
                                <button onClick={() => openEditGroupModal(group)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px 4px', fontSize: '0.75rem' }}>✏️</button>
                                <button onClick={() => handleDeleteGroup(group.id, group.title)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 4px', fontSize: '0.75rem' }}>🗑</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '8px', padding: '4px', flexShrink: 0 }}>
                    {[
                        { value: 'all', label: 'ทั้งหมด', count: docs.length },
                        { value: 'published', label: 'เผยแพร่', count: publishedCount },
                        { value: 'draft', label: 'แบบร่าง', count: draftCount },
                    ].map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setStatusFilter(tab.value)}
                            style={{
                                padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
                                background: statusFilter === tab.value ? 'white' : 'transparent',
                                color: statusFilter === tab.value ? '#1e293b' : '#64748b',
                                boxShadow: statusFilter === tab.value ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                            }}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="ค้นหาชื่อบทความหรือ slug..."
                    style={{ flex: 1, minWidth: '200px', padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', background: 'white', color: '#1e293b' }}
                />
            </div>

            {/* Docs List */}
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>กำลังโหลด...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                        {docs.length === 0 ? (
                            <div>
                                <p style={{ marginBottom: '12px' }}>ยังไม่มีบทความ</p>
                                {groups.length === 0 && <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '16px' }}>เริ่มต้นด้วยการสร้างหมวดหมู่ก่อน</p>}
                                <Link href="/admin/docs/new" style={{ padding: '10px 20px', background: '#2563eb', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem' }}>
                                    เขียนบทความแรก
                                </Link>
                            </div>
                        ) : (
                            <p>ไม่พบบทความที่ตรงกับตัวกรอง</p>
                        )}
                    </div>
                ) : (
                    <div>
                        {filtered.map(doc => (
                            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                {/* Group badge */}
                                <div style={{ flexShrink: 0, width: '120px' }}>
                                    <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: '#f1f5f9', color: '#64748b', borderRadius: '4px', fontWeight: 500 }}>
                                        {doc.group?.title ?? '—'}
                                    </span>
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {doc.title}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '12px' }}>
                                        <span>/docs/{doc.slug}</span>
                                        <span>อ่าน {doc.viewCount.toLocaleString()} ครั้ง</span>
                                        <span>ลำดับ {doc.orderIndex}</span>
                                    </div>
                                </div>

                                {/* Status toggle */}
                                <button
                                    onClick={() => handleToggleStatus(doc)}
                                    title={doc.status === 'published' ? 'คลิกเพื่อเปลี่ยนเป็นแบบร่าง' : 'คลิกเพื่อเผยแพร่'}
                                    style={{
                                        padding: '4px 12px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 500,
                                        border: '1px solid', cursor: 'pointer', flexShrink: 0,
                                        background: doc.status === 'published' ? '#dcfce7' : '#fef3c7',
                                        borderColor: doc.status === 'published' ? '#86efac' : '#fcd34d',
                                        color: doc.status === 'published' ? '#16a34a' : '#d97706',
                                    }}
                                >
                                    {doc.status === 'published' ? '✓ เผยแพร่' : 'แบบร่าง'}
                                </button>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                    {doc.status === 'published' && (
                                        <Link href={`/docs/${doc.slug}`} target="_blank" title="ดูบนเว็บ"
                                            style={{ padding: '7px 10px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '6px', textDecoration: 'none', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                            ดู
                                        </Link>
                                    )}
                                    <Link href={`/admin/docs/${doc.id}/edit`}
                                        style={{ padding: '7px 14px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', textDecoration: 'none', fontSize: '0.8125rem' }}>
                                        แก้ไข
                                    </Link>
                                    <button onClick={() => handleDeleteDoc(doc.id, doc.title)}
                                        style={{ padding: '7px 10px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem' }}>
                                        ลบ
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Group Modal */}
            {groupModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '28px', borderRadius: '16px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: '20px' }}>
                            {groupForm.id ? 'แก้ไขหมวดหมู่' : 'หมวดหมู่ใหม่'}
                        </h3>
                        {groupError && (
                            <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
                                {groupError}
                            </div>
                        )}
                        <form onSubmit={handleGroupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>ชื่อหมวดหมู่ *</label>
                                <input
                                    type="text"
                                    value={groupForm.title}
                                    onChange={e => {
                                        const title = e.target.value;
                                        setGroupForm(f => ({
                                            ...f,
                                            title,
                                            slug: slugManuallyEdited ? f.slug : generateSlug(title),
                                        }));
                                    }}
                                    required
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Slug</label>
                                <input
                                    type="text"
                                    value={groupForm.slug}
                                    onChange={e => { setGroupForm(f => ({ ...f, slug: e.target.value })); setSlugManuallyEdited(true); }}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>คำอธิบาย</label>
                                <textarea
                                    value={groupForm.description}
                                    onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))}
                                    rows={2}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>ลำดับ (น้อยกว่า = ขึ้นก่อน)</label>
                                <input
                                    type="number"
                                    value={groupForm.orderIndex}
                                    onChange={e => setGroupForm(f => ({ ...f, orderIndex: parseInt(e.target.value) || 0 }))}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                                <button type="button" onClick={() => setGroupModalOpen(false)}
                                    style={{ padding: '10px 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem', color: '#64748b' }}>
                                    ยกเลิก
                                </button>
                                <button type="submit" disabled={groupSaving}
                                    style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem', opacity: groupSaving ? 0.7 : 1 }}>
                                    {groupSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
