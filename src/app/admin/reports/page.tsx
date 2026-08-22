'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Download, GraduationCap, ReceiptText, TrendingUp, Users } from 'lucide-react';

import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPendingLabel,
  AdminSection,
  AdminStatusBadge,
} from '@/components/admin/ui/AdminOperations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NativeSelect } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface Overview {
  totalRevenue: number;
  totalTransactions: number;
  totalUsers: number;
  totalEnrollments: number;
  totalCourses: number;
}

interface RecentStats {
  newUsers: number;
  newEnrollments: number;
  revenue: number;
}

interface MonthlyData {
  month: string;
  revenue?: number;
  transactions?: number;
  count?: number;
}

interface CoursePerformance {
  courseId: string;
  courseTitle: string;
  coursePrice: string;
  enrollmentCount: number;
  completedCount: number;
  avgProgress: number;
}

interface RevenueByCourse {
  courseId: string;
  courseTitle: string;
  revenue: number;
  transactions: number;
}

interface RevenueByBundle {
  bundleId: string;
  bundleTitle: string;
  revenue: number;
  transactions: number;
}

interface UserStats {
  total: number;
  admins: number;
  instructors: number;
  students: number;
}

interface CompletionStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
}

interface PaymentMethod {
  method: string;
  count: number;
  revenue: number;
}

interface ReportData {
  overview: Overview;
  recentStats: RecentStats;
  monthlyRevenue: MonthlyData[];
  monthlyEnrollments: MonthlyData[];
  monthlyUsers: MonthlyData[];
  coursePerformance: CoursePerformance[];
  revenueByCourse: RevenueByCourse[];
  revenueByBundle: RevenueByBundle[];
  userStats: UserStats;
  completionStats: CompletionStats;
  paymentMethods: PaymentMethod[];
}

type ReportTab = 'overview' | 'revenue' | 'courses' | 'users' | 'export';

const tabs: Array<{ id: ReportTab; label: string }> = [
  { id: 'overview', label: 'ภาพรวม' },
  { id: 'revenue', label: 'รายได้' },
  { id: 'courses', label: 'คอร์ส' },
  { id: 'users', label: 'ผู้ใช้' },
  { id: 'export', label: 'ส่งออกข้อมูล' },
];

const exportOptions = [
  { type: 'payments', title: 'รายงานการชำระเงิน', description: 'ข้อมูลการชำระเงินทั้งหมดในช่วงที่เลือก' },
  { type: 'enrollments', title: 'รายงานการลงทะเบียน', description: 'ข้อมูลการลงทะเบียนทั้งหมดในช่วงที่เลือก' },
  { type: 'users', title: 'รายงานผู้ใช้', description: 'รายชื่อผู้ใช้ทั้งหมดพร้อมข้อมูลการลงทะเบียน' },
  { type: 'courses', title: 'รายงานคอร์ส', description: 'รายการคอร์ส จำนวนการลงทะเบียน และรายได้' },
  { type: 'revenue-monthly', title: 'รายได้รายเดือน', description: 'สรุปรายได้แยกตามเดือนในช่วงที่เลือก' },
];

function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(parseFloat(String(amount)));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('th-TH').format(value);
}

function formatMonth(monthString: string) {
  if (!monthString) return '';
  const [year, month] = monthString.split('-');
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return months[parseInt(month) - 1] + ' ' + year;
}

