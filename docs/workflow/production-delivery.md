# Production delivery standard

วันที่: 2026-10-02, ปรับ 2026-10-08. กติกาที่ตกลงแล้วอยู่ใน [AGENTS.md](../../AGENTS.md); ไฟล์นี้บันทึกช่องว่างที่ยังเหลือและ release runbook

เทียบ workflow ของ MilerDev กับแนวปฏิบัติที่ใช้กันทั่วไปสำหรับเว็บ production ขนาดทีมเล็ก
(แนวคิดจาก [DORA](https://dora.dev/capabilities/continuous-delivery/): trunk-based development, ชุด test อัตโนมัติ, deploy ที่ย้อนกลับได้, เฝ้าดูหลัง deploy)
ไม่ใช่การรับรองมาตรฐานใด ๆ ตารางด้านล่างแยก **มีแล้ว / บางส่วน / ยังไม่มี** และระบุว่าใครต้องลงมือ

หลักฐานมาจากไฟล์ใน repo, ผล audit วันที่ 2026-10-02 และภาพหน้า Settings ของ Railway ที่เจ้าของส่งมา
ค่าตั้งของ GitHub/Railway ส่วนอื่นยังไม่ได้ตรวจ จึงทำเครื่องหมาย "ยังไม่ยืนยัน"

## เทียบทีละหัวข้อ

| หัวข้อ | สถานะ | หลักฐาน / ช่องว่าง | ผู้ลงมือ |
| --- | --- | --- | --- |
| Branch สั้น ๆ + PR เล็ก (trunk-based) | มีแล้ว | merge PR ต่อเนื่อง, Conventional Commits | - |
| CI ก่อน merge | มีแล้ว | lint, `tsc`, admin-text, unit, required E2E บน MySQL จริง, build; ด่าน schema drift | - |
| Required checks | มีแล้ว | branch protection (2026-10-08) บังคับ Lint/Test/Build และ `CI passed` ไม่บังคับให้ branch ทันกับ `master`; GitHub นับ job ที่ skipped เป็นผ่าน `CI passed` จึงล้มเมื่อ job ใดไม่ `success` | - |
| คิว merge (merge queue) | ใช้ไม่ได้ตอนนี้ | GitHub merge queue ใช้ได้กับ public repo ที่เป็นของ Organization ([GitHub](https://github.blog/changelog/2023-07-12-pull-request-merge-queue-is-now-generally-available/)) แต่ `ohmiler/milerdev` อยู่ใต้บัญชีส่วนตัว ทางแทน: ไม่บังคับให้ทันกับ `master`, merge ทันทีที่ CI ผ่าน, CI บน `master` หลัง merge และด่าน deploy ตรวจ CI ของ `master` (AGENTS.md หัวข้อ Merging) | พิจารณาย้าย repo ไป Organization เมื่อ PR มากขึ้นหรือ `master` แดงบ่อย |
| ตาข่าย test ของจุดเสี่ยง | บางส่วน | MySQL จริง: Stripe, PromptPay, ใบรับรอง, ลบ enrollment, admin ให้สิทธิ์เรียน/ออกใบรับรอง; route-policy test; admin route ที่ยังไม่มีเทสต์ของตัวเอง 13 จาก 45 (2026-10-04), webhook/ใบรับรองใน E2E ที่บังคับ | agent + เจ้าของ |
| Migration ปลอดภัย | บางส่วน | รันเป็น pre-deploy (`npm run db:migrate`), health check `/api/health`; กติกา expand/contract อยู่ใน AGENTS.md; ลบ `db:push` ออกจาก scripts แล้ว (2026-10-04) | - |
| รอ CI ผ่านก่อน deploy | มีแล้ว | Railway deploy จาก branch `production` ซึ่งขยับเฉพาะเมื่อเจ้าของสั่ง "deploy" และ agent ตรวจแล้วว่า CI ของ commit ล่าสุดบน `master` ผ่าน (ADR 0013) | - |
| ติดตั้งแบบ lockfile เป๊ะบน production | ยังไม่มี | Railway ใช้ `npm install` ไม่ใช่ `npm ci` | เจ้าของตั้ง install command |
| ล็อกเวอร์ชัน runtime | มีแล้ว | `.nvmrc` + `engines.node` = 22; Railway ใช้ 22.23.2 | ตรวจ deploy ถัดไปว่ายังเป็น 22 |
| Smoke test หลัง deploy | มีแล้ว | `Production Smoke` ทำงานหลัง deployment สำเร็จ | - |
| ย้อนกลับ (rollback) | บางส่วน | revert PR ได้; schema/data ย้อนไม่ได้; ยังไม่มี runbook | เขียน runbook (ดูด้านล่าง) |
| Staging / preview | ยังไม่มี | ทดสอบกับของจริงได้แค่หลัง deploy | พิจารณา Railway PR environment |
| Log และ alert | บางส่วน | log redacted และมี label แยก route; ยังไม่ยืนยันว่ามี alert (error rate, health check) | เจ้าของตั้ง alert ใน Railway/uptime monitor |
| Backup และการกู้คืน | บางส่วน | เคยซ้อมกู้คืนในเครื่อง; ยังไม่ยืนยันตารางสำรองและการทดสอบกู้คืนเป็นระยะ | เจ้าของยืนยัน |
| Dependency และช่องโหว่ | บางส่วน | `.github/dependabot.yml` เปิด PR อัปเดต npm และ GitHub Actions ทุกวันจันทร์ (2026-10-04); ยังไม่ยืนยัน secret scanning/Dependabot alerts | เจ้าของเปิด secret scanning และ Dependabot alerts ใน Settings |
| ผู้ตรวจ (review) งานเสี่ยงสูง | บางส่วน | ไม่บังคับ approval; [CODEOWNERS](../../.github/CODEOWNERS) ระบุ path เสี่ยงสูงที่ต้องให้เจ้าของ merge (tier C) | - |
| Secrets | มีแล้ว | Infisical + กฎห้ามอ่าน `.env` | - |

## Release runbook (ฉบับสั้น)

ก่อน merge เข้า `master`: CI ผ่านบน commit ล่าสุด, branch up to date, PR body ระบุสิ่งที่ยังไม่ได้ตรวจและแผนย้อนกลับ การ merge ไม่ deploy

ก่อน deploy (เมื่อเจ้าของสั่ง "deploy"): CI ผ่านบน commit ล่าสุดของ `master`, `Production Smoke` ของ deploy ครั้งก่อนผ่าน, ไม่มี migration ที่ลบสิ่งที่โค้ดบน production ยังใช้ แล้วสรุปรายการ PR ที่จะขึ้นและ fast-forward `production` ไปที่ `master`

หลัง deploy: ดู Railway ว่า deploy สำเร็จ (migration, health check), ดูผล `Production Smoke`, ดู log หา label `*_failed` ที่ผิดปกติ ภายในไม่กี่นาทีแรก

ถ้าผิดปกติ: เจ้าของ rollback deployment ใน Railway (ย้อนแค่โค้ด migration ยังอยู่) หรือ revert ใน `master` ผ่าน PR ใหม่แล้ว deploy อีกครั้ง ถ้ามี migration แล้ว **ห้ามคาดว่าย้อนได้** ใช้ migration ถัดไปแก้ไปข้างหน้า ถ้าเกี่ยวกับเงินหรือสิทธิ์เรียน แจ้งผู้ได้รับผลกระทบและตรวจ `payments`/`enrollments` เทียบกัน

## Merge authority

การ merge เข้า `master` ไม่ deploy (ADR 0013) AGENTS.md ใช้นโยบายสามระดับ: A เอกสาร/เทสต์อย่างเดียว และ B โค้ดนอกจุดเสี่ยงสูง agent merge เองเมื่อ CI ผ่าน; C จุดเสี่ยงสูงและ CI gate เจ้าของ merge หรือสั่ง "merge" หลังอ่าน diff
การ deploy เกิดเมื่อเจ้าของพิมพ์ "deploy" เท่านั้น

## ลำดับที่แนะนำให้เจ้าของลงมือ

1. ตั้ง install command ของ Railway เป็น `npm ci` (deploy จาก branch `production` ตั้งแล้ว 2026-10-07)
2. เพิ่ม alert พื้นฐาน (health check ล้ม, อัตรา error) และยืนยันตาราง backup
3. เปิด secret scanning และ Dependabot alerts ใน GitHub Settings
4. ตัดสินใจ: จะมี staging หรือไม่

ทำแล้ว 2026-10-08: `CI passed` เป็น required check, ปิด "Require branches to be up to date before merging" และเปิด "Automatically delete head branches"
