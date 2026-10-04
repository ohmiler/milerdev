# Acquisition and content journey specimen

สถานะ: รอความเห็นจาก owner  
ตั๋ว: [ปรับปรุง acquisition และ content journey](https://github.com/ohmiler/milerdev/issues/18)

เอกสารนี้เป็น localized prototype สำหรับกำหนดหน้าที่ของหน้า public แต่ละหน้า, ลำดับ CTA, หลักฐานความน่าเชื่อถือ, เส้นทางขอความช่วยเหลือ และ recovery path โดยคง section และ pattern ที่ทำงานดีอยู่แล้ว ไม่เปลี่ยนกติกา auth, role, การลงทะเบียนเรียน, การชำระเงิน หรือเนื้อหากฎหมาย

## Design thesis

ให้แต่ละหน้าตอบคำถามของผู้เยี่ยมชมเพียงช่วงเดียวของ journey แล้วส่งต่ออย่างมีเหตุผล:

```text
หน้าแรก ──► เข้าใจคุณค่าและเลือกจุดเริ่ม
  ├─► เกี่ยวกับเรา ──► เข้าใจวิธีสอนและเห็นหลักฐานจริง
  ├─► บทความ ──► เรียนรู้แนวคิด ──► อ่านเรื่องถัดไป / ดูคอร์สเมื่อเกี่ยวข้อง
  ├─► FAQ ──► คลายข้อกังวล ──► ไปยังงานตรงเรื่อง / ติดต่อทีม
  └─► คอร์สทั้งหมด ──► เปรียบเทียบและตัดสินใจ

ประกาศ ──► รับรู้ข้อมูลการใช้งานตาม role
Privacy / Terms ──► ตรวจสอบข้อตกลง ──► ติดต่อเมื่อมีคำถาม
Error / 404 ──► กลับเข้าสู่เส้นทางที่ทำงานได้
```

Home เป็นหน้า conversion หลักเพียงหน้าเดียว ส่วนบทความ หน้าช่วยเหลือ และหน้ากฎหมายต้องไม่ถูกทำให้เป็น sales landing page ซ้ำอีกชุด

## 1. Journey role และ CTA contract

| Route | งานหลักของหน้า | Primary action | Secondary / escape hatch |
|---|---|---|---|
| `/` | สื่อ outcome และช่วยเลือกจุดเริ่ม | ดูคอร์สทั้งหมด | รู้จัก MilerDev / FAQ ตาม section เดิม |
| `/about` | อธิบายวิธีออกแบบการเรียนและแสดงหลักฐานจริง | ดูคอร์สทั้งหมด | ติดต่อทีม |
| `/blog` | ค้นหาและเลือกบทความ | อ่านบทความ | ล้างตัวกรองเมื่อไม่พบผลลัพธ์ |
| `/blog/[slug]` | อ่านบทความให้จบและไปต่ออย่างสัมพันธ์กับเนื้อหา | บทความที่เกี่ยวข้อง | ดูคอร์สทั้งหมดแบบ low-pressure ที่ท้ายบทความ |
| `/announcements` | อ่านข้อมูลการใช้งานที่ active และตรง role | เปิดอ่านประกาศ | ลองใหม่เมื่อโหลดล้มเหลว |
| `/faq` | หาคำตอบก่อนติดต่อ | เปิดคำถาม / ไปยังปลายทางตรงเรื่อง | ติดต่อทีม |
| `/contact` | ส่งบริบทให้ทีมช่วยเหลือ | ส่งข้อความ | อ่าน FAQ ก่อนส่ง |
| `/privacy`, `/terms` | อ่านและอ้างอิงข้อกำหนด | เลือกหัวข้อในสารบัญ | ติดต่อทีมเมื่อมีคำถาม |
| error | ฟื้นจากงานที่ล้มเหลว | ลองอีกครั้ง | กลับหน้าแรก |
| not-found | กลับเข้าสู่ discovery journey | ดูคอร์สทั้งหมด | กลับหน้าแรก / ติดต่อทีม |

ในหนึ่ง region มี filled primary action ได้ไม่เกินหนึ่งจุด บทความ หน้าช่วยเหลือ หน้ากฎหมาย และหน้ากู้คืนไม่แทรก CTA ซื้อคอร์สซ้ำระหว่างเนื้อหา

## 2. Home: preserve the frozen conversion story

คง Home ตาม ADR 0002 ทั้ง 7 section และไม่แก้ composition/copy ใน ticket นี้:

1. Hero outcome
2. capability strip
3. learning outcomes
4. latest courses
5. Studio proof
6. FAQ
7. final CTA

เหตุผล: หน้าเดิมมี value proposition, action หลัก และ evidence sequence ครบแล้ว การเพิ่ม trust strip, testimonial, ตัวเลข หรือ CTA ใหม่โดยไม่มีข้อมูลจริงจะทำให้ hierarchy และความน่าเชื่อถืออ่อนลง

## 3. About: จากการย้ำคำสัญญาไปสู่ method + evidence

คง header, หลักการ, ภาพจริง 3 ภาพ และ final CTA เดิม แต่ให้เนื้อหาช่วงกลางทำหน้าที่ต่างจาก Home:

```text
CURRENT
เข้าใจเหตุผล / เขียนไปพร้อมกัน / จบด้วยผลงาน
(ใจความใกล้กับ learning outcomes บน Home)

PROPOSED
เราออกแบบบทเรียนอย่างไร
01 เห็นภาพงานปลายทางและ prerequisite ก่อนเริ่ม
02 อธิบายเหตุผล แล้วลงมือเขียนตามลำดับที่ทดสอบได้
03 ปิดแต่ละช่วงด้วยสิ่งที่ตรวจสอบหรือใช้ต่อได้
```

ส่วนหลักฐานใช้เฉพาะสิ่งที่ตรวจสอบได้จาก asset/content จริง:

- ใช้คำกลางว่า “ภาพจากกิจกรรมการสอนและเวทีแบ่งปันความรู้” จนกว่าจะมีชื่อองค์กร งาน วันที่ และสิทธิ์เผยแพร่ที่ยืนยันได้
- เพิ่ม caption เชิงข้อเท็จจริงต่อภาพเมื่อ metadata พร้อม ไม่เดาชื่องานหรือองค์กรจากภาพ
- ไม่เพิ่ม testimonial, จำนวนผู้เรียน, โลโก้ลูกค้า หรือผลลัพธ์เชิงสถิติโดยไม่มีแหล่งอ้างอิง

## 4. Blog discovery: รักษาการค้นหา เพิ่ม state ที่เป็นมาตรฐาน

คง featured article, server-backed search, tag filter, pagination และ URL state เดิม เพราะรองรับการค้นพบเนื้อหาได้ดีอยู่แล้ว ปรับเฉพาะจุด:

- เปลี่ยน no-results Card เป็น canonical `Empty` พร้อมข้อความตามเงื่อนไขและ action “ล้างตัวกรอง” โดยเก็บ query ใน URL
- รูป featured/card ต้องมี intrinsic `width`/`height` หรือใช้ image component ที่กำหนด `sizes` เพื่อกัน layout shift
- วันที่และยอดอ่านใช้ formatter locale `th-TH` แหล่งเดียวกัน ไม่ format กระจายตาม component
- คงทั้ง card เป็นลิงก์เดียวและ focus-visible เดิม ไม่เพิ่มปุ่ม CTA ซ้อนใน card

## 5. Article: reading first, acquisition second

คง breadcrumb, metadata, reading progress, rich content, copy-code, share, related articles และปุ่มกลับหน้าบทความเดิม พร้อมปรับ seam ต่อไปนี้:

```text
[เนื้อหาบทความ]

[อ่านต่อ: บทความที่เกี่ยวข้อง]        ← content continuation มาก่อน

┌ ฝึกต่อจากแนวคิดนี้ ─────────────────────────┐
│ อยากลงมือทำเป็นลำดับ? ดูคอร์สทั้งหมดและเลือก │
│ จากระดับ/หัวข้อที่ตรงกับคุณ                  │
│                         [ดูคอร์สทั้งหมด →]   │
└──────────────────────────────────────────────┘

[แชร์]                              [กลับไปบทความทั้งหมด]
```

- แสดง bridge “ฝึกต่อจากแนวคิดนี้” เพียงครั้งเดียวที่ท้ายบทความและใช้ outline/secondary treatment
- จนกว่าจะมี relation ระหว่าง post กับ published course ที่เชื่อถือได้ ให้ลิงก์ `/courses` และไม่อ้างว่าเป็น “คอร์สที่เกี่ยวข้อง”
- เมื่อมี relation ที่ตรวจสอบสถานะ published ได้แล้วจึงแสดงชื่อคอร์สเฉพาะ และต้องมี fallback ไป `/courses`
- ทำสารบัญเป็น collapsible block ก่อนเนื้อหาบน mobile; desktop คง sticky aside
- สร้าง heading id แบบเสถียรจาก content pipeline และใช้ id ชุดเดียวกับสารบัญ/anchor ไม่กำหนด id หลัง hydration เท่านั้น
- รูปปก, avatar และรูป related article มี intrinsic dimensions; rich content รองรับ code/table/link ยาวโดยไม่เกิด horizontal page overflow

## 6. FAQ → Contact: support ladder ที่ไม่สร้างคำตอบซ้ำ

คง category index, Accordion, anchor offset และ contact card เดิม จากนั้นเปลี่ยน FAQ data จากข้อความล้วนเป็น structured answer ที่รองรับ optional `href` เพื่อ deep-link เฉพาะคำตอบที่มีปลายทางแน่นอน เช่น:

| คำถาม | ปลายทางที่เสนอ |
|---|---|
| ไม่มีพื้นฐานควรเริ่มอย่างไร | `/courses` |
| ลืมรหัสผ่าน | `/forgot-password` |
| เปลี่ยนอีเมล / ต้องการความช่วยเหลือ | `/contact` |
| ข้อกำหนดการคืนเงิน | `/terms#terms-payment` |

ข้อมูลเชิงนโยบายต้องมี canonical source เดียว; FAQ สรุปและลิงก์ไปยังรายละเอียด ไม่คัดลอกกติกาการชำระเงิน/คืนเงินไปแก้แยกหลายแห่ง

หน้า Contact คงคำเตือน “อย่าส่งรหัสผ่านหรือข้อมูลบัตร”, field validation, pending/success/error และช่องทางติดต่อเดิม เพิ่มเพียงลิงก์ “ลองดูคำถามที่พบบ่อยก่อน” เหนือฟอร์ม ไม่สัญญา SLA ที่ระบบหรือทีมยังไม่ได้รับรอง หลังส่งสำเร็จให้คง “ส่งข้อความใหม่” และเพิ่มลิงก์กลับ FAQ แบบ secondary

## 7. Announcements: copy ต้องตรงกับ role targeting

API ปัจจุบันเลือกประกาศ active ที่ `targetRole = all` หรือเท่ากับ role ของ session, เรียงล่าสุดก่อน และจำกัด 10 รายการ ผู้เยี่ยมชมที่ไม่มี session ใช้ fallback role `student` ดังนั้น:

```text
CURRENT
“เฉพาะประกาศที่เกี่ยวข้องกับบัญชีของคุณ”

PROPOSED
“ประกาศล่าสุดที่เปิดใช้งานและตรงกับประเภทผู้ใช้งานของคุณ”
evidence: “เรียงจากล่าสุด · สูงสุด 10 รายการ · แสดงตามประเภทผู้ใช้งาน”
```

- คง Skeleton, Alert + retry, Empty และ announcement cards เดิม
- แก้ข้อความตอบกลับ 500 ที่เป็น mojibake ให้เป็น UTF-8 ภาษาไทย และคง safe logging เดิม
- ไม่เปลี่ยน role fallback, query, visibility หรือเพิ่มข้อมูลส่วนบุคคลใน ticket นี้

## 8. Legal readability: ทางลัดโดยไม่แก้ความหมาย

คงเนื้อหา, section ids, desktop sticky TOC และ contact section เดิมทั้งหมด:

- ใช้ `updatedLabel` ตัวเดียวทั้ง evidence card และ document header เพื่อตัดความเสี่ยงวันที่สองจุดไม่ตรงกัน
- mobile แสดงสารบัญแบบ collapsed โดย default พร้อมจำนวนหัวข้อ; เปิดแล้วใช้ anchor เดิม
- เมื่อกระโดดไปหัวข้อ ต้องไม่ถูก sticky header บังและ focus target ต้องมองเห็น
- ไม่แก้ถ้อยคำกฎหมาย, refund policy หรือ effective date โดยไม่มี legal/product owner review

## 9. Recovery surfaces: action ที่สม่ำเสมอ

```text
ERROR                                  404
เกิดข้อผิดพลาด                        ไม่พบหน้าที่ต้องการ
ยังไม่ระบุสาเหตุที่เดาไม่ได้           ลิงก์อาจเปลี่ยนหรือพิมพ์ไม่ครบ
[ลองอีกครั้ง] [กลับหน้าแรก]            [ดูคอร์สทั้งหมด] [กลับหน้าแรก]
                                       ติดต่อทีม
```

- ทุก action ใช้ `Button asChild`/Button primitive เดียวกันผ่าน `StatusSurface`; ไม่ปล่อย raw Link ที่ style ต่างกันตาม caller
- error คง retry เป็น primary เพราะรักษางานเดิมได้ดีที่สุด และไม่แสดง stack, payload หรือรายละเอียดภายใน
- 404 ใช้ discovery destination ที่มีอยู่จริง ไม่สร้าง search route ปลอม
- direct contact เป็น tertiary text link ไม่แย่ง recovery action หลัก

## Evidence inventory

| Finding | Evidence | Decision |
|---|---|---|
| Home มี conversion sequence ครบและถูก freeze | ADR 0001–0003, `src/app/page.tsx` | preserve ทั้ง composition/copy |
| About ซ้ำ learning outcome ของ Home และ proof copy กว้างกว่าหลักฐานที่มี | `src/app/about/page.tsx` | เปลี่ยนช่วงกลางเป็น method; ใช้ factual caption |
| Blog มี discovery controls ดี แต่ empty state และรูปยังไม่ใช้ contract เดียวกัน | `src/app/blog/page.tsx` | คง flow; ใช้ Empty และ intrinsic image size |
| Article มี related content ดี แต่สารบัญหายบน mobile และ heading id ถูกเติมหลัง hydration | `src/app/blog/[slug]/page.tsx`, `TableOfContents.tsx` | mobile TOC + stable ids |
| FAQ เป็น plain-string data จึง deep-link ในคำตอบไม่ได้อย่างเป็นระบบ | `src/app/faq/faq-data.ts` | optional structured link; canonical policy source |
| Contact มี safety/validation/states ครบ แต่ไม่มีทางกลับ FAQ หลังสำเร็จ | `contact/page.tsx`, `ContactForm.tsx` | เพิ่ม low-pressure support cross-link |
| Announcement copy อ้างระดับบัญชี แต่ API filter ตาม role | `announcements/page.tsx`, `api/announcements/route.ts` | copy ตาม role behavior; คง authorization/query |
| Announcement API error text เป็น mojibake | `api/announcements/route.ts` | แก้ safe Thai 500 message |
| วันที่ legal ซ้ำสองแหล่ง | `LegalDocument.tsx` | render จาก `updatedLabel` แหล่งเดียว |
| not-found ส่ง raw Links เข้า shared status surface และกล่าวถึง Contact โดยไม่ลิงก์ | `not-found.tsx`, `StatusSurface.tsx` | shared action contract + direct tertiary link |

## Minimum implementation sequence

1. แก้ content truth ที่ไม่ตรง implementation: announcement copy/error UTF-8 และ legal updated label
2. ปรับ shared primitives: Empty usage, StatusSurface actions, mobile/desktop TOC patterns และ stable heading ids
3. ปรับ About method/evidence copy โดยยืนยัน metadata ของภาพก่อนใส่ชื่อเฉพาะ
4. เพิ่ม FAQ structured links และ FAQ ↔ Contact support ladder
5. เพิ่ม article end bridge แบบ low-pressure พร้อม fallback `/courses`
6. กำหนด intrinsic image dimensions/`sizes` และตรวจ long-content overflow
7. เพิ่ม behavior tests สำหรับ filtered-empty, announcement states/scope copy, mobile TOC, legal anchors, contact success และ error/404 actions
8. ตรวจ 320/390/768/1024/1440 px, keyboard path, reduced motion, no horizontal overflow, Thai UTF-8 และไม่มี CTA ซ้ำ

## Explicit non-goals

- ไม่เปลี่ยน Home composition/copy หรือเพิ่ม section ใหม่
- ไม่สร้าง route, CMS relation, search service, testimonial หรือ marketing metric ใหม่
- ไม่เปลี่ยน auth, role, announcement targeting, enrollment, payment, refund หรือ certificate behavior
- ไม่แก้สาระของ Privacy/Terms โดยไม่มี review ที่เหมาะสม
- ไม่เพิ่ม personalized recommendation หรืออ้างว่า course/post เกี่ยวข้องกันหากไม่มี relation จริง
- ไม่เปลี่ยน visual identity, typography, icon library หรือ shadcn preset
- ไม่รวม navigation/global-shell change ที่ตัดสินใน ticket ก่อนหน้า ยกเว้นใช้ shared Breadcrumb/skip-link เมื่อ implement

## Owner reaction requested

โปรดยืนยันหรือแก้ 5 จุดนี้:

1. Home คงเดิมทั้งหมด และให้ About เปลี่ยนจาก outcome ซ้ำเป็น “วิธีออกแบบบทเรียน + หลักฐานจริง”
2. หลักฐานบน About ใช้ caption กลางจนกว่าจะยืนยันชื่องาน/องค์กร/วันที่ได้ ไม่เติม claim ใหม่
3. บทความมี course bridge เพียงครั้งเดียวที่ท้ายบทความแบบ low-pressure; ก่อนมี relation จริงให้ไป `/courses` เท่านั้น
4. FAQ/Contact/Legal คงเป็น support-first และไม่แทรก sales CTA; 404 ใช้ “ดูคอร์สทั้งหมด” เป็น recovery หลัก
5. หน้า Announcements อธิบายว่าแสดงตามประเภทผู้ใช้งานให้ตรง API และแก้เฉพาะข้อความ error UTF-8 โดยไม่เปลี่ยน targeting
