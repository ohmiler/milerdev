import { ArrowRight, Banknote, BookOpen, CircleAlert, CreditCard, GraduationCap, Users } from 'lucide-react';
import Link from 'next/link';

import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
  type AdminTone,
} from '@/components/admin/ui/AdminOperations';
import { Button } from '@/components/ui/button';

export type AdminDashboardData = {
  generatedAt: Date;
  stats: {
    courses: number;
    publishedCourses: number;
    users: number;
    enrollments: number;
    lessons: number;
  };
  sevenDay: {
    revenue: number;
    enrollments: number;
  };
  paymentHealth: {
    completed: number;
    pending: number;
    verifying: number;
    failed: number;
    refunded: number;
  };
  courseAttention: {
    draft: number;
    withoutLessons: number;
    withoutThumbnail: number;
  };
  recentEnrollments: Array<{
    id: string;
    enrolledAt: Date | null;
    userName: string | null;
    userEmail: string | null;
    courseTitle: string | null;
  }>;
  recentPayments: Array<{
    id: string;
    amount: string;
    status: string;
    method: string | null;
    createdAt: Date | null;
    userName: string | null;
    userEmail: string | null;
  }>;
};

function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('th-TH').format(value);
}

function formatDateTime(value: Date | string | null) {
  if (!value) return 'ไม่ทราบเวลา';
  return new Date(value).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function paymentStatus(status: string): { label: string; tone: AdminTone } {
  if (status === 'completed') return { label: 'สำเร็จ', tone: 'success' };
  if (status === 'verifying') return { label: 'กำลังตรวจ', tone: 'warning' };
  if (status === 'pending') return { label: 'รอดำเนินการ', tone: 'warning' };
  if (status === 'failed') return { label: 'ไม่สำเร็จ', tone: 'danger' };
  if (status === 'refunded') return { label: 'คืนเงินแล้ว', tone: 'neutral' };
  return { label: status, tone: 'neutral' };
}

export default function AdminDashboardView({ data }: { data: AdminDashboardData }) {
  const paymentsNeedReview = data.paymentHealth.pending + data.paymentHealth.verifying;
  const attentionItems = [
    {
      key: 'payments-review',
      label: 'ตรวจรายการชำระเงิน',
      detail: 'รายการที่รอดำเนินการหรือกำลังตรวจสอบ',
      count: paymentsNeedReview,
      href: '/admin/payments',
      tone: 'warning' as const,
    },
    {
      key: 'payments-failed',
      label: 'ทบทวนรายการไม่สำเร็จ',
      detail: 'ตรวจสาเหตุและเส้นทางกู้คืนก่อนดำเนินการต่อ',
      count: data.paymentHealth.failed,
      href: '/admin/reconciliation',
      tone: 'danger' as const,
    },
    {
      key: 'courses-lessons',
      label: 'เติมบทเรียนให้คอร์ส',
      detail: 'คอร์สที่ยังไม่มีบทเรียนและยังไม่พร้อมเปิดเรียน',
      count: data.courseAttention.withoutLessons,
      href: '/admin/courses',
      tone: 'danger' as const,
    },
    {
      key: 'courses-cover',
      label: 'เติมภาพปกคอร์ส',
      detail: 'ทำให้รายการคอร์สพร้อมสำหรับการนำเสนอ',
      count: data.courseAttention.withoutThumbnail,
      href: '/admin/courses',
      tone: 'warning' as const,
    },
    {
      key: 'courses-draft',
      label: 'ทบทวนคอร์สแบบร่าง',
      detail: 'ตรวจรายละเอียดและความพร้อมก่อนเผยแพร่',
      count: data.courseAttention.draft,
      href: '/admin/courses',
      tone: 'info' as const,
    },
  ].filter((item) => item.count > 0);

  const recentActivity = [
    ...data.recentEnrollments.map((item) => ({
      key: `enrollment-${item.id}`,
      title: item.userName || item.userEmail || 'ไม่ทราบผู้ใช้',
      detail: `ลงทะเบียนเรียน ${item.courseTitle || 'คอร์ส'}`,
      date: item.enrolledAt,
      kind: 'การลงทะเบียน',
      tone: 'info' as AdminTone,
    })),
    ...data.recentPayments.map((item) => {
      const status = paymentStatus(item.status);
      return {
        key: `payment-${item.id}`,
        title: item.userName || item.userEmail || 'ไม่ทราบผู้ใช้',
        detail: `${formatCurrency(item.amount)} · ${status.label}`,
        date: item.createdAt,
        kind: 'การชำระเงิน',
        tone: status.tone,
      };
    }),
  ]
    .sort((left, right) => Number(new Date(right.date || 0)) - Number(new Date(left.date || 0)))
    .slice(0, 8);

  return (
    <div className="grid gap-6" data-admin-dashboard>
      <AdminPageHeader
        eyebrow="Operations overview"
        title="งานที่ต้องดูแลวันนี้"
        description="เห็นรายการที่ต้องตรวจและสถานะสำคัญจากข้อมูลจริง ก่อนเข้าสู่รายละเอียดของแต่ละส่วน"
        meta={(
          <span>
            อัปเดตเมื่อ {formatDateTime(data.generatedAt)} · ข้อมูลอาจล่าช้าไม่เกิน 1 นาที
          </span>
        )}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="ตัวชี้วัด 7 วันล่าสุด">
        <AdminMetricCard
          label="รายได้ 7 วัน"
          value={formatCurrency(data.sevenDay.revenue)}
          detail="นับเฉพาะรายการชำระเงินที่สำเร็จ"
          icon={<Banknote />}
          tone="success"
        />
        <AdminMetricCard
          label="ลงทะเบียนใหม่ 7 วัน"
          value={formatNumber(data.sevenDay.enrollments)}
          detail={`จากทั้งหมด ${formatNumber(data.stats.enrollments)} การลงทะเบียน`}
          icon={<GraduationCap />}
          tone="info"
        />
        <AdminMetricCard
          label="คอร์สที่เผยแพร่"
          value={formatNumber(data.stats.publishedCourses)}
          detail={`จากทั้งหมด ${formatNumber(data.stats.courses)} คอร์ส`}
          icon={<BookOpen />}
          tone="neutral"
        />
        <AdminMetricCard
          label="การชำระเงินที่ต้องตรวจ"
          value={formatNumber(paymentsNeedReview)}
          detail="รอดำเนินการและกำลังตรวจสอบ"
          icon={<CreditCard />}
          tone={paymentsNeedReview > 0 ? 'warning' : 'success'}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <AdminSection
          title="คิวงานที่ต้องจัดการ"
          description="เรียงจากข้อยกเว้นที่อาจกระทบผู้เรียนหรือการขาย ไปสู่งานเตรียมความพร้อมของเนื้อหา"
        >
          {attentionItems.length === 0 ? (
            <AdminEmptyState
              title="ยังไม่มีรายการเร่งด่วน"
              description="สถานะที่ตรวจได้จากข้อมูลปัจจุบันยังไม่พบรายการที่ต้องดำเนินการ"
              tone="success"
            />
          ) : (
            <div className="divide-y divide-border">
              {attentionItems.map((item) => (
                <div key={item.key} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <CircleAlert className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{item.label}</h3>
                      <AdminStatusBadge tone={item.tone}>{formatNumber(item.count)} รายการ</AdminStatusBadge>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.detail}</p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={item.href}>เปิดรายการ<ArrowRight /></Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </AdminSection>

        <AdminSection title="ภาพรวมระบบ" description="จำนวนสะสมจากข้อมูลปัจจุบัน">
          <dl className="divide-y divide-border">
            {[
              { label: 'ผู้ใช้ทั้งหมด', value: data.stats.users, icon: Users },
              { label: 'การลงทะเบียนทั้งหมด', value: data.stats.enrollments, icon: GraduationCap },
              { label: 'บทเรียนทั้งหมด', value: data.stats.lessons, icon: BookOpen },
              { label: 'การชำระเงินสำเร็จ', value: data.paymentHealth.completed, icon: CreditCard },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <item.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                <dt className="flex-1 text-sm text-muted-foreground">{item.label}</dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">{formatNumber(item.value)}</dd>
              </div>
            ))}
          </dl>
        </AdminSection>
      </div>

      <AdminSection title="กิจกรรมล่าสุด" description="การลงทะเบียนและการชำระเงินล่าสุดที่ระบบบันทึกไว้">
        {recentActivity.length === 0 ? (
          <AdminEmptyState title="ยังไม่มีกิจกรรมล่าสุด" description="เมื่อมีการลงทะเบียนหรือการชำระเงิน รายการจะปรากฏที่นี่" />
        ) : (
          <div className="divide-y divide-border">
            {recentActivity.map((item) => (
              <div key={item.key} className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <AdminStatusBadge tone={item.tone}>{item.kind}</AdminStatusBadge>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{item.detail}</p>
                </div>
                <time className="text-xs text-muted-foreground">{formatDateTime(item.date)}</time>
              </div>
            ))}
          </div>
        )}
      </AdminSection>
    </div>
  );
}