function TrendList({
  items,
  getValue,
  formatValue,
  emptyDescription,
}: {
  items: MonthlyData[];
  getValue: (item: MonthlyData) => number;
  formatValue: (value: number) => string;
  emptyDescription: string;
}) {
  if (items.length === 0) {
    return <AdminEmptyState title="ไม่มีข้อมูลในช่วงนี้" description={emptyDescription} icon={<TrendingUp />} />;
  }

  const maximum = Math.max(...items.map(getValue), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const value = getValue(item);
        return (
          <div key={item.month} className="grid gap-2 sm:grid-cols-[90px_minmax(120px,1fr)_140px] sm:items-center">
            <span className="text-xs font-medium text-muted-foreground">{formatMonth(item.month)}</span>
            <Progress value={(value / maximum) * 100} aria-label={formatValue(value)} />
            <span className="text-left text-sm font-semibold tabular-nums text-foreground sm:text-right">
              {formatValue(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('12');
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [exporting, setExporting] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reports?period=' + period);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
        return;
      }
      setData(json);
    } catch (fetchError) {
      console.error('Error fetching reports:', fetchError);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      const res = await fetch('/api/admin/reports/export?type=' + type + '&period=' + period);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = type + '-report.csv';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (exportError) {
      console.error('Export error:', exportError);
      showToast('เกิดข้อผิดพลาดในการส่งออกข้อมูล', 'error');
    } finally {
      setExporting(null);
    }
  };

  if (loading && !data) {
    return <AdminLoadingState title="กำลังโหลดรายงาน" description="กำลังรวบรวมข้อมูลตามช่วงเวลาที่เลือก" />;
  }

  if (error) {
    return (
      <AdminErrorState
        title="โหลดรายงานไม่สำเร็จ"
        description={error}
        action={
          <Button variant="outline" size="sm" onClick={fetchData}>
            ลองใหม่
          </Button>
        }
      />
    );
  }

  if (!data) return null;

  const completionTotal = Math.max(data.completionStats.total, 1);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Analytics"
        title="รายงานและวิเคราะห์"
        description="ติดตามรายได้ การลงทะเบียน ความคืบหน้า และการเติบโตของผู้ใช้"
        actions={
          <NativeSelect
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="w-48"
            aria-label="ช่วงเวลารายงาน"
          >
            <option value="3">3 เดือนล่าสุด</option>
            <option value="6">6 เดือนล่าสุด</option>
            <option value="12">12 เดือนล่าสุด</option>
            <option value="24">24 เดือนล่าสุด</option>
          </NativeSelect>
        }
      />

      <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(activeTab === tab.id && 'bg-card shadow-xs')}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminMetricCard
              label="รายได้รวม"
              value={formatCurrency(data.overview.totalRevenue)}
              detail={formatNumber(data.overview.totalTransactions) + ' รายการชำระเงิน'}
              icon={<ReceiptText />}
              tone="success"
            />
            <AdminMetricCard
              label="การลงทะเบียน"
              value={formatNumber(data.overview.totalEnrollments)}
              icon={<GraduationCap />}
              tone="info"
            />
            <AdminMetricCard label="ผู้ใช้" value={formatNumber(data.overview.totalUsers)} icon={<Users />} tone="warning" />
            <AdminMetricCard label="คอร์ส" value={formatNumber(data.overview.totalCourses)} icon={<BookOpen />} />
          </div>

          <AdminSection title="30 วันล่าสุด" description="สัญญาณการเติบโตระยะสั้นของแพลตฟอร์ม">
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">รายได้</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--color-success-strong)]">
                  {formatCurrency(data.recentStats.revenue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ผู้ใช้ใหม่</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                  {formatNumber(data.recentStats.newUsers)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">การลงทะเบียนใหม่</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                  {formatNumber(data.recentStats.newEnrollments)}
                </p>
              </div>
            </div>
          </AdminSection>

          <div className="grid gap-6 xl:grid-cols-2">
            <AdminSection title="สถานะการเรียน" description={formatNumber(data.completionStats.total) + ' การลงทะเบียน'}>
              <div className="space-y-5">
                {[
                  { label: 'เรียนจบ', value: data.completionStats.completed, tone: 'text-[var(--color-success-strong)]' },
                  { label: 'กำลังเรียน', value: data.completionStats.inProgress, tone: 'text-primary' },
                  { label: 'ยังไม่เริ่ม', value: data.completionStats.notStarted, tone: 'text-muted-foreground' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={cn('font-semibold tabular-nums', item.tone)}>{formatNumber(item.value)}</span>
                    </div>
                    <Progress value={(item.value / completionTotal) * 100} />
                  </div>
                ))}
              </div>
            </AdminSection>

            <AdminSection title="ประเภทผู้ใช้" description={formatNumber(data.userStats.total) + ' บัญชีทั้งหมด'}>
              <div className="space-y-3">
                {[
                  { label: 'Admin', value: data.userStats.admins, tone: 'danger' as const },
                  { label: 'Instructor', value: data.userStats.instructors, tone: 'info' as const },
                  { label: 'Student', value: data.userStats.students, tone: 'success' as const },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <AdminStatusBadge tone={item.tone}>{formatNumber(item.value)}</AdminStatusBadge>
                  </div>
                ))}
              </div>
            </AdminSection>
          </div>
        </div>
      ) : null}

      {activeTab === 'revenue' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
          <AdminSection title="รายได้รายเดือน" description="เทียบสัดส่วนกับเดือนที่มีรายได้สูงสุดในช่วงที่เลือก">
            <TrendList
              items={data.monthlyRevenue}
              getValue={(item) => item.revenue || 0}
              formatValue={formatCurrency}
              emptyDescription="ยังไม่มีรายได้ในช่วงเวลาที่เลือก"
            />
          </AdminSection>

          <AdminSection title="วิธีการชำระเงิน" description="จำนวนธุรกรรมและรายได้แยกตามช่องทาง">
            {data.paymentMethods.length === 0 ? (
              <AdminEmptyState title="ไม่มีข้อมูล" description="ยังไม่มีวิธีชำระเงินในช่วงที่เลือก" icon={<ReceiptText />} />
            ) : (
              <div className="space-y-3">
                {data.paymentMethods.map((method) => (
                  <div key={method.method || 'unknown'} className="rounded-xl border border-border p-4">
                    <p className="font-medium capitalize text-foreground">{method.method || 'ไม่ระบุ'}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatNumber(method.count)} รายการ</span>
                      <span className="font-semibold tabular-nums text-foreground">{formatCurrency(method.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminSection>
        </div>
      ) : null}

      {activeTab === 'courses' ? (
        <div className="space-y-6">
          <AdminSection title="รายได้ตามคอร์ส" description="10 คอร์สที่สร้างรายได้สูงสุด">
            {data.revenueByCourse.length === 0 ? (
              <AdminEmptyState title="ไม่มีข้อมูล" description="ยังไม่มีรายได้จากคอร์สในช่วงที่เลือก" icon={<BookOpen />} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>คอร์ส</TableHead>
                    <TableHead className="text-right">รายได้</TableHead>
                    <TableHead className="text-right">รายการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.revenueByCourse.map((course) => (
                    <TableRow key={course.courseId}>
                      <TableCell className="font-medium">{course.courseTitle || 'ไม่ระบุ'}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-[var(--color-success-strong)]">
                        {formatCurrency(course.revenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatNumber(course.transactions)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AdminSection>

          {data.revenueByBundle.length > 0 ? (
            <AdminSection title="รายได้ตาม Bundle" description="10 Bundle ที่สร้างรายได้สูงสุด">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bundle</TableHead>
                    <TableHead className="text-right">รายได้</TableHead>
                    <TableHead className="text-right">รายการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.revenueByBundle.map((bundle) => (
                    <TableRow key={bundle.bundleId}>
                      <TableCell className="font-medium">{bundle.bundleTitle || 'ไม่ระบุ'}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-[var(--color-success-strong)]">
                        {formatCurrency(bundle.revenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatNumber(bundle.transactions)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AdminSection>
          ) : null}

          <AdminSection title="ความคืบหน้าตามคอร์ส" description="10 คอร์สที่มีการลงทะเบียนสูงสุด">
            {data.coursePerformance.length === 0 ? (
              <AdminEmptyState title="ไม่มีข้อมูล" description="ยังไม่มีข้อมูลความคืบหน้าในช่วงที่เลือก" icon={<GraduationCap />} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>คอร์ส</TableHead>
                    <TableHead className="text-right">ลงทะเบียน</TableHead>
                    <TableHead className="text-right">เรียนจบ</TableHead>
                    <TableHead className="min-w-52">ความคืบหน้าเฉลี่ย</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.coursePerformance.map((course) => (
                    <TableRow key={course.courseId}>
                      <TableCell className="font-medium">{course.courseTitle || 'ไม่ระบุ'}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(course.enrollmentCount)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-[var(--color-success-strong)]">
                        {formatNumber(course.completedCount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Progress value={course.avgProgress} className="min-w-24" />
                          <span className="w-11 text-right text-xs tabular-nums text-muted-foreground">
                            {Math.round(course.avgProgress)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AdminSection>
        </div>
      ) : null}

      {activeTab === 'users' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <AdminSection title="ผู้ใช้ใหม่รายเดือน" description="จำนวนบัญชีที่สร้างใหม่ในแต่ละเดือน">
            <TrendList
              items={data.monthlyUsers}
              getValue={(item) => item.count || 0}
              formatValue={formatNumber}
              emptyDescription="ยังไม่มีผู้ใช้ใหม่ในช่วงเวลาที่เลือก"
            />
          </AdminSection>
          <AdminSection title="การลงทะเบียนรายเดือน" description="จำนวนการลงทะเบียนใหม่ในแต่ละเดือน">
            <TrendList
              items={data.monthlyEnrollments}
              getValue={(item) => item.count || 0}
              formatValue={formatNumber}
              emptyDescription="ยังไม่มีการลงทะเบียนในช่วงเวลาที่เลือก"
            />
          </AdminSection>
        </div>
      ) : null}

      {activeTab === 'export' ? (
        <AdminSection
          title="ส่งออกข้อมูลเป็น CSV"
          description={'ดาวน์โหลดข้อมูลสำหรับ Excel หรือเครื่องมือวิเคราะห์ โดยใช้ช่วง ' + period + ' เดือนล่าสุด'}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {exportOptions.map((option) => {
              const pending = exporting === option.type;
              return (
                <Card key={option.type} className="rounded-xl shadow-none">
                  <CardHeader>
                    <CardTitle>{option.title}</CardTitle>
                    <CardDescription className="leading-5">{option.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" disabled={pending} onClick={() => handleExport(option.type)}>
                      {pending ? (
                        <AdminPendingLabel>กำลังส่งออก...</AdminPendingLabel>
                      ) : (
                        <>
                          <Download aria-hidden />
                          ดาวน์โหลด CSV
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </AdminSection>
      ) : null}
    </div>
  );
}
