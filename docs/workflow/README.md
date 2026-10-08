# AI development workflow

[AGENTS.md](../../AGENTS.md) คือข้อกำหนดหลักเรื่องสิทธิ์ Git, การ merge, secrets และ production
ไฟล์นี้สรุปลำดับงานและขอบเขตการตรวจ ถ้าขัดกัน ให้ถือตาม AGENTS.md
ช่องว่างที่ยังเหลือและ release runbook อยู่ใน [production-delivery.md](production-delivery.md)

## Working sequence

1. ระบุโจทย์ ขอบเขต และเกณฑ์รับงานใน Issue หรือคำขอที่ตกลงกัน ตรวจ implementation และข้อจำกัดที่เกี่ยวข้องก่อนเริ่ม
2. แตก feature branch จาก `master` ล่าสุด ตรวจ worktree และรักษางานที่ไม่เกี่ยวข้องของเจ้าของ
3. พัฒนาและตรวจพฤติกรรมตามความเสี่ยง แก้ regression ที่เกิดจากงานนี้ก่อนส่งต่อ
4. Review diff เทียบโจทย์และกติกา repo
5. Stage เฉพาะไฟล์ของงาน ใช้ Conventional Commit, push branch และเปิด PR เข้า `master` เมื่องานเสร็จและตรวจแล้ว เชื่อม Issue ถ้ามี
   PR ไม่ทำให้เกิดการ deploy จึงเปิดได้ทันทีที่ตรวจในเครื่องผ่าน CI จะ build และรัน `Required E2E` ให้ ระหว่างนั้นถ่ายภาพหน้าจอไปได้
   PR body ระบุสิ่งที่เปลี่ยน สิ่งที่ตรวจแล้ว สิ่งที่**ยังไม่ได้**ตรวจ และความเสี่ยงต่อ production
   งานเล็กที่เสี่ยงต่ำในหน้าหรือเรื่องเดียวกันรวมเป็น PR เดียวได้ แยก commit เรื่องละ 1 commit และแยกหัวข้อใน PR body
   งานเสี่ยงสูง migration และ CI ยังต้องแยก PR เดี่ยว PR ที่รวมงานถูก squash merge ถ้า revert จะย้อนทุกเรื่องในนั้น
6. รายงานเจ้าของว่าเปลี่ยนอะไร ตรวจอะไรแล้ว และลองดูบน dev server ได้อย่างไร
   งานที่ผู้ใช้มองเห็นต้องแนบภาพก่อนและหลัง ทั้งจอมือถือ (390px) และเดสก์ท็อป (1440px) เพื่อให้เจ้าของตรวจได้โดยไม่ต้องเปิด localhost
   ปิดท้ายทุกรายงานด้วยสิ่งที่รออยู่: PR ที่เปิดอยู่ และงานที่ merge แล้วแต่ยังไม่ deploy
7. รอ CI และแก้ failures ที่เกิดจากงานนี้ merge `master` เข้า branch เฉพาะเมื่อมี conflict หรือ GitHub บังคับให้ทันกับ `master` (ไม่ rebase ไม่ force-push)
8. Merge เข้า `master` ตามระดับความเสี่ยงใน AGENTS.md (หัวข้อ Merging) ทันทีที่ CI ผ่าน ไม่ต้องเข้าคิว การ merge ไม่ deploy:
   - **A** เอกสารหรือเทสต์อย่างเดียว และ **B** โค้ด production อื่น: agent merge เองเมื่อ CI ผ่านจริง
   - **C** PR ที่แตะ path ใดใน [CODEOWNERS](../../.github/CODEOWNERS) (จุดเสี่ยงสูง, migration, CI, AGENTS.md): เจ้าของ merge เอง หรือสั่ง "merge" หลังอ่าน diff
   หลัง merge ดู CI ของ `master` ถ้าแดง หยุด merge แล้วแก้ `master` ก่อน เพราะ `master` ที่แดง deploy ไม่ได้
9. Deploy เมื่อเจ้าของพิมพ์ "deploy" เท่านั้น (AGENTS.md หัวข้อ Deploying, ADR 0013):
   agent ตรวจ CI ของ commit ล่าสุดบน `master`, `Production Smoke` ของ deploy ครั้งก่อน และ migration ที่ลบของ
   แล้วสรุปสิ่งที่จะขึ้น fast-forward branch `production` ไปที่ `master` จากนั้นดู Railway และ `Production Smoke` เจ้าของยืนยันผล

## Verification scope

