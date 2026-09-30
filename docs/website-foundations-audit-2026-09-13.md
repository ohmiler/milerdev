# พื้นฐานเว็บไซต์ MilerDev: สิ่งที่มีและงานที่ควรเติม

ตรวจเมื่อ 13 กันยายน 2026 จาก source code ใน working tree ปัจจุบัน เป็นการสำรวจความพร้อม ไม่ใช่การรับรองความปลอดภัย กฎหมาย หรือผลทดสอบ production ไม่อ่าน secrets หรือข้อมูลลูกค้า และไม่เปลี่ยน application code

## ภาพรวม

MilerDev มีพื้นฐานหลายส่วนแล้ว งานถัดไปควรทำให้ประกาศต่อผู้ใช้ การควบคุมข้อมูล และกระบวนการปฏิบัติจริงสอดคล้องกัน แบนเนอร์ cookies เป็นเพียงส่วนหนึ่งของงานนี้

| เรื่อง | หลักฐานปัจจุบัน | สิ่งที่ควรเติม / เกณฑ์เสร็จ |
| --- | --- | --- |
| Privacy notice | มี [Privacy](../src/app/privacy/page.tsx) และลิงก์ใน [Footer](../src/components/layout/Footer.tsx) | ระบุผู้ควบคุมข้อมูลให้ชัด วัตถุประสงค์และฐานรายประเภท ระยะเก็บหรือเกณฑ์กำหนดระยะเก็บ ผู้รับข้อมูล/บริการภายนอก การโอนข้อมูล และสิทธิที่เกี่ยวข้องตามการใช้งานจริง ตรวจข้อความผู้เยาว์และวันที่ปรับปรุง |
| Cookies และ consent | Privacy กล่าวถึง cookies จำเป็น/ฟังก์ชัน แต่ไม่พบ banner หรือ preference center จากการค้น src | ทำ inventory ของ cookies, browser storage, network requests และ embed ก่อนออกแบบ UI หากประเภทใดต้องขอ consent ต้องหยุดการส่ง/โหลดก่อนเลือก และมีปฏิเสธ/เลือกประเภท/ถอนความยินยอมได้ |
| Analytics | มี [client events](../src/components/analytics/analytics-client.ts), [Web Vitals client](../src/components/analytics/web-vitals-client.ts), [governance gate](../src/lib/analytics-control.ts) และ [retention helper](../src/lib/analytics-retention.ts) | Client ส่ง event โดยไม่มี visitor-consent gate ที่พบในโค้ด ส่วน server มี global governance/event-class gate จึงยังสรุปไม่ได้ว่า production บันทึกอยู่ หากใช้ฐาน consent ต้องเชื่อมการเลือกกับการส่งและบันทึกจริง Global switch ไม่ใช่ consent ของผู้เยี่ยมชม |
| ข้อมูล analytics | [Analytics insert](../src/lib/analytics.ts) ตั้ง IP/user agent เป็น null แต่บาง event เชื่อม userId/paymentId | ไม่เรียกข้อมูลทั้งหมดว่า anonymous เพียงเพราะไม่ใช้ tracking cookie แยก measurement จากธุรกรรมชำระเงินและความคืบหน้าที่จำเป็นต่อบริการ |
| Third-party services | มี [video iframe](../src/components/video/BunnyPlayer.tsx), Stripe, SlipOK, Google และอีเมลในระบบ | ตรวจ provider ที่เปิดใช้จริง รวม storage/hosting และคำขอจาก iframe ด้วย Privacy ปัจจุบันระบุผู้รับข้อมูลหลักเพียง Stripe และผู้ให้บริการอีเมล จึงควรทบทวนให้ครอบคลุม |
| สิทธิข้อมูล | Privacy มีช่องทางอีเมลรับคำขอ; [Settings](../src/app/settings/page.tsx) มีโปรไฟล์และรหัสผ่าน | จัด workflow รับคำขอ ตรวจตัวตน ติดตามกำหนดเวลา ส่งข้อมูลอย่างปลอดภัย ลบ/จำกัดตามเงื่อนไข และแจ้งส่วนที่ยังต้องเก็บ ไม่จำเป็นต้องเริ่มด้วยปุ่มลบทันที; การระงับบัญชีไม่เท่ากับลบข้อมูล |
| Retention | มี helper สำหรับลบ raw analytics/Web Vitals ตาม policy | ยืนยัน schedule และผลทำงานจริง พร้อมตาราง retention ของบัญชี สลิป logs backups และ aggregate; ไม่อนุมานว่ามี helper แล้วลบอัตโนมัติครบ |
| Terms และการซื้อ | มี [Terms](../src/app/terms/page.tsx), [order review](../src/components/checkout/OrderReviewSummary.tsx), ประวัติและใบแสดงรายการชำระเงิน | ทบทวนข้อความไม่คืนเงินทุกกรณี เพิ่มขั้นตอนกรณีจ่ายซ้ำ จ่ายแล้วเข้าเรียนไม่ได้ และยกเลิกบริการ; กำหนดวิธีแสดง/ยอมรับเงื่อนไขและหลักฐานรุ่นที่ยอมรับ ใบแสดงรายการชำระเงินไม่ควรถูกเรียกว่าใบกำกับภาษีโดยไม่มีการตรวจ |
| ช่องทางช่วยเหลือ | มี contact, FAQ, about, footer และ [ContactForm](../src/components/contact/ContactForm.tsx) | ระบุเวลาตอบกลับ วิธีแจ้งปัญหาการซื้อ และแจ้งการใช้ข้อมูลตรงฟอร์มพร้อมลิงก์ privacy; ทดลองส่ง/รับจริงในขอบเขตที่ตกลง |
| SEO และ social sharing | [Root metadata](../src/app/layout.tsx), [sitemap](../src/app/sitemap.ts), [robots](../src/app/robots.ts), [SEO helpers](../src/lib/seo.ts) | มี implementation แล้ว ยังต้องตรวจ indexability, canonical, social preview และ Search Console ของเว็บจริง; robots ไม่ใช่ access control |
| Accessibility และ UX | มี skip link, labels, status/error/loading UI และ browser tests; [rollout report](rollout-readiness-2026-09-05.md) ระบุขอบเขต QA | ตรวจ keyboard, focus, screen reader, contrast, zoom/mobile, reduced motion และคำบรรยาย/ข้อความทดแทนวิดีโอทั้ง journey ยังไม่มีหลักฐานว่าครบ WCAG |
| ความปลอดภัย | มี [security headers](../src/proxy.ts), auth/rate-limit/password และ server authorization หลายส่วน | ถือว่ามีฐาน ไม่ใช่ผ่าน audit; ทบทวน admin MFA, session recovery, dependency updates และ CSP ที่ยังอนุญาต unsafe-inline/unsafe-eval ตามผลกระทบจริง |
| ความเร็ว | มี Web Vitals reporter/recorder และการแบ่ง release/device | ต้องวัดผลผู้ใช้จริงเมื่อ privacy policy พร้อม ไม่สรุปว่ามี reporter แล้วเว็บเร็ว |
| Operations | มี [CI](../.github/workflows/ci.yml), [production smoke](../.github/workflows/production-smoke.yml), health route | ยืนยัน monitoring/alert routing, backup และการซ้อม restore, incident owner/runbook, provider delivery และแผน migration/rollback จริง [Workflow](workflow/README.md) ยังระบุการซ้อม restore เป็นส่วนที่ไม่ได้ยืนยัน |

