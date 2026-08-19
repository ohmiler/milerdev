'use client';

import { useRef, useState } from 'react';
import { FormButton, FormInput, FormTextarea } from '@/components/ui/FormControls';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

type SubmitStatus = 'idle' | 'success' | 'error';

const emptyForm = { name: '', email: '', subject: '', message: '' };

export default function ContactForm() {
  const [formData, setFormData] = useState(emptyForm);
  const [honey, setHoney] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const formLoadTime = useRef(Date.now());

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, _honey: honey, _timestamp: formLoadTime.current }),
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        setSubmitStatus('error');
      } else {
        setSubmitStatus('success');
        setFormData(emptyForm);
        formLoadTime.current = Date.now();
      }
    } catch {
      setErrorMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900" role="status" aria-live="polite">
        <span aria-hidden="true">✓</span><AlertTitle>ส่งข้อความเรียบร้อย</AlertTitle><AlertDescription>ทีมได้รับรายละเอียดแล้ว และจะตอบกลับผ่านอีเมลที่คุณระบุ</AlertDescription>
        <FormButton className="mt-4 w-fit" type="button" onClick={() => setSubmitStatus('idle')}>ส่งข้อความใหม่</FormButton>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isSubmitting}>
      <div className="sr-only" inert={true} aria-hidden={true}>
        <label htmlFor={'contact-website'}>เว็บไซต์</label>
        <input id={'contact-website'} type={'text'} name={'website'} tabIndex={-1} autoComplete={'off'} value={honey} onChange={(event) => setHoney(event.target.value)} />
      </div>

      {submitStatus === 'error' && errorMessage ? (
        <Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name">ชื่อ</Label>
          <FormInput id={'contact-name'} name={'name'} type={'text'} required minLength={2} maxLength={100} autoComplete={'name'} value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} placeholder={'ชื่อที่ใช้ติดต่อ'} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">อีเมล</Label>
          <FormInput id={'contact-email'} name={'email'} type={'email'} required maxLength={255} autoComplete={'email'} value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} placeholder={'name@example.com'} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-subject">หัวข้อที่ต้องการติดต่อ</Label>
        <FormInput id={'contact-subject'} name={'subject'} type={'text'} required minLength={2} maxLength={200} value={formData.subject} onChange={(event) => setFormData({ ...formData, subject: event.target.value })} placeholder={'เช่น สอบถามการเข้าเรียนคอร์ส'} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="contact-message">รายละเอียด</Label>
          <span className="text-xs text-muted-foreground">10 ถึง 5,000 ตัวอักษร</span>
        </div>
        <FormTextarea id={'contact-message'} name={'message'} required minLength={10} maxLength={5000} rows={7} value={formData.message} onChange={(event) => setFormData({ ...formData, message: event.target.value })} placeholder={'อธิบายสิ่งที่ต้องการให้ทีมช่วย พร้อมข้อมูลที่เกี่ยวข้อง'} />
      </div>

      <div className="flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs leading-5 text-muted-foreground">เมื่อส่งข้อความ คุณยืนยันว่าข้อมูลที่ระบุสามารถใช้เพื่อติดต่อกลับได้</p>
        <FormButton className="sm:min-w-44" type="submit" pending={isSubmitting} disabled={isSubmitting}>{isSubmitting ? 'กำลังส่งข้อความ…' : 'ส่งข้อความถึงทีม'}</FormButton>
      </div>
    </form>
  );
}
