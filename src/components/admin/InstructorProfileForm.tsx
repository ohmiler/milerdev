'use client';

import { Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { AdminPendingLabel, AdminSection } from '@/components/admin/ui/AdminOperations';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/components/ui/Toast';
import type { InstructorProfileLink } from '@/lib/db/schema';

export interface InstructorProfile {
  headline: string | null;
  bio: string | null;
  profileLinks: InstructorProfileLink[] | null;
}

const MAX_LINKS = 4;

/** The public instructor card shown on the course pages this user teaches. */
export default function InstructorProfileForm({ userId, profile }: { userId: string; profile: InstructorProfile }) {
  const [headline, setHeadline] = useState(profile.headline ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [links, setLinks] = useState<InstructorProfileLink[]>(profile.profileLinks ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateLink = (index: number, change: Partial<InstructorProfileLink>) => {
    setLinks((current) => current.map((link, position) => (position === index ? { ...link, ...change } : link)));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/instructor-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          profileLinks: links.filter((link) => link.label.trim() || link.url.trim()),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'บันทึกประวัติผู้สอนไม่สำเร็จ');
      showToast('บันทึกประวัติผู้สอนแล้ว', 'success');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกประวัติผู้สอนไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSection title="ประวัติผู้สอน" description="แสดงในการ์ดผู้สอนบนหน้าคอร์สที่บัญชีนี้เป็นผู้สอน ช่องที่เว้นว่างจะไม่แสดง">
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          <Field>
            <FieldLabel htmlFor="instructor-headline">ตำแหน่ง</FieldLabel>
            <Input id="instructor-headline" maxLength={160} value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="เช่น ผู้ก่อตั้งและผู้สอน MilerDev" />
          </Field>
          <Field>
            <FieldLabel htmlFor="instructor-bio">ประวัติ</FieldLabel>
            <Textarea id="instructor-bio" rows={4} maxLength={1000} value={bio} onChange={(event) => setBio(event.target.value)} />
            <FieldDescription>เล่าสิ่งที่ผู้เรียนตรวจสอบได้ เช่น ช่องที่สอน หรือประสบการณ์ทำงาน {bio.length}/1000 ตัวอักษร</FieldDescription>
          </Field>
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-medium">ลิงก์ (https เท่านั้น)</legend>
            {links.map((link, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end">
                <Field>
                  <FieldLabel htmlFor={`instructor-link-label-${index}`}>ชื่อลิงก์</FieldLabel>
                  <Input id={`instructor-link-label-${index}`} maxLength={40} value={link.label} onChange={(event) => updateLink(index, { label: event.target.value })} placeholder="ช่อง YouTube" />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`instructor-link-url-${index}`}>URL</FieldLabel>
                  <Input id={`instructor-link-url-${index}`} type="url" value={link.url} onChange={(event) => updateLink(index, { url: event.target.value })} placeholder="https://www.youtube.com/@MilerDev" />
                </Field>
                <Button type="button" variant="outline" aria-label={`ลบลิงก์ที่ ${index + 1}`} onClick={() => setLinks((current) => current.filter((_, position) => position !== index))}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
            {links.length < MAX_LINKS ? (
              <Button type="button" variant="outline" className="justify-self-start" onClick={() => setLinks((current) => [...current, { label: '', url: '' }])}>
                <Plus data-icon="inline-start" aria-hidden />เพิ่มลิงก์
              </Button>
            ) : null}
          </fieldset>
          <Button type="submit" disabled={saving} className="justify-self-start">
            {saving ? <AdminPendingLabel>กำลังบันทึก</AdminPendingLabel> : <><Save data-icon="inline-start" aria-hidden />บันทึกประวัติผู้สอน</>}
          </Button>
        </FieldGroup>
      </form>
    </AdminSection>
  );
}
