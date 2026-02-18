# Testing Coverage Review — MilerDev

**วันที่ตรวจ:** 2026-02-19  
**ขอบเขต:** Unit Tests (Vitest), E2E Tests (Playwright), Coverage Gaps

---

## สรุปผลการตรวจ

| หมวด | สถานะ | สรุป |
|------|--------|------|
| Unit Tests — Auth | ✅ ดีมาก | register, reset-password, change-password ครบ |
| Unit Tests — Payment | ✅ ดีมาก | Stripe checkout, webhook, enroll, bundle enroll ครบ |
| Unit Tests — Admin Auth | ✅ ดีมาก | 401/403 ทุก admin route ครบ |
| Unit Tests — Coupon Logic | ✅ ดีมาก | calculateDiscount, validateCouponEligibility ครบ |
| Unit Tests — Rate Limit | ✅ ดี | sliding window, per-IP logic |
| Unit Tests — Notification PubSub | ✅ ดี | subscribe, publish, connection limits |
| E2E — Smoke Tests | ✅ ดี | ทุก public page โหลดได้, security headers |
| E2E — Auth Flow | ✅ ดี | login, register, redirect |
| E2E — Payment UI | ✅ ดี | pricing display, unauthenticated redirect |
| **Coverage Gaps** | 🟡 มีช่องว่าง | Progress tracking, Profile, Admin CRUD, Coupon validation API |

---

## สถานะ Tests ปัจจุบัน

```
Test Files  9 passed (9)
Tests       197 passed (197)
Duration    ~1.8s
```

**Framework:**
- **Unit/Integration:** Vitest + vi.mock()
- **E2E:** Playwright

---

## ✅ สิ่งที่ทำดีแล้ว

### Unit Tests ที่ครอบคลุมดี

| ไฟล์ | Tests | Coverage |
|------|-------|---------|
| `tests/api/auth.test.ts` | 28 tests | register, reset, confirm, change-password + rate limit + anti-enumeration |
| `tests/api/payment.test.ts` | 40+ tests | Stripe checkout, webhook, enroll, bundle — happy path + edge cases |
| `tests/api/admin-auth.test.ts` | 28 tests | 401 unauthenticated + 403 non-admin ทุก admin route |
| `tests/lib/coupon.test.ts` | 30+ tests | calculateDiscount, validateCouponEligibility, isCouponFullDiscount |
| `tests/lib/rate-limit.test.ts` | rate limiting logic |
| `tests/lib/notification-pubsub.test.ts` | pub/sub, connection limits |
| `tests/lib/validations.test.ts` | Zod schema validation |

### E2E Tests ที่ครอบคลุมดี

| ไฟล์ | Coverage |
|------|---------|
| `e2e/smoke.spec.ts` | ทุก public page + security headers |
| `e2e/auth.spec.ts` | login, register, redirect flows |
| `e2e/payment.spec.ts` | pricing display, unauthenticated redirect |
| `e2e/course.spec.ts` | course listing, detail page |
| `e2e/concurrency.spec.ts` | concurrent requests |

---

## 🟡 Coverage Gaps — ที่ควรเพิ่ม

---

### 1. Progress Tracking API — ไม่มี test เลย

**ไฟล์:** `src/app/api/progress/route.ts`  
**ความเสี่ยง:** Progress tracking เป็น core feature — ถ้า bug จะทำให้ user เรียนแล้วไม่บันทึก

```typescript
// ควรเพิ่ม tests/api/progress.test.ts
describe('POST /api/progress', () => {
  it('should mark lesson as complete')
  it('should return 401 for unauthenticated')
  it('should reject invalid lessonId')
  it('should not duplicate progress record')
  it('should return 403 if not enrolled in course')
})
```

---

### 2. Profile Update API — ไม่มี test

**ไฟล์:** `src/app/api/profile/route.ts`  
**ความเสี่ยง:** PUT /api/profile มี rate limit + validation — ควรมี test ยืนยัน

```typescript
// ควรเพิ่มใน tests/api/profile.test.ts
describe('PUT /api/profile', () => {
  it('should update name and bio')
  it('should reject XSS in bio field')
  it('should return 401 for unauthenticated')
  it('should return 429 when rate limited')
  it('should reject name > 255 chars')
})
```

---

### 3. Coupon Validation API — ไม่มี integration test

**ไฟล์:** `src/app/api/coupons/validate/route.ts`  
**ความเสี่ยง:** Coupon logic มี unit tests แต่ API endpoint ไม่มี test — อาจมี bug ที่ integration layer

```typescript
// ควรเพิ่มใน tests/api/coupon.test.ts
describe('POST /api/coupons/validate', () => {
  it('should validate active coupon')
  it('should reject expired coupon')
  it('should reject inactive coupon')
  it('should reject coupon over usage limit')
  it('should return 401 for unauthenticated')
})
```

---

### 4. Admin CRUD — ทดสอบแค่ Auth ไม่ได้ทดสอบ Business Logic

**ผลกระทบ:** `admin-auth.test.ts` ทดสอบแค่ว่า route block non-admin ได้ แต่ไม่ได้ทดสอบว่า CRUD ทำงานถูกต้อง

Routes ที่ควรเพิ่ม business logic tests:
- `POST /api/admin/courses` — validate required fields, slug generation
- `POST /api/admin/coupons` — validate discount value, expiry date logic
- `DELETE /api/admin/enrollments/[id]` — cascade effects

---

### 5. E2E — Authenticated User Flows ยังไม่ครบ

**ผลกระทบ:** E2E tests ส่วนใหญ่ทดสอบ unauthenticated flows — ไม่มี test สำหรับ logged-in user

```typescript
// ควรเพิ่มใน e2e/dashboard.spec.ts
test('logged-in user can see dashboard')
test('logged-in user can access enrolled course')
test('logged-in user can mark lesson complete')
test('logged-in user can view certificate')
```

---

### 6. Webhook Idempotency — ทดสอบแค่บางกรณี

**ไฟล์:** `tests/api/payment.test.ts`  
**ความเสี่ยง:** Stripe webhook retry ทดสอบแค่ duplicate enrollment — ยังขาด:

```typescript
it('should handle payment_intent.payment_failed')
it('should handle charge.refunded')
it('should be idempotent on duplicate webhook delivery')
```

---

## Priority Action Plan

### ทำก่อน (High ROI)
1. **`tests/api/progress.test.ts`** — core feature, ไม่มี test เลย
2. **`tests/api/profile.test.ts`** — มี rate limit + validation ที่ควรยืนยัน
3. **`tests/api/coupon.test.ts`** — integration layer ยังขาด

### ทำถัดไป (Medium)
4. **Webhook edge cases** — payment_failed, refunded, idempotency
5. **Admin CRUD business logic** — courses, coupons

### ระยะยาว (Low)
6. **E2E authenticated flows** — dashboard, lesson progress, certificate
7. **Coverage report** — รัน `vitest run --coverage` เพื่อดู % จริง
