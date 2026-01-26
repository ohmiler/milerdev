'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  createdAt: string;
  enrollmentCount: number;
}

interface Stats {
  total: number;
  admins: number;
  instructors: number;
  students: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'student' });

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({ name: user.name || '', role: user.role });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    
    setUpdating(editingUser.id);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        await fetchUsers();
        setEditingUser(null);
      } else {
        const data = await res.json();
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;

    setUpdating(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'ไม่สามารถลบผู้ใช้ได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setUpdating(null);
    }
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'admin': return { background: '#fef2f2', color: '#dc2626' };
      case 'instructor': return { background: '#fef3c7', color: '#d97706' };
      default: return { background: '#dcfce7', color: '#16a34a' };
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'instructor': return 'ผู้สอน';
      default: return 'นักเรียน';
    }
  };

  if (loading) {
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
          จัดการผู้ใช้
        </h1>
        <p style={{ color: '#64748b' }}>จัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึง</p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>ผู้ใช้ทั้งหมด</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>{stats.total}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>Admin</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{stats.admins}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>ผู้สอน</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{stats.instructors}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>นักเรียน</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{stats.students}</div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            margin: '16px',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px', color: '#1e293b' }}>
              แก้ไขผู้ใช้
            </h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
                ชื่อ
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
                Role
              </label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  background: 'white',
                }}
              >
                <option value="student">นักเรียน</option>
                <option value="instructor">ผู้สอน</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingUser(null)}
                style={{
                  padding: '10px 20px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={updating === editingUser.id}
                style={{
                  padding: '10px 20px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: updating === editingUser.id ? 'not-allowed' : 'pointer',
                  opacity: updating === editingUser.id ? 0.7 : 1,
                }}
              >
                {updating === editingUser.id ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                  ผู้ใช้
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                  Role
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                  คอร์สที่ลงทะเบียน
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                  วันที่สมัคร
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                  การดำเนินการ
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}>
                        {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>
                          {user.name || 'ไม่ระบุชื่อ'}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '50px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      ...getRoleStyle(user.role),
                    }}>
                      {getRoleText(user.role)}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                    {user.enrollmentCount} คอร์ส
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    }) : '-'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleEdit(user)}
                        style={{
                          padding: '6px 12px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={updating === user.id}
                        style={{
                          padding: '6px 12px',
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: updating === user.id ? 'not-allowed' : 'pointer',
                          opacity: updating === user.id ? 0.7 : 1,
                        }}
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

        {users.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            ยังไม่มีผู้ใช้
          </div>
        )}
      </div>
    </div>
  );
}
