'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/ui/Toast';

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

export default function AdminSettingsPage() {
  const [, setSettings] = useState<Setting[]>([]);
  const [grouped, setGrouped] = useState<GroupedSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      setSettings(data.settings || []);
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
    setSettings(prev => prev.map(s => 
      s.key === key ? { ...s, value } : s
    ));
    if (grouped) {
      setGrouped({
        general: grouped.general.map(s => s.key === key ? { ...s, value } : s),
        features: grouped.features.map(s => s.key === key ? { ...s, value } : s),
        upload: grouped.upload.map(s => s.key === key ? { ...s, value } : s),
        email: grouped.email.map(s => s.key === key ? { ...s, value } : s),
      });
    }
  };

  const tabs = [
    { id: 'general', label: 'ทั่วไป' },
    { id: 'features', label: 'ฟีเจอร์' },
    { id: 'upload', label: 'อัพโหลด' },
    { id: 'email', label: 'อีเมล' },
  ];

  const renderSetting = (setting: Setting) => {
    const isBoolean = setting.type === 'boolean';
    const isNumber = setting.type === 'number';

    return (
      <div key={setting.key} style={{
        padding: '16px 20px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, color: '#1e293b', marginBottom: '4px' }}>
            {setting.description || setting.key}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {setting.key}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isBoolean ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={setting.value === 'true'}
                onChange={(e) => handleChange(setting.key, e.target.checked ? 'true' : 'false')}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                {setting.value === 'true' ? 'เปิด' : 'ปิด'}
              </span>
            </label>
          ) : (
            <input
              type={isNumber ? 'number' : 'text'}
              value={setting.value || ''}
              onChange={(e) => handleChange(setting.key, e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.875rem',
                width: isNumber ? '100px' : '250px',
              }}
            />
          )}
          <button
            onClick={() => handleSave(setting.key, setting.value || '')}
            disabled={saving === setting.key}
            style={{
              padding: '8px 16px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              cursor: saving === setting.key ? 'not-allowed' : 'pointer',
              opacity: saving === setting.key ? 0.7 : 1,
              minWidth: '70px',
            }}
          >
            {saving === setting.key ? '...' : 'บันทึก'}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
        กำลังโหลด...
      </div>
    );
  }

  const currentSettings = grouped ? grouped[activeTab as keyof GroupedSettings] : [];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
          ตั้งค่าระบบ
        </h1>
        <p style={{ color: '#64748b' }}>จัดการการตั้งค่าทั่วไปของระบบ</p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        background: '#f1f5f9',
        padding: '4px',
        borderRadius: '10px',
        width: 'fit-content',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#1e293b' : '#64748b',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings List */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {currentSettings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            ไม่มีการตั้งค่าในหมวดนี้
          </div>
        ) : (
          currentSettings.map(renderSetting)
        )}
      </div>

      {/* Info */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: '#0369a1',
      }}>
        💡 การเปลี่ยนแปลงจะถูกบันทึกทันทีเมื่อกดปุ่ม &quot;บันทึก&quot; และจะมีการบันทึก log การเปลี่ยนแปลงทุกครั้ง
      </div>
    </div>
  );
}
