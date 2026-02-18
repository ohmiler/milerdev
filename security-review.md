# Security Code Review — MilerDev Platform
**Date:** February 2026  
**Scope:** Full codebase (`src/`) — API routes, auth, payments, uploads, middleware  
**Reviewer:** Cascade AI  

---

## ระดับความเสี่ยง

| ระดับ | ความหมาย |
|-------|----------|
| 🔴 HIGH | ต้องแก้ทันที อาจส่งผลกระทบต่อผู้ใช้หรือระบบโดยตรง |
| 🟡 MEDIUM | ควรแก้ในเวอร์ชันถัดไป มีความเสี่ยงที่เกิดขึ้นได้ |
| 🔵 LOW | ควรพิจารณาแก้ เป็น defense-in-depth |
| ⚪ INFO | ข้อสังเกตหรือ best practice ที่ควรรู้ |

---

## 1. Authentication & Authorization

### ✅ สิ่งที่ทำถูกต้อง

- [x] **bcrypt cost factor 12** — `src/lib/auth.ts`, `src/app/api/auth/register/route.ts`  
  ค่า cost 12 ทำให้ brute force ช้ามาก (benchmark: ~250ms/hash ซึ่งเหมาะสม)

- [x] **Role refresh จาก DB ทุก 5 นาที** — `src/lib/auth.ts:77-92`  
  ป้องกัน privilege persistence: ถ้า admin ถูก downgrade จาก DB, JWT จะรู้ภายใน 5 นาที ไม่ใช่ทั้ง 7 วัน

- [x] **Email normalization** — `toLowerCase().trim()` ใน register, login, reset-password  
  ป้องกัน `User@example.com` กับ `user@example.com` เป็น account คนละ account

- [x] **ไม่มี allowDangerousEmailAccountLinking** — `src/lib/auth.ts`  
  ป้องกัน account takeover ผ่าน Google OAuth ที่ใช้ email เดิมกับ credentials account

- [x] **Admin authorization ตรวจ role ทุก route** — `session.user.role !== 'admin'`  
  ทุก admin route ตรวจ role ก่อน ไม่มี route ที่ลืม check

- [x] **Password strength validation** — ตรวจ uppercase, lowercase, digit ทั้งใน register และ change-password

### 🔵 LOW — ไม่มี session invalidation เมื่อเปลี่ยนรหัสผ่าน

**ไฟล์:** `src/app/api/auth/change-password/route.ts`, `src/app/api/auth/reset-password/confirm/route.ts`

**ปัญหา:** เมื่อผู้ใช้เปลี่ยนรหัสผ่าน JWT token เดิม (จากอุปกรณ์อื่น) ยังใช้งานได้อีก 7 วัน  
Role จะ refresh จาก DB ทุก 5 นาที แต่ token ยังคง valid อยู่

**แนวทางแก้:**
```typescript
// เพิ่ม passwordChangedAt ใน users table
// ใน JWT callback ตรวจว่า token.issuedAt < user.passwordChangedAt
if (freshUser.passwordChangedAt && token.iat) {
  if (new Date(token.iat * 1000) < freshUser.passwordChangedAt) {
    return null; // invalidate token
  }
}
```

---

## 2. Input Validation & Sanitization

### ✅ สิ่งที่ทำถูกต้อง

- [x] **Zod schema validation** ใน register, change-password, reset-password, contact  
  Validate ก่อน process ทุก route

- [x] **XSS prevention ใน lesson content** — `sanitizeRichContent()` ใน lesson create/update  
  `src/app/api/admin/courses/[id]/lessons/route.ts`, `src/app/api/admin/lessons/[lessonId]/route.ts`

- [x] **XSS prevention ใน review comment** — `stripHtml(comment).slice(0, 2000)`  
  `src/app/api/courses/[slug]/reviews/route.ts:193`

- [x] **XSS prevention ใน blog output** — `sanitizeRichContent(enhanceBlogContent(post.content))`  
  `src/app/blog/[slug]/page.tsx:254` — sanitize at render time ป้องกัน XSS ได้

- [x] **CSV injection prevention** — `csvSafe()` function ใน reports export  
  `src/app/api/admin/reports/export/route.ts:8-17` — prefix dangerous chars ด้วย `'`

