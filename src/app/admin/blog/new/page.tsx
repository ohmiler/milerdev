'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

import AdminBlogEditorForm, { type BlogEditorData } from '@/components/admin/AdminBlogEditorForm';
import { AdminPageHeader, AdminPendingLabel } from '@/components/admin/ui/AdminOperations';
import { Button } from '@/components/ui/button';

const initialForm: BlogEditorData = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  thumbnailUrl: '',
  status: 'draft',
};

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙\s-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-/, '')
    .substring(0, 200);
}

function generateSlug(title: string) {
  return normalizeSlug(title).replace(/-$/, '');
}

export default function NewBlogPostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [formData, setFormData] = useState<BlogEditorData>(initialForm);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
        router.push('/admin/blog/' + data.postId + '/edit');
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
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Editorial"
        title="เขียนบทความใหม่"
        description="เตรียมชื่อ URL เนื้อหา แท็ก และรูปปกก่อนเลือกสถานะเผยแพร่"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/admin/blog">
                <ArrowLeft aria-hidden />
                ยกเลิก
              </Link>
            </Button>
            <Button form="blog-form" type="submit" disabled={loading}>
              {loading ? <AdminPendingLabel>กำลังสร้าง...</AdminPendingLabel> : 'สร้างบทความ'}
            </Button>
          </>
        }
      />

      <AdminBlogEditorForm
        formId="blog-form"
        value={formData}
        selectedTagIds={selectedTagIds}
        error={error}
        slugCanReset={slugManuallyEdited}
        onChange={setFormData}
        onTitleChange={(title) =>
          setFormData((current) => ({
            ...current,
            title,
            ...(!slugManuallyEdited ? { slug: generateSlug(title) } : {}),
          }))
        }
        onSlugChange={(slug) => {
          setSlugManuallyEdited(true);
          setFormData((current) => ({ ...current, slug: normalizeSlug(slug) }));
        }}
        onResetSlug={() => {
          setSlugManuallyEdited(false);
          setFormData((current) => ({ ...current, slug: generateSlug(current.title) }));
        }}
        onTagsChange={setSelectedTagIds}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
