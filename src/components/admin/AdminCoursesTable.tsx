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
    const withStudentsCount = filtered.filter(c => Number(c.enrollmentCount || 0) > 0).length;
    const missingThumbnailCount = filtered.filter(c => !normalizeUrl(c.thumbnailUrl)).length;
    const activePromoCount = filtered.filter((course) => {
        const now = new Date();
        const hasPromo = course.promoPrice !== null && course.promoPrice !== undefined;
        const promoStartOk = !course.promoStartsAt || new Date(course.promoStartsAt) <= now;
        const promoEndOk = !course.promoEndsAt || new Date(course.promoEndsAt) >= now;
        return hasPromo && promoStartOk && promoEndOk;
    }).length;
    const attentionCount = filtered.filter((course) => {
        const lessonCount = Number(course.lessonCount || 0);
        const thumbnail = normalizeUrl(course.thumbnailUrl);
        return lessonCount === 0 || (course.status === 'published' && !thumbnail);
    }).length;
    const isFiltered = Boolean(search) || statusFilter !== 'all';
    const statusTabs = [
        { value: 'all', label: 'All', count: courses.length },
        { value: 'published', label: 'Published', count: publishedCount },
        { value: 'draft', label: 'Draft', count: draftCount },
    ];
    const catalogHealthCards = [
        {
            label: 'Needs Attention',
            value: `${attentionCount} Courses`,
            detail: 'คอร์สที่ควรเริ่มตรวจจากหน้า catalog นี้',
            background: attentionCount > 0 ? '#eefbf2' : '#f8fbff',
            border: attentionCount > 0 ? '#c6f0d4' : '#dbe5f4',
            labelColor: attentionCount > 0 ? '#15803d' : '#64748b',
            valueColor: attentionCount > 0 ? '#166534' : '#0f172a',
            detailColor: '#64748b',
        },
        {
            label: 'Cover Check',
            value: `${missingThumbnailCount} Courses`,
            detail: 'คอร์สที่ยังไม่มีภาพปกพร้อมใช้งาน',
            background: '#fbfdff',
            border: '#dbe5f4',
            labelColor: '#64748b',
            valueColor: '#0f172a',
            detailColor: '#64748b',
        },
        {
            label: 'Live Traction',
            value: `${withStudentsCount} Courses`,
            detail: 'รายการที่เริ่มมีผู้เรียนจริงแล้ว',
            background: '#eff6ff',
            border: '#bfdbfe',
            labelColor: '#1d4ed8',
            valueColor: '#1d4ed8',
            detailColor: '#1e40af',
        },
        {
            label: 'Promo Active',
            value: `${activePromoCount} Courses`,
            detail: 'คอร์สที่กำลังมีโปรโมชันในตอนนี้',
            background: '#fff7ed',
            border: '#fed7aa',
            labelColor: '#c2410c',
            valueColor: '#c2410c',
            detailColor: '#9a3412',
        },
    ];

    return (
        <>
            <div className="admin-catalog-panel" style={{
                background: 'white',
                borderRadius: '22px',
                border: '1px solid #dbe5f4',
                boxShadow: '0 14px 32px rgba(15, 23, 42, 0.04)',
                overflow: 'hidden',
                marginBottom: '18px',
            }}>
                <div className="admin-catalog-header" style={{ padding: '18px 20px 16px', borderBottom: '1px solid #e6eefb', background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ color: '#334155', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Course Catalog</div>
                            <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.65 }}>ค้นหา กรอง และจัดลำดับว่าคอร์สไหนควรเติมเนื้อหา เตรียม publish หรือดูผลลัพธ์จากผู้เรียนต่อ</div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ padding: '7px 12px', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: '0.76rem' }}>
                                matched {filtered.length} course
                            </span>
                            <span style={{ padding: '7px 12px', borderRadius: '999px', background: '#0f172a', color: '#ffffff', fontWeight: 700, fontSize: '0.76rem' }}>
                                {publishedCount} active course
                            </span>
                            {isFiltered && (
                                <button
                                    onClick={() => { setSearch(''); setStatusFilter('all'); setCurrentPage(1); }}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#2563eb',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontSize: '0.82rem',
                                    }}
                                >
                                    ล้างตัวกรอง
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '18px 20px 20px', display: 'grid', gap: '16px' }}>
                    <div className="admin-catalog-toolbar" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: '12px',
                        alignItems: 'center',
                    }}>
                        <div style={{ position: 'relative', minWidth: 0 }}>
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
                                    padding: '12px 14px 12px 42px',
                                    border: '1px solid #dbe5f4',
                                    borderRadius: '12px',
                                    fontSize: '0.875rem',
                                    background: '#fbfdff',
                                }}
                            />
                        </div>

                        <div className="admin-catalog-status-tabs" style={{
                            display: 'flex',
                            gap: '4px',
                            background: '#f8fbff',
                            borderRadius: '12px',
                            padding: '4px',
                            flexWrap: 'wrap',
                            border: '1px solid #dbe5f4',
                        }}>
                            {statusTabs.map((tab) => (
                                <button
                                    key={tab.value}
                                    onClick={() => { setStatusFilter(tab.value); setCurrentPage(1); }}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        fontSize: '0.8125rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: statusFilter === tab.value ? '#1d4ed8' : 'transparent',
                                        color: statusFilter === tab.value ? 'white' : '#64748b',
                                        boxShadow: statusFilter === tab.value ? '0 10px 20px rgba(37,99,235,0.18)' : 'none',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="admin-catalog-health-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                        gap: '10px',
                        color: '#64748b',
                        fontSize: '0.8rem',
                    }}>
                        {catalogHealthCards.map((item) => (
                            <div className="admin-catalog-health-card" key={item.label} style={{ padding: '12px 14px', borderRadius: '14px', background: item.background, border: `1px solid ${item.border}` }}>
                                <div style={{ color: item.labelColor, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>{item.label}</div>
                                <div style={{ color: item.valueColor, fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.1 }}>{item.value}</div>
                                <div style={{ color: item.detailColor, fontSize: '0.74rem', marginTop: '4px' }}>{item.detail}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="admin-catalog-table-panel" style={{
                background: 'white',
                borderRadius: '22px',
                border: '1px solid #dbe5f4',
                boxShadow: '0 14px 32px rgba(15, 23, 42, 0.04)',
                overflow: 'hidden',
            }}>
                <div className="admin-catalog-table-header" style={{ padding: '16px 18px', borderBottom: '1px solid #e6eefb', background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)' }}>
                    <div style={{ color: '#0f172a', fontSize: '0.98rem', fontWeight: 700, marginBottom: '6px' }}>Operational View</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.7 }}>สแกนสถานะ ราคา ความพร้อมของบทเรียน และ next action ต่อคอร์สได้จากตารางเดียว</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                <table className="admin-catalog-table" style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#fbfdff', borderBottom: '1px solid #e6eefb' }}>
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
                            const courseHealth = lessonCount === 0
                                ? { label: 'ต้องเติมบทเรียน', color: '#dc2626', background: '#fef2f2' }
                                : course.status === 'draft'
                                    ? { label: 'รอ publish', color: '#d97706', background: '#fffbeb' }
                                    : !thumbnail
                                        ? { label: 'เติมภาพปก', color: '#c2410c', background: '#fff7ed' }
                                        : { label: 'พร้อมจัดการต่อ', color: '#16a34a', background: '#f0fdf4' };
                            const primaryAction = lessonCount === 0
                                ? {
                                    href: `/admin/courses/${course.id}/lessons`,
                                    label: 'เพิ่มบทเรียน',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    border: '1px solid #bfdbfe',
                                  }
                                : course.status === 'draft' || !thumbnail
                                    ? {
                                        href: `/admin/courses/${course.id}/edit`,
                                        label: 'เตรียมคอร์ส',
                                        background: '#fff7ed',
                                        color: '#c2410c',
                                        border: '1px solid #fed7aa',
                                      }
                                    : {
                                        href: `/admin/courses/${course.id}/lessons`,
                                        label: 'จัดการบทเรียน',
                                        background: '#eff6ff',
                                        color: '#2563eb',
                                        border: '1px solid #bfdbfe',
                                      };
                            const compactMetaItems = [
                                `/${course.slug}`,
                                `สร้างเมื่อ ${formatDate(course.createdAt)}`,
                                enrollmentCount > 0 ? 'มีผู้เรียนแล้ว' : 'ยังไม่มีผู้เรียน',
                                isPromoActive ? 'โปรโมชันใช้งาน' : null,
                                lessonCount === 0 ? 'ยังไม่มีบทเรียน' : null,
                                !thumbnail ? 'ไม่มีภาพปก' : null,
                            ].filter(Boolean);

                            return (
                            <tr className="admin-catalog-row" key={course.id} style={{ borderBottom: '1px solid #e6eefb', background: needsAttention ? 'linear-gradient(90deg, rgba(239,246,255,0.68), rgba(255,255,255,0))' : 'white' }}>
                                <td style={{ padding: '16px' }}>
                                    <div className="admin-course-main-cell" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div className="admin-course-thumb" style={{
                                            width: '84px',
                                            height: '50px',
                                            borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                            flexShrink: 0,
                                            overflow: 'hidden',
                                            position: 'relative',
                                            border: '1px solid rgba(255,255,255,0.4)',
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
                                            <div className="admin-course-title-row" style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', alignItems: 'center', marginBottom: '6px', minWidth: 0 }}>
                                                <div className="admin-course-title" style={{ fontWeight: 700, color: '#1e293b', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {course.title}
                                                </div>
                                                <span className="admin-course-health-badge" style={{ padding: '4px 8px', borderRadius: '999px', background: courseHealth.background, color: courseHealth.color, fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                    {courseHealth.label}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {compactMetaItems.join(' · ')}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                    <span style={{
                                        padding: '5px 12px',
                                        borderRadius: '50px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        background: course.status === 'published' ? '#dcfce7' : '#fef3c7',
                                        color: course.status === 'published' ? '#16a34a' : '#d97706',
                                    }}>
                                        {course.status === 'published' ? 'เผยแพร่' : 'แบบร่าง'}
                                    </span>
                                    <div style={{ color: needsAttention ? '#dc2626' : '#94a3b8', fontSize: '0.7rem', fontWeight: 600, marginTop: '8px' }}>
                                        {needsAttention ? 'ควรตรวจ' : 'สถานะปกติ'}
                                    </div>
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', color: '#1e293b' }}>
                                    {price === 0 ? <span style={{ color: '#16a34a', fontWeight: 700 }}>ฟรี</span> : isPromoActive ? (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.8125rem' }}>฿{price.toLocaleString()}</span>
                                                <span style={{ color: '#dc2626', fontWeight: 700 }}>฿{parseFloat(course.promoPrice || '0').toLocaleString()}</span>
                                            </div>
                                            <span style={{
                                                display: 'inline-block',
                                                marginTop: '4px',
                                                padding: '2px 8px',
                                                background: '#fef2f2',
                                                color: '#dc2626',
                                                borderRadius: '50px',
                                                fontSize: '0.6875rem',
                                                fontWeight: 600,
                                            }}>
                                                ลด {Math.round((1 - parseFloat(course.promoPrice || '0') / price) * 100)}%
                                            </span>
                                        </div>
                                    ) : `฿${price.toLocaleString()}`}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', color: '#1e293b' }}>
                                    <div style={{ fontWeight: 700, color: lessonCount === 0 ? '#dc2626' : '#1e293b' }}>
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
                                            fontWeight: 700,
                                            padding: '5px 10px',
                                            borderRadius: '999px',
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
                                    <div className="admin-course-actions" style={{ display: 'grid', gap: '8px', justifyItems: 'end' }}>
                                        <Link
                                            href={primaryAction.href}
                                            className="admin-course-primary-action"
                                            style={{
                                                padding: '8px 12px',
                                                background: primaryAction.background,
                                                color: primaryAction.color,
                                                borderRadius: '999px',
                                                textDecoration: 'none',
                                                fontSize: '0.8125rem',
                                                fontWeight: 700,
                                                border: primaryAction.border,
                                            }}
                                        >
                                            {primaryAction.label}
                                        </Link>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            <Link
                                                href={`/admin/courses/${course.id}/edit`}
                                                className="admin-course-secondary-action"
                                                style={{
                                                    padding: '7px 11px',
                                                    background: '#fbfdff',
                                                    color: '#475569',
                                                    borderRadius: '999px',
                                                    textDecoration: 'none',
                                                    fontSize: '0.78rem',
                                                    border: '1px solid #dbe5f4',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                แก้ไขคอร์ส
                                            </Link>
                                            <Link
                                                href={`/admin/courses/${course.id}/lessons`}
                                                className="admin-course-secondary-action"
                                                style={{
                                                    padding: '7px 11px',
                                                    background: '#fbfdff',
                                                    color: '#475569',
                                                    borderRadius: '999px',
                                                    textDecoration: 'none',
                                                    fontSize: '0.78rem',
                                                    border: '1px solid #dbe5f4',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                บทเรียน
                                            </Link>
                                            <Link
                                                href={`/courses/${course.slug}`}
                                                target="_blank"
                                                className="admin-course-secondary-action"
                                                style={{
                                                    padding: '7px 11px',
                                                    background: '#ffffff',
                                                    color: '#475569',
                                                    borderRadius: '999px',
                                                    textDecoration: 'none',
                                                    fontSize: '0.78rem',
                                                    border: '1px solid #dbe5f4',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                ดูหน้าเว็บ
                                            </Link>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
                </div>

                {/* Pagination */}
                {filtered.length > 0 && (
                    <div className="admin-catalog-pagination" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderTop: '1px solid #e6eefb',
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
                                    border: '1px solid #dbe5f4',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    background: '#fbfdff',
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
                                        border: '1px solid #dbe5f4',
                                        borderRadius: '8px',
                                        background: '#fbfdff',
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
                                                    borderColor: currentPage === page ? '#2563eb' : '#dbe5f4',
                                                    borderRadius: '8px',
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
                                        border: '1px solid #dbe5f4',
                                        borderRadius: '8px',
                                        background: '#fbfdff',
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
                                        background: '#eff6ff',
                                        border: '1px solid #bfdbfe',
                                        borderRadius: '8px',
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
                                        borderRadius: '10px',
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

            <style jsx>{`
                .admin-catalog-panel,
                .admin-catalog-table-panel {
                    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98)) !important;
                    border: 1px solid rgba(203, 213, 225, 0.86) !important;
                    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.05), inset 0 1px 0 rgba(255,255,255,0.82) !important;
                }

                .admin-catalog-header,
                .admin-catalog-table-header {
                    background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.88)) !important;
                    border-bottom: 1px solid rgba(226, 232, 240, 0.92) !important;
                }

                .admin-catalog-status-tabs {
                    background: #ffffff !important;
                    border-color: rgba(219, 234, 254, 0.92) !important;
                }

                .admin-catalog-health-card {
                    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
                }

                .admin-catalog-table thead tr {
                    background: linear-gradient(180deg, #f8fafc, #ffffff) !important;
                }

                .admin-catalog-row {
                    transition: background-color 180ms ease, transform 180ms ease;
                }

                .admin-catalog-row:hover {
                    background: linear-gradient(90deg, rgba(248, 250, 252, 0.98), rgba(255,255,255,0.98)) !important;
                }

                .admin-course-thumb {
                    box-shadow: 0 12px 20px rgba(15, 23, 42, 0.08);
                }

                .admin-course-title {
                    letter-spacing: -0.01em;
                }

                .admin-course-primary-action,
                .admin-course-secondary-action {
                    transition: transform 180ms ease, border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
                }

                .admin-course-primary-action:hover,
                .admin-course-secondary-action:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 10px 18px rgba(37, 99, 235, 0.08);
                }

                .admin-catalog-pagination {
                    border-top: 1px solid rgba(226, 232, 240, 0.92) !important;
                    background: linear-gradient(180deg, rgba(255,255,255,0.72), rgba(248,250,252,0.92));
                }

                @media (max-width: 760px) {
                    .admin-catalog-toolbar {
                        grid-template-columns: 1fr !important;
                    }

                    .admin-course-main-cell {
                        gap: 10px !important;
                    }

                    .admin-course-thumb {
                        width: 72px !important;
                        height: 44px !important;
                    }

                    .admin-course-title-row {
                        gap: 6px !important;
                        margin-bottom: 4px !important;
                    }

                    .admin-course-title {
                        font-size: 0.94rem !important;
                    }

                    .admin-course-health-badge {
                        padding: 3px 7px !important;
                        font-size: 0.64rem !important;
                    }
                }

                @media (max-width: 640px) {
                    .admin-catalog-health-grid {
                        grid-template-columns: 1fr !important;
                    }

                    .admin-course-main-cell {
                        gap: 8px !important;
                    }

                    .admin-course-thumb {
                        width: 64px !important;
                        height: 40px !important;
                    }

                    .admin-course-title {
                        font-size: 0.9rem !important;
                    }

                    .admin-course-health-badge {
                        padding: 2px 6px !important;
                        font-size: 0.62rem !important;
                    }
                }
            `}</style>
        </>
    );
}
