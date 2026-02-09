'use client';

import { useState, useEffect } from 'react';

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
      const res = await fetch(`/api/admin/audit-logs?${params}`);
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
  }, [currentPage, entityTypeFilter, actionFilter, searchDebounce]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionStyle = (action: string) => {
    switch (action) {
      case 'create': return { background: '#dcfce7', color: '#16a34a' };
      case 'update': return { background: '#dbeafe', color: '#2563eb' };
      case 'delete': return { background: '#fef2f2', color: '#dc2626' };
      default: return { background: '#f1f5f9', color: '#64748b' };
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'create': return 'สร้าง';
      case 'update': return 'แก้ไข';
      case 'delete': return 'ลบ';
      default: return action;
    }
  };

  const getEntityTypeText = (type: string) => {
    const types: Record<string, string> = {
      setting: 'การตั้งค่า',
      user: 'ผู้ใช้',
      course: 'คอร์ส',
      lesson: 'บทเรียน',
      payment: 'การชำระเงิน',
      enrollment: 'การลงทะเบียน',
    };
    return types[type] || type;
  };

  if (loading && logs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
        กำลังโหลด...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
          บันทึกการใช้งาน
        </h1>
        <p style={{ color: '#64748b' }}>ติดตามการเปลี่ยนแปลงและกิจกรรมในระบบ</p>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '350px' }}>
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
            placeholder="ค้นหาชื่อผู้ใช้, อีเมล..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
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
        <select
          value={entityTypeFilter}
          onChange={(e) => { setEntityTypeFilter(e.target.value); setCurrentPage(1); }}
          style={{
            padding: '10px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: 'white',
            fontSize: '0.875rem',
          }}
        >
          <option value="all">ทุกประเภท</option>
          {filters?.entityTypes.map(type => (
            <option key={type} value={type}>{getEntityTypeText(type)}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
          style={{
            padding: '10px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: 'white',
            fontSize: '0.875rem',
          }}
        >
          <option value="all">ทุกการกระทำ</option>
          {filters?.actions.map(action => (
            <option key={action} value={action}>{getActionText(action)}</option>
          ))}
        </select>
      </div>

      {/* Logs List */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            ยังไม่มีบันทึกการใช้งาน
          </div>
        ) : (
          <div>
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    cursor: 'pointer',
                    background: expandedLog === log.id ? '#f8fafc' : 'white',
                  }}
                >
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '50px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    ...getActionStyle(log.action),
                  }}>
                    {getActionText(log.action)}
                  </span>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '50px',
                    fontSize: '0.75rem',
                    background: '#f1f5f9',
                    color: '#64748b',
                  }}>
                    {getEntityTypeText(log.entityType)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#1e293b', fontWeight: 500 }}>
                      {log.userName || log.userEmail || 'ระบบ'}
                    </span>
                    {log.entityId && (
                      <span style={{ color: '#64748b', marginLeft: '8px', fontSize: '0.875rem' }}>
                        ID: {log.entityId}
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                    {formatDate(log.createdAt)}
                  </div>
                  <span style={{ color: '#94a3b8' }}>
                    {expandedLog === log.id ? '▲' : '▼'}
                  </span>
                </div>

                {/* Expanded Details */}
                {expandedLog === log.id && (
                  <div style={{
                    padding: '16px 20px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '16px',
                    }}>
                      {log.oldValue && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                            ค่าเดิม
                          </div>
                          <div style={{
                            padding: '8px 12px',
                            background: '#fef2f2',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            color: '#dc2626',
                            wordBreak: 'break-all',
                          }}>
                            {log.oldValue}
                          </div>
                        </div>
                      )}
                      {log.newValue && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                            ค่าใหม่
                          </div>
                          <div style={{
                            padding: '8px 12px',
                            background: '#dcfce7',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            color: '#16a34a',
                            wordBreak: 'break-all',
                          }}>
                            {log.newValue}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{
                      marginTop: '12px',
                      fontSize: '0.75rem',
                      color: '#94a3b8',
                    }}>
                      IP: {log.ipAddress || 'ไม่ทราบ'} | 
                      ผู้ใช้: {log.userEmail || 'ไม่ทราบ'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            padding: '16px',
            borderTop: '1px solid #e2e8f0',
          }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                background: 'white',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              ก่อนหน้า
            </button>
            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
              หน้า {currentPage} จาก {pagination.totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage === pagination.totalPages}
              style={{
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                background: 'white',
                cursor: currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === pagination.totalPages ? 0.5 : 1,
              }}
            >
              ถัดไป
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
