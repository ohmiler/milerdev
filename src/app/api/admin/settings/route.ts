import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { settings, auditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Default settings
const defaultSettings = [
  { key: 'site_name', value: 'Course Platform', type: 'string', description: 'ชื่อเว็บไซต์' },
  { key: 'site_description', value: 'ระบบเรียนออนไลน์', type: 'string', description: 'คำอธิบายเว็บไซต์' },
  { key: 'contact_email', value: '', type: 'string', description: 'อีเมลติดต่อ' },
  { key: 'enable_registration', value: 'true', type: 'boolean', description: 'เปิดให้สมัครสมาชิก' },
  { key: 'enable_payment', value: 'true', type: 'boolean', description: 'เปิดระบบชำระเงิน' },
  { key: 'currency', value: 'THB', type: 'string', description: 'สกุลเงิน' },
  { key: 'max_upload_size', value: '5', type: 'number', description: 'ขนาดไฟล์สูงสุด (MB)' },
  { key: 'maintenance_mode', value: 'false', type: 'boolean', description: 'โหมดปิดปรับปรุง' },
  { key: 'analytics_enabled', value: 'false', type: 'boolean', description: 'เปิดใช้ Analytics' },
  { key: 'smtp_host', value: '', type: 'string', description: 'SMTP Host' },
  { key: 'smtp_port', value: '587', type: 'number', description: 'SMTP Port' },
  { key: 'smtp_user', value: '', type: 'string', description: 'SMTP Username' },
  { key: 'smtp_from', value: '', type: 'string', description: 'Email ผู้ส่ง' },
];

// GET /api/admin/settings - Get all settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all settings from DB
    const settingsList = await db.select().from(settings);
    
    // Create a map of existing settings
    const settingsMap = new Map(settingsList.map(s => [s.key, s]));
    
    // Merge with defaults (show all default keys even if not in DB)
    const mergedSettings = defaultSettings.map(def => {
      const existing = settingsMap.get(def.key);
      if (existing) {
        return {
          ...existing,
          description: def.description,
        };
      }
      return {
        id: null,
        key: def.key,
        value: def.value,
        type: def.type,
        description: def.description,
        updatedAt: null,
        updatedBy: null,
      };
    });

    // Group settings by category
    const grouped = {
      general: mergedSettings.filter(s => ['site_name', 'site_description', 'contact_email', 'currency'].includes(s.key)),
      features: mergedSettings.filter(s => ['enable_registration', 'enable_payment', 'maintenance_mode', 'analytics_enabled'].includes(s.key)),
      upload: mergedSettings.filter(s => ['max_upload_size'].includes(s.key)),
      email: mergedSettings.filter(s => ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_from'].includes(s.key)),
    };

    return NextResponse.json({ settings: mergedSettings, grouped });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings - Update settings
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: 'กรุณาระบุ key' }, { status: 400 });
    }

    // Get IP and User Agent for audit log
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check if setting exists
    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    const oldValue = existing?.value || null;

    if (existing) {
      // Update existing
      await db
        .update(settings)
        .set({
          value: String(value),
          updatedAt: new Date(),
          updatedBy: session.user.id,
        })
        .where(eq(settings.key, key));
    } else {
      // Create new
      const defaultSetting = defaultSettings.find(d => d.key === key);
      await db.insert(settings).values({
        id: createId(),
        key,
        value: String(value),
        type: (defaultSetting?.type || 'string') as 'string' | 'number' | 'boolean' | 'json',
        description: defaultSetting?.description || null,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      });
    }

    // Log the change
    await db.insert(auditLogs).values({
      id: createId(),
      userId: session.user.id,
      action: existing ? 'update' : 'create',
      entityType: 'setting',
      entityId: key,
      oldValue: oldValue,
      newValue: String(value),
      ipAddress: ipAddress.split(',')[0].trim(),
      userAgent,
    });

    return NextResponse.json({ message: 'บันทึกการตั้งค่าสำเร็จ' });
  } catch (error) {
    console.error('Error updating setting:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึก' },
      { status: 500 }
    );
  }
}
