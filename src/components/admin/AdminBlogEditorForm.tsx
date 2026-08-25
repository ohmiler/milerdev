'use client';

import dynamic from 'next/dynamic';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false });
const ImageUpload = dynamic(() => import('@/components/admin/ImageUpload'), { ssr: false });
const TagSelector = dynamic(() => import('@/components/admin/TagSelector'), { ssr: false });

export type BlogEditorData = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  thumbnailUrl: string;
  status: string;
};

type AdminBlogEditorFormProps = {
  formId: string;
  value: BlogEditorData;
  selectedTagIds: string[];
  error?: string;
  slugCanReset?: boolean;
  onChange: (value: BlogEditorData) => void;
  onTitleChange: (title: string) => void;
  onSlugChange: (slug: string) => void;
  onResetSlug?: () => void;
  onTagsChange: (tagIds: string[]) => void;
  onSubmit: (event: React.FormEvent) => void;
};

export default function AdminBlogEditorForm({
  formId,
  value,
  selectedTagIds,
  error,
  slugCanReset = false,
  onChange,
  onTitleChange,
  onSlugChange,
  onResetSlug,
  onTagsChange,
  onSubmit,
}: AdminBlogEditorFormProps) {
  return (
    <>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>บันทึกไม่สำเร็จ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form
        id={formId}
        onSubmit={onSubmit}
        className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="flex flex-col gap-5">
          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle>ข้อมูลบทความ</CardTitle>
              <CardDescription>ชื่อและ URL ที่ผู้อ่านจะเห็น</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="gap-5">
                <Field>
                  <FieldLabel htmlFor={formId + '-title'}>ชื่อบทความ *</FieldLabel>
                  <Input
                    id={formId + '-title'}
                    value={value.title}
                    onChange={(event) => onTitleChange(event.target.value)}
                    required
                    placeholder="เช่น วิธีเริ่มต้นเขียน JavaScript"
                    className="text-base"
                    autoFocus
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={formId + '-slug'}>Slug (URL)</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>/blog/</InputGroupAddon>
                    <InputGroupInput
                      id={formId + '-slug'}
                      value={value.slug}
                      onChange={(event) => onSlugChange(event.target.value)}
                      placeholder="auto-generated-from-title"
                    />
                    {slugCanReset && onResetSlug ? (
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton type="button" onClick={onResetSlug}>
                          รีเซ็ต
                        </InputGroupButton>
                      </InputGroupAddon>
                    ) : null}
                  </InputGroup>
                  <FieldDescription>ใช้ตัวอักษรไทย อังกฤษ ตัวเลข และขีดกลาง</FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle>เนื้อหาย่อ</CardTitle>
              <CardDescription>ใช้ในหน้ารวมบทความและข้อมูลสำหรับเครื่องมือค้นหา</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={value.excerpt}
                onChange={(event) => onChange({ ...value, excerpt: event.target.value })}
                rows={4}
                placeholder="สรุปเนื้อหาสั้น ๆ สำหรับหน้ารายการและ SEO"
                aria-label="เนื้อหาย่อ"
              />
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle>เนื้อหาหลัก</CardTitle>
              <CardDescription>จัดรูปแบบหัวข้อ ลิงก์ รูปภาพ และโค้ดจาก toolbar</CardDescription>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                content={value.content}
                onChange={(html) => onChange({ ...value, content: html })}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-5 xl:sticky xl:top-6">
          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle>การเผยแพร่</CardTitle>
              <CardDescription>เลือกบันทึกเป็นแบบร่างหรือเผยแพร่</CardDescription>
            </CardHeader>
            <CardContent>
              <Field>
                <FieldLabel htmlFor={formId + '-status'}>สถานะ</FieldLabel>
                <NativeSelect
                  id={formId + '-status'}
                  value={value.status}
                  onChange={(event) => onChange({ ...value, status: event.target.value })}
                >
                  <option value="draft">แบบร่าง</option>
                  <option value="published">เผยแพร่</option>
                </NativeSelect>
              </Field>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle>แท็ก</CardTitle>
              <CardDescription>ช่วยจัดกลุ่มและค้นหาบทความ</CardDescription>
            </CardHeader>
            <CardContent>
              <TagSelector selectedTagIds={selectedTagIds} onChange={onTagsChange} />
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle>รูปภาพปก</CardTitle>
              <CardDescription>ใช้บนหน้ารวมและเวลาแชร์ลิงก์</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={value.thumbnailUrl}
                onChange={(url) => onChange({ ...value, thumbnailUrl: url })}
                folder="blog"
              />
            </CardContent>
          </Card>
        </aside>
      </form>
    </>
  );
}
