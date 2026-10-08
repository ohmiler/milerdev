'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRef, useState } from 'react';
import { FeedbackState, PendingButton } from '@/components/status/FeedbackState';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CONTACT_TOPICS } from '@/lib/content/contact';

type SubmitStatus = 'idle' | 'success' | 'error';

const emptyForm = { name: '', email: '', subject: '', message: '' };

export default function ContactForm() {
  const [formData, setFormData] = useState(emptyForm);
  const [honey, setHoney] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const formLoadTime = useRef(Date.now());
  const { data: session } = useSession();
  const member = session?.user;
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);

  // A signed-in member's name and email are filled in once, without overwriting anything already typed.
  if (member?.email && prefilledFor !== member.email) {
    setPrefilledFor(member.email);
    setFormData((current) => ({
      ...current,
      name: current.name || member.name || '',
      email: current.email || member.email || '',
    }));
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, _honey: honey, _timestamp: formLoadTime.current }),
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'ส่งข้อความไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองอีกครั้ง');
        setSubmitStatus('error');
      } else {
        setSubmitStatus('success');
        // The same person may write again: keep who they are, clear what they wrote.
        setFormData({ ...emptyForm, name: formData.name, email: formData.email });
        formLoadTime.current = Date.now();
      }
    } catch {
      setErrorMessage('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <FeedbackState
        state={'success'}
        title={'ส่งข้อความเรียบร้อย'}
        description={'ทีมได้รับรายละเอียดแล้ว และจะตอบกลับผ่านอีเมลที่คุณระบุ'}
        action={(
          <div className={'flex flex-wrap gap-2'}>
            <Button type={'button'} onClick={() => setSubmitStatus('idle')}>ส่งข้อความใหม่</Button>
            <Button asChild variant={'outline'}>
              <Link href={'/faq'}>กลับไปดูคำถามที่พบบ่อย</Link>
            </Button>
          </div>
        )}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className={'flex flex-col gap-5'} aria-busy={isSubmitting}>
      <span className={'sr-only'} role={'status'} aria-live={'polite'}>
        {isSubmitting ? 'กำลังส่งข้อความ กรุณารอสักครู่' : ''}
      </span>

      <div className={'sr-only'} inert={true} aria-hidden={true}>
        <Field>
          <FieldLabel htmlFor={'contact-website'}>เว็บไซต์</FieldLabel>
          <Input id={'contact-website'} type={'text'} name={'website'} tabIndex={-1} autoComplete={'off'} value={honey} onChange={(event) => setHoney(event.target.value)} />
        </Field>
      </div>

      {submitStatus === 'error' && errorMessage ? (
        <FeedbackState state={'error'} title={'ส่งข้อความไม่สำเร็จ'} description={errorMessage} />
      ) : null}

      <FieldGroup className={'gap-5'}>
        <div className={'grid gap-5 sm:grid-cols-2'}>
          <Field>
            <FieldLabel htmlFor={'contact-name'}>ชื่อ</FieldLabel>
            <Input id={'contact-name'} name={'name'} type={'text'} required minLength={2} maxLength={100} autoComplete={'name'} value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} placeholder={'ชื่อที่ใช้ติดต่อ'} />
          </Field>
          <Field>
            <FieldLabel htmlFor={'contact-email'}>อีเมล</FieldLabel>
            <Input id={'contact-email'} name={'email'} type={'email'} required maxLength={255} autoComplete={'email'} value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} placeholder={'name@example.com'} />
          </Field>
        </div>

        <FieldSet className={'gap-0'}>
          <FieldLegend variant={'label'}>เรื่องที่ต้องการติดต่อ</FieldLegend>
          <div className={'grid gap-2 sm:grid-cols-2'}>
            {CONTACT_TOPICS.map((topic) => (
              <label
                key={topic}
                className={'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted has-checked:border-primary has-checked:bg-secondary has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50'}
              >
                <input
                  type={'radio'}
                  name={'subject'}
                  value={topic}
                  required
                  checked={formData.subject === topic}
                  onChange={() => setFormData({ ...formData, subject: topic })}
                  className={'size-4 shrink-0 accent-primary'}
                />
                {topic}
              </label>
            ))}
          </div>
          {formData.subject === 'การชำระเงิน' ? (
            <p className={'mt-3 text-sm leading-6 text-muted-foreground'}>
              {member ? (
                <>
                  สถานะของแต่ละรายการดูได้ที่{' '}
                  <Link className={'font-medium text-link hover:underline'} href={'/dashboard/payments'}>ประวัติการชำระเงิน</Link>
                  {' '}ถ้ายังไม่ตรง บอกชื่อคอร์สและวันที่ชำระมาด้วย
                </>
              ) : 'บอกชื่อคอร์สและวันที่ชำระมาด้วย เพื่อให้ตรวจสอบได้เร็วขึ้น'}
            </p>
          ) : null}
        </FieldSet>

        <Field>
          <FieldLabel htmlFor={'contact-message'}>รายละเอียด</FieldLabel>
          <Textarea id={'contact-message'} name={'message'} required minLength={10} maxLength={5000} rows={7} value={formData.message} onChange={(event) => setFormData({ ...formData, message: event.target.value })} placeholder={'อธิบายสิ่งที่ต้องการให้ทีมช่วย พร้อมข้อมูลที่เกี่ยวข้อง'} />
          <FieldDescription>10 ถึง 5,000 ตัวอักษร</FieldDescription>
        </Field>
      </FieldGroup>

      <div className={'flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between'}>
        <p className={'max-w-md text-caption leading-5 text-muted-foreground'}>เมื่อส่งข้อความ คุณยืนยันว่าข้อมูลที่ระบุสามารถใช้เพื่อติดต่อกลับได้</p>
        <PendingButton
          className={'sm:min-w-44'}
          type={'submit'}
          pending={isSubmitting}
          pendingLabel={'กำลังส่งข้อความ…'}
        >
          {submitStatus === 'error' ? 'ลองส่งข้อความอีกครั้ง' : 'ส่งข้อความถึงทีม'}
        </PendingButton>
      </div>
    </form>
  );
}
