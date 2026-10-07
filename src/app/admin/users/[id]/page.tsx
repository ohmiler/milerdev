'use client';

import { ArrowLeft, Award, BookOpen, ExternalLink, Plus, Search, Trash2, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  AdminUserLifecycleAction,
  AdminUserLifecycleBadge,
} from '@/components/admin/AdminUserLifecycleControls';
import InstructorProfileForm, { type InstructorProfile } from '@/components/admin/InstructorProfileForm';
import { AdminConfirmActionDialog } from '@/components/admin/ui/AdminConfirmActionDialog';
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminMetricCard,
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
} from '@/components/admin/ui/AdminOperations';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showToast } from '@/components/ui/Toast';
import {
  applyAuthoritativeLifecycleState,
  getLifecyclePresentation,
  lifecycleDeactivationDialog,
  lifecycleMutationFeedback,
  type AdminUserLifecycleAction as AdminUserLifecycleActionName,
  type AuthoritativeLifecycleUser,
} from '@/lib/users/admin-lifecycle-ui';

interface UserInfo extends InstructorProfile {
  id: string;
  name: string | null;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  createdAt: string;
  lifecycleStatus: 'active' | 'inactive';
  deactivatedAt: string | null;
}

interface Enrollment {
  id: string;
  courseId: string | null;
  enrolledAt: string | null;
  progressPercent: number | null;
  completedAt: string | null;
  courseTitle: string | null;
  courseSlug: string | null;
  coursePrice: string | null;
  courseImage: string | null;
}

interface LearnerPayment {
  id: string;
  amount: string;
  method: 'stripe' | 'promptpay' | 'bank_transfer';
  status: 'pending' | 'verifying' | 'completed' | 'failed' | 'refunded';
  createdAt: string | null;
  itemTitle: string | null;
  courseTitle: string | null;
  bundleTitle: string | null;
}

interface LearnerCertificate {
  id: string;
  certificateCode: string;
  courseId: string | null;
  courseTitle: string;
  issuedAt: string | null;
  revokedAt: string | null;
}

const paymentStatusText: Record<LearnerPayment['status'], string> = {
  pending: 'รอชำระ',
  verifying: 'รอตรวจสลิป',
  completed: 'สำเร็จ',
  failed: 'ไม่สำเร็จ',
  refunded: 'คืนเงินแล้ว',
};
const paymentStatusTone = (status: LearnerPayment['status']) => status === 'completed' ? 'success' : status === 'failed' ? 'danger' : status === 'pending' || status === 'verifying' ? 'warning' : 'neutral';
const paymentMethodText: Record<LearnerPayment['method'], string> = { stripe: 'บัตร (Stripe)', promptpay: 'พร้อมเพย์', bank_transfer: 'โอนเงิน' };

interface AvailableCourse {
  id: string;
  title: string;
  slug: string;
  price: string | null;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const [user, setUser] = useState<UserInfo | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [learnerPayments, setLearnerPayments] = useState<LearnerPayment[] | null>(null);
  const [learnerCertificates, setLearnerCertificates] = useState<LearnerCertificate[] | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Enrollment | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [searchAvailable, setSearchAvailable] = useState('');
  const [searchEnrolled, setSearchEnrolled] = useState('');
  const [lifecycleConfirm, setLifecycleConfirm] = useState(false);
  const [updatingLifecycle, setUpdatingLifecycle] = useState(false);

