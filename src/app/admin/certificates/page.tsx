'use client';

import { useState, useEffect } from 'react';

interface Certificate {
  id: string;
  certificateCode: string;
  recipientName: string;
  courseTitle: string;
  completedAt: string;
  issuedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  userId: string;
  courseId: string;
  userEmail: string | null;
}

export default function AdminCertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const fetchCerts = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    fetch(`/api/admin/certificates?${params}`)
      .then(res => res.json())
      .then(data => setCerts(data.certificates || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    fetch(`/api/admin/certificates?${params}`)
      .then(res => res.json())
      .then(data => setCerts(data.certificates || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const handleRevoke = async (id: string) => {
    const res = await fetch(`/api/admin/certificates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke', reason: revokeReason }),
    });
    if (res.ok) {
      setRevokeId(null);
      setRevokeReason('');
      fetchCerts();
    }
  };

  const handleRestore = async (id: string) => {
    const res = await fetch(`/api/admin/certificates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore' }),
    });
    if (res.ok) fetchCerts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบใบรับรองนี้?')) return;
    const res = await fetch(`/api/admin/certificates/${id}`, { method: 'DELETE' });
    if (res.ok) fetchCerts();
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>จัดการใบรับรอง</h1>
        <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 600 }}>
          ทั้งหมด {certs.length} ใบ
        </span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <form onSubmit={e => { e.preventDefault(); fetchCerts(); }} style={{ display: 'flex', gap: '8px', flex: 1 }}>
          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัส, คอร์ส..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px',
              fontSize: '0.9375rem', minWidth: '200px',
            }}
          />
          <button type="submit" style={{
            padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none',
            borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
          }}>ค้นหา</button>
        </form>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9375rem' }}
        >
          <option value="all">ทุกสถานะ</option>
          <option value="active">ใช้งาน</option>
          <option value="revoked">เพิกถอน</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>กำลังโหลด...</p>
      ) : certs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '1.125rem', color: '#64748b', marginBottom: '8px' }}>ยังไม่มีใบรับรอง</p>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>ใบรับรองจะออกอัตโนมัติเมื่อผู้เรียนเรียนจบคอร์ส</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9375rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontWeight: 600 }}>รหัสใบรับรอง</th>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontWeight: 600 }}>ผู้รับ</th>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontWeight: 600 }}>คอร์ส</th>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontWeight: 600 }}>วันที่ออก</th>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontWeight: 600 }}>สถานะ</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', color: '#64748b', fontWeight: 600 }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {certs.map(cert => (
                <tr key={cert.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <a
                      href={`/certificate/${cert.certificateCode}`}
                      target="_blank"
                      style={{ fontFamily: 'monospace', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                    >
                      {cert.certificateCode}
                    </a>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ fontWeight: 500 }}>{cert.recipientName}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{cert.userEmail}</div>
                  </td>
                  <td style={{ padding: '12px 8px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cert.courseTitle}
                  </td>
                  <td style={{ padding: '12px 8px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {formatDate(cert.issuedAt)}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    {cert.revokedAt ? (
                      <span style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8125rem', fontWeight: 600 }}>
                        เพิกถอน
                      </span>
                    ) : (
                      <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8125rem', fontWeight: 600 }}>
                        ใช้งาน
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {cert.revokedAt ? (
                        <button
                          onClick={() => handleRestore(cert.id)}
                          style={{ padding: '6px 12px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}
                        >
                          คืนสถานะ
                        </button>
                      ) : (
                        <button
                          onClick={() => setRevokeId(cert.id)}
                          style={{ padding: '6px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}
                        >
                          เพิกถอน
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(cert.id)}
                        style={{ padding: '6px 12px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem' }}
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Revoke Modal */}
      {revokeId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>เพิกถอนใบรับรอง</h3>
            <textarea
              placeholder="เหตุผลในการเพิกถอน (ไม่บังคับ)"
              value={revokeReason}
              onChange={e => setRevokeReason(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9375rem', marginBottom: '16px', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setRevokeId(null); setRevokeReason(''); }} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
                ยกเลิก
              </button>
              <button onClick={() => handleRevoke(revokeId)} style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                ยืนยันเพิกถอน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
