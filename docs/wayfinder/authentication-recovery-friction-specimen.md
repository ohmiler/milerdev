# Authentication and recovery friction specimen

สถานะ: รอความเห็นจาก owner

Ticket: [[UI Improvement] ลด friction ใน authentication และ recovery](https://github.com/ohmiler/milerdev/issues/21)

ขอบเขตนี้เป็น localized planning specimen สำหรับ `/login`, `/register`, `/forgot-password`, `/reset-password`, Google OAuth และ post-auth return เท่านั้น ยังไม่แก้ source code, authentication policy, authorization, account linking, rate limit, session invalidation หรือ production data

## Design thesis

ผู้ใช้ควรรู้เสมอว่า “ต้องแก้อะไร”, “ระบบกำลังทำอะไร” และ “สำเร็จแล้วจะกลับไปไหน” โดยระบบยังตอบแบบไม่เปิดเผยว่ามีบัญชี อีเมล หรือวิธีเข้าสู่ระบบใดอยู่จริง

ใช้ Academy-light, `AuthShell`, form-only layout ของ login/register และ recovery context panel เดิมต่อไป งานนี้ลด friction ด้วย return intent, copy, validation และ recovery state ไม่ใช่การ redesign หน้า authentication

หลักที่ต้องรักษา:

- การสมัครสมาชิกสร้าง **สมาชิก** ไม่ใช่ผู้เรียน และไม่สร้าง enrollment
- invalid credentials, บัญชี Google-only, บัญชีถูกปิด และอีเมลที่ไม่มีในระบบต้องไม่ทำให้ account enumeration ง่ายขึ้น
- Google account linking ใช้ verified-email policy และ server boundary เดิม ห้ามเพิ่ม client-side linking shortcut
- password reset token ยังคง opaque, hash ก่อนเก็บ, มีอายุจำกัด, ใช้ได้ครั้งเดียว และไม่ถูก log
- การตั้งรหัสผ่านใหม่สำเร็จต้องเพิ่ม `sessionVersion` และทำให้ session เดิมใช้ต่อไม่ได้
- rate limiter fail closed และ server เป็น authority; client countdown เป็น feedback เท่านั้น
- ทุกหน้าปลายทางยังตรวจ session, role, enrollment และ ownership ของตนเอง ไม่เชื่อ `callbackUrl`

## 1. One safe return intent

ปัจจุบัน Course, Bundle, learning และ payment-success ส่ง `callbackUrl` มาที่ login แล้ว แต่ credentials และ Google OAuth บังคับไป `/dashboard`; ลิงก์ Login → Register → Forgot password ก็ทิ้ง intent ระหว่างทาง

ให้ใช้ชื่อ `callbackUrl` เดิมเป็น canonical return intent แต่ normalize ผ่าน helper ฝั่ง server ชุดเดียว:

```ts
type SafeAuthReturn = {
  pathname: string;
  source: 'validated' | 'fallback';
};
```

กติกา:

1. รับเฉพาะ pathname ภายใน origin ที่เริ่มด้วย `/` เพียงหนึ่งตัว
2. ปฏิเสธ absolute/protocol-relative URL, backslash, control character และ encoded variant ที่เปลี่ยนความหมายหลัง decode
3. ปฏิเสธ `/api`, asset/internal routes และวงวน `/login`, `/register`, `/forgot-password`, `/reset-password`
4. slice แรกเก็บเฉพาะ pathname; ไม่พก origin, query หรือ hash เพื่อไม่พา secret/filter ที่ผู้ใช้ไม่ตั้งใจผ่าน auth และอีเมล
5. invalid/missing intent ใช้ `/dashboard`
6. validate ใหม่ทุก trust boundary; client value ไม่เป็น authorization

เส้นทางที่ต้องรักษา intent:

```text
Course / Bundle / Learn / Payment return / protected member page
                          │
                          ▼
                  Login ?callbackUrl=...
                    │              │
            credentials/Google     ├── Register
                    │              │      │
                    │              │      └── Login
                    │              │
                    │              └── Forgot password
                    │                       │
                    │                 reset email link
                    │                       │
                    │                 Reset password
                    │                       │
                    └────────────── Login + reset-complete
                                      │
                                      ▼
                              validated destination
```

หลัง reset ให้กลับ login ก่อนเสมอเพราะ session เดิมถูก invalidate แล้ว หน้า login แสดงข้อความ “ตั้งรหัสผ่านใหม่แล้ว กรุณาเข้าสู่ระบบอีกครั้ง” และเข้าสู่ปลายทางที่ validate ไว้หลัง sign-in สำเร็จ

## 2. Login: one answer, useful next action

### Preserve

- ข้อความ invalid credentials แบบกลาง ไม่ยืนยันว่าอีเมลหรือรหัสผ่านส่วนใดผิด
- Google OAuth และ credentials เป็นสองวิธีที่ชัดเจน
- ปุ่ม pending disabled พร้อม Spinner และ copy “กำลังเข้าสู่ระบบ…”

### Repair

| State | Copy ที่ผู้ใช้เห็น | Action |
| --- | --- | --- |
| ช่องไม่ครบ/อีเมลผิดรูปแบบ | error ภาษาไทยใต้ field | focus field แรกที่ผิด |
| credentials ไม่ผ่าน | “เข้าสู่ระบบไม่สำเร็จ ตรวจสอบข้อมูลหรือลองใหม่อีกครั้ง” | ลองใหม่ / ลืมรหัสผ่าน |
| IP rate limited | “ลองเข้าสู่ระบบถี่เกินไป กรุณารอประมาณ {เวลา} แล้วลองใหม่” | ปิด submit จนถึง server `Retry-After`/reset time |
| auth protection unavailable | “ระบบป้องกันบัญชีไม่พร้อมชั่วคราว กรุณาลองใหม่ภายหลัง” | retry ภายหลัง; ไม่ลด fail-closed behavior |
| OAuth cancelled/denied | “ยังไม่ได้เข้าสู่ระบบด้วย Google” | ลอง Google ใหม่ / ใช้รหัสผ่าน |
| OAuth account conflict | “ยังเข้าสู่ระบบด้วย Google ไม่ได้ ลองใช้รหัสผ่านหรือรีเซ็ตรหัสผ่าน” | ไม่มีคำสัญญาว่าเชื่อม Google ภายหลัง |
| reset complete | “ตั้งรหัสผ่านใหม่แล้ว กรุณาเข้าสู่ระบบอีกครั้ง” | credentials form; เก็บ safe return intent |
| unauthorized role | “บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานหน้านั้น” | ไป dashboard; ห้ามวนกลับ restricted route |

ข้อความ error ทั่วไปอยู่ใน alert summary ได้ แต่ field error ต้องอยู่ใกล้ช่อง, ผูกด้วย `aria-describedby`/`aria-invalid`, และ focus field แรกที่ผิด หลัง async error ใช้ polite live region โดยไม่ย้าย focus ถ้าผู้ใช้กำลังพิมพ์

ฟอร์มใช้ `noValidate` แล้วให้ schema/client validation ชุดเดียวแสดงภาษาไทย แทน browser-native message ซึ่ง runtime ปัจจุบันแสดงภาษาอังกฤษ

## 3. Register: create a member account without revealing account state

เปลี่ยนคำจาก “บัญชีผู้เรียน” เป็น **“บัญชีสมาชิก”**:

- Heading: “สมัครสมาชิก”
- Description: “สร้างบัญชีสมาชิก MilerDev หรือสมัครด้วย Google”
- CTA: “สร้างบัญชีสมาชิก”

Terms และ Privacy เป็นลิงก์จริงไป `/terms` และ `/privacy` ไม่ใช่ plain text

### Generic register result

API ต้องคง generic 200 response สำหรับอีเมลใหม่และอีเมลที่มีอยู่แล้ว หลัง response:

1. ลอง sign-in ด้วยข้อมูลที่ผู้ใช้เพิ่งกรอกตาม flow เดิม
2. ถ้าสำเร็จ ไป safe return intent
3. ถ้าไม่สำเร็จ **ห้าม silent redirect**; แสดง neutral recovery state:

```text
ตรวจสอบคำขอแล้ว
หากบัญชีพร้อมใช้งาน คุณสามารถเข้าสู่ระบบได้
หากจำรหัสผ่านไม่ได้ ให้ขอลิงก์ตั้งรหัสผ่านใหม่

[เข้าสู่ระบบ] [ตั้งรหัสผ่านใหม่]
หรือ ใช้ Google
```

state นี้ไม่บอกว่าบัญชีมีอยู่แล้ว, เป็น Google-only, ถูกปิด หรือ password ผิด

### Password contract

ใช้ password policy schema/presenter ร่วมกันระหว่าง Register และ Reset:

- อย่างน้อย 8 ตัวอักษร
- มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข
- อักขระพิเศษเป็นคำแนะนำ ไม่ใช่ requirement
- checklist เปลี่ยนสถานะขณะพิมพ์และไม่ใช้สีอย่างเดียว
- confirm error อยู่ใต้ช่อง confirm
- ปุ่มแสดงรหัสผ่านของ password/confirm ควบคุมแยกกัน
- ห้าม log password หรือส่ง strength telemetry ที่มี password material

## 4. Forgot password: neutral success, deliberate retry

รักษา generic response เดิมทั้งกรณีอีเมลมี/ไม่มี บัญชีถูกปิด และช่วง duplicate suppression

เปลี่ยน success title จากข้อความที่รับรองว่า “ส่งลิงก์แล้ว” เป็น:

```text
ตรวจสอบคำขอแล้ว
หากอีเมลนี้เชื่อมกับบัญชีที่ใช้งานอยู่ เราจะส่งลิงก์ตั้งรหัสผ่านใหม่
ตรวจกล่องจดหมายและสแปม ลิงก์มีอายุ 1 ชั่วโมง
```

actions:

- Primary: “กลับไปหน้าเข้าสู่ระบบ” พร้อม safe return intent
- Secondary: “ใช้อีเมลอื่น” เพื่อกลับไปแก้ field
- Resend: แสดงเมื่อ cooldown หมดตาม server response เท่านั้น; ระหว่างรอใช้ “ขอใหม่ได้ใน {เวลา}”

ไม่แสดง “ไม่พบอีเมล”, delivery provider detail หรือผลที่อนุมาน account state ได้ และไม่เปลี่ยนอีเมลเป็น URL state

## 5. Reset password: clear invalid-link and completion states

### Missing token

แสดง invalid-link state ทันทีจาก server-rendered route โดยไม่ flash password form:

```text
ลิงก์ไม่สมบูรณ์
กรุณาขอลิงก์ตั้งรหัสผ่านใหม่
[ขอลิงก์ใหม่] [กลับไปหน้าเข้าสู่ระบบ]
```

### Opaque token present

ไม่เพิ่ม token preflight endpoint ใน slice นี้ เพราะจะเพิ่ม oracle/request surface และยังเกิด race ก่อน submit ได้ ให้แสดง password form พร้อมบอกตรง ๆ ว่าระบบจะตรวจลิงก์เมื่อบันทึก

ถ้า submit แล้ว token invalid/expired/used:

```text
ลิงก์นี้ใช้ไม่ได้แล้ว
ลิงก์อาจหมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่
[ขอลิงก์ใหม่] [กลับไปหน้าเข้าสู่ระบบ]
```

อย่าแยกว่า token ไม่เคยมี, หมดอายุ หรือถูกใช้แล้ว

### Success

```text
ตั้งรหัสผ่านใหม่แล้ว
เพื่อความปลอดภัย กรุณาเข้าสู่ระบบอีกครั้ง
[ไปหน้าเข้าสู่ระบบ]
```

ลิงก์ login เก็บ safe return intent และส่ง arrival reason แบบ allowlisted value เช่น `reason=password-reset`; ห้ามนำข้อความจาก query มา render โดยตรง

## 6. Rate-limit and stable error vocabulary

API/auth boundary ส่งเฉพาะ stable public reason และ optional retry metadata:

```ts
type AuthPublicFailure =
  | { kind: 'invalid_input'; fields: Record<string, string> }
  | { kind: 'invalid_credentials' }
  | { kind: 'rate_limited'; retryAfterSeconds: number }
  | { kind: 'temporarily_unavailable' }
  | { kind: 'invalid_or_expired_link' }
  | { kind: 'oauth_cancelled' | 'oauth_unavailable' | 'oauth_conflict' };
```

- login rate limit ผูก IP และทำก่อน lookup อยู่แล้ว จึงแสดงสถานะ rate limited ได้โดยไม่เปิดเผยอีเมล
- register/forgot/reset ใช้ข้อความกลางเหมือนกันสำหรับ account existence
- UI ไม่แสดง raw provider/Auth.js/database error
- countdown clamp เป็นค่าที่สมเหตุผล, หยุดเมื่อ tab hidden ได้ และ re-check server เมื่อ submit; client clock ไม่ปลด rate limit เอง
- pending ใช้ Spinner ไม่ใช้ skeleton และปุ่มมี `aria-busy`

## 7. Responsive and accessibility contract

- รักษา form-only login/register และ recovery context panel; mobile เรียง form ก่อน/ตาม document order ที่อ่านเข้าใจได้
- ทุก input มี `name`, `autocomplete`; email ใช้ `spellCheck={false}`, `inputMode="email"` และ label ที่มองเห็นได้
- error ไม่พึ่ง toast อย่างเดียว; summary และ field error ใช้ถ้อยคำเดียวกัน
- focus ring มองเห็นได้ด้วย keyboard; toggle password มี accessible name ตามสถานะ “แสดง/ซ่อน…”
- ไม่ autofocus บน mobile
- ข้อความ Thai ยาวได้ที่ 320–390 px โดยไม่ overflow; action stack เป็นแนวตั้งเมื่อพื้นที่ไม่พอ
- async feedback ใช้ `aria-live="polite"`; invalid-link และ protection unavailable ใช้ alert ที่มี heading
- return destination เป็น URL state ที่ deep-link/back-forward ได้ แต่ต้อง canonicalize เฉพาะ reason/error ที่ consume แล้วโดยไม่ลบ safe callback
- reduced motion ไม่กระทบความเข้าใจ pending/success/error

## 8. Evidence inventory

| Surface | หลักฐานปัจจุบัน | Friction/risk |
| --- | --- | --- |
| Login form | `src/components/auth/LoginForm.tsx` | อ่านเฉพาะ `error`; credentials และ Google ไป `/dashboard`; forgot/register links ทิ้ง callback |
| Register form | `src/components/auth/RegisterForm.tsx` | ใช้ “บัญชีผู้เรียน”; generic register response ตามด้วย sign-in แต่ failure พาไป login แบบเงียบ; callback ถูกทิ้ง |
| Forgot password | `src/components/auth/ForgotPasswordForm.tsx`, reset request route | anti-enumeration และ duplicate suppression ดี; success title รับรองการส่งมากเกินหลักฐาน; retry ไม่สะท้อน cooldown |
| Reset password | `src/components/auth/ResetPasswordForm.tsx`, reset confirm route | token hashed/one-time/session invalidation ดี; missing token รอ client; password policy feedback ไม่เท่า Register; visibility toggle ร่วมกัน |
| OAuth | `src/lib/auth/google.ts`, `src/lib/auth/oauth-account-integrity.ts` | verified-email/linking guard ดี; UI บอกให้เชื่อม Google ภายหลังทั้งที่ไม่มี settings action |
| Return callers | Course/Bundle enroll, learn และ payment-success routes | สร้าง `callbackUrl` ถูกต้อง แต่ consumer ไม่ใช้ |
| Runtime | local `/login`, `/register`, `/forgot-password`, `/reset-password` | semantic structure และ labels ดี; callback หายจากทุก cross-link; browser-native invalid email แสดงภาษาอังกฤษ; console 0 errors/0 warnings |
| Tests | focused Vitest auth baseline | 9 files, 73 tests ผ่านทั้งหมด |

## 9. Minimum implementation sequence

1. เพิ่ม shared server-side safe-return parser พร้อม unit tests สำหรับ external URL, `//`, backslash, encoding, auth loop, `/api` และ fallback
2. ส่ง safe return intent เข้า Login/Register forms; ใช้กับ credentials, Google และ cross-links; เพิ่ม protected-route round-trip tests
3. ทำ shared auth error presentation/Thai field validation, focus-first-invalid, live region และ stable rate-limit feedback
4. ปรับ Register terminology, Terms/Privacy links, password policy presenter และ neutral post-register recovery state
5. ปรับ Forgot neutral success/cooldown และพก safe return ผ่าน reset email link โดย validate ซ้ำที่ API
6. ปรับ Reset missing/invalid/success states, shared password checklist, independent visibility และ reset-complete login reason
7. แก้ OAuth copy ให้ตรง capability จริง โดยไม่เปลี่ยน account linking policy
8. เพิ่ม deterministic tests สำหรับ new/existing/Google-only/deactivated generic outcomes, rate-limited/unavailable, token missing/expired/used, session invalidation และ malicious callback
9. browser checks ที่ 320/390/768/1024/1440 px, keyboard/focus, password toggles, back-forward, reduced motion, Thai long copy และไม่มี overflow

## Explicit non-goals

- ไม่เพิ่ม magic link, passkey, MFA, social provider ใหม่ หรือ manual Google account-linking UI
- ไม่เปลี่ยน password requirements, reset-token lifetime, email provider หรือ session policy
- ไม่บอกว่ามีบัญชีหรือ provider ใดผูกกับอีเมล
- ไม่ลด rate limit, fail-closed behavior, deactivated-user checks, role checks หรือ OAuth verified-email guard
- ไม่ auto-enroll, grant course access หรือข้าม authorization หลัง authentication
- ไม่ redesign global navigation, footer, AuthShell หรือ visual identity ทั้งหน้า
- ไม่ log token, password, credential, provider payload หรือ customer data

## Owner reaction requested

โปรดยืนยันหรือแก้ 6 decisions นี้:

1. ใช้ `callbackUrl` เดิม แต่รับเฉพาะ safe internal pathname และ fallback `/dashboard`; credentials, Google และ cross-links ต้องรักษาปลายทาง
2. พก safe pathname ผ่าน forgot/reset email flow และหลัง reset ให้ login ใหม่ก่อนกลับปลายทาง
3. Login แยก IP rate-limit/temporary protection unavailable จาก invalid credentials ได้ แต่ยังใช้ข้อความกลางที่ไม่เปิดเผย account state
4. Register ใช้ “บัญชีสมาชิก”; generic API response เดิม และถ้า automatic sign-in ไม่สำเร็จให้แสดง neutral recovery stateแทน silent redirect
5. Forgot success ใช้ “ตรวจสอบคำขอแล้ว” ไม่รับรองว่าอีเมลมีอยู่หรือส่งสำเร็จ; resend อิง cooldown จาก server
6. Reset ไม่เพิ่ม preflight endpoint; ตรวจ opaque token ตอน submit, ใช้ invalid/expired/used copy เดียว และคง session invalidation เดิม
