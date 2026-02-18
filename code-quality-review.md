# Code Quality / Maintainability Review — MilerDev

**วันที่ตรวจ:** 2026-02-19  
**ขอบเขต:** Error Handling, DRY Violations, Dead Code, Consistency, Type Safety

---

## สรุปผลการตรวจ

| หมวด | สถานะ | สรุป |
|------|--------|------|
| Error Handling Consistency | 🔴 พบปัญหา | 73 routes ใช้ inline error format แตกต่างกัน |
| Dead Utility Code | 🔴 พบปัญหา | `api-response.ts`, `error-handler.ts` สร้างไว้ดีแต่ไม่ถูกใช้ |
| DRY — Validation | 🟡 พบปัญหา | `validateBody()` ใช้แค่ 1 route จาก 40+ routes |
| console.error ใน Production | 🟡 พบปัญหา | 214 matches ใน 110 ไฟล์ ไม่ผ่าน logError() |
| Type Safety (`any`) | 🟡 พบปัญหา | 38 matches — ส่วนใหญ่ใน schema.ts และ middleware |
| TODO Comments | 🔵 สังเกต | 8 ไฟล์ — Sentry, FIXME ที่ยังค้าง |
| Response Format | 🔴 พบปัญหา | บาง route ตอบ `{ error }` บาง route ตอบ `{ success, error }` |

---

## 🔴 ปัญหาระดับสูง

---

### 1. Dead Utility Code — `api-response.ts` และ `error-handler.ts`

**ไฟล์:** `src/lib/api-response.ts`, `src/lib/error-handler.ts`  
**ผลกระทบ:** มี utility ที่ดีมากแต่ไม่มีใครใช้ — เป็น dead code ที่ทำให้ codebase สับสน

มีการสร้าง helper ครบครัน:
- `ok()`, `created()`, `badRequest()`, `unauthorized()`, `forbidden()`, `notFound()`, `serverError()`
- `AppError` class, `logError()`, `formatErrorResponse()`
- `apiHandler()` wrapper

แต่ผลการ scan พบว่า **ไม่มี route ไหนใช้เลย**:

```typescript
// ❌ ปัจจุบัน — ทุก route เขียนซ้ำๆ เอง
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });

// ✅ ควรใช้ helper ที่มีอยู่แล้ว
import { unauthorized, serverError } from '@/lib/api-response';
return unauthorized();
return serverError(error, { userId, action: 'updateProfile' });
```

**ทางเลือก:**
- **A (แนะนำ):** เริ่มใช้ใน routes ใหม่ทุกตัว + ค่อยๆ migrate routes เก่า
- **B:** ลบทิ้งถ้าไม่มีแผนใช้ เพื่อไม่ให้ confuse คนอ่าน

---

### 2. Inconsistent Response Format

**ผลกระทบ:** Frontend ต้อง handle 2 format ต่างกัน ทำให้ error handling ฝั่ง client ซับซ้อน

```typescript
// Format A — ส่วนใหญ่ใช้ (73 routes)
{ error: 'Unauthorized' }

// Format B — api-response.ts ออกแบบไว้
{ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }

// Format C — บาง route ใช้
{ message: 'Success' }
```

**วิธีแก้:** เลือก format เดียวแล้ว enforce ทั้ง codebase — แนะนำ Format B เพราะมี `code` field ที่ frontend ใช้ handle error ได้ดีกว่า

---

### 3. DRY Violation — Auth Check ซ้ำทุก Route

**ผลกระทบ:** Admin auth check เขียนซ้ำ ~40 ครั้ง

```typescript
// ❌ เขียนซ้ำใน ~40 admin routes
const session = await auth();
if (!session?.user || session.user.role !== 'admin') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// ✅ วิธีแก้ — สร้าง helper
// src/lib/auth-helpers.ts
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  return session;
}

// ใน route:
const session = await requireAdmin(); // 1 บรรทัด แทน 4 บรรทัด
```

---

## 🟡 ปัญหาระดับกลาง

---

### 4. `console.error` ใน Production ไม่ผ่าน Structured Logger

**ไฟล์:** 110 ไฟล์, 214 matches  
**ผลกระทบ:** Log ไม่มี structure — ไม่มี timestamp, userId, action context — ทำให้ debug production ยาก

