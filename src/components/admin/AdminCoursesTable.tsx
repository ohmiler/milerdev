'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Course {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    price: string | null;
    promoPrice: string | null;
    promoStartsAt: Date | null;
    promoEndsAt: Date | null;
    status: string;
    thumbnailUrl: string | null;
    createdAt: Date | null;
    lessonCount: number;
    enrollmentCount: number;
}

interface AdminCoursesTableProps {
    courses: Course[];
}

const PER_PAGE_OPTIONS = [10, 25, 50];

function normalizeUrl(url: string | null): string | null {
    if (!url || url.trim() === '') return null;
    if (url.startsWith('http')) return url;
    return `https://${url}`;
}

function formatDate(value: Date | null) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('th-TH', {
        month: 'short',
        day: 'numeric',
    });
}

export default function AdminCoursesTable({ courses }: AdminCoursesTableProps) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    const filtered = courses.filter((course) => {
        const matchesSearch = !search ||
            course.title.toLowerCase().includes(search.toLowerCase()) ||
            course.slug.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filtered.length / perPage);
    const paginatedCourses = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

    const publishedCount = courses.filter(c => c.status === 'published').length;
    const draftCount = courses.filter(c => c.status === 'draft').length;
    const noLessonCount = filtered.filter(c => Number(c.lessonCount || 0) === 0).length;
    const withStudentsCount = filtered.filter(c => Number(c.enrollmentCount || 0) > 0).length;

    return (
        <>
            {/* Filters */}
            <div style={{ display: 'grid', gap: '14px', marginBottom: '16px' }}>
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '420px' }}>
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
                            placeholder="ค้นหาจากชื่อคอร์สหรือ slug"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 40px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '0.875rem',
                                background: 'white',
                            }}
                        />
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: '#f1f5f9',
                        borderRadius: '10px',
                        padding: '4px',
                        flexWrap: 'wrap',
                    }}>
                        {[
                            { value: 'all', label: 'ทั้งหมด', count: courses.length },
                            { value: 'published', label: 'เผยแพร่', count: publishedCount },
                            { value: 'draft', label: 'แบบร่าง', count: draftCount },
                        ].map((tab) => (
                            <button
                                key={tab.value}
                                onClick={() => { setStatusFilter(tab.value); setCurrentPage(1); }}
                                style={{
                                    padding: '7px 14px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
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

                <div style={{
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    color: '#64748b',
                    fontSize: '0.8rem',
                }}>
                    <span style={{ padding: '6px 10px', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}>
                        ผลลัพธ์ {filtered.length} คอร์ส
                    </span>
                    <span style={{ padding: '6px 10px', borderRadius: '999px', background: '#fef2f2', color: '#dc2626', fontWeight: 600 }}>
                        ไม่มีบทเรียน {noLessonCount}
                    </span>
                    <span style={{ padding: '6px 10px', borderRadius: '999px', background: '#f5f3ff', color: '#7c3aed', fontWeight: 600 }}>
                        มีผู้เรียน {withStudentsCount}
                    </span>
                    {(search || statusFilter !== 'all') && (
                        <button
                            onClick={() => { setSearch(''); setStatusFilter('all'); setCurrentPage(1); }}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#2563eb',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: 0,
                            }}
                        >
                            ล้างตัวกรอง
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div style={{
                background: 'white',
                borderRadius: '18px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)',
                overflow: 'hidden',
            }}>
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse' }}>
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
                        {paginatedCourses.map((course) => {
                            const price = parseFloat(course.price || '0');
                            const now = new Date();
                            const hasPromo = course.promoPrice !== null && course.promoPrice !== undefined;
                            const promoStartOk = !course.promoStartsAt || new Date(course.promoStartsAt) <= now;
                            const promoEndOk = !course.promoEndsAt || new Date(course.promoEndsAt) >= now;
                            const isPromoActive = hasPromo && promoStartOk && promoEndOk;
                            const lessonCount = Number(course.lessonCount || 0);
                            const enrollmentCount = Number(course.enrollmentCount || 0);
                            const thumbnail = normalizeUrl(course.thumbnailUrl);
                            const needsAttention = lessonCount === 0 || (course.status === 'published' && !thumbnail);

                            return (
                            <tr key={course.id} style={{ borderBottom: '1px solid #e2e8f0', background: needsAttention ? 'linear-gradient(90deg, rgba(254,242,242,0.55), rgba(255,255,255,0))' : 'white' }}>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '80px',
                                            height: '48px',
                                            borderRadius: '8px',
                                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                            flexShrink: 0,
                                            overflow: 'hidden',
                                            position: 'relative',
                                        }}>
                                            {thumbnail && (
                                                <img
                                                    src={thumbnail}
                                                    alt={course.title}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                                                {course.title}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                /{course.slug}
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                                                {lessonCount === 0 && (
                                                    <span style={{ padding: '4px 8px', borderRadius: '999px', background: '#fef2f2', color: '#dc2626', fontSize: '0.68rem', fontWeight: 600 }}>
                                                        ยังไม่มีบทเรียน
                                                    </span>
                                                )}
                                                {!thumbnail && (
                                                    <span style={{ padding: '4px 8px', borderRadius: '999px', background: '#fff7ed', color: '#c2410c', fontSize: '0.68rem', fontWeight: 600 }}>
                                                        ไม่มีภาพปก
                                                    </span>
                                                )}
                                                {enrollmentCount > 0 && (
                                                    <span style={{ padding: '4px 8px', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.68rem', fontWeight: 600 }}>
                                                        มีผู้เรียนแล้ว
                                                    </span>
                                                )}
                                                {isPromoActive && (
                                                    <span style={{ padding: '4px 8px', borderRadius: '999px', background: '#f5f3ff', color: '#7c3aed', fontSize: '0.68rem', fontWeight: 600 }}>
                                                        โปรโมชันกำลังใช้งาน
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '8px' }}>
                                                สร้างเมื่อ {formatDate(course.createdAt)}
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
                                    {needsAttention && (
                                        <div style={{ color: '#dc2626', fontSize: '0.7rem', fontWeight: 600, marginTop: '8px' }}>
                                            ควรตรวจ
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', color: '#1e293b' }}>
                                    {price === 0 ? <span style={{ color: '#16a34a' }}>ฟรี</span> : isPromoActive ? (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.8125rem' }}>฿{price.toLocaleString()}</span>
                                                <span style={{ color: '#dc2626', fontWeight: 600 }}>฿{parseFloat(course.promoPrice || '0').toLocaleString()}</span>
                                            </div>
                                            <span style={{
                                                display: 'inline-block',
                                                marginTop: '4px',
                                                padding: '2px 8px',
                                                background: '#fef2f2',
                                                color: '#dc2626',
                                                borderRadius: '50px',
                                                fontSize: '0.6875rem',
                                                fontWeight: 500,
                                            }}>
                                                ลด {Math.round((1 - parseFloat(course.promoPrice || '0') / price) * 100)}%
                                            </span>
                                        </div>
                                    ) : `฿${price.toLocaleString()}`}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', color: '#1e293b' }}>
                                    <div style={{ fontWeight: 600, color: lessonCount === 0 ? '#dc2626' : '#1e293b' }}>
                                        {lessonCount} บท
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: lessonCount === 0 ? '#dc2626' : '#94a3b8', marginTop: '4px' }}>
                                        {lessonCount === 0 ? 'ยังไม่พร้อมขาย' : 'พร้อมจัดการเนื้อหา'}
                                    </div>
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                    <Link
                                        href={`/admin/courses/${course.id}/enrollments`}
                                        style={{
                                            color: '#2563eb',
                                            textDecoration: 'none',
                                            fontWeight: 500,
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            background: '#eff6ff',
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        {enrollmentCount} คน
                                    </Link>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>
                                        {enrollmentCount > 0 ? 'เปิดดูรายชื่อผู้เรียน' : 'ยังไม่มีผู้เรียน'}
                                    </div>
                                </td>
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                        <Link
                                            href={`/courses/${course.slug}`}
                                            target="_blank"
                                            style={{
                                                padding: '8px 12px',
                                                background: '#ffffff',
                                                color: '#475569',
                                                borderRadius: '6px',
                                                textDecoration: 'none',
                                                fontSize: '0.875rem',
                                                border: '1px solid #e2e8f0',
                                            }}
                                        >
                                            ดูหน้าเว็บ
                                        </Link>
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
                        )})}
                    </tbody>
                </table>
                </div>

                {/* Pagination */}
                {filtered.length > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderTop: '1px solid #e2e8f0',
                        fontSize: '0.875rem',
                        color: '#64748b',
                        flexWrap: 'wrap',
                        gap: '12px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>แสดง</span>
                            <select
                                value={perPage}
                                onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                style={{
                                    padding: '4px 8px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem',
                                    background: 'white',
                                }}
                            >
                                {PER_PAGE_OPTIONS.map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                            <span>รายการ · {(currentPage - 1) * perPage + 1}-{Math.min(currentPage * perPage, filtered.length)} จาก {filtered.length}</span>
                        </div>

                        {totalPages > 1 && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '6px 10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px',
                                        background: 'white',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === 1 ? 0.4 : 1,
                                        fontSize: '0.8125rem',
                                    }}
                                >
                                    «
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '6px 10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px',
                                        background: 'white',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === 1 ? 0.4 : 1,
                                        fontSize: '0.8125rem',
                                    }}
                                >
                                    ‹
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                                    .reduce<(number | string)[]>((acc, page, idx, arr) => {
                                        if (idx > 0 && page - (arr[idx - 1] as number) > 1) acc.push('...');
                                        acc.push(page);
                                        return acc;
                                    }, [])
                                    .map((page, idx) => (
                                        typeof page === 'string' ? (
                                            <span key={`ellipsis-${idx}`} style={{ padding: '6px 4px', color: '#94a3b8' }}>…</span>
                                        ) : (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                style={{
                                                    padding: '6px 12px',
                                                    border: '1px solid',
                                                    borderColor: currentPage === page ? '#2563eb' : '#e2e8f0',
                                                    borderRadius: '6px',
                                                    background: currentPage === page ? '#2563eb' : 'white',
                                                    color: currentPage === page ? 'white' : '#475569',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8125rem',
                                                    fontWeight: currentPage === page ? 600 : 400,
                                                }}
                                            >
                                                {page}
                                            </button>
                                        )
                                    ))}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: '6px 10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px',
                                        background: 'white',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === totalPages ? 0.4 : 1,
                                        fontSize: '0.8125rem',
                                    }}
                                >
                                    ›
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: '6px 10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px',
                                        background: 'white',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === totalPages ? 0.4 : 1,
                                        fontSize: '0.8125rem',
                                    }}
                                >
                                    »
                                </button>
                            </div>
                        )}
                    </div>
                )}

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
