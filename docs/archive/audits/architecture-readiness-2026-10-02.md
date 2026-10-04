# ตรวจความพร้อมก่อนปรับสถาปัตยกรรม back-end/front-end

วันที่ตรวจ: 2026-10-02 (บน `master` ที่ commit `0582bf1`)

สถานะ: ผลตรวจและข้อเสนอลำดับงาน ยังไม่ใช่ spec ที่ตกลงแล้ว ยังไม่ได้สร้าง GitHub Issues

## เป้าหมายและวิธีตรวจ

เป้าหมายคือให้ back-end กับ front-end มีโครงสร้างที่ดีและเชื่อมกันชัดเจน เพื่อต่อยอดฟีเจอร์ในอนาคตได้ง่าย คำถามที่ตอบคือ "ควรทำอะไรก่อนเริ่มปรับ"

ตรวจแบบอ่านอย่างเดียว 16 มุม โดยแต่ละมุมมีผู้ตรวจอิสระและมีผู้หักล้างข้อค้นพบระดับสูง/กลางทุกข้อ รวม 112 ข้อค้นพบ ไม่มีข้อใดถูกตัดทิ้ง แต่ 74 ข้อถูกแก้ตัวเลขหรือลดความรุนแรง มุมที่ตรวจ: สุขภาพ baseline, ตาข่าย test, ชั้น API, การแบ่ง layer, สถาปัตยกรรม front-end, สัญญา FE/BE, data model, การต่อยอด commerce และ platform, เรื่องที่ใช้ร่วมกัน (log/env/rate limit/dependency), เอกสารและงานค้าง, design system, และมุมเสริม (วงจรชีวิต commerce, สื่อ/อัปโหลด, รายงาน/นำเข้า-ส่งออก, ข้อมูลส่วนบุคคล)

ข้อจำกัด:

- ตัวเลขเป็นค่าประมาณ ให้นับใหม่ใน PR ที่จะลงมือแก้จริง
- ไม่ได้รัน build, E2E หรืออะไรที่แตะ DB ไม่ได้เปิด `.env`
- ผลตรวจมุม `fe-architecture` ไม่มีรายการข้อค้นพบ (มีเพียงสรุปและตัวเลข) และ `ext-commerce` รอบแรกว่างเปล่า แต่มุมเสริมวงจรชีวิต commerce ครอบคลุมแล้ว ควรตรวจ front-end ซ้ำเมื่อจะเริ่มงานฝั่งนั้น
- ตัวเลข coverage วัดจาก unit test เท่านั้น E2E อาจครอบคลุมเพิ่ม

## สภาพปัจจุบัน

ที่ดีอยู่แล้ว (ควรรักษา):

- `tsc --noEmit`, ESLint และ `check:admin-text` ผ่านโดยไม่มี error/warning; Vitest ผ่าน 1,356 จาก 1,356 (227 ไฟล์) ไม่มี test ที่ skip
- `: any` ใน `src` เป็น 0, `as any` 1, ไม่มี `@ts-ignore`
- ไม่มี import วนระดับไฟล์ และไม่มี component ใดใน `src/components` import `@/lib/db`
- `drizzle/meta/_journal.json` 23 รายการตรงกับไฟล์ SQL 23 ไฟล์
- required E2E ใช้ MySQL จริงที่แยกต่างหาก และ `tests/lib/backend-log-ci-contract.test.ts` ล็อกให้ `Build` ต้องพึ่งสามงานก่อนหน้า
- pattern ที่ใช้เป็นแม่แบบได้: `src/lib/navigation-model.ts`, `requireMember` ใน `src/lib/auth/member-access.ts`, lifecycle module ที่ inject store

ที่เป็นปัญหา:

