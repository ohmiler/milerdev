'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, History, Search } from 'lucide-react';

import {
  AdminEmptyState,
  AdminLoadingState,
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
  type AdminTone,
} from '@/components/admin/ui/AdminOperations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { cn } from '@/lib/utils';

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Filters {
  entityTypes: string[];
  actions: string[];
}

function getActionPresentation(action: string): { label: string; tone: AdminTone } {
  switch (action) {
    case 'create':
      return { label: 'สร้าง', tone: 'success' };
    case 'update':
      return { label: 'แก้ไข', tone: 'info' };
    case 'delete':
      return { label: 'ลบ', tone: 'danger' };
    default:
      return { label: action, tone: 'neutral' };
  }
}

function getEntityTypeText(type: string) {
  const types: Record<string, string> = {
    setting: 'การตั้งค่า',
    user: 'ผู้ใช้',
    course: 'คอร์ส',
    lesson: 'บทเรียน',
    payment: 'การชำระเงิน',
    enrollment: 'การลงทะเบียน',
    coupon: 'คูปอง',
    announcement: 'ประกาศ',
    review: 'รีวิว',
    certificate: 'ใบรับรอง',
    blog: 'บทความ',
    bundle: 'Bundle',
    tag: 'แท็ก',
  };
  return types[type] || type;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        entityType: entityTypeFilter,
        action: actionFilter,
        ...(searchDebounce && { search: searchDebounce }),
      });
      const res = await fetch('/api/admin/audit-logs?' + params);
      const data = await res.json();
      setLogs(data.logs || []);
      setPagination(data.pagination || null);
      setFilters(data.filters || null);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, entityTypeFilter, actionFilter, searchDebounce]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Traceability"
        title="บันทึกการใช้งาน"
        description="ติดตามว่าใครเปลี่ยนข้อมูลอะไร เมื่อใด และตรวจค่าก่อนกับหลังสำหรับการวิเคราะห์เหตุการณ์"
        meta={pagination ? pagination.total.toLocaleString('th-TH') + ' เหตุการณ์ตามตัวกรองปัจจุบัน' : undefined}
      />

      <AdminSection
        title="เหตุการณ์ในระบบ"
        description="ค้นหาผู้ใช้ แล้วกรองตามประเภทข้อมูลหรือการกระทำ"
        actions={
          pagination ? (
            <AdminStatusBadge tone="info">{pagination.total.toLocaleString('th-TH')} รายการ</AdminStatusBadge>
          ) : undefined
        }
      >
        <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหาชื่อผู้ใช้หรืออีเมล"
              className="pl-9"
              aria-label="ค้นหา audit log"
            />
          </div>
          <NativeSelect
            value={entityTypeFilter}
            onChange={(event) => {
              setEntityTypeFilter(event.target.value);
              setCurrentPage(1);
            }}
            aria-label="กรองประเภทข้อมูล"
          >
            <option value="all">ทุกประเภท</option>
            {filters?.entityTypes.map((type) => (
              <option key={type} value={type}>
                {getEntityTypeText(type)}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={actionFilter}
            onChange={(event) => {
              setActionFilter(event.target.value);
              setCurrentPage(1);
            }}
            aria-label="กรองการกระทำ"
          >
            <option value="all">ทุกการกระทำ</option>
            {filters?.actions.map((action) => (
              <option key={action} value={action}>
                {getActionPresentation(action).label}
              </option>
            ))}
          </NativeSelect>
        </div>

        {loading && logs.length === 0 ? (
          <AdminLoadingState title="กำลังโหลดบันทึกการใช้งาน" />
        ) : logs.length === 0 ? (
          <AdminEmptyState
            title="ไม่พบบันทึกการใช้งาน"
            description="ลองเปลี่ยนคำค้นหา ประเภทข้อมูล หรือการกระทำ"
            icon={<History />}
          />
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => {
              const expanded = expandedLog === log.id;
              const action = getActionPresentation(log.action);

              return (
                <article key={log.id} className="py-3 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    className="grid w-full gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/40 md:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] md:items-center"
                    onClick={() => setExpandedLog(expanded ? null : log.id)}
                    aria-expanded={expanded}
                  >
                    <AdminStatusBadge tone={action.tone}>{action.label}</AdminStatusBadge>
                    <AdminStatusBadge>{getEntityTypeText(log.entityType)}</AdminStatusBadge>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {log.userName || log.userEmail || 'ระบบ'}
                      </span>
                      {log.entityId ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">ID: {log.entityId}</span>
                      ) : null}
                    </span>
                    <time className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(log.createdAt)}</time>
                    <ChevronDown
                      aria-hidden
                      className={cn('size-4 text-muted-foreground transition-transform', expanded && 'rotate-180')}
                    />
                  </button>

                  {expanded ? (
                    <div className="mt-2 rounded-xl border border-border bg-muted/25 p-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        {log.oldValue ? (
                          <div>
                            <p className="mb-2 text-xs font-medium text-muted-foreground">ค่าเดิม</p>
                            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-destructive/15 bg-[var(--color-error-soft)] p-3 text-xs leading-5 text-[var(--color-error-strong)]">
                              {log.oldValue}
                            </pre>
                          </div>
                        ) : null}
                        {log.newValue ? (
                          <div>
                            <p className="mb-2 text-xs font-medium text-muted-foreground">ค่าใหม่</p>
                            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-[var(--color-success)]/20 bg-[var(--color-success-soft)] p-3 text-xs leading-5 text-[var(--color-success-strong)]">
                              {log.newValue}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                      {!log.oldValue && !log.newValue ? (
                        <p className="text-sm text-muted-foreground">เหตุการณ์นี้ไม่มีค่าก่อนหรือหลังที่บันทึกไว้</p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                        <span>IP: {log.ipAddress || 'ไม่ทราบ'}</span>
                        <span>ผู้ใช้: {log.userEmail || 'ไม่ทราบ'}</span>
                        <span>User ID: {log.userId || 'ระบบ'}</span>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        {pagination && pagination.totalPages > 1 ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              หน้า {currentPage.toLocaleString('th-TH')} จาก {pagination.totalPages.toLocaleString('th-TH')}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                ก่อนหน้า
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === pagination.totalPages || loading}
                onClick={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))}
              >
                ถัดไป
              </Button>
            </div>
          </div>
        ) : null}
      </AdminSection>
    </div>
  );
}