- [x] **Contact form anti-spam** — honeypot field + timing check (< 3 seconds reject)  
  `src/app/api/contact/route.ts:42-52`

### 🔵 LOW — Blog content ไม่ถูก sanitize เมื่อ write ลง DB

**ไฟล์:** `src/app/api/admin/blog/route.ts:67-79`, `src/app/api/admin/blog/[id]/route.ts:71-80`

**ปัญหา:** `content` field เก็บลง DB โดยไม่ผ่าน `sanitizeRichContent()` แม้ว่า render time จะ sanitize อยู่แล้ว  
แต่ถ้าในอนาคตมี API endpoint ที่ return `content` โดยตรงโดยไม่ sanitize ก่อน render จะเกิด XSS ได้

**แนวทางแก้:**
```typescript
// เพิ่มใน admin/blog/route.ts POST handler
import { sanitizeRichContent } from '@/lib/sanitize';

content: content ? sanitizeRichContent(content) : null,
```

### 🔵 LOW — MIME type validation ใน slip verify ขึ้นกับ client

**ไฟล์:** `src/app/api/slip/verify/route.ts:39-44`

**ปัญหา:** `slipFile.type` มาจาก browser's `File` object ซึ่ง client ควบคุมได้  
ไฟล์ที่ไม่ใช่รูปภาพสามารถ set `type: 'image/jpeg'` ได้

**ความเสี่ยง:** ต่ำ — ไฟล์ถูกส่งต่อไป SlipOK API ซึ่งจะ fail ถ้าไม่ใช่สลิปจริง ไม่ได้เก็บ locally

**แนวทางแก้ (ถ้าต้องการ):** ตรวจ magic bytes ของไฟล์แทน Content-Type:
```typescript
const bytes = await slipFile.arrayBuffer();
const header = new Uint8Array(bytes.slice(0, 4));
const isJpeg = header[0] === 0xFF && header[1] === 0xD8;
const isPng = header[0] === 0x89 && header[1] === 0x50;
if (!isJpeg && !isPng) { /* reject */ }
```

---

## 3. API Security

### ✅ สิ่งที่ทำถูกต้อง