| หมวด | สิ่งที่พบ |
| --- | --- |
| ตาข่าย test | 33 จาก 84 route ไม่มี test import (admin 18 จาก 45); coverage รวมประมาณ 49.5%; เงิน/สิทธิ์เรียน/ใบรับรอง ทดสอบกับ DB จำลอง ไม่ใช่ MySQL จริง; E2E ที่ CI บังคับมี 10 ตัว ส่วนราว 85 ตัวไม่รันใน CI; test ราว 64 ไฟล์ผูกกับ source text หรือลำดับ query |
| สิทธิ์ | admin guard มี 4 รูปแบบ; 3 หน้า admin ที่อ่าน DB (`admin/page.tsx`, `admin/courses/page.tsx`, `admin/courses/[id]/enrollments/page.tsx`) มี guard ที่ layout เท่านั้น (ยังไม่ได้พิสูจน์ว่าเลี่ยงได้) |
| สิทธิ์เรียน | enrollment ถูกสร้างใน 7 จุด และตรวจใน 27 ไฟล์ ไม่มี module เดียวตอบ "สมาชิกมีสิทธิ์เข้าคอร์สนี้ไหม" |
| สัญญา FE/BE | `fetch` ไม่มี type 113 จุดใน 48 ไฟล์; รูปแบบ error ไม่เป็นกลาง; 32 จาก 58 route ที่อ่าน body ตรวจด้วยมือ ขณะที่มี schema สำเร็จรูป 12 ตัวที่ไม่ได้ใช้ |
| front-end | admin 23 จาก 27 หน้าเป็น client page ดึงข้อมูลใน `useEffect`; ไม่มี shared data hook |
| data model | enrollment ไม่มี source/สถานะถอนสิทธิ์ (ถอนแล้วลบประวัติ); สินค้าที่ซื้อได้เป็น FK สองตัวที่ nullable; `measurement_outbox.enrollment_id` เป็น `ON DELETE NO ACTION` ทำให้ลบ enrollment ไม่ได้เมื่อมีแถว outbox |
| log/ops | `console.error` ดิบ 39 จุดใน 24 route; `logError` 81 จาก 92 จุดมี label เดียวกัน; ไม่มี config deploy ของ web service ใน repo |
| สภาพแวดล้อม | `node_modules` ในเครื่องตามหลัง lockfile 8 แพ็กเกจ และใช้ Node 24 (CI ใช้ 22) |
| งานค้าง | branch `feat/privacy-consent` อยู่ในเครื่องเท่านั้น (นำหน้า 8 ตามหลัง 41) มี migration 0023 และงานแยก seam; `AGENTS.md` ที่แก้แล้ว, `CONTEXT.md`, `docs/security/admin-mfa-scope.md` ยังไม่ commit |
| อื่น ๆ | refund เป็นการเปลี่ยนสถานะและลบ enrollment โดยไม่ดูที่มา; กติกาคูปองต่างกันใน 4 เส้นทาง; อัปโหลดมี 2 endpoint นโยบายต่างกัน; รายงานรายได้จัดกลุ่มตามเวลาสร้างและ timezone ไม่ตายตัว; ยังไม่มี erasure/export ข้อมูลส่วนบุคคล |

## ลำดับงานที่เสนอ

ผู้วางแผนสามมุม (เสี่ยงก่อน, ผลต่อแรงสูงสุด, ตามการพึ่งพา) ได้ลำดับเกือบเหมือนกัน

