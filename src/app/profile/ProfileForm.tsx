'use client';

import { useState } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

interface User {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export default function ProfileForm({ user }: { user: User }) {
  const [name, setName] = useState(user.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'อัปเดตโปรไฟล์สำเร็จ' });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'เกิดข้อผิดพลาด' });
      }
    } catch {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} aria-busy={isSubmitting}>
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
        <Field>
          <FieldLabel htmlFor="profile-name">ชื่อ</FieldLabel>
          <Input
          id="profile-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="ชื่อของคุณ"
          autoComplete="name"
          />
        </Field>

        <Field data-disabled="true">
          <FieldLabel htmlFor="profile-email">อีเมล</FieldLabel>
          <Input id="profile-email" type="email" value={user.email} disabled />
          <FieldDescription>อีเมลเป็นข้อมูลประจำบัญชีและไม่สามารถเปลี่ยนจากหน้านี้ได้</FieldDescription>
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting && <Spinner data-icon="inline-start" aria-hidden="true" />}
          {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
        </Button>
      </div>
    </form>
  );
}
