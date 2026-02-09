'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false });

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditCoursePage({ params }: Props) {
  const router = useRouter();
  const [courseId, setCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    price: '0',
    status: 'draft',
    thumbnailUrl: '',
  });

  useEffect(() => {
    params.then(({ id }) => {
      setCourseId(id);
      // Fetch course data
      fetch(`/api/admin/courses/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.course) {
            setFormData({
              title: data.course.title || '',
              slug: data.course.slug || '',
              description: data.course.description || '',
              price: String(data.course.price || 0),
              status: data.course.status || 'draft',
              thumbnailUrl: data.course.thumbnailUrl || '',
            });
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    
    setError('');
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/admin/courses');
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!courseId) return;
    setShowDeleteConfirm(false);

    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('ลบคอร์สสำเร็จ', 'success');
        router.push('/admin/courses');
      } else {
        const data = await res.json();
        showToast(data.error || 'ไม่สามารถลบคอร์สได้', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
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
    <div style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link href="/admin/courses" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← กลับไปรายการคอร์ส
        </Link>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: '#1e293b',
          marginTop: '8px',
        }}>
          แก้ไขคอร์ส
        </h1>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '24px',
        }}>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
            ชื่อคอร์ส *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '1rem',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
            Slug (URL)
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '1rem',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
            คำอธิบาย
          </label>
          <RichTextEditor
            content={formData.description}
            onChange={(html) => setFormData(prev => ({ ...prev, description: html }))}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
              ราคา (บาท)
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              min="0"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
              สถานะ
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
                background: 'white',
              }}
            >
              <option value="draft">แบบร่าง</option>
              <option value="published">เผยแพร่</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
            URL รูปภาพปก
          </label>
          <input
            type="url"
            value={formData.thumbnailUrl}
            onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '1rem',
            }}
          />
          {formData.thumbnailUrl && (
            <div style={{ marginTop: '8px' }}>
              <img
                src={formData.thumbnailUrl}
                alt="Preview"
                style={{
                  maxWidth: '200px',
                  maxHeight: '120px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '1px solid #e2e8f0',
                }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '12px 24px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
            <Link
              href="/admin/courses"
              style={{
                padding: '12px 24px',
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                textDecoration: 'none',
              }}
            >
              ยกเลิก
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: '12px 24px',
              background: '#fef2f2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            ลบคอร์ส
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="ลบคอร์ส"
        message="คุณแน่ใจหรือไม่ที่จะลบคอร์สนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
        confirmText="ลบคอร์ส"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