0. **จัดพื้นที่ทำงาน (ไม่มีโค้ด):** `npm ci` แล้วรัน tsc/lint/test/admin-text ซ้ำ (ควรใช้ Node 22) บันทึกตัวเลข; commit `AGENTS.md`, `CONTEXT.md`, `docs/security/admin-mfa-scope.md` เป็น PR เอกสารแยก หลังเจ้าของอ่าน diff ของ `AGENTS.md` (มีการผ่อนกติกา self-merge); push backup ref ของ `feat/privacy-consent` (ต้องได้รับอนุญาต); เพิ่ม `engines.node`/`.nvmrc` เป็น chore PR เล็ก
1. **ตัดสินใจรอบเดียว** แล้วบันทึกใน ADR/spec (ดูหัวข้อ "สิ่งที่เจ้าของต้องตัดสินใจ")
2. **ADR 0012 กติกา layering:** ทิศทาง import ที่อนุญาต, ที่อยู่ของ Zod/transaction/audit, อะไรนับเป็น refactor ที่ไม่เปลี่ยนพฤติกรรม (เอกสารอย่างเดียว)
3. **PR โค้ดแรก = test อย่างเดียว:** `tests/api/route-policy.test.ts` glob ทุก `route.ts` ต้องถูกจัดประเภท (public/auth/admin/signature/delegated) และทุก admin handler ต้องปฏิเสธเมื่อไม่มี session และเมื่อเป็น student; ระบุ 19 จุดที่ guard inline (คืน 401) และ 3 หน้า admin ที่ไม่มี guard เป็นรายการที่ยอมรับชั่วคราว ไม่แก้ route ใด
4. **guardrail ใน CI (PR เล็กแยกกัน):** ESLint `no-restricted-imports` (component ห้าม import `@/lib/db`, `@/lib/auth`, `commerce/stripe`, `bunny/stream`, `notifications/email`; lib ห้าม import app/components; ห้ามใช้ `server-only` กับ `db/index.ts` เพราะ script ใช้ร่วม); ขั้น `drizzle-kit generate` ที่ fail เมื่อมีไฟล์ใหม่ (เพิ่มในงานเดิม ห้ามเปลี่ยนชื่อ/ลบ job); coverage แบบรายงานอย่างเดียว ทดลองบน branch ทิ้งก่อน
5. **characterization test บน MySQL จริง** (ใช้ guard `isIsolatedDatabase` เดิม): Stripe event ซ้ำได้ enrollment เดียว, PromptPay claim พร้อมกัน, ออกใบรับรองพร้อมกันได้แถวเดียว, ความคืบหน้าบทเรียนสุดท้ายออกใบรับรอง, ลบ enrollment ที่มีแถว outbox; และ table-driven test ของ admin route 18 ตัวที่ไม่มี test ตรึงพฤติกรรมปัจจุบัน รวมข้อบกพร่องที่ทราบ (ติดป้าย "known defect" ไม่ใช่การรับรอง)
6. **log ให้ปลอดภัย (ขนานกับ 3–5):** แทน `console.error(..., error)` ด้วย `logError`, เปลี่ยน label เป็นแบบ dot-style, ขยาย contract test; เส้นทางเงิน/enrollment แยก PR เล็กต่างหาก
7. **ประตูก่อน refactor PR แรก:** baseline บันทึกแล้ว, ตัดสินใจครบ, ADR 0012 merge, route policy + lint + drift check อยู่ใน CI, มี characterization test ของพื้นที่ที่จะแตะ แล้วลำดับ refactor แรกที่แนะนำ: (a) type `DbTransaction`/`affectedRows` กลาง (b) module ค่าคงที่ role/status/payment (c) `requireAdmin` เดียวพร้อม `requireAdminPage` (auth: PR เล็กแยก เจ้าของสั่ง merge) (d) นำร่องสัญญา FE/BE กับ admin coupons หนึ่งทรัพยากร (e) `grantEnrollment`/`hasCourseAccess` (หลังตัดสินเรื่องถอนสิทธิ์)

กฎ PR ตาม [AGENTS.md](../../../AGENTS.md): งานย้าย/เปลี่ยนชื่อเชิงกลไกรวมได้; auth, payments, enrollment, certificates, migrations, CI gates แยก PR เล็ก; ทุก PR ระบุสิ่งที่เปลี่ยน/ตรวจ/ไม่ได้ตรวจ และความเสี่ยง production ทุกการ merge เข้า `master` จะ rebuild และรัน migration บน Railway

## เลื่อนไว้ก่อน (และเหตุผล)