  const fetchUserData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch(`/api/admin/users/${userId}/enrollments`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 404) {
          showToast('ไม่พบข้อมูลผู้ใช้', 'error');
          router.push('/admin/users');
          return;
        }
        throw new Error(data.error || 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
      }
      setUser(data.user);
      setEnrollments(data.enrollments || []);
      setAvailableCourses(data.availableCourses || []);
    } catch (caughtError) {
      setLoadError(caughtError instanceof Error ? caughtError.message : 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
    } finally {
      setLoading(false);
    }
  };

  // Payments and certificates load alongside the enrollments; a failure here leaves the rest of the page usable.
  const fetchLearnerHistory = async () => {
    setHistoryError('');
    try {
      const [paymentResponse, certificateResponse] = await Promise.all([
        fetch(`/api/admin/payments?userId=${encodeURIComponent(userId)}&limit=50`),
        fetch(`/api/admin/certificates?userId=${encodeURIComponent(userId)}`),
      ]);
      if (!paymentResponse.ok || !certificateResponse.ok) throw new Error('history unavailable');
      const [paymentData, certificateData] = await Promise.all([paymentResponse.json(), certificateResponse.json()]);
      setLearnerPayments(paymentData.payments || []);
      setLearnerCertificates(certificateData.certificates || []);
    } catch {
      setHistoryError('โหลดประวัติการชำระเงินและใบรับรองไม่สำเร็จ');
    }
  };

  useEffect(() => {
    if (userId) void fetchLearnerHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (userId) void fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleUnenroll = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const response = await fetch(`/api/admin/enrollments/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'ถอนสิทธิ์การลงทะเบียนไม่สำเร็จ');
      setDeleteTarget(null);
      showToast('ถอนสิทธิ์การลงทะเบียนสำเร็จ', 'success');
      await fetchUserData();
    } catch (caughtError) {
      setDeleteError(caughtError instanceof Error ? caughtError.message : 'ถอนสิทธิ์ไม่สำเร็จ');
    } finally {
      setDeleting(false);
    }
  };

  const handleEnroll = async (course: AvailableCourse) => {
    if (enrollingCourseId) return;
    setEnrollingCourseId(course.id);
    try {
      const response = await fetch(`/api/admin/users/${userId}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'เพิ่มสิทธิ์เข้าเรียนไม่สำเร็จ');
      showToast(`เพิ่ม “${course.title}” สำเร็จ`, 'success');
      await fetchUserData();
    } catch (caughtError) {
      showToast(caughtError instanceof Error ? caughtError.message : 'เพิ่มสิทธิ์เข้าเรียนไม่สำเร็จ', 'error');
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const executeLifecycleAction = async (action: AdminUserLifecycleActionName) => {
    if (!user) return;
    setUpdatingLifecycle(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ไม่สามารถเปลี่ยนสถานะบัญชีได้');
      setUser((current) => current
        ? applyAuthoritativeLifecycleState([current], (data.users || []) as AuthoritativeLifecycleUser[])[0] as UserInfo
        : current);
      showToast(lifecycleMutationFeedback(action, data.changedCount ?? 0, data.skippedCount ?? 0), 'success');
    } catch (caughtError) {
      showToast(caughtError instanceof Error ? caughtError.message : 'เปลี่ยนสถานะบัญชีไม่สำเร็จ กรุณาลองใหม่', 'error');
    } finally {
      setUpdatingLifecycle(false);
      if (action === 'deactivate') setLifecycleConfirm(false);
    }
  };

  const requestLifecycleAction = () => {
    if (!user) return;
    const { action } = getLifecyclePresentation(user.lifecycleStatus);
    if (action === 'deactivate') setLifecycleConfirm(true);
    else void executeLifecycleAction(action);
  };

  const formatDate = (dateString: string | null) => dateString
    ? new Date(dateString).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
    : '-';
  const roleText = (role: UserInfo['role']) => role === 'admin' ? 'ผู้ดูแลระบบ' : role === 'instructor' ? 'ผู้สอน' : 'ผู้เรียน';
  const formatPrice = (price: string | null) => parseFloat(price || '0') === 0 ? 'ฟรี' : new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(parseFloat(price || '0'));

  const completedCount = enrollments.filter((enrollment) => enrollment.completedAt).length;
  const certifiedCourseIds = new Set((learnerCertificates ?? []).filter((certificate) => !certificate.revokedAt).map((certificate) => certificate.courseId));
  // A finished course without an active certificate is worth a look; it is otherwise flagged nowhere.
  const missingCertificate = (enrollment: Enrollment) => Boolean(learnerCertificates && enrollment.completedAt && enrollment.courseId && !certifiedCourseIds.has(enrollment.courseId));
  const formatAmount = (amount: string) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(Number(amount));
  const inProgressCount = enrollments.filter((enrollment) => !enrollment.completedAt && (enrollment.progressPercent ?? 0) > 0).length;
  const filteredAvailable = availableCourses.filter((course) => course.title.toLowerCase().includes(searchAvailable.toLowerCase()));
  const filteredEnrolled = enrollments.filter((enrollment) => (enrollment.courseTitle || '').toLowerCase().includes(searchEnrolled.toLowerCase()));

  if (loading && !user) return <AdminLoadingState title="กำลังโหลดข้อมูลผู้ใช้" />;
  if (loadError && !user) return <AdminErrorState description={loadError} action={<Button variant="outline" onClick={() => void fetchUserData()}>ลองใหม่</Button>} />;
  if (!user) return null;

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <AdminPageHeader
        eyebrow="ข้อมูลผู้เรียน"
        title={user.name || 'ไม่ระบุชื่อ'}
        description={`${user.email} · ${roleText(user.role)} · สมัครเมื่อ ${formatDate(user.createdAt)}`}
        actions={
          <>
            <Button asChild variant="outline"><Link href="/admin/users"><ArrowLeft data-icon="inline-start" aria-hidden />กลับไปรายชื่อ</Link></Button>
            <AdminUserLifecycleBadge status={user.lifecycleStatus} />
            <AdminUserLifecycleAction status={user.lifecycleStatus} pending={updatingLifecycle} onRequest={requestLifecycleAction} />
          </>
        }
        meta={user.lifecycleStatus === 'inactive' && user.deactivatedAt ? `ปิดใช้งานตั้งแต่ ${formatDate(user.deactivatedAt)} ข้อมูลการเรียนและธุรกรรมยังคงอยู่` : 'บัญชีนี้เข้าใช้งานระบบได้ตามสิทธิ์ปัจจุบัน'}
      />

      {user.lifecycleStatus === 'inactive' ? (
        <Alert><AlertTitle>บัญชีถูกปิดใช้งาน</AlertTitle><AlertDescription>ผู้ใช้เข้าสู่ระบบหรือใช้เซสชันเดิมไม่ได้ แต่การลงทะเบียน ความคืบหน้า การชำระเงิน และใบรับรองยังคงอยู่</AlertDescription></Alert>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3" aria-label="สรุปการเรียนของผู้ใช้">
        <AdminMetricCard label="คอร์สที่ลงทะเบียน" value={enrollments.length.toLocaleString('th-TH')} detail="สิทธิ์เรียนที่ยังอยู่ในบัญชี" tone="info" />
        <AdminMetricCard label="เรียนจบ" value={completedCount.toLocaleString('th-TH')} detail="คอร์สที่มีวันที่เรียนจบแล้ว" tone="success" />
        <AdminMetricCard label="กำลังเรียน" value={inProgressCount.toLocaleString('th-TH')} detail="เริ่มเรียนแล้วแต่ยังไม่จบ" tone="warning" />
      </section>

      {user.role === 'instructor' || user.role === 'admin' ? (
        <InstructorProfileForm key={user.id} userId={user.id} profile={{ headline: user.headline, bio: user.bio, profileLinks: user.profileLinks }} />
      ) : null}

      <AdminSection title="คอร์สที่ลงทะเบียน" description={`${enrollments.length.toLocaleString('th-TH')} คอร์ส`}>
        {enrollments.length === 0 ? (
          <AdminEmptyState icon={<BookOpen aria-hidden />} title="ยังไม่มีคอร์สที่ลงทะเบียน" description="เพิ่มสิทธิ์เข้าเรียนจากส่วนจัดการคอร์สด้านล่าง" />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>คอร์ส</TableHead><TableHead>ความคืบหน้า</TableHead><TableHead>วันที่ลงทะเบียน</TableHead><TableHead>สถานะ</TableHead><TableHead className="text-right">จัดการ</TableHead></TableRow></TableHeader>
            <TableBody>
              {enrollments.map((enrollment) => {
                const progress = enrollment.progressPercent || 0;
                return (
                  <TableRow key={enrollment.id}>
                    <TableCell><div className="font-medium">{enrollment.courseTitle || 'คอร์สที่ถูกลบ'}</div>{enrollment.coursePrice ? <div className="mt-1 text-xs text-muted-foreground">{formatPrice(enrollment.coursePrice)}</div> : null}</TableCell>
                    <TableCell><div className="flex min-w-32 items-center gap-3"><Progress value={progress} className="w-24" aria-label={`ความคืบหน้า ${progress}%`} /><span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{progress}%</span></div></TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(enrollment.enrolledAt)}</TableCell>
                    <TableCell><div className="flex flex-wrap gap-1.5"><AdminStatusBadge tone={enrollment.completedAt ? 'success' : progress > 0 ? 'warning' : 'neutral'}>{enrollment.completedAt ? 'เรียนจบ' : progress > 0 ? 'กำลังเรียน' : 'ยังไม่เริ่ม'}</AdminStatusBadge>{missingCertificate(enrollment) ? <AdminStatusBadge tone="danger">ยังไม่มีใบรับรอง</AdminStatusBadge> : null}</div></TableCell>
                    <TableCell><div className="flex justify-end"><Button variant="ghost" size="icon-sm" onClick={() => { setDeleteError(''); setDeleteTarget(enrollment); }} aria-label={`ถอนสิทธิ์คอร์ส ${enrollment.courseTitle || ''}`}><Trash2 aria-hidden /></Button></div></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </AdminSection>

      <AdminSection title="ประวัติการชำระเงิน" description={learnerPayments ? `${learnerPayments.length.toLocaleString('th-TH')} รายการ` : undefined}>
        {historyError ? (
          <AdminErrorState description={historyError} action={<Button variant="outline" onClick={() => void fetchLearnerHistory()}>ลองใหม่</Button>} />
        ) : !learnerPayments ? (
          <AdminLoadingState title="กำลังโหลดประวัติการชำระเงิน" />
        ) : learnerPayments.length === 0 ? (
          <AdminEmptyState icon={<WalletCards aria-hidden />} title="ยังไม่มีรายการชำระเงิน" description="คอร์สที่ได้จากผู้ดูแลหรือคอร์สฟรีไม่มีรายการชำระเงิน" />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>รายการ</TableHead><TableHead className="text-right">จำนวน</TableHead><TableHead>ช่องทาง</TableHead><TableHead>สถานะ</TableHead><TableHead>เวลา</TableHead></TableRow></TableHeader>
            <TableBody>
              {learnerPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell><div className="font-medium">{payment.bundleTitle || payment.courseTitle || payment.itemTitle || '-'}</div><div className="mt-1 font-mono text-xs text-muted-foreground">{payment.id}</div></TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatAmount(payment.amount)}</TableCell>
                  <TableCell>{paymentMethodText[payment.method] ?? payment.method}</TableCell>
                  <TableCell><AdminStatusBadge tone={paymentStatusTone(payment.status)}>{paymentStatusText[payment.status] ?? payment.status}</AdminStatusBadge></TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(payment.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminSection>

      <AdminSection title="ใบรับรอง" description={learnerCertificates ? `${learnerCertificates.length.toLocaleString('th-TH')} ใบ` : undefined}>
        {historyError ? null : !learnerCertificates ? (
          <AdminLoadingState title="กำลังโหลดใบรับรอง" />
        ) : learnerCertificates.length === 0 ? (
          <AdminEmptyState icon={<Award aria-hidden />} title="ยังไม่มีใบรับรอง" description="ใบรับรองออกเมื่อเรียนจบคอร์ส หรือเมื่อผู้ดูแลออกให้จากหน้าใบรับรอง" />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>คอร์ส</TableHead><TableHead>รหัส</TableHead><TableHead>ออกเมื่อ</TableHead><TableHead>สถานะ</TableHead><TableHead className="text-right">ดู</TableHead></TableRow></TableHeader>
            <TableBody>
              {learnerCertificates.map((certificate) => (
                <TableRow key={certificate.id}>
                  <TableCell className="font-medium">{certificate.courseTitle}</TableCell>
                  <TableCell className="font-mono text-xs">{certificate.certificateCode}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(certificate.issuedAt)}</TableCell>
                  <TableCell><AdminStatusBadge tone={certificate.revokedAt ? 'danger' : 'success'}>{certificate.revokedAt ? 'ถูกเพิกถอน' : 'ใช้งานได้'}</AdminStatusBadge></TableCell>
                  <TableCell><div className="flex justify-end"><Button asChild variant="ghost" size="icon-sm"><a href={`/certificate/${certificate.certificateCode}`} target="_blank" rel="noreferrer" aria-label={`เปิดหน้าใบรับรอง ${certificate.certificateCode}`}><ExternalLink aria-hidden /></a></Button></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminSection>

      <AdminSection title="จัดการสิทธิ์คอร์ส" description="เพิ่มคอร์สโดยผู้ดูแล หรือถอนสิทธิ์พร้อมคำเตือนเรื่องข้อมูลความคืบหน้า">
        <div className="grid gap-5 lg:grid-cols-2">
          <CoursePickerPanel title={`คอร์สที่เพิ่มได้ (${availableCourses.length})`} search={searchAvailable} onSearchChange={setSearchAvailable} placeholder="ค้นหาคอร์สที่เพิ่มได้">
            {filteredAvailable.length ? filteredAvailable.map((course) => (
              <div key={course.id} className="flex items-center justify-between gap-3 border-b px-3 py-3 last:border-0">
                <div className="min-w-0"><div className="truncate font-medium">{course.title}</div><div className="mt-1 text-xs text-muted-foreground">{formatPrice(course.price)}</div></div>
                <Button size="sm" disabled={Boolean(enrollingCourseId)} onClick={() => void handleEnroll(course)}><Plus data-icon="inline-start" aria-hidden />{enrollingCourseId === course.id ? 'กำลังเพิ่ม' : 'เพิ่ม'}</Button>
              </div>
            )) : <div className="p-6 text-center text-sm text-muted-foreground">ไม่มีคอร์สที่สามารถเพิ่มได้</div>}
          </CoursePickerPanel>

          <CoursePickerPanel title={`คอร์สที่มีสิทธิ์ (${enrollments.length})`} search={searchEnrolled} onSearchChange={setSearchEnrolled} placeholder="ค้นหาคอร์สที่มีสิทธิ์">
            {filteredEnrolled.length ? filteredEnrolled.map((enrollment) => (
              <div key={enrollment.id} className="flex items-center justify-between gap-3 border-b px-3 py-3 last:border-0">
                <div className="min-w-0"><div className="truncate font-medium">{enrollment.courseTitle || 'คอร์สที่ถูกลบ'}</div><div className="mt-1 text-xs text-muted-foreground">{enrollment.progressPercent || 0}% · {enrollment.completedAt ? 'เรียนจบ' : 'กำลังเรียน'}</div></div>
                <Button variant="ghost" size="icon-sm" onClick={() => { setDeleteError(''); setDeleteTarget(enrollment); }} aria-label={`ถอนสิทธิ์ ${enrollment.courseTitle || ''}`}><Trash2 aria-hidden /></Button>
              </div>
            )) : <div className="p-6 text-center text-sm text-muted-foreground">ยังไม่มีคอร์สที่ลงทะเบียน</div>}
          </CoursePickerPanel>
        </div>
      </AdminSection>

      <AdminConfirmActionDialog
        open={Boolean(deleteTarget)}
        title="ถอนสิทธิ์การลงทะเบียน"
        description="สิทธิ์เข้าเรียนและข้อมูลความคืบหน้าที่ผูกกับการลงทะเบียนนี้อาจถูกลบ"
        target={deleteTarget?.courseTitle || 'คอร์สที่ไม่ระบุชื่อ'}
        confirmLabel="ถอนสิทธิ์"
        pending={deleting}
        pendingLabel="กำลังถอนสิทธิ์"
        error={deleteError || undefined}
        onConfirm={() => void handleUnenroll()}
        onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteError(''); } }}
      />
      <AdminConfirmActionDialog
        open={lifecycleConfirm}
        title={lifecycleDeactivationDialog.title}
        description={lifecycleDeactivationDialog.message}
        target={user.name || user.email}
        confirmLabel={lifecycleDeactivationDialog.confirmText}
        pending={updatingLifecycle}
        pendingLabel="กำลังปิดใช้งาน"
        onConfirm={() => void executeLifecycleAction('deactivate')}
        onOpenChange={setLifecycleConfirm}
      />
    </div>
  );
}

function CoursePickerPanel({
  title,
  search,
  onSearchChange,
  placeholder,
  children,
}: {
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="border-b bg-muted/40 p-3">
        <div className="mb-2 text-sm font-semibold">{title}</div>
        <InputGroup><InputGroupAddon><Search aria-hidden /></InputGroupAddon><InputGroupInput value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={placeholder} /></InputGroup>
      </div>
      <div className="max-h-80 overflow-y-auto">{children}</div>
    </div>
  );
}
