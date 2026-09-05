'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { getPasswordPolicyError } from '@/lib/password-policy';
import PasswordPolicyFeedback from '@/components/auth/PasswordPolicyFeedback';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { signOut } from 'next-auth/react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { PasswordInput } from '@/components/auth/AuthFormLayout';

export default function PasswordSettingsForm({ hasPassword }: { hasPassword: boolean }) {
  const busy = useRef(false);
  const [openItem, setOpenItem] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const policyError = getPasswordPolicyError(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const isDisabled = loading || !currentPassword || !newPassword || !confirmPassword || !passwordsMatch || Boolean(policyError);

  function resetForm() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || success) return;
    setError('');
    if (policyError) { setError(policyError); return; }

    if (!passwordsMatch) {
      setError('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    busy.current = true;
    setLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();

      if (response.ok) {
        resetForm();
        setSuccess(true);
        try {
          await signOut({ callbackUrl: '/login?reason=password-changed' });
        } catch {
          // The password mutation succeeded; retain the fresh sign-in action.
        }
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่');
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  if (!hasPassword) {
    return (
      <Alert>
        <Info aria-hidden="true" />
        <AlertTitle>รหัสผ่าน</AlertTitle>
        <AlertDescription>
          บัญชีนี้ใช้ Google เข้าสู่ระบบ จึงไม่ต้องตั้งรหัสผ่านแยก
          <div className="mt-3"><Badge variant="secondary">Google Login</Badge></div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Accordion
      type="single"
      collapsible
      value={openItem}
      onValueChange={(value) => {
        if (busy.current || success) return;
        setOpenItem(value);
        if (!value) resetForm();
      }}
    >
      <AccordionItem value="change-password">
        <AccordionTrigger disabled={loading || success}>
          <span className="flex flex-col items-start gap-1 text-left">
            <strong>เปลี่ยนรหัสผ่าน</strong>
            <span>ยืนยันรหัสผ่านปัจจุบันก่อนตั้งรหัสผ่านใหม่</span>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          {success ? (
            <Alert role="status">
              <CircleCheck aria-hidden="true" />
              <AlertTitle>เปลี่ยนรหัสผ่านสำเร็จ</AlertTitle>
              <AlertDescription>เซสชันเดิมถูกยกเลิก กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่
                <Button asChild className="mt-3"><Link href="/login?reason=password-changed">เข้าสู่ระบบใหม่</Link></Button>
              </AlertDescription>
            </Alert>
          ) : (
            <form className="flex flex-col gap-5" onSubmit={handleSubmit} aria-busy={loading}>
              {error && (
                <Alert variant="destructive" role="alert">
                  <CircleAlert aria-hidden="true" />
                  <AlertTitle>เปลี่ยนรหัสผ่านไม่สำเร็จ</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <FieldGroup className="gap-5">
                <Field>
                  <FieldLabel htmlFor="current-password">รหัสผ่านปัจจุบัน</FieldLabel>
                  <PasswordInput
                    id="current-password"
                    visible={showCurrentPassword}
                    onVisibilityChange={() => setShowCurrentPassword((show) => !show)}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    disabled={loading}
                    required
                    autoComplete="current-password"
                    showLabel="แสดงรหัสผ่านปัจจุบัน"
                    hideLabel="ซ่อนรหัสผ่านปัจจุบัน"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="new-password">รหัสผ่านใหม่</FieldLabel>
                  <PasswordInput
                    id="new-password"
                    visible={showNewPassword}
                    onVisibilityChange={() => setShowNewPassword((show) => !show)}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={loading}
                    required
                    autoComplete="new-password"
                    aria-describedby="password-strength"
                    showLabel="แสดงรหัสผ่านใหม่"
                    hideLabel="ซ่อนรหัสผ่านใหม่"
                  />
                  <PasswordPolicyFeedback id="password-strength" password={newPassword} />
                </Field>

                <Field data-invalid={Boolean(confirmPassword && !passwordsMatch) || undefined}>
                  <FieldLabel htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</FieldLabel>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={loading}
                    required
                    autoComplete="new-password"
                    aria-invalid={Boolean(confirmPassword && !passwordsMatch) || undefined}
                    aria-describedby={confirmPassword && !passwordsMatch ? 'password-match-error' : undefined}
                  />
                  {confirmPassword && !passwordsMatch && (
                    <FieldError id="password-match-error">รหัสผ่านไม่ตรงกัน</FieldError>
                  )}
                </Field>
              </FieldGroup>

              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  disabled={loading}
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setOpenItem('');
                    resetForm();
                  }}
                >
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={isDisabled} aria-busy={loading}>
                  {loading && <Spinner data-icon="inline-start" aria-hidden="true" />}
                  {loading ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
                </Button>
              </div>
            </form>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