- [x] **Security headers ครบถ้วน** — `src/middleware.ts:139-163`
  - `X-Frame-Options: SAMEORIGIN` — clickjacking protection
  - `X-Content-Type-Options: nosniff` — MIME sniffing protection
  - `X-XSS-Protection: 1; mode=block` — legacy XSS filter
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security` (production only)

- [x] **Content Security Policy** — `src/middleware.ts:151-163`  
  มีการ set CSP ครอบคลุมทุก directive

- [x] **Rate limiting ครบทุก sensitive endpoint**
  - Login: 10 req/min ใน middleware
  - Register: 5 req/min
  - Reset password: 5 req/min
  - Slip verify: 10 req/min (per user ID)
  - Coupon validate: 10 req/min (per user ID)
  - Contact form: 3 req/10min
  - Admin API: 60 req/min

### 🟡 MEDIUM — In-memory rate limiter ไม่ shared ระหว่าง server instances

**ไฟล์:** `src/lib/rate-limit.ts:11`, `src/middleware.ts:5`

**ปัญหา:** ทั้งสอง rate limiter ใช้ `Map` ใน memory ของ Node.js process เดียว  
บน Railway เมื่อ scale up หลาย instances, attacker สามารถกระจาย request ไปยังแต่ละ instance เพื่อ bypass rate limit

**ตัวอย่าง:** ถ้ามี 3 instances, login rate limit จริงๆ คือ 30 req/min (10×3) ไม่ใช่ 10

**แนวทางแก้:** ใช้ Redis-based rate limiting
```typescript
// ใช้ Upstash Redis (มี free tier)
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
});
```

### 🟡 MEDIUM — CSP มี `unsafe-inline` และ `unsafe-eval`

**ไฟล์:** `src/middleware.ts:153`

**ปัญหา:**
```
script-src 'self' 'unsafe-inline' 'unsafe-eval' ...
```
- `unsafe-inline` ทำให้ inline `<script>` ทำงานได้ → ลบ XSS protection ของ CSP
- `unsafe-eval` ทำให้ `eval()`, `new Function()` ทำงานได้

**สาเหตุ:** Next.js ใช้ inline scripts สำหรับ hydration และ `eval` สำหรับ development  

**แนวทางแก้:** ใช้ nonce-based CSP (Next.js 13+ รองรับ)
```typescript
// next.config.ts
const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
// ใน middleware set nonce header และใช้ใน CSP
`script-src 'self' 'nonce-${nonce}'`
```

### 🔵 LOW — Missing rate limit ใน PUT /api/profile

**ไฟล์:** `src/app/api/profile/route.ts`

**ปัญหา:** Authenticated endpoint ที่ update user profile ไม่มี rate limiting  
ผู้ใช้สามารถ spam การ update ชื่อได้ไม่จำกัด

**แนวทางแก้:**
```typescript
const rateLimit = checkRateLimit(`profile:${session.user.id}`, rateLimits.api);
if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);
```

### ⚪ INFO — CSP img-src รวม `http:` (overly broad)

**ไฟล์:** `src/middleware.ts:155`
```
img-src 'self' data: blob: https: http:
```
`http:` ทำให้ image จาก HTTP URL ใดก็ได้ถูก load ได้ อาจเกิด mixed content  
แนะนำให้ตัด `http:` ออกแล้วใช้แค่ `https:`

---

## 4. Payment & Webhook Security

### ✅ สิ่งที่ทำถูกต้อง

- [x] **Stripe webhook signature verification** — `src/app/api/stripe/webhook/route.ts:20-24`  
  ใช้ `stripe.webhooks.constructEvent()` ตรวจ HMAC signature ทุก request

- [x] **DB cross-check หลาย layer** — `src/app/api/stripe/webhook/route.ts:43-88`
  - ตรวจ paymentId มีใน DB ไหม
  - ตรวจ userId ตรงกับ DB ไหม
  - ตรวจ courseId/bundleId ตรงกับ DB ไหม
  - ตรวจ amount ตรงกับ DB ไหม (ยอมรับ tolerance ≤ 1 satang)
  - ตรวจ currency ตรงกับ DB ไหม

- [x] **Server-side price calculation** — ไม่รับราคาจาก client  
  `src/app/api/stripe/checkout/route.ts`, `src/app/api/slip/verify/route.ts`  
  คำนวณราคาจาก DB รวมถึง promo price และ coupon discount

- [x] **Transaction atomicity ใน slip verify** — `src/app/api/slip/verify/route.ts:233-261`  
  update payment + insert enrollment + record coupon usage อยู่ใน transaction เดียว

- [x] **Idempotency ใน webhook** — ตรวจ duplicate enrollment ก่อน insert  
  ใช้ `safeInsertEnrollment()` ที่จัดการ duplicate key error

- [x] **Coupon server-side validation** — `src/app/api/coupons/validate/route.ts`  
  ตรวจ: active, date range, course restriction, usage limit, per-user limit, min purchase  
  ทั้งหมดจาก DB ไม่รับจาก client

### ⚪ INFO — Coupon usageCount อาจ race condition (concurrent requests)

**ไฟล์:** `src/app/api/coupons/validate/route.ts:75-76`, webhook

**ปัญหา:** ถ้าผู้ใช้หลายคน validate coupon พร้อมกัน (ก่อนใช้จริง) `usageCount` check อาจผ่านทั้งคู่  
แต่ actual record coupon usage ทำที่ transaction ของ slip verify/webhook ซึ่ง DB unique constraint จะ catch ได้

**ผลกระทบ:** ต่ำ — เป็น race window เล็ก แต่ไม่ส่งผลต่อ actual coupon usage recording

---

## 5. File Upload Security

### ✅ สิ่งที่ทำถูกต้อง

- [x] **Admin-only upload** — `session.user.role !== 'admin'` ก่อน allow upload  
  `src/app/api/upload/route.ts:14`

- [x] **MIME type whitelist** — `['image/jpeg', 'image/png', 'image/webp', 'image/gif']`

- [x] **Size limit** — 10MB สำหรับ image upload, 5MB สำหรับ slip

- [x] **Path traversal prevention** — folder name sanitize  
  `src/app/api/upload/route.ts:25`
  ```typescript
  const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50) || "courses";
  ```

- [x] **Media tracking** — ทุกไฟล์ที่ upload บันทึกลง `media` table พร้อม uploader ID

### ⚪ INFO — ไม่มี virus scan บน uploaded files

ไฟล์รูปภาพที่ upload ไปยัง Bunny CDN ไม่ผ่าน antivirus scan  
สำหรับ platform เรียนออนไลน์ที่รับแค่รูปภาพ ความเสี่ยงต่ำ แต่ควรรู้ไว้

---

## 6. Database Security

### ✅ สิ่งที่ทำถูกต้อง

- [x] **Drizzle ORM parameterized queries ทุก query**  
  ไม่มีการ string-interpolate user input ลงใน SQL โดยตรง → ป้องกัน SQL Injection

- [x] **Select เฉพาะ column ที่จำเป็น** — เช่น `GET /api/profile` select แค่ 6 columns ไม่ return `passwordHash`  
  `src/app/api/profile/route.ts:59-67`

- [x] **Audit log ทุก sensitive admin action** — settings, user management  
  `src/app/api/admin/settings/route.ts:138-148`

- [x] **Password stored as bcrypt hash เท่านั้น** — ไม่มีที่ไหน return `passwordHash` ใน response

- [x] **Reset token stored as SHA-256 hash** — `src/app/api/auth/reset-password/route.ts:52`  
  เก็บ hash ใน DB, ส่ง plaintext ทางอีเมล — ถ้า DB leak token ก็ใช้ไม่ได้

---

## 7. SSRF & Open Redirect

### ✅ สิ่งที่ทำถูกต้อง

- [x] **Image proxy allowlist** — `src/app/api/image-proxy/route.ts:5-10`
  ```typescript
  const ALLOWED_HOSTS = ['milerdev.b-cdn.net', 'milerdev.com', 'www.milerdev.com', 'localhost'];
  ```
  ป้องกัน SSRF — ไม่สามารถ proxy ไปยัง internal network (169.254.x.x, 192.168.x.x)

- [x] **HTTPS enforcement ใน production** — `parsed.protocol !== 'https:'` → reject  
  `src/app/api/image-proxy/route.ts:34-36`

- [x] **Content-Type validation ใน proxy response** — ตรวจว่า response เป็น `image/*`

- [x] **Size limit ใน proxy** — ตรวจทั้ง `Content-Length` header และ actual `buffer.byteLength`

### ⚪ INFO — ALLOWED_HOSTS ไม่ block private IP ranges

ถ้า `milerdev.b-cdn.net` resolve ไปยัง private IP (DNS rebinding attack) proxy จะยังส่ง request ได้  
โอกาสเกิดต่ำมากในสภาพแวดล้อม Bunny CDN แต่เป็น defense-in-depth ที่ดีถ้าต้องการ:
```typescript
// ตรวจหลัง resolve hostname
const isPrivateIP = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.)/.test(resolvedIP);
```

---

## 8. Information Disclosure

### 🔵 LOW — Debug console.log ใน production ใน blog page

**ไฟล์:** `src/app/blog/[slug]/page.tsx:77-89`

```typescript
console.log('[Blog] Looking for slug:', JSON.stringify(slug), 'length:', slug.length);
// ...
const allPosts = await db.select({ id: blogPosts.id, slug: blogPosts.slug, status: blogPosts.status }).from(blogPosts);
console.log('[Blog] Available slugs:', allPosts.map(p => JSON.stringify(p.slug)));
```

**ปัญหา 2 อย่าง:**
1. Log ข้อมูล slug ทุก posts ลง server log ทุกครั้งที่ post ไม่พบ (information disclosure ใน logs)
2. **Performance issue:** Query ดึง ALL blog posts ทุกครั้งที่ slug ไม่ match — ถ้ามีหลายร้อย posts จะช้ามาก

**แนวทางแก้:** ลบ console.log และ fuzzy matching fallback ออก หรือใช้ `LIKE` query แทน:
```typescript
// แทน load all posts
const match = await db.select({ id: blogPosts.id, slug: blogPosts.slug })
  .from(blogPosts)
  .where(like(blogPosts.slug, `${slug}%`))
  .limit(1);
```

### ⚪ INFO — SSE stream เปิดเผย internal userId ใน initial event

**ไฟล์:** `src/app/api/notifications/stream/route.ts:22`

```typescript
controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`));
```

Internal user ID (CUID) ถูกส่งกลับไปยัง client ผ่าน SSE  
ข้อมูลนี้เป็นของ user เองแต่เป็น implementation detail ที่ไม่จำเป็นต้องเปิดเผย

---

## 9. Infrastructure & Configuration

### ✅ สิ่งที่ทำถูกต้อง

- [x] **HSTS ใน production** — `max-age=31536000; includeSubDomains; preload`  
  Force HTTPS ป้องกัน SSL stripping

- [x] **nextConfig.images remotePatterns** — allowlist เฉพาะ trusted CDN hostnames  
  `next.config.ts:4-23` — `*.googleusercontent.com`, `*.b-cdn.net`, `*.bunny.net`, `*.slipok.com`

- [x] **NODE_ENV guard สำหรับ security headers** — HSTS ติดเฉพาะ production

### ⚪ INFO — HSTS preload ต้องสมัครแยก

`Strict-Transport-Security: ...; preload` อยู่ใน header แล้ว แต่ยังต้อง submit domain ที่  
[hstspreload.org](https://hstspreload.org) เพื่อให้ browser ทั้งหมด enforce ก่อน visit ครั้งแรก

---

## 10. Analytics & Tracking

### ⚪ INFO — Analytics track ไม่ validate courseId/bundleId กับ DB

**ไฟล์:** `src/app/api/analytics/track/route.ts`

Client-side tracking รับ `courseId` และ `bundleId` โดยไม่ verify ว่ามีอยู่ใน DB จริง  
ทำให้ analytics_events table อาจมี junk data ได้  
แต่ rate limited ที่ 30 req/min และ event name ถูก whitelist แล้ว ผลกระทบจำกัด

---

## สรุปภาพรวม

| หมวด | ผล | หมายเหตุ |
|------|----|----|
| Authentication | ✅ ดี | Role refresh, bcrypt 12, email normalization |
| Authorization | ✅ ดี | ทุก route ตรวจ role ครบ |
| Input Validation | ✅ ดี | Zod schema, sanitize-html |
| SQL Injection | ✅ ดี | Drizzle ORM parameterized queries ทั้งหมด |
| XSS | ✅ ดี | Sanitize ที่ output, stripHtml ที่ input |
| CSRF | ✅ ดี | SameSite cookie via NextAuth JWT |
| Rate Limiting | 🟡 ปรับปรุงได้ | In-memory ไม่ share ระหว่าง instances |
| Payment Security | ✅ ดี | Signature verify + DB cross-check + transaction |
| File Upload | ✅ ดี | MIME, size, path traversal ป้องกันครบ |
| SSRF | ✅ ดี | Allowlist + HTTPS enforcement |
| CSP | 🟡 ปรับปรุงได้ | unsafe-inline/eval ลดประสิทธิภาพ CSP |
| Information Disclosure | ✅ แก้แล้ว | ลบ debug log + แทน fuzzy fallback ด้วย LIKE query |
| Infrastructure | ✅ ดี | Security headers, HSTS, remotePatterns |

---

## Priority Action Plan

### ทำก่อน (MEDIUM)
1. **Upgrade rate limiter เป็น Redis** (Upstash Redis — free tier ใช้ได้)  
   แก้ปัญหา bypass ระหว่าง multiple Railway instances

2. ~~**ลบ debug console.log และ fuzzy slug fallback** ใน `blog/[slug]/page.tsx`~~  
   ✅ **แก้แล้ว** — ลบ console.log ทั้งหมด + แทน fuzzy fallback ด้วย `LIKE` query ที่ DB level

### ทำถัดไป (LOW)
3. ~~**เพิ่ม rate limit ใน PUT /api/profile**~~  
   ✅ **แก้แล้ว** — เพิ่ม `rateLimits.api` (30 req/min per user ID)

4. **เพิ่ม sanitizeRichContent ใน blog write** (defense-in-depth)  
   แม้ render time จะ sanitize แล้ว แต่ clean data ใน DB ดีกว่า

5. **Invalidate JWT เมื่อเปลี่ยนรหัสผ่าน**  
   เพิ่ม `passwordChangedAt` column + check ใน JWT callback

### พิจารณาระยะยาว (INFO)
6. **Nonce-based CSP** แทน `unsafe-inline` (ต้องการ Next.js middleware config เพิ่มเติม)
7. **Submit domain ที่ hstspreload.org**
8. **Magic bytes validation** ใน slip file upload