- ย้าย admin ไป server components หรือ shared data hook: ยังไม่ได้เลือกรูปแบบ และ admin ยังไม่มี test พฤติกรรม ให้ทำหลังนำร่อง coupons
- repository/service layer ทั้งระบบ, route wrapper (`withRoute`): กระทบประมาณ 90 จุด ต้องมี route policy test กับ ADR ก่อน
- payment-method registry, product polymorphism, refund ผ่าน Stripe, dispute: ยังไม่มีสินค้าชนิดที่สามหรือช่องทางชำระที่สองใน roadmap และเป็นงานเสี่ยงสูง
- MFA แอดมิน, erasure/export ข้อมูลส่วนบุคคล, retention: ต้องตัดสินนโยบายและตามหลัง migration 0023 (ADR 0011)
- รวม rate limiter, SSE/pub-sub หลาย instance: สำคัญเมื่อมีมากกว่าหนึ่ง replica เท่านั้น
- แปลง test แบบ source-text ทีเดียวทั้งหมด: ให้แปลงทีละตัวเมื่อมี test พฤติกรรมมาแทน
- ทำความสะอาด dependency/script/dead code: ทำแทรกได้ ไม่ใช่เงื่อนไขก่อน

## สิ่งที่เจ้าของต้องตัดสินใจ

1. ถอนสิทธิ์เรียนจะลบแถว (master ปัจจุบัน) หรือระงับพร้อมเก็บประวัติ ([CONTEXT.md](../../../CONTEXT.md) ระบุแบบหลัง) กระทบ schema, access predicate และ refund
2. `feat/privacy-consent`: port ทีละ commit, ทำใหม่ หรือทิ้ง และอนุญาต push backup ref หรือไม่
3. จำนวน replica, เวอร์ชัน Node และ start command บน Railway; migration รันตอน start หรือก่อน deploy
4. role instructor ใช้จริงหรือไม่ ถ้าไม่ ลบ `POST /api/courses`
5. error contract: คง `error` เป็นข้อความไทยแล้วเพิ่ม `code` (แนะนำ ไม่ต้องแก้ UI) หรือเปลี่ยนเป็นรหัสพร้อมข้อความฝั่ง client
6. guard inline 19 จุดจะเปลี่ยนจาก 401 เป็น 403 หรือไม่ และ MFA ควรมาก่อนหรือหลังรวม guard
7. รับหรือแก้ ADR 0011 และปรับขอบเขตหรือปิด issue #85
8. การผ่อนกติกา self-merge ใน `AGENTS.md` ที่ยังไม่ commit ตั้งใจจริงหรือไม่ และไฟล์ใน `.agents/skills`, `skills-lock.json`, `docs/wayfinder` จะ commit หรือเก็บในเครื่อง
9. test MySQL เพิ่มใช้ฐาน `milerdev_e2e` ได้ไหม เวลา CI ที่เพิ่มยอมรับได้ไหม เพิ่ม admin ใน fixture E2E ได้ไหม และจะเก็บ/ยกระดับ/เลิกใช้ E2E ที่ไม่บังคับราว 85 ตัว
10. จังหวะ merge ของชุด refactor เพราะแต่ละ merge ทำให้ production rebuild

## ความเสี่ยงของแผนนี้

- characterization test ตรึงพฤติกรรมปัจจุบันรวมข้อบกพร่อง (ขีดจำกัดคูปองไม่ตรวจซ้ำ, `discountAmount` เป็น `'0'`, FK ของ outbox, refund ลบ enrollment ที่แอดมินให้) ต้องติดป้ายชัดเจน
- test MySQL เพิ่มเวลา CI และโอกาส flake (เคยปรับ timeout แล้ว 3 ครั้ง) ให้เร่ง CI ไม่ใช่ตัดทิ้ง
- drift check และกฎ lint อาจแดงตั้งแต่วันแรกจาก snapshot ที่ขาด (0003, 0007) ให้ทดลองบน branch ทิ้งก่อนและบันทึกส่วนต่างที่ทราบ
- การเปลี่ยน 401 เป็น 403 อาจกระทบ client/E2E ที่ไม่พบด้วย grep ให้ตรวจ `e2e/course.spec.ts` และ `e2e/payment.spec.ts`
- ทุก merge เข้า `master` กระทบ production แม้เป็น PR ที่มีแต่ test
