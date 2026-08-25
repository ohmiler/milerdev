'use client';

import { useEffect, useState } from 'react';
import { Info, Settings2 } from 'lucide-react';

import {
  AdminEmptyState,
  AdminLoadingState,
  AdminPageHeader,
  AdminPendingLabel,
  AdminSection,
  AdminStatusBadge,
} from '@/components/admin/ui/AdminOperations';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface Setting {
  id: string | null;
  key: string;
  value: string | null;
  type: string;
  description: string | null;
  updatedAt: string | null;
}

interface GroupedSettings {
  general: Setting[];
  features: Setting[];
  upload: Setting[];
  email: Setting[];
}

type SettingsGroup = keyof GroupedSettings;

const tabs: Array<{ id: SettingsGroup; label: string; description: string }> = [
  { id: 'general', label: 'ทั่วไป', description: 'ข้อมูลและพฤติกรรมหลักของระบบ' },
  { id: 'features', label: 'ฟีเจอร์', description: 'เปิดหรือปิดความสามารถของแพลตฟอร์ม' },
  { id: 'upload', label: 'อัปโหลด', description: 'ข้อจำกัดและค่าที่เกี่ยวกับไฟล์' },
  { id: 'email', label: 'อีเมล', description: 'การส่งข้อความและการแจ้งเตือน' },
];

export default function AdminSettingsPage() {
  const [grouped, setGrouped] = useState<GroupedSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsGroup>('general');

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      setGrouped(data.grouped || null);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (key: string, value: string) => {
    setSaving(key);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });

      if (res.ok) {
        await fetchSettings();
        showToast('บันทึกสำเร็จ', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleChange = (key: string, value: string) => {
    if (!grouped) return;
    setGrouped({
      general: grouped.general.map((setting) => (setting.key === key ? { ...setting, value } : setting)),
      features: grouped.features.map((setting) => (setting.key === key ? { ...setting, value } : setting)),
      upload: grouped.upload.map((setting) => (setting.key === key ? { ...setting, value } : setting)),
      email: grouped.email.map((setting) => (setting.key === key ? { ...setting, value } : setting)),
    });
  };

  if (loading) {
    return <AdminLoadingState title="กำลังโหลดการตั้งค่า" />;
  }

  const currentSettings = grouped?.[activeTab] ?? [];
  const activeTabDetail = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="System Configuration"
        title="ตั้งค่าระบบ"
        description="ปรับค่าการทำงานของแพลตฟอร์มทีละรายการ พร้อมบันทึก audit log ทุกครั้ง"
        meta="ค่าบางรายการอาจมีผลต่อผู้ใช้ทันทีหลังบันทึก"
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as SettingsGroup)}
        className="gap-6"
      >
        <TabsList className="h-auto flex-wrap justify-start">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab}>
          <AdminSection
            title={activeTabDetail?.label || 'การตั้งค่า'}
            description={activeTabDetail?.description}
            actions={<AdminStatusBadge tone="info">{currentSettings.length.toLocaleString('th-TH')} รายการ</AdminStatusBadge>}
          >
        {currentSettings.length === 0 ? (
          <AdminEmptyState
            title="ไม่มีการตั้งค่าในหมวดนี้"
            description="ยังไม่มีค่าที่ระบบเปิดให้แก้ไขในหมวดที่เลือก"
            icon={<Settings2 />}
          />
        ) : (
          <div className="divide-y divide-border">
            {currentSettings.map((setting) => {
              const isBoolean = setting.type === 'boolean';
              const isNumber = setting.type === 'number';
              const pending = saving === setting.key;

              return (
                <div
                  key={setting.key}
                  className="grid gap-4 py-5 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1fr)_minmax(260px,420px)] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{setting.description || setting.key}</p>
                    <code className="mt-1 block break-all text-xs text-muted-foreground">{setting.key}</code>
                    {setting.updatedAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        อัปเดตล่าสุด {new Date(setting.updatedAt).toLocaleString('th-TH')}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    {isBoolean ? (
                      <div className="flex min-w-32 flex-1 items-center justify-between rounded-lg border border-border px-3 py-2">
                        <span className="text-sm text-muted-foreground">
                          {setting.value === 'true' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                        <Switch
                          checked={setting.value === 'true'}
                          onCheckedChange={(checked) => handleChange(setting.key, checked ? 'true' : 'false')}
                          aria-label={setting.description || setting.key}
                        />
                      </div>
                    ) : (
                      <Input
                        type={isNumber ? 'number' : 'text'}
                        value={setting.value || ''}
                        onChange={(event) => handleChange(setting.key, event.target.value)}
                        className={cn(isNumber && 'max-w-32')}
                        aria-label={setting.description || setting.key}
                      />
                    )}
                    <Button
                      size="sm"
                      className="min-w-24"
                      disabled={pending}
                      onClick={() => handleSave(setting.key, setting.value || '')}
                    >
                      {pending ? <AdminPendingLabel>กำลังบันทึก</AdminPendingLabel> : 'บันทึก'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </AdminSection>
        </TabsContent>
      </Tabs>

      <Alert>
        <Info aria-hidden />
        <AlertTitle>การตั้งค่าเป็นการเปลี่ยนแปลงระดับระบบ</AlertTitle>
        <AlertDescription>
          ตรวจสอบค่าก่อนกดบันทึก การเปลี่ยนแปลงจะมีผลตามพฤติกรรมของแต่ละฟีเจอร์และถูกเก็บใน audit log
        </AlertDescription>
      </Alert>
    </div>
  );
}
