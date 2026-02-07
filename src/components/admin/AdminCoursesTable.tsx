'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Course {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    price: string | null;
    status: string;
    thumbnailUrl: string | null;
    createdAt: Date | null;
    lessonCount: number;
    enrollmentCount: number;
}

interface AdminCoursesTableProps {
    courses: Course[];
}

export default function AdminCoursesTable({ courses }: AdminCoursesTableProps) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const filtered = courses.filter((course) => {
        const matchesSearch = !search ||
            course.title.toLowerCase().includes(search.toLowerCase()) ||
            course.slug.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const publishedCount = courses.filter(c => c.status === 'published').length;
    const draftCount = courses.filter(c => c.status === 'draft').length;

    return (
        <>
            {/* Filters */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '16px',
                flexWrap: 'wrap',
                alignItems: 'center',
            }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '400px' }}>
                    <svg
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '18px',
                            height: '18px',
                            color: '#94a3b8',
                        }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="ค้นหาคอร์ส..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 12px 10px 40px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            background: 'white',
                        }}
                    />
                </div>

                {/* Status Filter Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    background: '#f1f5f9',
                    borderRadius: '8px',
                    padding: '4px',
                }}>
                    {[
                        { value: 'all', label: 'ทั้งหมด', count: courses.length },
                        { value: 'published', label: 'เผยแพร่', count: publishedCount },
                        { value: 'draft', label: 'แบบร่าง', count: draftCount },
                    ].map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setStatusFilter(tab.value)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                background: statusFilter === tab.value ? 'white' : 'transparent',
                                color: statusFilter === tab.value ? '#1e293b' : '#64748b',
                                boxShadow: statusFilter === tab.value ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                transition: 'all 0.15s',
                            }}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                                คอร์ส
                            </th>
                            <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                                สถานะ
                            </th>
                            <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                                ราคา
                            </th>
                            <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                                บทเรียน
                            </th>
                            <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                                ผู้เรียน
                            </th>
                            <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                                การดำเนินการ
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((course) => (
                            <tr key={course.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '8px',
                                            background: course.thumbnailUrl
                                                ? `url(${course.thumbnailUrl}) center/cover`
                                                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                            flexShrink: 0,
                                        }} />
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                                                {course.title}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                /{course.slug}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: '50px',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        background: course.status === 'published' ? '#dcfce7' : '#fef3c7',
                                        color: course.status === 'published' ? '#16a34a' : '#d97706',
                                    }}>
                                        {course.status === 'published' ? 'เผยแพร่' : 'แบบร่าง'}
                                    </span>
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', color: '#1e293b' }}>
                                    {parseFloat(course.price || '0') === 0 ? (
                                        <span style={{ color: '#16a34a' }}>ฟรี</span>
                                    ) : (
                                        `฿${parseFloat(course.price || '0').toLocaleString()}`
                                    )}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', color: '#1e293b' }}>
                                    {course.lessonCount} บท
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', color: '#1e293b' }}>
                                    {course.enrollmentCount} คน
                                </td>
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <Link
                                            href={`/admin/courses/${course.id}/lessons`}
                                            style={{
                                                padding: '8px 12px',
                                                background: '#f1f5f9',
                                                color: '#475569',
                                                borderRadius: '6px',
                                                textDecoration: 'none',
                                                fontSize: '0.875rem',
                                            }}
                                        >
                                            บทเรียน
                                        </Link>
                                        <Link
                                            href={`/admin/courses/${course.id}/edit`}
                                            style={{
                                                padding: '8px 12px',
                                                background: '#eff6ff',
                                                color: '#2563eb',
                                                borderRadius: '6px',
                                                textDecoration: 'none',
                                                fontSize: '0.875rem',
                                            }}
                                        >
                                            แก้ไข
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filtered.length === 0 && (
                    <div style={{
                        padding: '60px 20px',
                        textAlign: 'center',
                        color: '#64748b',
                    }}>
                        {search || statusFilter !== 'all' ? (
                            <div>
                                <p>ไม่พบคอร์สที่ตรงกับตัวกรอง</p>
                                <button
                                    onClick={() => { setSearch(''); setStatusFilter('all'); }}
                                    style={{
                                        marginTop: '12px',
                                        padding: '8px 16px',
                                        background: '#f1f5f9',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: '#475569',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                    }}
                                >
                                    ล้างตัวกรอง
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p>ยังไม่มีคอร์ส</p>
                                <Link
                                    href="/admin/courses/new"
                                    style={{
                                        display: 'inline-block',
                                        marginTop: '16px',
                                        padding: '12px 20px',
                                        background: '#2563eb',
                                        color: 'white',
                                        borderRadius: '8px',
                                        textDecoration: 'none',
                                    }}
                                >
                                    สร้างคอร์สแรก
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
