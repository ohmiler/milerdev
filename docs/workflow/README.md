# AI development workflow

[AGENTS.md](../../AGENTS.md) คือข้อกำหนดหลักเรื่องสิทธิ์ Git, การ merge, secrets และ production
ไฟล์นี้สรุปลำดับงานและขอบเขตการตรวจ ถ้าขัดกัน ให้ถือตาม AGENTS.md
ช่องว่างที่ยังเหลือและ release runbook อยู่ใน [production-delivery.md](production-delivery.md)

## Working sequence

1. ระบุโจทย์ ขอบเขต และเกณฑ์รับงานใน Issue หรือคำขอที่ตกลงกัน ตรวจ implementation และข้อจำกัดที่เกี่ยวข้องก่อนเริ่ม
2. แตก feature branch จาก `master` ล่าสุด ตรวจ worktree และรักษางานที่ไม่เกี่ยวข้องของเจ้าของ
3. พัฒนาและตรวจพฤติกรรมตามความเสี่ยง แก้ regression ที่เกิดจากงานนี้ก่อนส่งต่อ
4. Review diff เทียบโจทย์และกติกา repo
5. Stage เฉพาะไฟล์ของงาน ใช้ Conventional Commit, push branch, เปิด PR เข้า `master` และเชื่อม Issue ถ้ามี
   PR body ระบุสิ่งที่เปลี่ยน สิ่งที่ตรวจแล้ว สิ่งที่**ยังไม่ได้**ตรวจ และความเสี่ยงต่อ production
6. รอ CI และแก้ failures ที่เกิดจากงานนี้ อัปเดต branch ด้วยการ merge `master` เข้ามา (ไม่ rebase ไม่ force-push)
7. Merge ตามระดับความเสี่ยงใน AGENTS.md (หัวข้อ Git and delivery):
   - **A** เอกสารหรือเทสต์อย่างเดียว: agent merge เองได้ เมื่อเงื่อนไขเบื้องต้นของระดับ A ครบ
   - **B** โค้ด production นอกจุดเสี่ยงสูง: เจ้าของพิมพ์ "merge" สำหรับ PR นั้น
   - **C** จุดเสี่ยงสูงและ CI gate: เจ้าของ merge เอง หรือสั่ง "merge" หลังอ่าน diff
8. ทุก merge เข้า `master` คือการ deploy production เจ้าของยืนยันผล Railway และ `Production Smoke`

## Verification scope

| การเปลี่ยนแปลง | การตรวจที่เหมาะสมก่อนส่งงาน |
| --- | --- |
| เอกสารเท่านั้น | ตรวจเนื้อหา ลิงก์ UTF-8 และ diff; ไม่ต้องรัน test suite/build ในเครื่อง |
| CI/configuration | ตรวจ syntax และ job/step ที่แก้ รันคำสั่งที่เพิ่ม และดู CI ของ PR |
| Application code | affected tests, lint, `tsc` และ build; ขยายชุดตรวจเมื่อกระทบ shared behavior หรือจุดเสี่ยงสูง |
| ข้อความแอดมินภาษาไทย | `npm run check:admin-text` เพิ่มจากการตรวจที่เกี่ยวข้อง |
| Auth/payment/enrollment/certificate/data | ตรวจ authorization, validation, replay/idempotency และ recovery บน MySQL จริง (`milerdev_e2e`) และ mock providers; รายงานส่วนที่ยังไม่ทดสอบ |

ก่อนส่งมอบรัน `git diff --check` และ `git status --short` เสมอ
การเลือกชุดตรวจในเครื่องไม่เปลี่ยน CI: ทุก PR ที่เข้า `master` รัน pipeline เต็ม รวม PR เอกสาร

## CI gates

ตาม [ci.yml](../../.github/workflows/ci.yml) สาม job แรกรันพร้อมกัน แล้ว `Build` รันเมื่อทั้งสามผ่าน

| Job | สิ่งที่ตรวจ |
| --- | --- |
| Lint & Type Check | admin-text scan, ESLint, `tsc`, และ `schema.ts` ตรงกับ `drizzle/` |
| Test | Vitest unit/component suite |
| Required E2E | MySQL แยก, migrations, fixtures, integration tests บน MySQL จริง และ required browser journeys |
| Build | production build; เป็นด่านรวมที่ `needs` ทั้งสาม job ข้างต้น |

branch protection (อ่านล่าสุด 2026-09-13) บังคับ `Lint & Type Check`, `Test`, `Build` และไม่บังคับ approval
`Required E2E` ถูกบังคับทางอ้อมผ่าน `Build`; ก่อน merge ให้ยืนยันว่าทุก job **สำเร็จจริง** ไม่ใช่ถูก skipped

หลัง deploy สำเร็จ `Production Smoke` ([production-smoke.yml](../../.github/workflows/production-smoke.yml)) ตรวจหน้าเว็บจริง
ผลผ่านไม่ยืนยันการทำงานของ email, Google หรือ payment providers
