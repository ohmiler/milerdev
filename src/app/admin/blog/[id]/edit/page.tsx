'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false });
const ImageUpload = dynamic(() => import('@/components/admin/ImageUpload'), { ssr: false });
const TagSelector = dynamic(() => import('@/components/admin/TagSelector'), { ssr: false });

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditBlogPostPage({ params }: Props) {
  const router = useRouter();
  const [postId, setPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    thumbnailUrl: '',
    status: 'draft',
  });

  useEffect(() => {
    params.then(({ id }) => {
      setPostId(id);
      fetch(`/api/admin/blog/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.post) {
            setFormData({
              title: data.post.title || '',
              slug: data.post.slug || '',
              excerpt: data.post.excerpt || '',
              content: data.post.content || '',
              thumbnailUrl: data.post.thumbnailUrl || '',
              status: data.post.status || 'draft',
            });
          }
          if (data.tags) {
            setSelectedTagIds(data.tags.map((t: { id: string }) => t.id));
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postId) return;

    setError('');
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/blog/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tagIds: selectedTagIds }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/admin/blog');
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
    if (!postId) return;
    setShowDeleteConfirm(false);

    try {
      const res = await fetch(`/api/admin/blog/${postId}`, { method: 'DELETE' });

      if (res.ok) {
        showToast('ลบบทความสำเร็จ', 'success');
        router.push('/admin/blog');
      } else {
        const data = await res.json();
        showToast(data.error || 'ไม่สามารถลบบทความได้', 'error');
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
      <div style={{ marginBottom: '24px' }}>
        <Link href="/admin/blog" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← กลับไปรายการบทความ
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginTop: '8px' }}>
          แก้ไขบทความ
        </h1>
      </div>

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

      <form onSubmit={handleSubmit} style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}>
        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
            ชื่อบทความ *
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

        {/* Slug */}
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

        {/* Excerpt */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
            เนื้อหาย่อ (Excerpt)
          </label>
          <textarea
            value={formData.excerpt}
            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            rows={3}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '1rem',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Content */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
            เนื้อหา
          </label>
          <RichTextEditor
            content={formData.content}
            onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
          />
        </div>

        {/* Status + Tags */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
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
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
              แท็ก
            </label>
            <TagSelector
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
            />
          </div>
        </div>

        {/* Thumbnail */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
            รูปภาพปก
          </label>
          <ImageUpload
            value={formData.thumbnailUrl}
            onChange={(url) => setFormData(prev => ({ ...prev, thumbnailUrl: url }))}
            folder="blog"
          />
        </div>

        {/* Actions */}
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
              href="/admin/blog"
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
            ลบบทความ
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="ลบบทความ"
        message="คุณแน่ใจหรือไม่ที่จะลบบทความนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
        confirmText="ลบบทความ"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