| การเปลี่ยนแปลง | การตรวจที่เหมาะสมก่อนส่งงาน |
| --- | --- |
| เอกสารเท่านั้น | ตรวจเนื้อหา ลิงก์ UTF-8 และ diff; ไม่ต้องรัน test suite/build ในเครื่อง |
| CI/configuration | ตรวจ syntax และ job/step ที่แก้ รันคำสั่งที่เพิ่ม และดู CI ของ PR |
| Application code (tier B) | affected tests, lint และ `tsc` ก่อนเปิด PR; CI รัน build และ `Required E2E` ให้ ถ้าแก้ required journeys หรือ fixtures ให้รัน `npm run test:e2e:local` ด้วย |
| Application code (tier C) | เหมือน tier B และรัน `npm run test:e2e:local` ก่อนเปิด PR |
| ข้อความแอดมินภาษาไทย | `npm run check:admin-text` เพิ่มจากการตรวจที่เกี่ยวข้อง |
| Auth/payment/enrollment/certificate/data | ตรวจ authorization, validation, replay/idempotency และ recovery บน MySQL จริง (`milerdev_e2e`) และ mock providers; รายงานส่วนที่ยังไม่ทดสอบ |

ก่อนส่งมอบรัน `git diff --check` และ `git status --short` เสมอ

`npm run test:e2e:local` รันงาน `Required E2E` ของ CI ในเครื่อง: ล้างฐาน loopback `milerdev_e2e` (ฐานนี้มีไว้ทดสอบอย่างเดียว) รัน migrations สร้าง fixtures แล้วรัน integration tests บน MySQL และ required browser journeys
ใช้ค่า secret ชั่วคราวทั้งหมด ไม่ยอมทำงานกับฐานอื่น และเซิร์ฟเวอร์ทดสอบบล็อกการเรียกออกนอกเครื่อง ([server-network-guard.mjs](../../e2e/required/server-network-guard.mjs))

การเลือกชุดตรวจในเครื่องไม่เปลี่ยน CI: ทุก PR ที่เข้า `master` รันทุก job ส่วน PR ที่แก้เฉพาะ `docs/` หรือไฟล์ `.md` ที่ root นั้น `Required E2E` ข้ามขั้น MySQL และ browser แต่ยังรายงานผ่าน (ดู [docs-only-scope.mjs](../../scripts/ci/docs-only-scope.mjs))

## CI gates

ตาม [ci.yml](../../.github/workflows/ci.yml) สี่ job แรกรันพร้อมกัน แล้ว `CI passed` สรุปผล
เวลาที่รอจึงเท่ากับ job ที่นานที่สุด (`Required E2E`) ไม่ใช่ผลรวม

| Job | สิ่งที่ตรวจ |
| --- | --- |
| Lint & Type Check | admin-text scan, ESLint, `tsc`, และ `schema.ts` ตรงกับ `drizzle/` |
| Test | Vitest unit/component suite |
| Required E2E | MySQL แยก, migrations, fixtures, integration tests บน MySQL จริง และ required browser journeys; PR ที่แก้เฉพาะเอกสารข้ามขั้นเหล่านี้ |
| Build | production build |
| CI passed | ด่านรวม: รอทุก job ข้างต้น และล้มถ้า job ใดไม่ `success` รวมถึงถูก skipped หรือถูกยกเลิก |

Build และ Required E2E เก็บ `.next/cache` ไว้ใน GitHub cache เพื่อให้ Turbopack เริ่ม build จากงานรอบก่อน

GitHub นับ job ที่ถูก skipped เป็นผ่าน แม้เป็น required check ([GitHub Docs](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/using-conditions-to-control-job-execution))
`CI passed` จึงรันแม้ job อื่นล้ม (`if: ${{ !cancelled() }}`) และแปลงผลที่ไม่ใช่ `success` เป็นล้ม

branch protection (อ่านล่าสุด 2026-10-08) บังคับ `Lint & Type Check`, `Test`, `Build`, branch ต้องทันกับ `master` และไม่บังคับ approval
เมื่อเจ้าของเพิ่ม `CI passed` เป็น required check แล้ว `Required E2E` จะถูกบังคับด้วยเครื่อง จนกว่าจะถึงตอนนั้น ก่อน merge ให้ยืนยันว่าทุก job **สำเร็จจริง** ไม่ใช่ถูก skipped

หลัง deploy สำเร็จ `Production Smoke` ([production-smoke.yml](../../.github/workflows/production-smoke.yml)) ตรวจหน้าเว็บจริง
ผลผ่านไม่ยืนยันการทำงานของ email, Google หรือ payment providers
