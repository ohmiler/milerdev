'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  AdminCourseLifecycleActions,
  AdminCourseLifecycleBadge,
  CourseLifecycleDialog,
} from '@/components/admin/AdminCourseLifecycleControls';
import { showToast } from '@/components/ui/Toast';
import { transitionAdminCourse } from '@/lib/admin-course-lifecycle-client';
import type { CourseLifecycleAction, CourseStatus } from '@/lib/course-lifecycle';

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: string | number | null;
  promoPrice: string | number | null;
  promoStartsAt: Date | string | null;
  promoEndsAt: Date | string | null;
  status: CourseStatus;
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

function formatPrice(value: string | number | null) {
  const amount = Number(value || 0);
  if (amount === 0) return 'ฟรี';
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(amount);
}

function isPromoActive(course: Course) {
  const now = new Date();
  const hasPromo = course.promoPrice !== null && course.promoPrice !== undefined;
  const promoStartOk = !course.promoStartsAt || new Date(course.promoStartsAt) <= now;
  const promoEndOk = !course.promoEndsAt || new Date(course.promoEndsAt) >= now;
  return hasPromo && promoStartOk && promoEndOk;
}

function getCourseHealth(course: Course) {
  const lessonCount = Number(course.lessonCount || 0);
  const thumbnail = normalizeUrl(course.thumbnailUrl);

  if (course.status === 'archived') {
    return { label: 'หยุดขายแล้ว', className: 'neutral' };
  }

  if (lessonCount === 0) {
    return { label: 'เติมบทเรียน', className: 'danger' };
  }

  if (course.status === 'draft') {
    return { label: 'รอเผยแพร่', className: 'warning' };
  }

  if (!thumbnail) {
    return { label: 'เติมภาพปก', className: 'warning' };
  }

  return { label: 'พร้อมใช้งาน', className: 'success' };
}

function getPrimaryAction(course: Course) {
  const lessonCount = Number(course.lessonCount || 0);
  const thumbnail = normalizeUrl(course.thumbnailUrl);

  if (course.status === 'archived') {
    return { href: `/admin/courses/${course.id}/edit`, label: 'ตรวจคอร์ส' };
  }

  if (lessonCount === 0) {
    return { href: `/admin/courses/${course.id}/lessons`, label: 'เพิ่มบทเรียน' };
  }

  if (course.status === 'draft' || !thumbnail) {
    return { href: `/admin/courses/${course.id}/edit`, label: 'แก้ไขคอร์ส' };
  }

  return { href: `/admin/courses/${course.id}/lessons`, label: 'จัดบทเรียน' };
}

