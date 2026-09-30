# AI development workflow

เปิด [interactive map](ai-development.html) ด้วย Chrome หรือ Edge โดยตรง ไม่ต้องรันแอป
ค้นหา node, คลิกเพื่อ focus, zoom, เปลี่ยน theme และ export ได้จาก viewer

## Working sequence

ใช้ร่วมกับ [AGENTS.md](../../AGENTS.md) ซึ่งเป็นข้อกำหนดหลักเรื่องสิทธิ์ Git, secrets และ production

1. ระบุโจทย์ ขอบเขต และเกณฑ์รับงานใน Issue หรือคำขอที่ตกลงกัน ตรวจ implementation และข้อจำกัดที่เกี่ยวข้องก่อนเริ่ม
2. ทำงานบน feature branch จากฐานล่าสุด ตรวจ worktree และรักษางานที่ไม่เกี่ยวข้องของผู้ใช้
3. พัฒนาและตรวจพฤติกรรมตามความเสี่ยง แก้ regression ที่เกิดจากงานนี้ก่อนส่งต่อ
4. Review diff เทียบโจทย์และกติกา repo บันทึกผลตรวจ ข้อจำกัด และความเสี่ยงที่ยังเหลือใน PR
5. สำหรับงานที่ได้รับอนุญาตให้ส่ง PR: stage เฉพาะไฟล์ของงาน ใช้ Conventional Commit, push feature branch และเชื่อม Issue ถ้ามี ติดตาม CI และแก้ failures ที่เกิดจากงานนี้
6. ส่งมอบ PR พร้อมหลักฐานเพื่อให้เจ้าของตัดสินใจ merge การอนุญาตให้พัฒนา/ส่ง PR ไม่ใช่การอนุญาต merge เข้า master หรือ deploy

## Verification scope

| การเปลี่ยนแปลง | การตรวจที่เหมาะสมก่อนส่งงาน |
| --- | --- |
| เอกสารเท่านั้น | ตรวจเนื้อหา ลิงก์ UTF-8 และ diff; ไม่ต้องรัน application suite/build ในเครื่องซ้ำ |
| CI/configuration | ตรวจ syntax และ job/step ที่แก้ รันคำสั่งที่เพิ่ม และดู CI ของ PR |
| Application code | affected tests, lint และ build เมื่อทำได้; เพิ่มชุดตรวจเมื่อกระทบ shared behavior หรือความเสี่ยงสูง |
| ข้อความแอดมินภาษาไทย | `npm run check:admin-text` เพิ่มจากการตรวจที่เกี่ยวข้อง |
| Auth/payment/data และขอบเขตเสี่ยงสูงใน AGENTS.md | ตรวจ authorization, validation, replay/idempotency และ recovery ที่เกี่ยวข้อง ใช้ isolated DB และ mock providers; รายงานส่วนที่ยังไม่ทดสอบ |

ก่อนส่งมอบรัน `git diff --check` และ `git status --short` เสมอ
หลังตรวจผ่านแล้ว รันซ้ำเมื่อมีการแก้ที่เกี่ยวข้อง เกิด failure หรือยังมีข้อสงสัยที่ต้องพิสูจน์
การเลือกชุดตรวจในเครื่องไม่เปลี่ยน CI: ปัจจุบันทุก PR ที่เข้า master/main ยังรัน pipeline เต็ม รวม PR เอกสาร

## CI gates in this change

| Job | สิ่งที่ตรวจ |
| --- | --- |
| Lint & Type Check | **เพิ่มในงานนี้:** admin-text scan; ตามด้วย ESLint และ TypeScript |
| Test | Vitest unit/component suite หลัง lint/type job ผ่าน |
| Required E2E | MySQL แยก, migrations, fixtures, MySQL integration และ required browser journeys หลัง lint/type job ผ่าน |
| Build | production build หลังทั้งสาม job ข้างต้นผ่าน |

admin-text scan ตรวจอักขระที่อาจเป็น mojibake ใน `src/app/admin` และ `src/components/admin`
ไม่ได้รับรองคุณภาพคำแปล ความถูกต้องของภาษา หรือข้อความทุกส่วนของเว็บ
เมื่อ scan ไม่ผ่าน job `Lint & Type Check` จะ fail; ใช้ required check เดิมโดยไม่เปลี่ยนชื่อ job หรือ GitHub settings
การเพิ่มนี้มีผลบน branch/PR นี้ และจะเข้า workflow ของ master เมื่อเจ้าของ merge

## Current settings and next phase

อ่าน branch protection ณ 2026-09-13: required checks คือ `Lint & Type Check`, `Test`, `Build`; จำนวน approving reviews ที่บังคับคือ 0
`Required E2E` เป็น dependency ของ Build แต่ยังไม่ได้ตั้งเป็น required check โดยตรง
ก่อน merge ควรยืนยันว่าทั้งสี่ job **สำเร็จจริง** ไม่ใช่เพียงถูก skipped

งานนี้ไม่เปลี่ยน branch protection, จำนวน approvals หรือ deployment configuration
ขั้นถัดไปที่ยังต้องตกลงคือ required E2E โดยตรง, วิธี review งานเสี่ยงสูงที่เหมาะกับทีม และ release checklist สำหรับบริการจริง/การกู้คืน
ยังไม่มีข้อกำหนดใหม่ให้ทุก PR ต้องได้ human approval

