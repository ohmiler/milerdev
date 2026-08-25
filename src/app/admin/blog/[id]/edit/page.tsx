'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';

import AdminBlogEditorForm, { type BlogEditorData } from '@/components/admin/AdminBlogEditorForm';
import { AdminConfirmActionDialog } from '@/components/admin/ui/AdminConfirmActionDialog';
import { AdminLoadingState, AdminPageHeader, AdminPendingLabel } from '@/components/admin/ui/AdminOperations';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/Toast';

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

export default function EditBlogPostPage() {
  const router = useRouter();
  const { id: postId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<BlogEditorData>(initialForm);

  useEffect(() => {
    fetch('/api/admin/blog/' + postId)
      .then((response) => response.json())
      .then((data) => {
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
          setSelectedTagIds(data.tags.map((tag: { id: string }) => tag.id));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [postId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!postId) return;

    setError('');
    setSaving(true);

    try {
      const res = await fetch('/api/admin/blog/' + postId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tagIds: selectedTagIds }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast('บันทึกบทความสำเร็จ', 'success');
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
    setDeleting(true);

    try {
      const res = await fetch('/api/admin/blog/' + postId, { method: 'DELETE' });
      if (res.ok) {
        setShowDeleteConfirm(false);
        showToast('ลบบทความสำเร็จ', 'success');
        router.push('/admin/blog');
      } else {
        const data = await res.json();
        showToast(data.error || 'ไม่สามารถลบบทความได้', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <AdminLoadingState title="กำลังโหลดบทความ" description="กำลังเตรียมข้อมูลล่าสุดสำหรับแก้ไข" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Editorial"
        title="แก้ไขบทความ"
        description={formData.title || 'ปรับเนื้อหา แท็ก รูปปก และสถานะของบทความ'}
        meta={formData.slug ? '/blog/' + formData.slug : undefined}
        actions={
          <>
            {formData.status === 'published' && formData.slug ? (
              <Button variant="outline" asChild>
                <Link href={'/blog/' + formData.slug} target="_blank">
                  <ExternalLink aria-hidden />
                  ดูบนเว็บ
                </Link>
              </Button>
            ) : null}
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 aria-hidden />
              ลบบทความ
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/blog">
                <ArrowLeft aria-hidden />
                ยกเลิก
              </Link>
            </Button>
            <Button form="blog-edit-form" type="submit" disabled={saving}>
              {saving ? <AdminPendingLabel>กำลังบันทึก...</AdminPendingLabel> : 'บันทึกการเปลี่ยนแปลง'}
            </Button>
          </>
        }
      />

      <AdminBlogEditorForm
        formId="blog-edit-form"
        value={formData}
        selectedTagIds={selectedTagIds}
        error={error}
        onChange={setFormData}
        onTitleChange={(title) => setFormData((current) => ({ ...current, title }))}
        onSlugChange={(slug) => setFormData((current) => ({ ...current, slug: normalizeSlug(slug) }))}
        onTagsChange={setSelectedTagIds}
        onSubmit={handleSubmit}
      />

      <AdminConfirmActionDialog
        open={showDeleteConfirm}
        title="ลบบทความ"
        description="บทความจะถูกลบถาวรและลิงก์สาธารณะจะใช้งานไม่ได้ การกระทำนี้ไม่สามารถย้อนกลับได้"
        target={formData.title}
        confirmLabel="ลบบทความ"
        pendingLabel="กำลังลบ"
        pending={deleting}
        onConfirm={handleDelete}
        onOpenChange={setShowDeleteConfirm}
      />
    </div>
  );
}
