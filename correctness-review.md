# Correctness / Logic Review — MilerDev

**วันที่ตรวจ:** 2026-02-19  
**ขอบเขต:** Business Logic, Edge Cases, Race Conditions, Data Integrity

---

## สรุปผลการตรวจ

| หมวด | สถานะ | สรุป |
|------|--------|------|
| Division by Zero — Progress | 🔴 Bug | `totalLessons = 0` → `NaN` เขียนลง DB |
| SlipOK Amount Check | 🔴 Bug | `undefined < amount` = false → ผ่าน amount check โดยไม่ตรวจสอบ |
| Period Param Parsing | 🟡 Bug | `parseInt('abc')` = NaN → invalid date ใน reports query |
| Coupon TOCTOU Race Condition | 🟡 Bug | สองคนใช้คูปองพร้อมกัน อาจเกินจำนวน usageLimit |
| console.error ใน .catch() callbacks | 🟡 ค้าง | 5 จุดที่ migration script ไม่ครอบคลุม |
| Certificate Code Collision | 🔵 สังเกต | 5 retry แล้วยังชนจะ throw — เกิดยากมาก |
| Free Preview Progress ของ non-enrolled | 🔵 สังเกต | บันทึก progress โดยไม่มี enrollment — ตั้งใจไหม? |

---

## 🔴 Bug ระดับสูง

---

### 1. Division by Zero — `progress/route.ts` ✅ แก้แล้ว

**ไฟล์:** `src/app/api/progress/route.ts:128`  
**เกิดเมื่อ:** Course ที่ไม่มี lesson (totalLessons = 0)

```typescript
// ❌ ก่อนแก้ — NaN เขียนลง DB
const progressPercent = Math.round((completedLessons / totalLessons) * 100);

// ✅ หลังแก้
const progressPercent = totalLessons > 0
  ? Math.round((completedLessons / totalLessons) * 100)
  : 0;
```

**ผลกระทบ:** `progressPercent = NaN` → `enrollments.progressPercent = NaN` → `NaN === 100` = false แต่ progressPercent ใน DB เป็น NULL/0 ขึ้นอยู่กับ driver — ทำให้ report completionStats ผิดพลาด

---

### 2. SlipOK Amount Check Bypass — `slip/verify/route.ts` ✅ แก้แล้ว

**ไฟล์:** `src/app/api/slip/verify/route.ts:218`  
**เกิดเมื่อ:** SlipOK API ตอบกลับโดยไม่มี field `data.amount`

```typescript
// ❌ ก่อนแก้ — undefined < amount = false → ผ่านเสมอ!
if (slipResult.data?.amount < amount) { ... }

// ✅ หลังแก้ — ต้องมีค่า amount จริงๆ จึงจะผ่าน
const slipAmount = slipResult.data?.amount;
if (typeof slipAmount !== 'number' || slipAmount < amount) { ... }
```

**ผลกระทบ (security):** ถ้า SlipOK ส่ง response ที่ไม่มี `data.amount` (เช่น format เปลี่ยน) user จะ enroll ได้ฟรีโดยไม่จ่ายเงิน

---

## 🟡 Bug ระดับกลาง

---

### 3. `parseInt(period)` NaN — `reports/route.ts` ✅ แก้แล้ว

**ไฟล์:** `src/app/api/admin/reports/route.ts:19`  
**เกิดเมื่อ:** Query param `?period=abc` หรือ `?period=-1`

```typescript
// ❌ ก่อนแก้
const period = searchParams.get('period') || '12';
startDate.setMonth(startDate.getMonth() - parseInt(period));
// parseInt('abc') = NaN → startDate = Invalid Date → query ผิดพลาด

// ✅ หลังแก้ — validate + clamp
const periodRaw = parseInt(searchParams.get('period') || '12', 10);
const period = Number.isFinite(periodRaw) && periodRaw > 0 ? Math.min(periodRaw, 60) : 12;
```

---

### 4. TOCTOU Race Condition — Coupon Usage Limit

**ไฟล์:** `src/app/api/enroll/route.ts:103-113`, `src/app/api/slip/verify/route.ts:77-95`  
**เกิดเมื่อ:** 2 user ส่ง request พร้อมกันกับ coupon ที่มี `usageLimit = 1`

```
User A: validateCouponEligibility() → usageCount = 0, limit = 1 → valid ✅
User B: validateCouponEligibility() → usageCount = 0, limit = 1 → valid ✅
User A: INSERT couponUsage + UPDATE usageCount = 1  ← ทั้งคู่สำเร็จ
User B: INSERT couponUsage + UPDATE usageCount = 2  ← เกิน limit!
```