```typescript
// ❌ ปัจจุบัน — ทุก catch block
} catch (error) {
  console.error('Error fetching blog posts:', error);
  return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
}

// ✅ ควรใช้ logError() ที่มีอยู่แล้ว
} catch (error) {
  logError(error instanceof Error ? error : new Error(String(error)), {
    userId: session?.user?.id,
    action: 'fetchBlogPosts',
  });
  return serverError(error);
}
```

---

### 5. `validateBody()` ใช้แค่ 1 Route จาก 40+

**ไฟล์:** `src/lib/validations/admin.ts` — ใช้แค่ใน `src/app/api/admin/courses/route.ts`  
**ผลกระทบ:** Routes อื่นๆ validate เองซ้ำๆ หรือไม่ validate เลย

```typescript
// ❌ ปัจจุบัน — หลาย routes
const body = await request.json();
const result = createCouponSchema.safeParse(body);
if (!result.success) {
  return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
}

// ✅ ใช้ validateBody() ที่มีอยู่แล้ว
const body = await request.json();
const validation = validateBody(createCouponSchema, body);
if (!validation.success) {
  return NextResponse.json({ error: validation.error }, { status: 400 });
}
const data = validation.data; // typed correctly
```

---

### 6. Type Safety — `any` ใน 11 ไฟล์

**ผลกระทบ:** ลด TypeScript benefit, อาจซ่อน runtime errors

```typescript
// ❌ ตัวอย่างใน notification-pubsub.ts
private listeners: Map<string, any[]> = new Map();

// ✅ ควรเป็น
type NotificationListener = (notification: Notification) => void;
private listeners: Map<string, NotificationListener[]> = new Map();
```

ไฟล์ที่ควรแก้ก่อน:
- `src/lib/notification-pubsub.ts`
- `src/app/api/notifications/stream/route.ts`
- `src/app/api/admin/users/route.ts`

---

### 7. TODO Comments ที่ค้างนาน

**ไฟล์:** 8 ไฟล์

| ไฟล์ | TODO |
|------|------|
| `src/lib/error-handler.ts:76` | Sentry integration |
| `src/app/api/enroll/route.ts` | ไม่ระบุ |
| `src/lib/bunny.ts` | ไม่ระบุ |
| `src/lib/certificate.ts` | ไม่ระบุ |
| `src/components/bundle/BundleEnrollButton.tsx` | ไม่ระบุ |
| `src/components/course/EnrollButton.tsx` | ไม่ระบุ |

---

## 🔵 สังเกต (ไม่เร่งด่วน)

---

### 8. `enroll` และ `enrollments` — Duplicate Routes?

**ไฟล์:** `src/app/api/enroll/route.ts` และ `src/app/api/enrollments/route.ts`  
**สังเกต:** มี 2 routes ที่ทำงานคล้ายกัน ควรตรวจสอบว่าซ้ำซ้อนหรือมีหน้าที่ต่างกัน

---

### 9. Client Component ที่ใหญ่มาก

**ไฟล์:** `src/app/courses/page.tsx` (494 บรรทัด), `src/app/admin/` หลายไฟล์  
**สังเกต:** Component ขนาดใหญ่ควรแตกเป็น sub-components เพื่อ maintainability

---

## สิ่งที่ทำดีแล้ว ✅

| Pattern | ไฟล์ |
|---------|------|
| Centralized Zod schemas | `src/lib/validations/admin.ts` |
| AppError class พร้อมใช้ | `src/lib/error-handler.ts` |
| Structured API response types | `src/lib/api-response.ts` |
| Audit logging ทุก admin action | `src/lib/auditLog.ts` |
| Rate limiting แยก config | `src/lib/rate-limit.ts` |
| Stripe lazy initialization | `src/lib/stripe.ts` |

---

## Priority Action Plan

### ทำก่อน (High ROI — เพิ่ม consistency ทันที)
1. **สร้าง `requireAdmin()` helper** — ลด boilerplate 40 routes (~4 บรรทัด/route)
2. **เริ่มใช้ `validateBody()`** ใน admin routes ที่ยังไม่ใช้
3. **ตัดสินใจ** เรื่อง `api-response.ts` — ใช้หรือลบ

### ทำถัดไป (Medium)
4. **Migrate catch blocks** ให้ใช้ `logError()` แทน `console.error` ตรงๆ
5. **แก้ `any` types** ใน notification-pubsub และ stream route
6. **ตรวจสอบ** `enroll` vs `enrollments` route ว่าซ้ำซ้อนไหม

### พิจารณาระยะยาว (Low)
7. **แตก large components** ใน admin pages
8. **Resolve TODO comments** หรือ convert เป็น GitHub Issues
