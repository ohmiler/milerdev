'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Field, FieldLabel, FieldDescription, FieldGroup } from '@/components/ui/field';
import { refreshConsent, saveConsent, suspendConsent, useConsentStatus } from '@/components/privacy/consent-client';

export default function ConsentProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const consent = useConsentStatus();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const channel = useRef<BroadcastChannel | null>(null);
  const trigger = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (sessionStatus === 'loading') return;
    let active = true;
    void refreshConsent(true).then(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [sessionStatus, session?.user?.id]);

  useEffect(() => {
    const refresh = () => { void refreshConsent(); };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    const show = () => {
      trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setAnalytics(consent.analytics);
      setOpen(true);
    };
    if (typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel('milerdev-consent');
      channel.current.onmessage = (event) => {
        if (event.data === 'changing') suspendConsent();
        else if (event.data === 'changed') void refreshConsent(true);
      };
    }
    window.addEventListener('milerdev:consent-settings', show);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    const expiry = consent.expiresAt ? Math.min(2_147_000_000, Math.max(0, Date.parse(consent.expiresAt) - Date.now())) : null;
    const timer = expiry === null ? null : window.setTimeout(refresh, expiry);
    return () => {
      channel.current?.close();
      window.removeEventListener('milerdev:consent-settings', show);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [consent.analytics, consent.expiresAt]);

  async function choose(value: boolean) {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      // Other tabs fail closed immediately, then re-read the authoritative decision after save.
      channel.current?.postMessage('changing');
      await saveConsent(value);
      channel.current?.postMessage('changed');
      setOpen(false);
    } catch {
      setError('บันทึกตัวเลือกไม่สำเร็จ สถิติในหน้านี้หยุดอยู่ กรุณาลองอีกครั้งเพื่อบันทึกให้ครบทุกอุปกรณ์');
    } finally { setPending(false); }
  }

  const actions = <>
    <Button variant="outline" disabled={pending} onClick={() => void choose(false)}>ใช้เฉพาะที่จำเป็น</Button>
    <Button variant="outline" disabled={pending} onClick={() => void choose(true)}>ยอมรับสถิติ</Button>
  </>;

  return <>
    {children}
    {ready && !consent.decided && !open ? <aside aria-label="ตัวเลือกความเป็นส่วนตัว" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-3 sm:p-5">
      <Card className="pointer-events-auto mx-auto max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto shadow-lg">
        <CardHeader>
          <CardTitle>เลือกความเป็นส่วนตัวของคุณ</CardTitle>
          <CardDescription>เราใช้คุกกี้ที่จำเป็นเพื่อให้บริการ ส่วนสถิติการใช้งานจะเริ่มเมื่อคุณยินยอม ปฏิเสธแล้วยังสมัคร ซื้อคอร์ส และเรียนได้ตามปกติ</CardDescription>
        </CardHeader>
        <CardContent><Link href="/privacy">อ่านนโยบายความเป็นส่วนตัว</Link>{error ? <p role="alert">{error}</p> : null}</CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          {actions}<Button variant="ghost" disabled={pending} onClick={() => { trigger.current = document.activeElement as HTMLElement; setAnalytics(false); setOpen(true); }}>ตั้งค่า</Button>
        </CardFooter>
      </Card>
    </aside> : null}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus(); }}>
        <DialogHeader><DialogTitle>ตั้งค่าความเป็นส่วนตัว</DialogTitle><DialogDescription>เปลี่ยนตัวเลือกได้ทุกเมื่อ การถอนจะหยุดสถิติในอนาคต ข้อมูลชำระเงินและความคืบหน้าที่จำเป็นต่อบริการยังคงอยู่</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field><FieldLabel>จำเป็นต่อบริการ — เปิดเสมอ</FieldLabel><FieldDescription>การเข้าสู่ระบบ ความปลอดภัย และการจดจำตัวเลือกนี้</FieldDescription></Field>
          <Field><FieldLabel htmlFor="analytics-consent">สถิติการใช้งาน</FieldLabel><FieldDescription id="analytics-consent-description">ช่วยวิเคราะห์การใช้งาน การเรียน การซื้อ และประสิทธิภาพเว็บ หากเข้าสู่ระบบ การเลือกครั้งนี้จะแทนตัวเลือกสถิติเดิมของบัญชี อุปกรณ์อื่นต้องเลือกใหม่</FieldDescription><Switch id="analytics-consent" checked={analytics} onCheckedChange={setAnalytics} disabled={pending} aria-describedby="analytics-consent-description" /></Field>
        </FieldGroup>
        <Link href="/privacy">รายละเอียดการใช้ข้อมูล</Link>
        {error ? <p role="alert">{error}</p> : null}
        <DialogFooter className="flex-wrap gap-2">{actions}<Button disabled={pending} onClick={() => void choose(analytics)}>{pending ? 'กำลังบันทึก…' : 'บันทึกตัวเลือก'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
