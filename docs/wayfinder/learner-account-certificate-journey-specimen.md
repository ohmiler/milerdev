# Learner account and certificate journey specimen

สถานะ: รอความเห็นจาก owner

Ticket: [[UI Improvement] ปรับปรุง learner account และ certificate journey](https://github.com/ohmiler/milerdev/issues/22)

ขอบเขตนี้เป็น localized planning specimen สำหรับ `/dashboard`, `/dashboard/certificates`, `/dashboard/payments`, `/profile`, `/settings` และ `/certificate/[code]` เท่านั้น ยังไม่แก้ source code, enrollment/completion policy, payment truth, certificate issuance/revocation, authentication, production data หรือ schema

## Design thesis

บัญชีสมาชิกควรตอบ 3 คำถามตามลำดับ:

1. ตอนนี้ทำอะไรต่อได้
2. มีสิทธิ์หรือหลักฐานใดแล้ว
3. ถ้าสถานะไม่ครบ ต้องกู้คืนอย่างไร

Dashboard ไม่ควรเริ่มด้วยรายงานตัวเลขจนบดบังการเรียนต่อ และ Certificate ไม่ควรถูกสื่อว่า “ยังมีผล” เพียงเพราะมีรูปหรือมีรหัสอยู่ ระบบต้องแยกความคืบหน้า, การเรียนจบ, การออกใบรับรอง, สถานะเพิกถอน และ payment record ตาม authority จริง

ใช้ Academy-light, Navbar/Footer, `LearnerAccountShell` และ shadcn primitives เดิมต่อไป งานนี้ปรับ hierarchy, copy, server boundary และ recovery state ไม่ใช่ redesign บัญชีใหม่

หลักที่ต้องรักษา:

- สมาชิกไม่ใช่ผู้เรียนจนมี enrollment ที่ถูกต้อง
- lesson progress ไม่ให้สิทธิ์เรียนและไม่ออกใบรับรองจาก client
- `enrollments.completedAt` เป็นหลักฐานการจบระดับ enrollment; progress 100% เพียงอย่างเดียวไม่ใช่ completion authority ใน UI
- Certificate เป็น credential record แยกจาก progress/completion และจะยังมีผลเมื่อ `revokedAt` เป็น `null` เท่านั้น
- Payment record ไม่ใช่ enrollment/access proof; ใช้ payment/access states ตาม resolution ของ enrollment/payment
- Public certificate route ตรวจรหัสได้โดยไม่ต้องเข้าสู่ระบบ แต่ต้องเปิดเผยข้อมูลเท่าที่จำเป็น
- การเปลี่ยนรหัสผ่านยังเพิ่ม `sessionVersion` และทำให้ session เดิมสิ้นสุด

## 1. Candidate domain vocabulary

คำต่อไปนี้ต้องยืนยันก่อนเพิ่มลง `CONTEXT.md`:

| Canonical term | Authority | ความหมายใน UI | ห้ามใช้แทน |
| --- | --- | --- | --- |
| สมาชิก | authenticated user/session | ผู้มีบัญชี MilerDev | ผู้เรียน เมื่อยังไม่มี enrollment |
| ผู้เรียน | valid enrollment ของคอร์สหนึ่ง | สมาชิกที่เข้าพื้นที่เรียนคอร์สนั้นได้ | สมาชิกทุกคน |
| ความคืบหน้า | completed lesson records ÷ current lesson count | จำนวนบทที่ทำครบและเปอร์เซ็นต์ | การเรียนจบ, ใบรับรอง |
| เรียนจบแล้ว | `enrollments.completedAt` | ระบบยืนยัน completion ของ enrollment | progress 100% ที่ยังไม่ยืนยัน |
| ใบรับรองยังมีผล | certificate record + `revokedAt = null` | credential ที่ public route ยืนยันได้และยังไม่ถูกเพิกถอน | เพียง “ตรวจสอบได้” ซึ่งไม่บอก validity |
| ใบรับรองถูกเพิกถอน | certificate record + `revokedAt != null` | พบ credential แต่ไม่ควรใช้อ้างสถานะปัจจุบัน | ไม่พบใบรับรอง |
| ไม่พบใบรับรอง | code ไม่ resolve เป็น record | ระบบยืนยัน credential จากรหัสนี้ไม่ได้ | ถูกเพิกถอน, ถูกลบ |
| ชื่อในโปรไฟล์ | `users.name` ปัจจุบัน | ชื่อที่แสดงในบัญชีและใช้กับการออกใบรับรองครั้งถัดไป | ชื่อบนใบรับรองเดิม |
| ชื่อผู้รับบนใบรับรอง | `certificates.recipientName` snapshot | ชื่อที่บันทึกตอนออก credential | ชื่อ profile แบบ live |

ชื่อผู้รับบนใบรับรองเดิมไม่เปลี่ยนตาม Profile เพื่อรักษาหลักฐานที่ออกไปแล้ว หากต้องแก้ credential เดิมต้องเป็น admin correction/reissue policy แยก ไม่ใช่ side effect ของการแก้โปรไฟล์

## 2. One member account shell

ปัจจุบัน Dashboard มี navigation 3 รายการของตัวเอง ส่วน Certificates, Payments, Profile และ Settings ใช้ sidebar 5 รายการ; `LearnerAccountShell` มีลิงก์ Dashboard แต่ type `current` ไม่รองรับ Dashboard จึงไม่มี canonical shell จริง

ยืนยัน topology เดียวจาก navigation resolution:

```text
บัญชีสมาชิก
├── การเรียนของฉัน          /dashboard
├── ใบรับรอง               /dashboard/certificates
├── การชำระเงิน            /dashboard/payments
├── โปรไฟล์                /profile
└── ตั้งค่าบัญชี           /settings
```

- ทุก route ใช้ `LearnerAccountShell`/account-link source เดียว และมี `aria-current="page"` เพียงหนึ่งรายการ
- “บัญชีสมาชิก” เป็น shell label; “ผู้เรียน” ใช้เฉพาะบริบท enrollment/course
- Desktop ใช้ sticky account navigation เดิม
- Mobile ใช้ `<nav>` + `<Link>` แบบ horizontal overflow หรือ compact wrap ที่ current item เห็นได้ทันที; ไม่ใช้ Tabs เพราะแต่ละรายการเป็น route และต้องรองรับ open-in-new-tab
- Dashboard ไม่ทำ navigation ชุดแยกและไม่ตัด Profile ออกจากทางลัด
- Loading/error layouts ใช้ shell และ link order เดียวกับ resolved page

```text
Desktop
┌ บัญชีสมาชิก · การเรียนของฉัน ───────────────────────────┐
│ [account nav] │ ทำต่อจากครั้งก่อน                        │
│               │ [คอร์ส + บทถัดไป + progress]            │
│               │ สรุปการเรียน                             │
│               │ คอร์สทั้งหมด                             │
└───────────────────────────────────────────────────────────┘

Mobile
บัญชีสมาชิก / การเรียนของฉัน
[การเรียนของฉัน][ใบรับรอง][การชำระเงิน] → scroll
ทำต่อจากครั้งก่อน
[primary course action]
สรุป + คอร์สอื่น
```

## 3. Private routes authorize before rendering

ทุก account route ตรวจ `auth()` ฝั่ง server ก่อน render private title, navigation หรือ skeleton และ redirect ไป Login พร้อม safe internal `callbackUrl` ตาม authentication resolution

ปัจจุบัน `/dashboard/certificates` และ `/dashboard/payments` render account shell ให้ผู้เยี่ยมชมก่อน แล้ว client fetch ได้ 401, แสดงข้อความว่าอาจเป็นปัญหา connection และทิ้ง console error ซึ่งเป็นทั้ง privacy/trust และ recovery gap

Contract:

1. server guard ก่อน private shell สำหรับ Dashboard, Certificates, Payments, Profile และ Settings
2. unauthenticated → `/login?callbackUrl=<exact-safe-path>`; ไม่มี private-shell flash และไม่มี 401 console error
3. API ยังตรวจ session/owner ซ้ำเสมอ; page guard ไม่แทน API authorization
4. initial account data ใช้ Server Component/read model เมื่อ practical; client islands จำกัดเฉพาะ mutation, copy/share/download และ explicit refresh
5. localized `error.tsx` แสดง “ยังโหลดข้อมูลบัญชีไม่ได้” + retry; ไม่ตีความ server error เป็น empty state

## 4. Dashboard: next action before metrics

รักษา `selectContinuationLesson()` และ sorting จาก learning activity เดิม แต่ให้ primary action มาก่อน summary metrics

### Canonical learning presentation

```ts
type LearningPresentation = {
  enrollment: 'none' | 'active' | 'completed';
  progress: {
    completedLessons: number;
    totalLessons: number;
    percent: number;
  };
  continuation: 'start' | 'resume' | 'review' | 'none';
  certificate: 'not_eligible' | 'missing' | 'active' | 'revoked';
};
```

server presenter derive status; UI ไม่ลดเหลือ boolean `progressPercent === 100`

| Facts | สถานะที่เห็น | Primary action |
| --- | --- | --- |
| ไม่มี enrollment | ยังไม่มีคอร์สในการเรียนของฉัน | ดูคอร์สทั้งหมด |
| enrollment, 0 completed | พร้อมเริ่มเรียน | เริ่มบทแรก |
| enrollment, 1–99% | กำลังเรียน · X/Y บท | เรียนต่อจากบทล่าสุด |
| derived progress 100%, `completedAt` ยังไม่มี | เรียนครบแล้ว · กำลังยืนยันการจบ | เปิดคอร์ส / ตรวจสถานะอีกครั้ง |
| `completedAt`, certificate ไม่มี | เรียนจบแล้ว · ยังไม่พบใบรับรอง | ตรวจสอบใบรับรองอีกครั้ง |
| `completedAt`, active certificate | เรียนจบแล้ว · ใบรับรองพร้อม | ดูและแชร์ใบรับรอง |
| `completedAt`, revoked certificate | เรียนจบแล้ว · ใบรับรองถูกเพิกถอน | ดูสถานะใบรับรอง / ติดต่อ |

- eyebrow “Next action” เปลี่ยนเป็น “ทำต่อจากครั้งก่อน”
- CTA ระบุ task จริง: “เริ่มบทแรก”, “เรียนต่อ: {ชื่อบท}”, “ทบทวนคอร์ส”, “ดูใบรับรอง”
- Progress label อ่านทั้งชื่อคอร์ส, X/Y บท และเปอร์เซ็นต์; ไม่พึ่งสี/Badge อย่างเดียว
- Summary cards อยู่หลัง primary action และใช้ `Card` composition หรือ semantic `<dl>` ไม่ใช้ styled anonymous `<div>` contract
- คอร์สหลักไม่ซ้ำในรายการที่เหลือ; empty state เดิมที่พาไป Catalog คงไว้
- completed/revoked certificate ไม่เปลี่ยน enrollment access; course review ยังเข้าได้ตาม policy เดิม

## 5. Certificate issuance recovery

`/api/progress` บันทึก `completedAt` ก่อนเรียก `issueCertificate()` และจับ certificate error โดยไม่ rollback progress ดังนั้น learner ที่เรียนจบแต่ไม่มี certificate เป็น state จริง ไม่ใช่ empty state ทั่วไป

เพิ่ม idempotent, authenticated repair boundary เช่น:

```ts
type CertificateRecoveryResult =
  | { kind: 'ready'; code: string }
  | { kind: 'issued'; code: string }
  | { kind: 'not_completed' }
  | { kind: 'revoked'; code: string }
  | { kind: 'temporarily_unavailable' };
```

server ต้องตรวจ user, enrollment, `completedAt`, course และ certificate record ใหม่ทุกครั้ง:

- active record มีอยู่ → return ready
- revoked record มีอยู่ → return revoked; ห้าม reissue/restore จาก learner action
- record ไม่มีและ completion ถูกต้อง → ใช้ issuance helper ที่ idempotent
- ไม่ completed → ไม่ออกใบรับรองแม้ client ส่ง courseId
- error → stable Thai recovery; ไม่แสดง DB/email/provider detail

CTA ใช้ “ตรวจสอบใบรับรองอีกครั้ง” ไม่ใช้ “ออกใบรับรองให้ฉัน” เพราะ server เป็น authority และต้องมี rate limit/idempotency tests

## 6. Certificate collection: proof, status, recovery

Collection ต้องแสดงใบรับรองของเจ้าของทั้งที่ยังมีผลและถูกเพิกถอน แทนการ filter revoked ออกจนผู้ใช้คิดว่า credential หาย

แต่ละ record ตอบ 5 ข้อ:

1. หลักสูตรอะไร
2. ชื่อผู้รับอะไร
3. เรียนจบ/ออกเมื่อใด
4. ตอนนี้ยังมีผลหรือถูกเพิกถอน
5. ทำอะไรต่อได้

```text
┌ TypeScript Foundations                         ┐
│ ใบรับรองยังมีผล                               │
│ ชื่อผู้รับ: Miler · เรียนจบ 31 ส.ค. 2569      │
│ ออก 31 ส.ค. 2569 · CERT-ABCD-2345             │
│ [ดูและตรวจสอบ] [แชร์ใบรับรอง]                 │
└────────────────────────────────────────────────┘
```

- active records มาก่อน revoked; count บอก “ยังมีผล X ใบ” และ “ถูกเพิกถอน Y ใบ” โดยไม่รวมกันอย่างคลุมเครือ
- revoked card ใช้ destructive `Alert`/Badge พร้อม “ดูสถานะ” และ Contact; ไม่เปิดเผย raw `revokedReason`
- completed enrollment ที่ certificate หายแสดง recovery Alert แยกจาก list
- empty + มี active enrollment → “ยังไม่มีใบรับรอง” + “กลับไปการเรียนของฉัน” ไม่ส่งผู้เรียนไปซื้อคอร์สใหม่เสมอ
- empty + ไม่มี enrollment → จึงใช้ “ดูคอร์สทั้งหมด”
- API project เฉพาะ field ที่ UI ต้องใช้; ไม่คืน full certificate row, internal user id หรือ revocation note

## 7. Public certificate verification

### Verification vocabulary

| Lookup result | Thai primary status | English secondary | Meaning |
| --- | --- | --- | --- |
| record + no `revokedAt` | ใบรับรองยังมีผล | ACTIVE CREDENTIAL | MilerDev พบ record และยังไม่เพิกถอน |
| record + `revokedAt` | ใบรับรองถูกเพิกถอน | REVOKED CREDENTIAL | พบ record แต่ไม่ควรใช้อ้างสถานะปัจจุบัน |
| no record | ไม่พบใบรับรองจากรหัสนี้ | NOT FOUND | ยืนยันไม่ได้จาก code นี้; ไม่สรุปว่าถูกลบหรือเพิกถอน |
| query failure | ยังตรวจสอบใบรับรองไม่ได้ | TEMPORARILY UNAVAILABLE | ลองใหม่/ติดต่อ; ไม่แสดง 404 |

### Privacy and payload

- เพิ่ม `robots: { index: false, follow: false }` เพื่อให้ direct-link sharing ทำงานแต่ลด search indexing ของชื่อผู้รับ
- Open Graph/Twitter metadata เปลี่ยนตาม active/revoked state; ไม่ใช้ `summary_large_image` ถ้าไม่มี preview image จริง
- public Client Component รับเฉพาะ code, recipient name, course title, completion/issue/revocation state, theme/header และ public course slug
- ห้าม serialize `userId`, internal `courseId`, email หรือ `revokedReason`; query join/project field ที่จำเป็นก่อนส่งข้าม RSC boundary
- ไม่ log code พร้อม identity/customer data และไม่เพิ่ม public certificate listing/search

### Certificate-specific recovery

แทน generic 404 ด้วย localized status surface:

```text
ไม่พบใบรับรองจากรหัสนี้
ตรวจตัวอักษรและขีดในรหัสอีกครั้ง เช่น CERT-ABCD-2345
[ตรวจรหัสอีกครั้ง] [ติดต่อ MilerDev]
```

verification input ใช้ label, `name="certificateCode"`, `spellCheck={false}`, uppercase normalization และ internal navigation ไป `/certificate/{code}`; missing code ไม่เปิดเผย record อื่น

## 8. Share and downloadable proof

- Primary action บน public route: “แชร์ใบรับรอง” ใช้ Web Share API เมื่อรองรับ และ fallback เป็น clipboard
- Feedback ใช้ inline/live `Alert`; toast เป็นเสริม ไม่ใช่หลักฐานเดียว
- PNG ยังเป็น document artifact และคง CSS Module exception ตาม ADR 0004
- Artifact เพิ่ม verification URL/คำสั่ง “ตรวจสถานะล่าสุดที่ …” เพราะรูปที่ดาวน์โหลดก่อนการเพิกถอนอาจเก่าได้
- Active PNG บอกว่า status ต้องตรวจจาก URL; Revoked PNG มี watermark และ action label ชัดว่าเป็นสำเนาที่ถูกเพิกถอน
- Certificate code/URL ใช้ `overflow-wrap`, long recipient/course names ไม่ล้นที่ 320–390 px
- Theme color ต้องคำนวณ readable foreground/overlay ให้ผ่าน contrast; ไม่เชื่อ arbitrary admin color ว่าอ่านกับสีขาวได้เสมอ
- Image-export logo/header กำหนด dimensions เพื่อลด layout shift ก่อน capture

ไม่เพิ่ม QR code, PDF, blockchain proof หรือ public directory ใน slice นี้

## 9. Profile and security

### Profile

- technical role `student` แสดงเป็น “สมาชิก”; ใช้ “ผู้เรียน” เฉพาะเมื่ออธิบาย enrollment
- อีเมลแสดงเป็น read-only account fact ไม่จำเป็นต้องเลียนแบบ editable input
- Name field มี `name`, `minLength`/schema feedback ภาษาไทยใต้ field, `data-invalid`/`aria-invalid`, focus-first-invalid และ stable rate-limit error
- CTA disabled เฉพาะระหว่าง requestหรือเมื่อค่าไม่เปลี่ยน; อย่าปิดก่อน submit จนผู้ใช้ไม่เห็น validation
- copy บอกผลต่อใบรับรองตรง ๆ: ชื่อใหม่ใช้กับบัญชีและใบรับรองที่ออกภายหลัง; ใบรับรองเดิมไม่เปลี่ยน
- success อยู่เป็น status จนผู้ใช้เริ่มแก้ใหม่หรือเปลี่ยนหน้า ไม่หายโดย timer สั้น

### Password/security

- ใช้ password policy presenter และ Thai inline validation เดียวกับ authentication resolution
- แยก visibility ของ current/new/confirm และคง paste/password-manager behavior
- rate limited, protection unavailable, wrong current password, reused password และ concurrent account change เป็น stable public states
- ก่อน submit อธิบายว่าเปลี่ยนสำเร็จแล้ว session ทุกอุปกรณ์รวมเครื่องนี้จะสิ้นสุด
- หลัง success อย่าปิด Accordion แล้วปล่อย session stale; แสดง “เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบอีกครั้ง” และ sign out/ไป Login ผ่าน server-safe flow
- Google-only state ใช้ “บัญชีนี้เข้าสู่ระบบด้วย Google” และชี้ recovery ที่มีจริง; ไม่สัญญา manual linking หรือ password action ที่ไม่มี server contract

## 10. Payments inside the account journey

Payment history ใช้ resolution ของ enrollment/payment เป็น authority: exact attempt, contextual status, reference, access separation และ recovery action ยังคงเดิม Ticket นี้เปลี่ยนเฉพาะ:

- อยู่ใน canonical member account navigation
- server auth guard ก่อน render
- loading/error shell ตรงกับ account layout
- Dashboard summary/link ใช้ status/count ที่ไม่สื่อว่า payment เท่ากับ enrollment

ห้ามสร้าง payment vocabulary หรือ recovery state ชุดที่สองใน Account specimen

## 11. Shadcn and accessibility contract

- ใช้ `Card` + Header/Title/Description/Content/Footer/Action ครบตามหน้าที่
- authoritative active/revoked/missing/repair ใช้ `Alert`; no-record ใช้ `Empty`; loading ใช้ `Skeleton`; mutation/download ใช้ disabled `Button` + `Spinner`
- account navigation ใช้ semantic `<nav><Link>` ไม่ใช้ Tabs หรือ clickable `div`
- current route มี visible state + `aria-current`; keyboard focus ไม่ถูก sticky nav บัง
- mobile nav มี scroll padding/visible overflow cue และทุก target อย่างน้อย 44×44 px
- dates/numbers ใช้ `Intl`; counts/amounts ใช้ tabular numerals เมื่อเปรียบเทียบ
- async updates ใช้ `aria-live="polite"`; errors มี next action
- placeholders/loading copy ใช้ “…” ไม่ใช้ “...”
- long Thai, recipient name, course title และ code รองรับ break/wrap โดยไม่มี horizontal page overflow
- reduced motion ปิด nonessential skeleton/toast transition; certificate validity ไม่อาศัย animation
- route-level loading mirror resolved shell/navigation/content geometry

## 12. Web Interface Guidelines findings

### `src/components/account/LearnerAccountShell.tsx`

- `src/components/account/LearnerAccountShell.tsx:8` — current route type ไม่รองรับ Dashboard ทั้งที่ nav มี Dashboard
- `src/components/account/LearnerAccountShell.tsx:37` — “บัญชีผู้เรียน” ขัด glossary สำหรับสมาชิกที่ยังไม่มี enrollment

### `src/app/dashboard/page.tsx`

- `src/app/dashboard/page.tsx:112` — unauthenticated redirect ทิ้ง exact return path
- `src/app/dashboard/page.tsx:141` — navigation ชุดที่สองไม่ใช้ shared account shell และขาด Profile
- `src/app/dashboard/page.tsx:156` — action/status language มี English “Next action” บน Thai task surface
- `src/app/dashboard/page.tsx:164` — progress 100% ถูกสื่อเป็น completion โดยไม่ดู `completedAt`
- `src/app/dashboard/page.tsx:179` — course list ทำซ้ำ progress-as-completion mismatch

### `src/app/dashboard/certificates/CertificateCollection.tsx`

- `src/app/dashboard/certificates/CertificateCollection.tsx:59` — private route รอ client fetch จึง render shell ก่อน API 401
- `src/app/dashboard/certificates/CertificateCollection.tsx:78` — share ใช้ clipboard อย่างเดียว; mobile native share/fallback state ขาด

### `src/app/api/certificates/route.ts`

- `src/app/api/certificates/route.ts:22` — revoked credentials ถูกซ่อนจากเจ้าของ จึงไม่มี status/recovery surface

### `src/app/certificate/[code]/page.tsx`

- `src/app/certificate/[code]/page.tsx:31` — public Client Component payload มี internal `userId` ที่ไม่ใช้
- `src/app/certificate/[code]/page.tsx:32` — public Client Component payload มี internal `courseId` ที่ไม่ใช้
- `src/app/certificate/[code]/page.tsx:78` — `summary_large_image` ไม่มี preview image contract
- `src/app/certificate/[code]/page.tsx:109` — status action language เป็น English-first และ “verified” ไม่แยก active จาก lookup

### `src/components/certificate/CertificateCard.tsx`

- `src/components/certificate/CertificateCard.tsx:128` — download error ถูกเขียน console จาก client แทน safe presentation/log boundary
- `src/components/certificate/CertificateCard.tsx:138` — copy-only share ไม่มี Web Share fallback/primary semantics

### `src/app/profile/page.tsx`

- `src/app/profile/page.tsx:54` — account description เรียกสมาชิกทุกคนว่าบัญชีผู้เรียน
- `src/app/profile/page.tsx:71` — technical `student` role ถูกแปลเป็นนักเรียนแม้ไม่มี enrollment

### `src/app/profile/ProfileForm.tsx`

- `src/app/profile/ProfileForm.tsx:65` — name input ไม่มี meaningful `name` และไม่มี inline invalid-field contract
- `src/app/profile/ProfileForm.tsx:85` — loading copy ใช้ `...` แทน `…`

### `src/components/settings/PasswordSettingsForm.tsx`

- `src/components/settings/PasswordSettingsForm.tsx:99` — success หาย/Accordion ปิดด้วย timer ทั้งที่ session ถูก invalidate
- `src/components/settings/PasswordSettingsForm.tsx:232` — submit ถูก disable ก่อน request จึงไม่เปิดทางให้ focus-first validation
- `src/components/settings/PasswordSettingsForm.tsx:234` — loading copy ใช้ `...` แทน `…`

## Evidence inventory

| Surface | หลักฐานปัจจุบัน | Friction/risk |
| --- | --- | --- |
| Account shell | `LearnerAccountShell`, Dashboard header nav | navigation 2 topology, Dashboard ไม่มี current state, member/learner copy drift |
| Dashboard | enrollment + lesson-progress queries, continuation helper | next action อยู่หลัง metrics; progress 100% ถูกใช้แทน completion; certificate stateไม่ร่วม presenter |
| Nested private routes | Certificates/Payments pages + runtime | unauthenticated เห็น private shell แล้วได้ API 401/error แทน Login redirect |
| Progress/issuance | `/api/progress`, `issueCertificate` | completion commit สำเร็จได้แม้ certificate issuance fail; ไม่มี learner recovery contract |
| Certificate collection | API filters `revokedAt`, client list | revoked credential หายจากเจ้าของ; empty CTA ไม่ดู active/completed context |
| Public verification | certificate page + generic not-found | status English/ambiguous; generic 404; public RSC payload เกินจำเป็น; ไม่มี robots noindex |
| Artifact/share | CertificateCard + CSS module | PNG ไม่มี authoritative verification URL disclaimer; clipboard-only; theme contrast ไม่รับประกัน |
| Profile | role mapping + ProfileForm | student ≠ learner; name/certificate snapshot effect ไม่อธิบาย; validation อยู่ top-level |
| Security | PasswordSettingsForm + change-password API | API invalidates all sessions แต่ UI success หายและไม่พา fresh login |
| Payments | PaymentHistory + prior resolution | account integration/server guard ยังขาด; payment recovery contract ถูกกำหนดแล้วใน ticket ก่อนหน้า |
| Runtime | local 1440/390 anonymous audit | `/dashboard` ไป `/login` แต่ทิ้ง callback; Certificates อยู่ route เดิม, API 401, console 1 error; certificate fake code ใช้ generic 404 |
| Tests | focused Vitest baseline | 7 files, 85/85 tests ผ่าน; ยังไม่มี behavior tests ของ public valid/revoked/missing certificate หรือ issuance repair |

## 13. Minimum implementation sequence

1. ยืนยัน glossary candidate และเพิ่ม member/progress/completion/certificate/snapshot terms ลง `CONTEXT.md`
2. ทำ shared server account guard + exact safe callback; เพิ่ม Dashboard เป็น current route ของ canonical shell และใช้ shell เดียวทุก account page
3. ทำ server-derived `LearningPresentation`; ย้าย next action ก่อน metrics และเพิ่ม progress/completion/certificate state tests
4. ทำ owner-scoped certificate read projection ที่รวม active/revoked + completed-without-certificate descriptor โดยไม่คืน internal fields/revocation note
5. เพิ่ม idempotent certificate repair boundary ที่ตรวจ completion/revocation/owner ฝั่ง server; test replay, revoked, not-completed และ issuance failure
6. ทำ certificate collection active/revoked/missing/empty states และ contextual next actions
7. ลด public certificate payload, เพิ่ม noindex/status-aware metadata, Thai active/revoked states และ certificate-specific not-found/error recovery
8. เพิ่ม verification URL/disclaimer ใน PNG, Web Share + clipboard fallback, long-content/contrast/export checks
9. ปรับ Profile semantics/inline validation/name-snapshot copy และ Password change fresh-login flow โดย reuse auth password/error contracts
10. นำ payment presentation/recovery จาก enrollment/payment resolution มาใส่ canonical account shell โดยไม่สร้าง state mapping ซ้ำ
11. deterministic tests/fixtures: member no enrollment, active course 0/partial/100, completed missing certificate, active/revoked certificate, invalid code, long Thai name/title, private 401 redirect, profile dirty/invalid/rate-limit, password session invalidation
12. browser checks 320/390/768/1024/1440, keyboard/focus, mobile nav overflow, share fallback, download failure, reduced motion, back-forward และไม่มี private-shell flash/console error

## Explicit non-goals

- ไม่เปลี่ยน enrollment/completion rules, lesson order, one-way completion UI หรือ course access
- ไม่ให้ client ออก/คืนสถานะ/เพิกถอน/ลบใบรับรอง และไม่ auto-reissue revoked credential
- ไม่เพิ่ม public certificate directory, person search, QR, PDF, blockchain proof หรือ credential provider ใหม่
- ไม่แก้ชื่อบนใบรับรองเดิมผ่าน Profile และไม่กำหนด admin correction/reissue policy ใน ticket นี้
- ไม่เปิดเผย email, userId, internal courseId, revocation note หรือ customer/payment payload บน public route
- ไม่เปลี่ยน payment status, refund, access หรือ recovery policy ที่ยืนยันไว้แล้ว
- ไม่เพิ่ม account deletion, email change, provider linking, MFA หรือ session-management feature ใหม่
- ไม่ redesign Navbar/Footer, learning workspace, certificate artwork identity หรือ global tokens

## Owner reaction requested

โปรดยืนยันหรือแก้ 6 decisions นี้:

1. ใช้ canonical “บัญชีสมาชิก” shell และ navigation ชุดเดียวทุก account route; “ผู้เรียน” ใช้เฉพาะผู้มี enrollment
2. Dashboard วาง “ทำต่อจากครั้งก่อน” ก่อน metrics และแยก progress, `completedAt`, active/missing/revoked certificate เป็นคนละ state
3. completed-without-certificate มี server-validated idempotent action “ตรวจสอบใบรับรองอีกครั้ง”; revoked credential ไม่ถูก reissue/restore จาก learner flow
4. Certificate collection แสดงทั้ง active และ revoked; Profile name มีผลกับใบรับรองในอนาคตเท่านั้น ส่วน `recipientName` เดิมเป็น snapshot
5. Public verification ใช้ Thai active/revoked/not-found states, certificate-specific recovery, `noindex` และ minimal client payload โดยไม่เปิดเผย internal IDs/revocation note
6. Password change บอกล่วงหน้าว่าทุก session จะสิ้นสุดและพา fresh login หลังสำเร็จ; share ใช้ native Web Share + clipboard fallback และ PNG ชี้กลับ authoritative verification URL