**วิธีแก้ที่ถูกต้อง:** เพิ่ม DB-level check ใน transaction ด้วย `SELECT FOR UPDATE` หรือ conditional update:

```typescript
// ใน transaction — อัปเดตเฉพาะเมื่อยังไม่เกิน limit
const result = await tx.update(coupons)
  .set({ usageCount: sql`${coupons.usageCount} + 1` })
  .where(and(
    eq(coupons.id, coupon.id),
    sql`(${coupons.usageLimit} IS NULL OR ${coupons.usageCount} < ${coupons.usageLimit})`
  ));
// ถ้า 0 rows affected = แย่งกัน → rollback
```

**ความเสี่ยง:** ต่ำ-กลาง — เกิดเฉพาะ high-concurrency บน coupon ที่มี usageLimit ต่ำ

---

### 5. `console.error` ใน `.catch()` Callbacks — ไม่ถูก Migrate

**ไฟล์:** 5 จุดใน non-blocking email/notification calls

```typescript
// ❌ ยังใช้ console.error ตรงๆ ใน .catch()
sendEnrollmentEmail(...).catch((err) => console.error("Failed to send enrollment email:", err));
// อยู่ใน: enroll/route.ts:150,178 | slip/verify/route.ts:295 | certificate.ts:101,111
// progress/route.ts:146 (certificate error)
```

Migration script ครั้งก่อนครอบคลุมแค่ catch block ปกติ ไม่ครอบคลุม `.catch()` arrow functions

---

## 🔵 สังเกต (ไม่ใช่ Bug แต่ควรรู้)

---

### 6. Certificate Code Collision Silent Failure

**ไฟล์:** `src/lib/certificate.ts:61-70`

```typescript
let retries = 0;
while (retries < 5) {
  // ถ้า 5 retries ทุกตัวชน → loop จบ ใช้ code ที่ชนซ้ำ
  // → db.insert() throw unique constraint → ไม่มี certificate → user ไม่รู้
  retries++;
}
```

โอกาสเกิดต่ำมาก (32^8 combinations) แต่ถ้าเกิดจะ silently fail — ควร throw error ที่ชัดเจนหลัง retry ครบ

---

### 7. Free Preview Progress ของ User ที่ไม่ได้ Enroll

**ไฟล์:** `src/app/api/progress/route.ts:49`

```typescript
if (!enrollment && !lesson.isFreePreview) {
    return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
}
// → unenrolled users สามารถบันทึก progress บน free preview lessons ได้
```

ตั้งใจหรือไม่? ถ้าตั้งใจให้ track ก็ OK แต่ progress จะสะสมใน DB โดยไม่มี enrollment record  
ถ้าไม่ตั้งใจ → ควร guard ด้วย enrollment check เสมอ

---

## สิ่งที่ทำดีแล้ว ✅

| Pattern | ไฟล์ |
|---------|------|
| `safeInsertEnrollment()` — handle duplicate via DB constraint | `src/lib/db/safe-insert.ts` |
| Coupon + enrollment ใช้ transaction ป้องกัน partial failure | `src/app/api/enroll/route.ts:126-139` |
| Stripe webhook idempotency — skip ถ้า already enrolled | `src/app/api/stripe/webhook/route.ts` |
| SlipOK timeout (30s) + abort signal | `src/app/api/slip/verify/route.ts:163-164` |
| Certificate retry loop สำหรับ code collision | `src/lib/certificate.ts:61-70` |
| `issueCertificate()` idempotent — คืน existing ถ้ามีอยู่แล้ว | `src/lib/certificate.ts:33-46` |
| Promo price verified server-side ไม่เชื่อ client | `src/app/api/enroll/route.ts:71-77` |

---

## Priority Action Plan

### ✅ แก้แล้ว (ใน session นี้)
1. ~~Division by zero ใน progress~~ — `progressPercent = totalLessons > 0 ? ... : 0`
2. ~~SlipOK amount check bypass~~ — `typeof slipAmount !== 'number' || slipAmount < amount`
3. ~~`parseInt(period)` NaN~~ — validate + clamp 1-60 months

### ✅ แก้แล้วทั้งหมด
4. ~~**Coupon TOCTOU**~~ — conditional UPDATE ใน transaction ทั้ง `enroll/route.ts` และ `slip/verify/route.ts`
5. ~~**`console.error` ใน `.catch()`**~~ — migrate 5 จุดใน `enroll`, `slip/verify`, `progress`, `certificate.ts`
6. ~~**Certificate collision**~~ — throw `Error` ชัดเจนหลัง 5 retries ครบ