Production Smoke ที่มีอยู่ตรวจหลัง deployment สำเร็จตาม event/environment ที่กำหนด หรือเมื่อสั่งรันเอง
ผลผ่านไม่ยืนยันการทำงานจริงของ email, Google หรือ payment providers ทั้งหมด
การซ้อม restore และการตรวจข้อมูล/บริการ production ต้องอยู่ในขอบเขตที่เจ้าของอนุญาต; การย้อนโค้ดไม่เท่ากับย้อน schema/data

## Scope

แผนที่อธิบาย workflow ที่เสนอจากการสนทนาและการตรวจ repo ณ 2026-09-13
ไม่ใช่ runtime architecture หรือสถานะ GitHub แบบสด และไม่ใช่การรับรองมาตรฐาน
การ์ดด้านล่างแยกสิ่งที่มีแล้ว ข้อเสนอ และขอบเขตความรับผิดชอบ
เนื้อหาเป็นภาษาไทย; fixed viewer UI และ HTML lang ใช้ English fallback ของ Archify

อ้างอิง: [AGENTS.md](../../AGENTS.md), [CI](../../.github/workflows/ci.yml),
[Production Smoke](../../.github/workflows/production-smoke.yml),
[rollout](../rollout-readiness-2026-09-05.md),
[GitHub PR #90](https://github.com/ohmiler/milerdev/pull/90)
และ branch protection ที่อ่านจาก GitHub ในวันตรวจ

แนวทางทั่วไปประกอบการประเมิน: [DORA continuous delivery](https://dora.dev/capabilities/continuous-delivery/)
และ [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
แผนที่เป็นการสังเคราะห์ให้เหมาะกับ MilerDev; Archify เป็นเครื่องมือแสดงผล ไม่ใช่แหล่งกำหนดมาตรฐาน
การ์ด CI ในแผนที่รวม admin-text ตาม branch นี้ ส่วนข้อเสนอที่ยังไม่ทำอยู่ในการ์ดสีเหลือง

ลูกศรหลักที่ไม่มี label หมายถึงลำดับงานตามชื่อขั้นตอน
เส้นประย้อนกลับหมายถึงเริ่มแก้ไขและผ่านกระบวนการตรวจใหม่ ไม่ใช่ deploy หรือ restore อัตโนมัติ
การตรวจบริการจริงและซ้อม restore เป็นข้อเสนอที่ยังไม่ได้ยืนยันการปฏิบัติจริง

## Source and regeneration

แก้ [ai-development.json](ai-development.json) แล้วสร้าง HTML ใหม่ด้วย
[Archify](https://github.com/tt-a1i/archify) commit
`a07fa1d5b2a10cbea110c5a2be2817397a301cdc` (MIT).
เก็บ [Archify license](ARCHIFY-LICENSE.txt) คู่กับ HTML ซึ่งมี viewer runtime ของเครื่องมือ; font license อยู่ใน HTML
เครื่องมือถูกใช้งานจาก temporary checkout; ไม่ได้ติดตั้ง skill แบบ global หรือเพิ่ม dependency ให้แอป

จากโฟลเดอร์ `archify/` ของ checkout รันคำสั่งต่อไปนี้ โดยแทน `<repo>` ด้วย absolute path ของ MilerDev:

```text
node bin/archify.mjs validate workflow <repo>/docs/workflow/ai-development.json --quality showcase --json
node bin/archify.mjs deliver workflow <repo>/docs/workflow/ai-development.json <repo>/docs/workflow/ai-development.html --quality showcase --json
node bin/archify.mjs visual-check <repo>/docs/workflow/ai-development.html --json
```

ควรเก็บ JSON, HTML, license และ README นี้ใน Git พร้อมกันเมื่อมีการปรับ workflow
`.gitattributes` กำหนด LF ให้ JSON/HTML เพื่อรักษา SHA-256 ข้าม Windows และ Linux
ไฟล์ `*.visual-check.*` เป็นหลักฐาน QA ที่สร้างซ้ำได้และไม่ต้อง commit
เก็บที่ docs เพราะเป็นเอกสารทีม ไม่ใช่หน้า production ใน public หรือ src/app

## Verification receipt

- diagram_type: workflow
- validation: 9/9 showcase, 0 errors, 0 warnings
- specification_sha256: `016ac665ac50a4a3d1ef11e3c29030b35a4606c1fa1bae0b1a3292b0b8c563ce`
- artifact_sha256: `3bcebe38e58ac590e874be840c4486a373a77946e1895bca3824a2c66acba3ba`
- browser_evidence: failed — Chrome เปิดได้ แต่ต้อง scroll แนวตั้งใน desktop ทั้งสี่ขนาดที่ตรวจ (1440×900, 1600×1000, 1920×1080, 2048×1320); ไม่มี horizontal overflow
- visual_review: failed — ภาพ light ที่ 1440×900 อ่านแผนที่ได้ แต่การ์ดอยู่ต่ำกว่าขอบจอ จึงยังไม่ผ่าน first-screen criterion
- visual correction_rounds: 0
- ยังไม่ได้ตรวจ interaction และ export ด้วยมือครบทุกตัว หรือ mobile

การผ่าน deterministic validation ไม่ได้หมายความว่าผ่าน browser/perceptual review
ไฟล์ใช้อ่านแบบเลื่อนหน้าได้ แต่ไม่ควรกล่าวว่าแสดงครบในจอเดียวหรือผ่าน QA ทุกด้าน
