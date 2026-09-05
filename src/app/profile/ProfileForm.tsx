'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProfileNameError, PROFILE_NAME_MAX_LENGTH } from '@/lib/profile-policy';
import { CircleAlert, CircleCheck } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

interface User {
  name: string | null;
  email: string;
}

export default function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const busy = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const [savedName, setSavedName] = useState(user.name || '');
  const [validationError, setValidationError] = useState('');
  const [name, setName] = useState(user.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || name === savedName) return;
    const error = getProfileNameError(name);
    setValidationError(error);
    if (error) { nameInput.current?.focus(); return; }
    busy.current = true;
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedName = typeof data.user?.name === 'string' ? data.user.name : name.trim();
        setName(updatedName);
        setSavedName(updatedName);
        router.refresh();
        setMessage({ type: 'success', text: 'อัปเดตโปรไฟล์สำเร็จ' });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: response.status === 429 ? 'บันทึกถี่เกินไป กรุณารอสักครู่แล้วลองใหม่ ข้อมูลที่แก้ไขยังอยู่' : data.error || 'เกิดข้อผิดพลาด' });
      }
    } catch {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
    } finally {
      busy.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={handleSubmit} aria-busy={isSubmitting}>
      {message && (
        <Alert
          variant={message.type === 'error' ? 'destructive' : 'default'}
          role={message.type === 'error' ? 'alert' : 'status'}
        >
          {message.type === 'error' ? <CircleAlert aria-hidden="true" /> : <CircleCheck aria-hidden="true" />}
          <AlertTitle>{message.type === 'error' ? 'บันทึกไม่สำเร็จ' : 'บันทึกสำเร็จ'}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <FieldGroup className="gap-5">
        <Field data-invalid={Boolean(validationError) || undefined}>
          <FieldLabel htmlFor="profile-name">ชื่อ</FieldLabel>
          <Input
          ref={nameInput}
          id="profile-name"
          disabled={isSubmitting}
          maxLength={PROFILE_NAME_MAX_LENGTH}
          aria-invalid={Boolean(validationError) || undefined}
          aria-describedby="profile-name-help profile-name-error"
          type="text"
          value={name}
          onChange={(event) => { setName(event.target.value); setValidationError(''); setMessage(null); }}
          placeholder="ชื่อของคุณ"
          autoComplete="name"
          />
          <FieldDescription id="profile-name-help">ชื่อนี้ใช้สำหรับใบรับรองที่ออกในอนาคต ใบรับรองที่ออกแล้วจะเก็บชื่อ ณ วันที่ออกและไม่เปลี่ยนตามโปรไฟล์</FieldDescription>
          <FieldError id="profile-name-error">{validationError}</FieldError>
        </Field>

        <Field data-disabled="true">
          <FieldLabel htmlFor="profile-email">อีเมล</FieldLabel>
          <Input id="profile-email" type="email" value={user.email} disabled />
          <FieldDescription>อีเมลเป็นข้อมูลประจำบัญชีและไม่สามารถเปลี่ยนจากหน้านี้ได้</FieldDescription>
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || name === savedName} aria-busy={isSubmitting}>
          {isSubmitting && <Spinner data-icon="inline-start" aria-hidden="true" />}
          {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
        </Button>
        <Button type="button" variant="outline" disabled={isSubmitting || name === savedName} onClick={() => { setName(savedName); setValidationError(''); setMessage(null); }}>ยกเลิกการแก้ไข</Button>
      </div>
    </form>
  );
}
