# Production delivery standard

วันที่: 2026-10-02. สถานะ: ข้อเสนอ ยังไม่ได้ตกลง ใช้ประกอบ [AGENTS.proposed.md](../agents/AGENTS.proposed.md)

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
| Required checks + branch ต้อง up to date | มีแล้ว (บางส่วนยังไม่ยืนยัน) | ตั้ง Build/Lint/Test เป็น required; `Required E2E` ผ่าน `Build` | เจ้าของยืนยันค่า |
| คิว merge (merge queue) | ยังไม่มี | ทุก merge ทำให้ PR อื่นต้องอัปเดตและรัน CI ซ้ำ | เจ้าของเปิดใน GitHub |
| ตาข่าย test ของจุดเสี่ยง | บางส่วน | MySQL จริง: Stripe, PromptPay, ใบรับรอง, ลบ enrollment; route-policy test; ยังขาด admin route 18 ตัว, webhook/ใบรับรองใน E2E ที่บังคับ | agent + เจ้าของ |
| Migration ปลอดภัย | บางส่วน | รันเป็น pre-deploy (`npm run db:migrate`), health check `/api/health`; ยังไม่มีกติกา expand/contract เป็นลายลักษณ์อักษร; มี `db:push` ใน scripts | เขียนใน AGENTS.md; ตัดสินเรื่อง `db:push` |
| รอ CI ผ่านก่อน deploy | ยังไม่ยืนยัน | Railway deploy จาก `master` ทันทีหลัง merge; ตัวเลือก "Wait for CI" ยังไม่เห็นในภาพที่ส่งมา | เจ้าของตรวจ/เปิดใน Railway |
| ติดตั้งแบบ lockfile เป๊ะบน production | ยังไม่มี | Railway ใช้ `npm install` ไม่ใช่ `npm ci` | เจ้าของตั้ง install command |
| ล็อกเวอร์ชัน runtime | มีแล้ว | `.nvmrc` + `engines.node` = 22; Railway ใช้ 22.23.2 | ตรวจ deploy ถัดไปว่ายังเป็น 22 |
| Smoke test หลัง deploy | มีแล้ว | `Production Smoke` ทำงานหลัง deployment สำเร็จ | - |
| ย้อนกลับ (rollback) | บางส่วน | revert PR ได้; schema/data ย้อนไม่ได้; ยังไม่มี runbook | เขียน runbook (ดูด้านล่าง) |
| Staging / preview | ยังไม่มี | ทดสอบกับของจริงได้แค่หลัง deploy | พิจารณา Railway PR environment |
| Log และ alert | บางส่วน | log redacted และมี label แยก route; ยังไม่ยืนยันว่ามี alert (error rate, health check) | เจ้าของตั้ง alert ใน Railway/uptime monitor |
| Backup และการกู้คืน | บางส่วน | เคยซ้อมกู้คืนในเครื่อง; ยังไม่ยืนยันตารางสำรองและการทดสอบกู้คืนเป็นระยะ | เจ้าของยืนยัน |
| Dependency และช่องโหว่ | บางส่วน | `npm audit fix` ทำเป็นครั้งคราว; ไม่มี Dependabot | เพิ่ม `.github/dependabot.yml`; เปิด secret scanning/CodeQL |
| ผู้ตรวจ (review) งานเสี่ยงสูง | ยังไม่มี | ไม่บังคับ approval; ทำคนเดียว | พิจารณา CODEOWNERS สำหรับ auth/payments/migrations แม้ยังไม่บังคับ |
| Secrets | มีแล้ว | Infisical + กฎห้ามอ่าน `.env` | - |

## Release runbook (ฉบับสั้น)

ก่อน merge งานที่กระทบ production: CI ผ่านบน commit ล่าสุด, branch up to date, PR body ระบุสิ่งที่ยังไม่ได้ตรวจและแผนย้อนกลับ

หลัง merge: ดู Railway ว่า deploy สำเร็จ (migration, health check), ดูผล `Production Smoke`, ดู log หา label `*_failed` ที่ผิดปกติ ภายในไม่กี่นาทีแรก

ถ้าผิดปกติ: revert PR ผ่าน PR ใหม่ (เร็วที่สุด) ถ้ามี migration แล้ว **ห้ามคาดว่าย้อนได้** ใช้ migration ถัดไปแก้ไปข้างหน้า ถ้าเกี่ยวกับเงินหรือสิทธิ์เรียน แจ้งผู้ได้รับผลกระทบและตรวจ `payments`/`enrollments` เทียบกัน

## What changes in AGENTS.md

- แทนที่หัวข้อ "Merging into master" (agent merge เองได้ทุกชนิดที่ไม่เปลี่ยนพฤติกรรม) ด้วยนโยบายสามระดับ: A เอกสาร/เทสต์อย่างเดียว agent merge เองได้เมื่อพร้อมตามเงื่อนไข; B โค้ดนอกจุดเสี่ยงสูง เจ้าของพิมพ์ "merge" รายตัว; C จุดเสี่ยงสูงและ CI gate เจ้าของ merge ระดับ A เปิดใช้ได้ต่อเมื่อ Railway รอ CI ก่อน deploy, มี alert, และโหมดสิทธิ์ของเครื่องอนุญาต (ระบบสิทธิ์ของ Claude Code ตัดสินแยกจาก AGENTS.md และอาจบล็อก)
- แก้คำอธิบาย migration: รันเป็น pre-deploy command ไม่ใช่ตอน start
- เพิ่ม: Production facts, Migrations (expand/contract), Testing (MySQL จริง, ป้าย KNOWN DEFECT, ตรวจว่า guard ทำงานจริงโดยถอดแล้วเทสต์ล้ม), Releasing, กติกา logging (`logError` + label), route-policy test
- เพิ่ม: PR ซ้อนกันไม่มี CI, อัปเดต branch ด้วยการ merge ไม่ rebase, ใช้การเฝ้า CI ของแอปแทนการ poll
- คงไว้: กฎความลับและข้อมูล, ขอบเขตการลบไฟล์, ข้อห้าม force-push/ข้าม branch protection, บล็อก `nextjs-agent-rules`

## ลำดับที่แนะนำให้เจ้าของลงมือ

1. ตรวจ Railway: "Wait for CI" และตั้ง install command เป็น `npm ci`
2. เปิด Merge queue ใน GitHub (หรือยอมรับต้นทุนการอัปเดต branch)
3. เพิ่ม alert พื้นฐาน (health check ล้ม, อัตรา error) และยืนยันตาราง backup
4. เพิ่ม Dependabot และ secret scanning
5. ตัดสินใจ: จะเก็บ `db:push` ใน scripts หรือไม่ และจะมี staging หรือไม่
