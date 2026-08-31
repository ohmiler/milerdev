import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import {
  AnalyticsControlError,
  getAnalyticsControlState,
  recordAnalyticsGovernanceDecision,
  setAnalyticsOperationalEnabled,
  type AnalyticsGovernanceDecisionInput,
} from '@/lib/analytics-control';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { auditLogs, settings } from '@/lib/db/schema';
import { logError } from '@/lib/error-handler';
import { getClientIP } from '@/lib/rate-limit';

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

function analyticsControlErrorResponse(error: AnalyticsControlError) {
  if (error.code === 'GOVERNANCE_REQUIRED') {
    return NextResponse.json(
      { error: 'ต้องบันทึกและอนุมัตินโยบายข้อมูล Analytics ก่อนเปิดใช้งาน' },
      { status: 409 },
    );
  }
  if (error.code === 'INVALID_GOVERNANCE_DECISION') {
    return NextResponse.json({ error: 'ข้อมูลการอนุมัติ Analytics ไม่ถูกต้อง' }, { status: 400 });
  }
  return NextResponse.json(
    { error: 'ไม่สามารถยืนยันสถานะ Analytics หลังบันทึกได้' },
    { status: 503 },
  );
}

function parseOperationalValue(value: unknown): boolean | null {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
}

// GET /api/admin/settings - Get all settings and observable analytics state.
export async function GET() {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const [settingsList, analyticsControl] = await Promise.all([
      db.select().from(settings),
      getAnalyticsControlState({ fresh: true }),
    ]);
    const settingsMap = new Map(settingsList.map((setting) => [setting.key, setting]));
    const mergedSettings = defaultSettings.map((definition) => {
      const existing = settingsMap.get(definition.key);
      if (existing) return { ...existing, description: definition.description };
      return {
        id: null,
        key: definition.key,
        value: definition.value,
        type: definition.type,
        description: definition.description,
        updatedAt: null,
        updatedBy: null,
      };
    });

    const grouped = {
      general: mergedSettings.filter((setting) => [
        'site_name', 'site_description', 'contact_email', 'currency',
      ].includes(setting.key)),
      features: mergedSettings.filter((setting) => [
        'enable_registration', 'enable_payment', 'maintenance_mode',
      ].includes(setting.key)),
      upload: mergedSettings.filter((setting) => setting.key === 'max_upload_size'),
      email: mergedSettings.filter((setting) => [
        'smtp_host', 'smtp_port', 'smtp_user', 'smtp_from',
      ].includes(setting.key)),
    };

    return NextResponse.json({ settings: mergedSettings, grouped, analyticsControl });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      action: 'Error fetching settings:',
    });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// PUT /api/admin/settings - Update settings.
export async function PUT(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    const { key, value } = body as { key?: unknown; value?: unknown };
    if (typeof key !== 'string' || !key) {
      return NextResponse.json({ error: 'กรุณาระบุ key' }, { status: 400 });
    }

    const auditContext = {
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent'),
    };

    if (key === 'analytics_enabled') {
      const enabled = parseOperationalValue(value);
      if (enabled === null) {
        return NextResponse.json({ error: 'ค่า Analytics ต้องเป็น true หรือ false' }, { status: 400 });
      }

      const analyticsControl = await setAnalyticsOperationalEnabled({
        enabled,
        actorId: session.user.id,
        auditContext,
      });
      return NextResponse.json({ message: 'บันทึกการตั้งค่าสำเร็จ', analyticsControl });
    }

    if (key === 'analytics_governance_decision') {
      const analyticsControl = await recordAnalyticsGovernanceDecision({
        decision: value as AnalyticsGovernanceDecisionInput,
        actorId: session.user.id,
        auditContext,
      });
      return NextResponse.json({ message: 'บันทึกการอนุมัติ Analytics สำเร็จ', analyticsControl });
    }

    const allowedKeys = defaultSettings.map((setting) => setting.key);
    if (!allowedKeys.includes(key)) {
      return NextResponse.json({ error: 'key ไม่ถูกต้อง' }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);
    const oldValue = existing?.value ?? null;

    if (existing) {
      await db
        .update(settings)
        .set({ value: String(value), updatedAt: new Date(), updatedBy: session.user.id })
        .where(eq(settings.key, key));
    } else {
      const defaultSetting = defaultSettings.find((setting) => setting.key === key);
      await db.insert(settings).values({
        id: createId(),
        key,
        value: String(value),
        type: (defaultSetting?.type ?? 'string') as 'string' | 'number' | 'boolean' | 'json',
        description: defaultSetting?.description ?? null,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      });
    }

    await db.insert(auditLogs).values({
      id: createId(),
      userId: session.user.id,
      action: existing ? 'update' : 'create',
      entityType: 'setting',
      entityId: key,
      oldValue,
      newValue: String(value),
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent ?? 'unknown',
    });

    return NextResponse.json({ message: 'บันทึกการตั้งค่าสำเร็จ' });
  } catch (error) {
    if (error instanceof AnalyticsControlError) return analyticsControlErrorResponse(error);
    logError(error instanceof Error ? error : new Error(String(error)), {
      action: 'Error updating setting:',
    });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึก' }, { status: 500 });
  }
}