export default function AdminCoursesTable({ courses }: AdminCoursesTableProps) {
  const router = useRouter();
  const [courseRows, setCourseRows] = useState(courses);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [lifecycleRequest, setLifecycleRequest] = useState<{
    course: Course;
    action: CourseLifecycleAction;
  } | null>(null);
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);
  const [lifecycleError, setLifecycleError] = useState('');

  const publishedCount = courseRows.filter((course) => course.status === 'published').length;
  const draftCount = courseRows.filter((course) => course.status === 'draft').length;
  const archivedCount = courseRows.filter((course) => course.status === 'archived').length;

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return courseRows.filter((course) => {
      const matchesSearch = !normalizedSearch ||
        course.title.toLowerCase().includes(normalizedSearch) ||
        course.slug.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [courseRows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCourses = filtered.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);
  const isFiltered = Boolean(search.trim()) || statusFilter !== 'all';
  const activePromoCount = filtered.filter(isPromoActive).length;
  const missingCoverCount = filtered.filter((course) => !normalizeUrl(course.thumbnailUrl)).length;
  const needsAttentionCount = filtered.filter((course) => {
    const lessonCount = Number(course.lessonCount || 0);
    return lessonCount === 0 || (course.status === 'published' && !normalizeUrl(course.thumbnailUrl));
  }).length;
  const hasStudentsCount = filtered.filter((course) => Number(course.enrollmentCount || 0) > 0).length;
  const statusTabs = [
    { value: 'all', label: 'ทั้งหมด', count: courseRows.length },
    { value: 'published', label: 'เผยแพร่', count: publishedCount },
    { value: 'draft', label: 'แบบร่าง', count: draftCount },
    { value: 'archived', label: 'เก็บเข้าคลัง', count: archivedCount },
  ];
  const healthCards = [
    { label: 'ต้องตรวจ', value: needsAttentionCount, detail: 'ไม่มีบทเรียนหรือภาพปก', tone: 'danger' },
    { label: 'ไม่มีภาพปก', value: missingCoverCount, detail: 'ควรเติมก่อนโปรโมต', tone: 'neutral' },
    { label: 'มีผู้เรียนแล้ว', value: hasStudentsCount, detail: 'เริ่มมี traction', tone: 'success' },
    { label: 'มีโปรโมชัน', value: activePromoCount, detail: 'กำลังลดราคาอยู่', tone: 'warning' },
  ];

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const requestLifecycleAction = (course: Course, action: CourseLifecycleAction) => {
    setLifecycleError('');
    setLifecycleRequest({ course, action });
  };

  const confirmLifecycleAction = async () => {
    if (!lifecycleRequest || pendingCourseId) return;
    const { course, action } = lifecycleRequest;
    setPendingCourseId(course.id);
    setLifecycleError('');

    const result = await transitionAdminCourse({
      courseId: course.id,
      action,
      expectedStatus: course.status,
    });

    if (!result.ok) {
      setLifecycleError(result.message);
      showToast(result.message, 'error');
      if (result.code === 'STATE_CONFLICT' || result.code === 'INVALID_RESPONSE') router.refresh();
      setPendingCourseId(null);
      return;
    }

    setCourseRows((current) => current.map((item) => (
      item.id === course.id ? { ...item, status: result.course.status } : item
    )));
    setLifecycleRequest(null);
    setPendingCourseId(null);
    showToast(
      action === 'archive'
        ? 'เก็บคอร์สเข้าคลังแล้ว'
        : action === 'restore'
          ? 'นำคอร์สกลับเป็นแบบร่างแล้ว'
          : 'เผยแพร่คอร์สแล้ว',
      'success',
    );
    router.refresh();
  };

  return (
    <section className="admin-catalog" aria-label="ตารางจัดการคอร์ส">
      <header className="admin-catalog-header">
        <div>
          <span className="admin-catalog-kicker">Course catalog</span>
          <h2>รายการคอร์ส</h2>
          <p>ค้นหา กรอง และเลือก action ถัดไปของแต่ละคอร์สจากมุมมองเดียว</p>
        </div>
        <div className="admin-catalog-header-actions">
          <span>{filtered.length} คอร์ส</span>
          <Link href="/admin/courses/new">สร้างคอร์สใหม่</Link>
        </div>
      </header>

      <div className="admin-catalog-toolbar">
        <label className="admin-catalog-search">
          <span>ค้นหาคอร์ส</span>
          <div>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="ชื่อคอร์สหรือ slug"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </label>

        <div className="admin-catalog-tabs" role="tablist" aria-label="กรองสถานะคอร์ส">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              aria-pressed={statusFilter === tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setCurrentPage(1);
              }}
            >
              {tab.label}
              <span>{tab.count}</span>
            </button>
          ))}
        </div>

        {isFiltered ? (
          <button type="button" className="admin-catalog-clear" onClick={clearFilters}>
            ล้างตัวกรอง
          </button>
        ) : null}
      </div>

      <div className="admin-catalog-health">
        {healthCards.map((item) => (
          <article className={`admin-catalog-health-card ${item.tone}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>

      {lifecycleError ? (
        <div className="admin-catalog-lifecycle-error" role="alert">
          <strong>เปลี่ยนสถานะไม่สำเร็จ</strong>
          <span>{lifecycleError}</span>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="admin-catalog-empty">
          <h3>{isFiltered ? 'ไม่พบคอร์สที่ตรงกับตัวกรอง' : 'ยังไม่มีคอร์ส'}</h3>
          <p>{isFiltered ? 'ลองล้างตัวกรองหรือค้นหาด้วยคำอื่น' : 'เริ่มสร้างคอร์สแรกเพื่อเปิด catalog ของระบบ'}</p>
          {isFiltered ? (
            <button type="button" onClick={clearFilters}>ล้างตัวกรอง</button>
          ) : (
            <Link href="/admin/courses/new">สร้างคอร์สแรก</Link>
          )}
        </div>
      ) : (
        <>
          <div className="admin-catalog-table-wrap">
            <table className="admin-catalog-table">
              <thead>
                <tr>
                  <th>คอร์ส</th>
                  <th>สถานะ</th>
                  <th>ราคา</th>
                  <th>บทเรียน</th>
                  <th>ผู้เรียน</th>
                  <th>สร้างเมื่อ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCourses.map((course) => {
                  const thumbnail = normalizeUrl(course.thumbnailUrl);
                  const health = getCourseHealth(course);
                  const primaryAction = getPrimaryAction(course);
                  const promoActive = isPromoActive(course);

                  return (
                    <tr key={course.id}>
                      <td>
                        <div className="admin-course-cell">
                          <div className="admin-course-cover">
                            {thumbnail ? (
                              <img src={thumbnail} alt="" />
                            ) : (
                              <span>MD</span>
                            )}
                          </div>
                          <div className="admin-course-copy">
                            <div>
                              <strong>{course.title}</strong>
                              <span className={`admin-course-health ${health.className}`}>{health.label}</span>
                            </div>
                            <p>{course.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <AdminCourseLifecycleBadge status={course.status} />
                      </td>
                      <td>
                        <div className="admin-price-cell">
                          <strong>{promoActive ? formatPrice(course.promoPrice) : formatPrice(course.price)}</strong>
                          {promoActive ? <span>โปรโมชัน</span> : null}
                        </div>
                      </td>
                      <td>{Number(course.lessonCount || 0)}</td>
                      <td>{Number(course.enrollmentCount || 0)}</td>
                      <td>{formatDate(course.createdAt)}</td>
                      <td>
                        <div className="admin-course-actions">
                          <Link className="primary" href={primaryAction.href}>{primaryAction.label}</Link>
                          <Link href={`/admin/courses/${course.id}/edit`}>แก้ไข</Link>
                          {course.status === 'published'
                            ? <Link href={`/courses/${course.slug}`} target="_blank">ดูหน้าเว็บ</Link>
                            : null}
                          <AdminCourseLifecycleActions
                            status={course.status}
                            pending={pendingCourseId === course.id}
                            onRequest={(action) => requestLifecycleAction(course, action)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="admin-catalog-cards">
            {paginatedCourses.map((course) => {
              const thumbnail = normalizeUrl(course.thumbnailUrl);
              const health = getCourseHealth(course);
              const primaryAction = getPrimaryAction(course);
              const promoActive = isPromoActive(course);

              return (
                <article className="admin-course-mobile-card" key={course.id}>
                  <div className="admin-course-card-top">
                    <div className="admin-course-cover">
                      {thumbnail ? <img src={thumbnail} alt="" /> : <span>MD</span>}
                    </div>
                    <div>
                      <strong>{course.title}</strong>
                      <p>{course.slug}</p>
                    </div>
                  </div>
                  <div className="admin-course-card-meta">
                    <AdminCourseLifecycleBadge status={course.status} />
                    <span className={`admin-course-health ${health.className}`}>{health.label}</span>
                    <span>{promoActive ? formatPrice(course.promoPrice) : formatPrice(course.price)}</span>
                    <span>{Number(course.lessonCount || 0)} บทเรียน</span>
                    <span>{Number(course.enrollmentCount || 0)} ผู้เรียน</span>
                  </div>
                  <div className="admin-course-card-actions">
                    <Link className="primary" href={primaryAction.href}>{primaryAction.label}</Link>
                    <Link href={`/admin/courses/${course.id}/edit`}>แก้ไข</Link>
                    {course.status === 'published'
                      ? <Link href={`/courses/${course.slug}`} target="_blank">ดูหน้าเว็บ</Link>
                      : null}
                    <AdminCourseLifecycleActions
                      status={course.status}
                      pending={pendingCourseId === course.id}
                      onRequest={(action) => requestLifecycleAction(course, action)}
                    />
                  </div>
                </article>
              );
            })}
          </div>

          <footer className="admin-catalog-pagination">
            <div>
              <span>แสดง</span>
              <select
                value={perPage}
                onChange={(event) => {
                  setPerPage(Number(event.target.value));
                  setCurrentPage(1);
                }}
              >
                {PER_PAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span>
                {(safeCurrentPage - 1) * perPage + 1}-{Math.min(safeCurrentPage * perPage, filtered.length)} จาก {filtered.length}
              </span>
            </div>

            {totalPages > 1 ? (
              <div className="admin-page-buttons">
                <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1}>
                  ก่อนหน้า
                </button>
                <span>{safeCurrentPage} / {totalPages}</span>
                <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages}>
                  ถัดไป
                </button>
              </div>
            ) : null}
          </footer>
        </>
      )}

      {lifecycleRequest ? (
        <CourseLifecycleDialog
          isOpen
          courseTitle={lifecycleRequest.course.title}
          action={lifecycleRequest.action}
          pending={pendingCourseId === lifecycleRequest.course.id}
          error={lifecycleError}
          onConfirm={confirmLifecycleAction}
          onCancel={() => {
            if (!pendingCourseId) setLifecycleRequest(null);
          }}
        />
      ) : null}

      <style jsx>{`
        .admin-catalog {
          --brand: #02abff;
          --brand-dark: #0089d6;
          --brand-soft: #eefaff;
          --ink: #102033;
          --muted: #64758b;
          --line: #dbe8f2;
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 12px 32px rgba(16, 32, 51, 0.06);
        }

        .admin-catalog-header {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
          padding: 20px;
          border-bottom: 1px solid var(--line);
          background: linear-gradient(180deg, #ffffff, #f7fbff);
        }

        .admin-catalog-kicker {
          color: var(--brand-dark);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .admin-catalog-header h2 {
          margin: 4px 0 6px;
          color: var(--ink);
          font-size: 1.18rem;
        }

        .admin-catalog-header p {
          margin: 0;
          color: var(--muted);
          font-size: 0.84rem;
          line-height: 1.7;
        }

        .admin-catalog-header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .admin-catalog-header-actions span,
        .admin-catalog-header-actions a,
        .admin-catalog-clear,
        .admin-catalog-empty button,
        .admin-catalog-empty a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 14px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 800;
          text-decoration: none;
        }

        .admin-catalog-header-actions span {
          background: var(--brand-soft);
          color: var(--brand-dark);
        }

        .admin-catalog-header-actions a,
        .admin-catalog-empty a {
          background: var(--brand);
          color: #ffffff;
        }

        .admin-catalog-toolbar {
          display: grid;
          grid-template-columns: minmax(260px, 1fr) auto auto;
          gap: 12px;
          align-items: end;
          padding: 18px 20px;
          border-bottom: 1px solid var(--line);
        }

        .admin-catalog-search {
          display: grid;
          gap: 7px;
          min-width: 0;
        }

        .admin-catalog-search > span {
          color: var(--muted);
          font-size: 0.76rem;
          font-weight: 700;
        }

        .admin-catalog-search > div {
          position: relative;
        }

        .admin-catalog-search svg {
          position: absolute;
          left: 13px;
          top: 50%;
          width: 18px;
          height: 18px;
          color: #91a1b5;
          transform: translateY(-50%);
        }

        .admin-catalog-search input {
          width: 100%;
          min-height: 44px;
          padding: 0 14px 0 42px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: #f7fbff;
          color: var(--ink);
          font-size: 0.88rem;
        }

        .admin-catalog-search input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(2, 171, 255, 0.2);
        }

        .admin-catalog-tabs {
          display: inline-flex;
          gap: 4px;
          padding: 4px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: #f7fbff;
        }

        .admin-catalog-tabs button {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          min-height: 36px;
          padding: 0 12px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          font-weight: 800;
        }

        .admin-catalog-tabs button[aria-pressed="true"] {
          background: var(--brand);
          color: #ffffff;
        }

        .admin-catalog-tabs span {
          opacity: 0.75;
          font-size: 0.72rem;
        }

        .admin-catalog-clear,
        .admin-catalog-empty button {
          border: 1px solid var(--line);
          background: #ffffff;
          color: var(--brand-dark);
          cursor: pointer;
        }

        .admin-catalog-health {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          padding: 0 20px 18px;
        }

        .admin-catalog-health-card {
          min-height: 104px;
          padding: 14px;
          border: 1px solid #e8f1f8;
          border-radius: 8px;
          background: #f7fbff;
        }

        .admin-catalog-health-card span {
          color: var(--muted);
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .admin-catalog-health-card strong {
          display: block;
          margin: 8px 0 5px;
          color: var(--ink);
          font-size: 1.35rem;
        }

        .admin-catalog-health-card p {
          margin: 0;
          color: var(--muted);
          font-size: 0.75rem;
          line-height: 1.55;
        }

        .admin-catalog-health-card.danger {
          background: #fff7f7;
          border-color: #ffd5d8;
        }

        .admin-catalog-health-card.success {
          background: #f1fbf6;
          border-color: #ccefdc;
        }

        .admin-catalog-health-card.warning {
          background: #fff9ed;
          border-color: #ffe0a8;
        }

        .admin-catalog-table-wrap {
          overflow-x: auto;
          border-top: 1px solid var(--line);
        }

        .admin-catalog-table {
          width: 100%;
          min-width: 1040px;
          border-collapse: collapse;
        }

        .admin-catalog-table th {
          padding: 14px 16px;
          color: var(--muted);
          background: #f7fbff;
          border-bottom: 1px solid var(--line);
          font-size: 0.78rem;
          font-weight: 800;
          text-align: left;
        }

        .admin-catalog-table th:not(:first-child),
        .admin-catalog-table td:not(:first-child) {
          text-align: center;
        }

        .admin-catalog-table th:last-child,
        .admin-catalog-table td:last-child {
          text-align: right;
        }

        .admin-catalog-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #e8f1f8;
          color: var(--ink);
          font-size: 0.84rem;
          vertical-align: middle;
        }

        .admin-catalog-table tr:hover td {
          background: #fbfdff;
        }

        .admin-course-cell,
        .admin-course-card-top {
          display: flex;
          gap: 12px;
          align-items: center;
          min-width: 0;
        }

        .admin-course-cover {
          display: grid;
          place-items: center;
          width: 92px;
          height: 56px;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: linear-gradient(135deg, var(--brand), #73d7ff);
          color: #ffffff;
          font-weight: 900;
        }

        .admin-course-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .admin-course-copy {
          min-width: 0;
        }

        .admin-course-copy > div {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }

        .admin-course-copy strong,
        .admin-course-card-top strong {
          color: var(--ink);
          font-size: 0.92rem;
          line-height: 1.35;
        }

        .admin-course-copy p,
        .admin-course-card-top p {
          margin: 0;
          color: var(--muted);
          font-size: 0.75rem;
        }

        .admin-course-health,
        .admin-course-status,
        .admin-payment-badge {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          padding: 0 9px;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .admin-course-health.success,
        .admin-course-status.published {
          background: #eefbf3;
          color: #0f7a4b;
        }

        .admin-course-health.warning,
        .admin-course-status.draft {
          background: #fff7ed;
          color: #b45309;
        }

        .admin-course-health.neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .admin-course-health.danger {
          background: #fff1f2;
          color: #be123c;
        }

        .admin-price-cell {
          display: grid;
          gap: 4px;
          justify-items: center;
        }

        .admin-price-cell strong {
          color: var(--ink);
        }

        .admin-price-cell span {
          color: #b45309;
          font-size: 0.7rem;
          font-weight: 800;
        }

        .admin-course-actions {
          display: flex;
          gap: 6px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .admin-course-actions a,
        .admin-course-card-actions a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          padding: 0 10px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: #ffffff;
          color: var(--ink);
          font-size: 0.74rem;
          font-weight: 800;
          text-decoration: none;
        }

        .admin-course-actions a.primary,
        .admin-course-card-actions a.primary {
          border-color: var(--brand);
          background: var(--brand);
          color: #ffffff;
        }

        .admin-catalog-cards {
          display: none;
          gap: 12px;
          padding: 0 16px 16px;
        }

        .admin-course-mobile-card {
          display: grid;
          gap: 12px;
          padding: 14px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: #ffffff;
        }

        .admin-course-card-meta,
        .admin-course-card-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .admin-course-card-meta > span:not(.admin-course-status):not(.admin-course-health) {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          padding: 0 8px;
          border-radius: 999px;
          background: #f7fbff;
          color: var(--muted);
          font-size: 0.72rem;
          font-weight: 700;
        }

        .admin-catalog-empty {
          display: grid;
          place-items: center;
          gap: 10px;
          padding: 54px 18px;
          text-align: center;
          border-top: 1px solid var(--line);
        }

        .admin-catalog-lifecycle-error {
          display: grid;
          gap: 3px;
          margin: 0 20px 18px;
          padding: 12px 14px;
          border: 1px solid #fecaca;
          border-radius: 8px;
          background: #fff1f2;
          color: #9f1239;
          font-size: 0.82rem;
          line-height: 1.55;
        }

        .admin-catalog-empty h3 {
          margin: 0;
          color: var(--ink);
        }

        .admin-catalog-empty p {
          margin: 0;
          color: var(--muted);
        }

        .admin-catalog-pagination {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          padding: 14px 16px;
          border-top: 1px solid var(--line);
          background: #fbfdff;
          color: var(--muted);
          font-size: 0.82rem;
        }

        .admin-catalog-pagination > div {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .admin-catalog-pagination select,
        .admin-page-buttons button {
          min-height: 34px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: #ffffff;
          color: var(--ink);
        }

        .admin-page-buttons span {
          color: var(--ink);
          font-weight: 800;
        }

        .admin-page-buttons button {
          padding: 0 10px;
          cursor: pointer;
          font-weight: 800;
        }

        .admin-page-buttons button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        @media (max-width: 1180px) {
          .admin-catalog-toolbar {
            grid-template-columns: 1fr;
            align-items: stretch;
          }

          .admin-catalog-tabs {
            width: fit-content;
            flex-wrap: wrap;
          }

          .admin-catalog-health {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .admin-catalog-header {
            flex-direction: column;
          }

          .admin-catalog-header-actions {
            justify-content: flex-start;
          }

          .admin-catalog-health {
            grid-template-columns: 1fr;
          }

          .admin-catalog-table-wrap {
            display: none;
          }

          .admin-catalog-cards {
            display: grid;
          }

          .admin-course-cover {
            width: 78px;
            height: 48px;
          }
        }
      `}</style>
    </section>
  );
}
