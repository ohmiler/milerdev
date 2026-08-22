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

  const normalizeSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙\s-]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-/, '')
      .substring(0, 200);
  };

  const generateSlug = (title: string) => {
    return normalizeSlug(title).replace(/-$/, '');
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
        router.push(`/admin/blog/${data.postId}/edit`);
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
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href="/admin/blog" style={{ color: 'var(--muted-foreground)', textDecoration: 'none', fontSize: '0.875rem' }}>
            ← กลับไปรายการบทความ
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--foreground)', marginTop: '8px' }}>
            เขียนบทความใหม่
          </h1>
        </div>
        {/* Top action buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link
            href="/admin/blog"
            style={{
              padding: '10px 20px',
              background: 'var(--muted)',
              color: 'var(--muted-foreground)',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            ยกเลิก
          </Link>
          <button
            form="blog-form"
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 24px',
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'กำลังสร้าง...' : 'สร้างบทความ'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'var(--color-error-soft)',
          border: '1px solid var(--color-error-soft)',
          color: 'var(--color-error-strong)',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          {error}
        </div>
      )}

      {/* Two-column layout */}
      <form id="blog-form" onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
        {/* Left: Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Title */}
          <div style={{
            background: 'var(--card)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: 'var(--foreground)' }}>
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
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '1.0625rem',
                boxSizing: 'border-box',
              }}
            />

            {/* Slug */}
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}>
                Slug (URL)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>/blog/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true);
                    setFormData({ ...formData, slug: normalizeSlug(e.target.value) });
                  }}
                  placeholder="auto-generated-from-title"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    color: 'var(--muted-foreground)',
                    boxSizing: 'border-box',
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
                      background: 'var(--muted)',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'var(--muted-foreground)',
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
          </div>

          {/* Excerpt */}
          <div style={{
            background: 'var(--card)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: 'var(--foreground)' }}>
              เนื้อหาย่อ (Excerpt)
            </label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              placeholder="สรุปเนื้อหาสั้นๆ สำหรับแสดงในหน้ารายการและ SEO..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '0.9375rem',
                resize: 'vertical',
                boxSizing: 'border-box',
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* Content */}
          <div style={{
            background: 'var(--card)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '12px', color: 'var(--foreground)' }}>
              เนื้อหา
            </label>
            <RichTextEditor
              content={formData.content}
              onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
            />
          </div>
        </div>

        {/* Right: Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Publish settings */}
          <div style={{
            background: 'var(--card)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '16px' }}>
              การเผยแพร่
            </h3>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}>
              สถานะ
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '0.9375rem',
                background: 'var(--card)',
                boxSizing: 'border-box',
              }}
            >
              <option value="draft">แบบร่าง</option>
              <option value="published">เผยแพร่</option>
            </select>
          </div>

          {/* Tags */}
          <div style={{
            background: 'var(--card)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '16px' }}>
              แท็ก
            </h3>
            <TagSelector
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
            />
          </div>

          {/* Thumbnail */}
          <div style={{
            background: 'var(--card)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '16px' }}>
              รูปภาพปก
            </h3>
            <ImageUpload
              value={formData.thumbnailUrl}
              onChange={(url) => setFormData(prev => ({ ...prev, thumbnailUrl: url }))}
              folder="blog"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
