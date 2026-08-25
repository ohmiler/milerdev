'use client';

import { ArrowLeft, BookOpen, Save } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  AdminMetricCard,
  AdminPageHeader,
  AdminPendingLabel,
  AdminSection,
  AdminStatusBadge,
} from '@/components/admin/ui/AdminOperations';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { DEFAULT_CERTIFICATE_COLOR } from '@/lib/certificate-color';

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false });
const ImageUpload = dynamic(() => import('@/components/admin/ImageUpload'), { ssr: false });
const TagSelector = dynamic(() => import('@/components/admin/TagSelector'), { ssr: false });
const CertificateColorPicker = dynamic(() => import('@/components/admin/CertificateColorPicker'), { ssr: false });

export default function NewCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    price: '0',
    status: 'draft',
    thumbnailUrl: '',
    certificateColor: DEFAULT_CERTIFICATE_COLOR,
  });
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const generateSlug = (title: string) => title
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙\s-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tagIds: selectedTagIds, certificateColor: formData.certificateColor }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'สร้างคอร์สไม่สำเร็จ');
      router.push('/admin/courses');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'สร้างคอร์สไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const normalizedSlug = formData.slug || generateSlug(formData.title);
  const isFreeCourse = Number(formData.price || 0) <= 0;
  const isPublished = formData.status === 'published';
  const statusLabel = isPublished ? 'เผยแพร่' : 'แบบร่าง';
  const priceLabel = isFreeCourse ? 'ฟรี' : new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(Number(formData.price || 0));
  const readyItems = [Boolean(formData.title.trim()), Boolean(formData.description.trim()), Boolean(formData.thumbnailUrl)];
  const readiness = Math.round((readyItems.filter(Boolean).length / readyItems.length) * 100);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <AdminPageHeader
        eyebrow="Course setup"
        title="สร้างคอร์สใหม่"
        description="กำหนดข้อมูลหลัก ราคา สถานะ และภาพลักษณ์ก่อนเพิ่มบทเรียนในขั้นถัดไป"
        actions={<Button asChild variant="outline"><Link href="/admin/courses"><ArrowLeft data-icon="inline-start" aria-hidden />กลับไปรายการคอร์ส</Link></Button>}
        meta="แนะนำให้เริ่มเป็นแบบร่าง แล้วตรวจบทเรียนและหน้าขายก่อนเผยแพร่"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard label="สถานะเริ่มต้น" value={statusLabel} tone={isPublished ? 'success' : 'warning'} detail={isPublished ? 'จะแสดงต่อผู้ใช้ทันทีหลังสร้าง' : 'ตรวจสอบและแก้ไขต่อได้'} />
        <AdminMetricCard label="รูปแบบราคา" value={priceLabel} tone={isFreeCourse ? 'success' : 'info'} detail={isFreeCourse ? 'ราคา 0 บาท' : 'ราคาหลักของคอร์ส'} />
        <AdminMetricCard label="ความพร้อมเบื้องต้น" value={`${readiness}%`} tone={readiness === 100 ? 'success' : 'neutral'} detail="ชื่อ คำอธิบาย และภาพปก" />
      </div>

      {error ? <Alert variant="destructive"><AlertTitle>สร้างคอร์สไม่สำเร็จ</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      <form id="course-setup-form" onSubmit={handleSubmit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-6">
          <AdminSection title="ตัวตนและบริบทของคอร์ส" description="ข้อมูลที่ใช้บนหน้าขาย การค้นหา และในระบบผู้ดูแล">
            <FieldGroup>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="course-title">ชื่อคอร์ส *</FieldLabel>
                  <Input
                    id="course-title"
                    value={formData.title}
                    onChange={(event) => {
                      const title = event.target.value;
                      setFormData((previous) => ({ ...previous, title, ...(!slugManuallyEdited ? { slug: generateSlug(title) } : {}) }));
                    }}
                    required
                    placeholder="เช่น JavaScript for Beginners"
                  />
                  <FieldDescription>ใช้ชื่อที่สื่อผลลัพธ์ของคอร์สได้ชัดเจน</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="course-slug">Slug (URL)</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>/courses/</InputGroupAddon>
                    <InputGroupInput id="course-slug" value={formData.slug} onChange={(event) => { setSlugManuallyEdited(true); setFormData((previous) => ({ ...previous, slug: event.target.value })); }} placeholder="course-slug" />
                    {slugManuallyEdited ? <InputGroupAddon align="inline-end"><InputGroupButton type="button" onClick={() => { setSlugManuallyEdited(false); setFormData((previous) => ({ ...previous, slug: generateSlug(previous.title) })); }}>รีเซ็ต</InputGroupButton></InputGroupAddon> : null}
                  </InputGroup>
                  <FieldDescription>ตัวอย่าง: /courses/{normalizedSlug || 'course-slug'}</FieldDescription>
                </Field>
              </div>
              <Field>
                <FieldLabel>คำอธิบาย</FieldLabel>
                <RichTextEditor content={formData.description} onChange={(description) => setFormData((previous) => ({ ...previous, description }))} />
              </Field>
              <Field>
                <FieldLabel>แท็ก</FieldLabel>
                <TagSelector selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />
              </Field>
            </FieldGroup>
          </AdminSection>

          <AdminSection title="ราคาและการมองเห็น" description="กำหนดราคาหลักและสถานะเริ่มต้นของคอร์ส">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="course-price">ราคา (บาท)</FieldLabel>
                <Input id="course-price" type="number" min="0" value={formData.price} onChange={(event) => setFormData((previous) => ({ ...previous, price: event.target.value }))} placeholder="0" />
                <FieldDescription>ใช้ 0 สำหรับคอร์สฟรี</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="course-status">สถานะเริ่มต้น</FieldLabel>
                <NativeSelect id="course-status" className="w-full" value={formData.status} onChange={(event) => setFormData((previous) => ({ ...previous, status: event.target.value }))}>
                  <NativeSelectOption value="draft">แบบร่าง</NativeSelectOption>
                  <NativeSelectOption value="published">เผยแพร่</NativeSelectOption>
                </NativeSelect>
                <FieldDescription>การเผยแพร่ทันทีจะทำให้ผู้ใช้มองเห็นและซื้อคอร์สได้</FieldDescription>
              </Field>
            </div>
          </AdminSection>

          <AdminSection title="ภาพลักษณ์และใบรับรอง" description="เพิ่มภาพปกและเลือกสีหลักของใบรับรอง">
            <div className="grid gap-6 md:grid-cols-2">
              <Field><FieldLabel>รูปภาพปก</FieldLabel><ImageUpload value={formData.thumbnailUrl} onChange={(thumbnailUrl) => setFormData((previous) => ({ ...previous, thumbnailUrl }))} folder="courses" /></Field>
              <Field><FieldLabel>สีใบรับรอง</FieldLabel><CertificateColorPicker value={formData.certificateColor} onChange={(certificateColor) => setFormData((previous) => ({ ...previous, certificateColor }))} /></Field>
            </div>
          </AdminSection>
        </div>

        <aside className="lg:sticky lg:top-24">
          <Card>
            <CardHeader><CardTitle>พร้อมสร้างคอร์ส</CardTitle><CardDescription>ตรวจข้อมูลสำคัญก่อนบันทึก แล้วไปเพิ่มบทเรียนต่อได้ทันที</CardDescription></CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 text-sm">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">สถานะ</span><AdminStatusBadge tone={isPublished ? 'success' : 'warning'}>{statusLabel}</AdminStatusBadge></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">ราคา</span><strong>{priceLabel}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">URL</span><span className="max-w-44 truncate font-mono text-xs">/courses/{normalizedSlug || 'course-slug'}</span></div>
              </div>
              {isPublished ? <Alert><AlertTitle>เผยแพร่ทันที</AlertTitle><AlertDescription>ตรวจชื่อ ราคา และภาพปกให้พร้อมก่อนสร้าง</AlertDescription></Alert> : null}
              <Button type="submit" disabled={loading} size="lg">
                {loading ? <AdminPendingLabel>กำลังสร้างคอร์ส</AdminPendingLabel> : <><Save data-icon="inline-start" aria-hidden />สร้างคอร์ส</>}
              </Button>
              <Button asChild variant="outline"><Link href="/admin/courses">ยกเลิก</Link></Button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><BookOpen className="size-4" aria-hidden />บทเรียนเพิ่มได้หลังสร้างคอร์ส</div>
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
  );
}
