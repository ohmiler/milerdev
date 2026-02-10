'use client';

import { useState, useEffect } from 'react';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: string;
  minPurchase: string | null;
  maxDiscount: string | null;
  usageLimit: number | null;
  usageCount: number | null;
  perUserLimit: number | null;
  courseId: string | null;
  courseTitle: string | null;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string | null;
}

interface CourseOption {
  id: string;
  title: string;
}

const defaultForm = {
  code: '',
  description: '',
  discountType: 'percentage' as 'percentage' | 'fixed',
  discountValue: '',
  minPurchase: '',
  maxDiscount: '',
  usageLimit: '',
  perUserLimit: '1',
  courseId: '',
  startsAt: '',
  expiresAt: '',
};

export default function AdminCouponsPage() {
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);

  const fetchCoupons = () => {
    setLoading(true);
    fetch('/api/admin/coupons')
      .then(r => r.json())
      .then(d => setCouponsList(d.coupons || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCoupons();
    fetch('/api/admin/courses')
      .then(r => r.json())
      .then(d => setCourseOptions((d.courses || []).map((c: any) => ({ id: c.id, title: c.title }))))
      .catch(console.error);
  }, []);

  const handleEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType as 'percentage' | 'fixed',
      discountValue: coupon.discountValue,
      minPurchase: coupon.minPurchase || '',
      maxDiscount: coupon.maxDiscount || '',
      usageLimit: coupon.usageLimit?.toString() || '',
      perUserLimit: coupon.perUserLimit?.toString() || '1',
      courseId: coupon.courseId || '',
      startsAt: coupon.startsAt ? new Date(coupon.startsAt).toISOString().slice(0, 16) : '',
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 16) : '',
    });
    setShowForm(true);
    setError('');
  };

  const handleCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      discountValue: parseFloat(form.discountValue) || 0,
      minPurchase: form.minPurchase ? parseFloat(form.minPurchase) : 0,
      maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
      usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
      perUserLimit: form.perUserLimit ? parseInt(form.perUserLimit) : 1,
      courseId: form.courseId || null,
      startsAt: form.startsAt || null,
      expiresAt: form.expiresAt || null,
    };

    try {
      const url = editingId ? `/api/admin/coupons/${editingId}` : '/api/admin/coupons';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        fetchCoupons();
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setError('เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch(`/api/admin/coupons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchCoupons();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบคูปองนี้?')) return;
    await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
    fetchCoupons();
  };

  const formatDiscount = (type: string, value: string) =>
    type === 'percentage' ? `${value}%` : `฿${parseFloat(value).toLocaleString()}`;

  const isExpired = (d: string | null) => d && new Date(d) < new Date();

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
    borderRadius: '8px', fontSize: '0.9375rem',
  };
  const labelStyle = { display: 'block' as const, fontWeight: 500, marginBottom: '6px', color: '#374151', fontSize: '0.875rem' };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>จัดการคูปอง / โค้ดส่วนลด</h1>
        <button onClick={handleCreate} style={{
          padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none',
          borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
        }}>+ สร้างคูปอง</button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', color: '#1e293b' }}>
              {editingId ? 'แก้ไขคูปอง' : 'สร้างคูปองใหม่'}
            </h2>

            {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>รหัสคูปอง *</label>
                  <input required value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" style={{ ...inputStyle, fontFamily: 'monospace', textTransform: 'uppercase' }} />
                </div>
                <div>
                  <label style={labelStyle}>ประเภทส่วนลด *</label>
                  <select value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value as any }))} style={inputStyle}>
                    <option value="percentage">เปอร์เซ็นต์ (%)</option>
                    <option value="fixed">จำนวนเงิน (฿)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>มูลค่าส่วนลด *</label>
                  <input required type="number" step="0.01" min="0" value={form.discountValue} onChange={e => setForm(p => ({ ...p, discountValue: e.target.value }))} placeholder={form.discountType === 'percentage' ? '20' : '100'} style={inputStyle} />
                </div>
                {form.discountType === 'percentage' && (
                  <div>
                    <label style={labelStyle}>ลดสูงสุด (฿)</label>
                    <input type="number" step="0.01" min="0" value={form.maxDiscount} onChange={e => setForm(p => ({ ...p, maxDiscount: e.target.value }))} placeholder="ไม่จำกัด" style={inputStyle} />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>คำอธิบาย</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="เช่น ส่วนลด 20% สำหรับลูกค้าใหม่" style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>ราคาขั้นต่ำ (฿)</label>
                  <input type="number" step="0.01" min="0" value={form.minPurchase} onChange={e => setForm(p => ({ ...p, minPurchase: e.target.value }))} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>ใช้ได้กับคอร์ส</label>
                  <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))} style={inputStyle}>
                    <option value="">ทุกคอร์ส</option>
                    {courseOptions.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>จำนวนใช้ได้ (ทั้งหมด)</label>
                  <input type="number" min="0" value={form.usageLimit} onChange={e => setForm(p => ({ ...p, usageLimit: e.target.value }))} placeholder="ไม่จำกัด" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>จำนวนต่อคน</label>
                  <input type="number" min="1" value={form.perUserLimit} onChange={e => setForm(p => ({ ...p, perUserLimit: e.target.value }))} placeholder="1" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={labelStyle}>เริ่มใช้ได้</label>
                  <input type="datetime-local" value={form.startsAt} onChange={e => setForm(p => ({ ...p, startsAt: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>หมดอายุ</label>
                  <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>ยกเลิก</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'กำลังบันทึก...' : editingId ? 'อัพเดท' : 'สร้างคูปอง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupons Table */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>กำลังโหลด...</p>
      ) : couponsList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '1.125rem', color: '#64748b', marginBottom: '8px' }}>ยังไม่มีคูปอง</p>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>สร้างคูปองเพื่อเริ่มให้ส่วนลด</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9375rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontWeight: 600 }}>รหัส</th>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontWeight: 600 }}>ส่วนลด</th>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontWeight: 600 }}>คอร์ส</th>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontWeight: 600 }}>ใช้แล้ว</th>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontWeight: 600 }}>สถานะ</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', color: '#64748b', fontWeight: 600 }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {couponsList.map(c => {
                const expired = isExpired(c.expiresAt);
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: expired || !c.isActive ? 0.6 : 1 }}>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>{c.code}</span>
                      {c.description && <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '2px' }}>{c.description}</div>}
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 600, color: '#16a34a' }}>
                      {formatDiscount(c.discountType, c.discountValue)}
                      {c.maxDiscount && <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>สูงสุด ฿{parseFloat(c.maxDiscount).toLocaleString()}</div>}
                    </td>
                    <td style={{ padding: '12px 8px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.courseTitle || <span style={{ color: '#94a3b8' }}>ทุกคอร์ส</span>}
                    </td>
                    <td style={{ padding: '12px 8px', color: '#64748b' }}>
                      {c.usageCount || 0}{c.usageLimit ? `/${c.usageLimit}` : ''}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      {expired ? (
                        <span style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8125rem', fontWeight: 600 }}>หมดอายุ</span>
                      ) : c.isActive ? (
                        <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8125rem', fontWeight: 600 }}>ใช้งาน</span>
                      ) : (
                        <span style={{ background: '#f8fafc', color: '#94a3b8', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8125rem', fontWeight: 600 }}>ปิดใช้งาน</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleEdit(c)} style={{ padding: '6px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem' }}>แก้ไข</button>
                        <button onClick={() => handleToggle(c.id, !!c.isActive)} style={{ padding: '6px 10px', background: c.isActive ? '#fef2f2' : '#f0fdf4', color: c.isActive ? '#dc2626' : '#16a34a', border: `1px solid ${c.isActive ? '#fecaca' : '#bbf7d0'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem' }}>
                          {c.isActive ? 'ปิด' : 'เปิด'}
                        </button>
                        <button onClick={() => handleDelete(c.id)} style={{ padding: '6px 10px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem' }}>ลบ</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