## ลำดับงานที่เสนอ

1. **รู้ข้อมูลที่เก็บก่อน**: ทำ inventory ใน browser ใหม่ ทั้งก่อน login หลัง login checkout และ video ระบุเจ้าของ วัตถุประสงค์ ฐาน ระยะเก็บ และบริการภายนอก ไม่ต้องอ่านข้อมูลลูกค้าเพื่อทำรายการชนิดข้อมูล
2. **ทำ privacy และ consent ให้ตรงกัน**: ตัดสินฐานรายประเภท ปรับ notice และสร้าง preference center/gating เฉพาะที่ต้องใช้ consent; เพิ่มหลักฐานรุ่น เวลา และการถอนตามแบบที่เลือก
3. **ทำกระบวนการให้ใช้งานได้จริง**: คำขอข้อมูล/ลบข้อมูล retention การช่วยเหลือการชำระเงิน และ terms/refund ที่ผู้รับผิดชอบตรวจแล้ว
4. **พิสูจน์ความพร้อม**: ตรวจ browser accessibility/performance/SEO พร้อมยืนยัน backup-restore, alerts และบริการจริงภายใต้ขอบเขตที่อนุญาต

ยังไม่เลือกฐานกฎหมาย ระยะเก็บ ตัวตนผู้ควบคุมข้อมูล หรือเงื่อนไขคืนเงินแทนเจ้าของ เพราะข้อเท็จจริงเหล่านี้เปลี่ยน implementation และข้อความที่จะประกาศต่อผู้ใช้

## Acceptance checklist สำหรับ consent ที่เลือกใช้

- Browser ใหม่: ไม่ส่ง analytics/โหลด tracking ที่ต้องใช้ consent ก่อนเลือก
- ปฏิเสธ optional: login ซื้อคอร์ส และเรียนยังทำงานตามบริการหลัก
- เลือกเฉพาะประเภท: เปิดเฉพาะประเภทที่เลือก รวมกรณี reload และ navigation
- ถอนภายหลัง: หยุดการเก็บในอนาคต และจัดการข้อมูลเดิมตามฐาน/retention ที่กำหนด
- มีทางกลับมาแก้ตัวเลือกจาก footer; ไม่ถือว่าปิด banner คือยอมรับ
- เก็บหลักฐานเท่าที่จำเป็น ไม่สร้าง tracking ใหม่เพื่อพิสูจน์ consent
- ทดสอบ network, storage, embeds และ server behavior ไม่ใช่ดูเพียงว่า banner หาย

## ใช้แชร์ความรู้

โครงเรื่อง: “เว็บพร้อมใช้งานจริงต้องครบทั้งแจ้งผู้ใช้ ควบคุมการเก็บข้อมูล ดูแลสิทธิ ช่วยเมื่อซื้อมีปัญหา ใช้งานได้ทุกคน และกู้ระบบได้”

แยกสามสถานะเวลาเล่า: มีโค้ดแล้ว / ยังไม่พบ implementation / ต้องพิสูจน์กับระบบจริง เพื่อไม่ให้ checklist กลายเป็นคำรับรองเกินหลักฐาน

ดู [แหล่งอ้างอิงและคำอธิบาย PDPA, WCAG, Web Vitals](research/website-foundations-sources-2026-09-13.md) ประกอบ ข้อเสนองานในตารางเป็นการสังเคราะห์ให้เหมาะกับ repo นี้ ไม่ใช่ข้อกำหนดกฎหมายทั้งหมด
