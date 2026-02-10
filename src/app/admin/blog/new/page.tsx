'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false });
const ImageUpload = dynamic(() => import('@/components/admin/ImageUpload'), { ssr: false });
const TagSelector = dynamic(() => import('@/components/admin/TagSelector'), { ssr: false });

export default function NewBlogPostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    thumbnailUrl: '',
    status: 'draft',
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙\s-]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/blog', {
        method: 'POST',
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
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/admin/blog" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← กลับไปรายการบทความ
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginTop: '8px' }}>
          เขียนบทความใหม่
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
            onChange={(e) => {
              const newTitle = e.target.value;
              setFormData(prev => ({
                ...prev,
                title: newTitle,
                ...(!slugManuallyEdited ? { slug: generateSlug(newTitle) } : {}),
              }));
            }}
            required
            placeholder="เช่น วิธีเริ่มต้นเขียน JavaScript"
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>/blog/</span>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                setFormData({ ...formData, slug: e.target.value });
              }}
              placeholder="auto-generated-from-title"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
            />
            {slugManuallyEdited && (
              <button
                type="button"
                onClick={() => {
                  setSlugManuallyEdited(false);
                  setFormData(prev => ({ ...prev, slug: generateSlug(prev.title) }));
                }}
                style={{
                  padding: '8px 12px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#475569',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                รีเซ็ต
              </button>
            )}
          </div>
        </div>

        {/* Excerpt */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
            เนื้อหาย่อ (Excerpt)
          </label>
          <textarea
            value={formData.excerpt}
            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            placeholder="สรุปเนื้อหาสั้นๆ สำหรับแสดงในหน้ารายการ..."
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

        {/* Submit */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'กำลังสร้าง...' : 'สร้างบทความ'}
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
      </form>
    </div>
  );
}
