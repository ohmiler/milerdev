# Catalog, course, and bundle discovery specimen

สถานะ: รอความเห็นจาก owner  
ตั๋ว: [ปรับปรุง catalog, course และ bundle discovery](https://github.com/ohmiler/milerdev/issues/19)

เอกสารนี้เป็น localized prototype สำหรับช่วยให้ผู้เยี่ยมชมค้นหาและประเมินคอร์ส/ชุดคอร์สได้จากข้อมูลจริง โดยคงโครงสร้างที่ทำงานดีแล้วตาม ADR 0004–0005 และไม่เปลี่ยน enrollment, payment, promotion authority หรือ schema

## Design thesis

ไม่สร้างเครื่องมือ compare ใหม่ แต่ทำให้ทุก card และ detail page ใช้ “decision facts” ชุดเดียวกัน ผู้เยี่ยมชมจึงเปรียบเทียบด้วยสายตาได้โดยไม่ต้องเปิดหลายหน้าเพื่อค้นหาข้อมูลพื้นฐาน

```text
ค้นหา/กรอง ──► อ่าน card ที่ใช้ facts ชุดเดียวกัน ──► เปิดรายละเอียด
                                                       │
                         ┌─────────────────────────────┴─────────────────────────────┐
                         │                                                           │
                Course decision journey                                    Bundle decision journey
          promise → sample → curriculum → proof → action           path → included courses → price basis → action
```

ภาพรวมยังเป็น Academy-light เดิม Signature ของ discovery surface คือ evidence row ที่สม่ำเสมอและ readiness ที่มองเห็นทันที ไม่เพิ่มสี, gradient, animation หรือ card layer ใหม่

## 1. Canonical price vocabulary

ปัจจุบัน card แสดงราคาโปรโมชันที่ active แต่ตัวกรอง/การเรียงราคาและ Bundle comparison ใช้ `courses.price` ทำให้คำว่า “ต่ำไปสูง”, “ฟรี” และ “ประหยัด” อาจเทียบคนละฐาน กำหนดคำให้ชัดก่อน:

| คำ | ความหมาย | แหล่งข้อมูล |
|---|---|---|
| ราคาปกติ | ราคาคอร์สก่อนโปรโมชัน | `courses.price` |
| ราคาปัจจุบัน | ราคาโปรโมชันเมื่อ active ตามเวลา มิฉะนั้นใช้ราคาปกติ | server-authoritative effective price |
| ราคาชุด | ราคาของ Bundle | `bundles.price` |
| ราคาซื้อแยกวันนี้ | ผลรวมราคาปัจจุบันของทุกคอร์สใน Bundle | effective price ของแต่ละคอร์ส ณ เวลาเดียวกัน |
| ราคาปกติรวม | ผลรวมราคาปกติของทุกคอร์สใน Bundle | `courses.price` รวม |

Contract:

- filter “ฟรี/มีค่าใช้จ่าย”, sort ราคา, ราคาบน card และ checkout entry ใช้ **ราคาปัจจุบัน** จาก resolver เดียวกัน
- Bundle ใช้คำว่า “ประหยัด” เมื่อ `ราคาซื้อแยกวันนี้ - ราคาชุด > 0` เท่านั้น
- `ราคาปกติรวม` อาจแสดงเป็นบริบท แต่ห้ามขีดฆ่าหรือใช้เป็น savings claim หากราคาซื้อแยกวันนี้ต่ำกว่า
- format THB ด้วย `Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 })` แหล่งเดียว ไม่พึ่ง default locale ของ `toLocaleString()`

## 2. Catalog: preserve the useful filter flow

คงส่วนต่อไปนี้:

- hero และข้อความ “เลือกคอร์สที่พาไปถึงงานชิ้นถัดไป”
- server-rendered GET form; ไม่เพิ่ม live search หรือ client-side data store
- search จากชื่อ, price, tag, sort และ pagination ใน URL
- desktop filter Card และ mobile bottom Sheet พร้อม title/description/focus trap/safe-area
- course card ทั้งใบเป็นลิงก์เดียว, canonical Empty และ clear-all action

ปรับเฉพาะ seam ที่มี friction:

```text
DESKTOP / MOBILE SUMMARY
ค้นหา “React”  [ราคา: ฟรี ×] [หัวข้อ: Frontend ×]     เรียง: ราคาต่ำไปสูง
พบ 4 คอร์ส                                           [ล้างทั้งหมด]

ไม่พบผลลัพธ์
ไม่พบคอร์สที่ตรงกับ “React” + ราคา “ฟรี”
[ล้างตัวกรอง]   (ไม่แสดง Bundle ที่ไม่สัมพันธ์กับ query ใต้ Empty)
```

1. Normalize query ก่อนใช้:
   - `price` รับเฉพาะ `all | free | paid`
   - `sort` รับเฉพาะ `newest | oldest | price-low | price-high`
   - `tag` ต้องเป็น slug ที่มีจริง
   - `page` ต้องอยู่ในช่วง; หากเกินหน้าสุดท้ายให้ redirect ไป URL canonical ของหน้าสุดท้าย และถ้าผลรวมเป็น 0 ให้ใช้หน้า 1
2. แยก filter count ออกจาก sort count เพราะ sort ไม่ได้ลดจำนวนผลลัพธ์
3. แสดง removable filter chips ทั้ง desktop/mobile โดยแต่ละ chip ลบเฉพาะ param ของตนและ reset `page=1`
4. ใช้ shared `Pagination` พร้อม first/last context และ ellipsis โดยรักษา search/price/tag/sort ทุกครั้ง
5. แสดง Bundle section เฉพาะ default catalog state จนกว่าจะมี matching-bundle query จริง; ไม่แสดง Bundle ทั้งหมดใต้ filtered/no-result course query

## 3. Course card: action label ต้องตรงปลายทาง

card ปัจจุบันใช้ “ทดลองฟรี” เมื่อมี free-preview lesson แต่ลิงก์ทั้งใบพาไป Course Detail ไม่ได้เปิดบททดลอง จึงเปลี่ยน label ปลายทางและคง preview เป็น evidence:

```text
┌────────────────────────────────────┐
│ [ภาพ/Artwork] [มีบทเรียนทดลอง]       │
│ [หัวข้อ]                            │
│ ชื่อคอร์สที่ตัดบรรทัดได้              │
│ คำอธิบายสั้น                         │
│ 12 บท · 2 ชม. 10 นาที · สอนโดย …    │
│ ★ 4.8 · 24 รีวิว                    │  ← แสดงเมื่อมีรีวิวจริง
├────────────────────────────────────┤
│ ฿1,490  ฿1,990  ลด 25%              │
│                     ดูรายละเอียด →   │
└────────────────────────────────────┘

ZERO LESSON
┌────────────────────────────────────┐
│ [กำลังเตรียมเนื้อหา]                 │
│ 0 บท · ยังไม่เปิดลงทะเบียน            │
├────────────────────────────────────┤
│ ฿200                 ดูรายละเอียด →   │
└────────────────────────────────────┘
```

Contract:

- footer action ใช้ “ดูรายละเอียด” เสมอ เพราะ href คือ `/courses/[slug]`; badge “มีบทเรียนทดลอง” ยังคงเป็นหลักฐาน
- published course ที่มี 0 บทยังคงมองเห็นตาม ADR 0005 แต่ต้องมี Badge “กำลังเตรียมเนื้อหา” และข้อความ “ยังไม่เปิดลงทะเบียน”; ห้ามทำให้ราคา “ฟรี” ดูเหมือนพร้อมเริ่มเรียน
- rating แสดงเฉพาะ aggregate จาก review data จริงและเมื่อ `totalReviews > 0`; ไม่สร้าง fallback rating
- outcome, target audience และ prerequisites ยังไม่แสดงบน card เพราะ schema ไม่มี structured fields ตาม ADR 0005
- thumbnail มี intrinsic `width`/`height` หรือ image component + `sizes`; title/description/instructor รองรับข้อความไทยยาว
- shared CourseCard ยังใช้บน Home ได้ แต่ต้องไม่เปลี่ยน Home composition/spacing และต้องผ่าน Home contract เดิม

## 4. Course Detail: preserve ADR 0005, repair residual seams

คงลำดับเดิมทั้งหมด:

1. summary hero + factual evidence
2. media/action card
3. compact section navigation
4. authored course detail
5. curriculum
6. instructor + verified reviews
7. final state-aware action

ไม่เพิ่ม section ใหม่, compare rail, second sticky card หรือ mobile sticky CTA ปรับเพียง:

- เพิ่ม review aggregate `★ 4.8 · 24 รีวิว` ใน hero evidence เมื่อมีข้อมูลจริง และลิงก์ไป `#course-reviews`; ใช้ read model เดียวกับ review section ไม่ยิง request ซ้ำ
- section navigation เป็น in-page anchor navigation ไม่ใช้ Tabs semantics เพราะทุก section แสดงพร้อมกัน; current item ใช้ `aria-current="location"`
- layout ของ section navigation derive จากจำนวน item จริง ไม่ fix `grid-cols-4` เมื่อไม่มี instructor
- visible breadcrumb และ JSON-LD ใช้ model เดียวตาม decision ของ navigation ticket
- review section มี heading/id เจ้าของเดียว ไม่ซ้อน `course-reviews-title` สองจุด
- GET review failure แสดง `Alert` + “ลองโหลดรีวิวอีกครั้ง” แยกจาก Empty; ไม่ตีความ network/API failure ว่า “ยังไม่มีรีวิว”
- review sort/rating/page สะท้อนใน URL แบบ namespaced เช่น `reviewSort`, `reviewRating`, `reviewPage` และ reset page เมื่อ sort/filter เปลี่ยน; form เปิด/ปิดยังเป็น ephemeral state ไม่ต้องอยู่ใน URL
- รูปปกและ instructor avatar มี intrinsic dimensions

ล็อก lesson behavior เดิมไว้: ผู้เยี่ยมชมไป login พร้อม callback กลับ Course Detail, ผู้มีสิทธิ์เปิดบทเรียน, ผู้ไม่มีสิทธิ์ไม่เข้าถึงเนื้อหา การปรับ enrollment/payment prompt เชิงลึกอยู่ใน ticket ถัดไป

## 5. Bundle card: readiness และ price claim ที่ตรวจสอบได้

runtime fixture ปัจจุบันแสดง Bundle ที่มีคอร์ส 0 บทใน catalog พร้อมราคา และขีดฆ่าราคา `฿200` เท่ากับราคาชุด `฿200` แม้ discount เป็น 0 ขณะที่ Bundle Detail จึงค่อยบอกว่ายังซื้อไม่ได้

```text
READY
[ชุดคอร์ส · 3 คอร์ส] [พร้อมเรียน]
Full-stack path
01 HTML/CSS · 02 React · +1 คอร์ส
ราคาชุด ฿3,490
ซื้อแยกวันนี้ ฿4,470 · ประหยัด ฿980 (22%)
ดูรายละเอียด →

NOT READY
[ชุดคอร์ส · 1 คอร์ส] [กำลังเตรียมเนื้อหา]
Lifecycle path
มี 1 คอร์สที่ยังไม่มีบทเรียน
ราคาชุด ฿200
ดูรายละเอียด →
```

- catalog query ต้องมี readiness aggregate; Bundle ที่ยังไม่พร้อมยังมองเห็นแต่ไม่อ้างว่าพร้อมซื้อ
- ไม่ render strikethrough เมื่อราคาฐานเท่ากับราคาชุด
- ไม่แสดง “ประหยัด” เมื่อ savings เทียบราคาซื้อแยกวันนี้เป็น 0 หรือติดลบ
- card คง course titles อย่างน้อย 2 รายการบน mobile ตาม behavior test เดิม

## 6. Bundle Detail: ordered path first, one price truth

คง ordered course list และ desktop sticky action Card; mobile ให้อยู่ใน document flowเดิม ปรับโครงสร้างข้อมูลโดยไม่เพิ่ม feature:

```text
หน้าแรก / คอร์สทั้งหมด / {ชื่อชุดคอร์ส}

[ชุดคอร์ส · 3 คอร์ส]
ชื่อชุดคอร์ส
คำอธิบายจริง
3 คอร์ส · 48 บท · 9 ชม. 20 นาที · ทดลองได้ 4 บท

01 COURSE ROW
ชื่อ · คำอธิบาย
16 บท · 3 ชม. · สอนโดย … · มีบททดลอง · ★ 4.8 (24)
ราคาปัจจุบัน ฿1,490                         ดูรายละเอียด →

ACTION CARD
ราคาชุด                    ฿3,490
ซื้อแยกวันนี้               ฿4,470
ประหยัด                     ฿980 (22%)
ราคาปกติรวม                ฿5,970   ← secondary context only
[ซื้อ Bundle ฿3,490]
```

Contract:

- breadcrumb final item เป็นชื่อ Bundle จริงตาม navigation decision; eyebrow ใช้ “ชุดคอร์ส · 3 คอร์ส” แทน `LEARNING PATH / 03 COURSES`
- hero facts ใช้ course count, lesson count, known duration และ preview count; ไม่ทำ price/discount cards ซ้ำกับ action Card
- included-course rows ใช้ decision facts ชุดเดียวกับ CourseCard: readiness, duration, instructor, preview, verified review summary และราคาปัจจุบัน เฉพาะค่าที่มีจริง
- Bundle ไม่มี review model ของตัวเอง จึงไม่แสดง “คะแนน Bundle”; ใช้ aggregate ของแต่ละคอร์สเท่านั้น
- action Card แสดง price basis ตาม canonical vocabulary และใช้ promotion resolver ณ timestamp เดียวกัน
- ถ้าคอร์สใดไม่มีบทเรียน แสดง unavailable state และปิด enrollment/checkout ตาม ADR 0005 เดิม
- ถ้าสมาชิกมีสิทธิ์บางคอร์ส ให้แสดง “มีสิทธิ์แล้ว X จาก Y คอร์ส” แต่ไม่เดาเครดิตหรือราคาปรับลด; policy และ server quote สำหรับ partial ownership ต้องตัดสินใน ticket enrollment/payment
- ถ้ามีสิทธิ์ครบทุกคอร์ส action เป็น “ไปการเรียนของฉัน” ตาม canonical navigation vocabulary

## 7. Shared read model, not duplicated display logic

ปัจจุบัน Home, catalog page, `/api/courses` และ Bundle Detail ดึง/คำนวณ lesson count, promotion และ tags คนละชุด เสนอ shared server read model โดยไม่เปลี่ยน API trust boundary:

```ts
CourseDecisionFacts {
  regularPrice
  effectivePrice
  isPromotionActive
  lessonCount
  knownDurationSeconds
  freePreviewCount
  readiness: 'ready' | 'preparing'
  instructorName?
  reviewAverage?
  reviewCount
}
```

- resolver รับ `now` หนึ่งค่าเพื่อให้ทุก course ใน response ตัดสิน promotion ณ เวลาเดียวกัน
- query/filter/sort และ presentation ใช้ effective-price expression เดียวกัน
- aggregate lessons/reviews แบบ bulk; ไม่เพิ่ม N+1 ต่อ course ใน Bundle
- API และ server pages map จาก read model เดียว แต่ authorization/enrollment/payment endpoints ไม่เปลี่ยน

## Evidence inventory

| Finding | Evidence | Decision |
|---|---|---|
| filter/sort ใช้ราคาปกติ แต่ card แสดง active promo | `courses/page.tsx:180-202`, `:272-284` | canonical effective price resolver |
| invalid/out-of-range URL state ไม่ normalize | `courses/page.tsx:313-323` | allow-list facets + canonical page redirect |
| Bundle ทั้งหมดแสดงใต้ทุก filtered state | `courses/page.tsx:381-385` | show only in default state until matching query exists |
| Bundle card ขีดฆ่าราคาแม้ราคาเท่ากัน | `courses/page.tsx:385`; runtime 1440/390 | conditional comparison; no false savings cue |
| card “ทดลองฟรี” ลิงก์ไป detail ไม่ใช่ preview | `CourseCard.tsx:69,88` | badge communicates preview; action says “ดูรายละเอียด” |
| 0-lesson courses ดูเหมือนพร้อมซื้อใน catalog | `CourseCard.tsx:78,85-88`; runtime fixture | explicit preparing/readiness state |
| native course images ไม่มี intrinsic dimensions | `CourseCard.tsx:67`, `courses/[slug]/page.tsx:272,345` | dimensions/`sizes` contract |
| section nav ใช้ Tabs กับ sections ที่แสดงพร้อมกัน และ fix 4 columns | `CourseSectionNav.tsx:52-60` | anchor nav + dynamic layout + location semantics |
| review heading id ซ้ำ | `courses/[slug]/page.tsx:360-362`, `CourseReviews.tsx:174-175`; runtime accessibility tree | one section heading owner |
| GET review failure ไม่มี error state และ controls ไม่อยู่ใน URL | `CourseReviews.tsx:93-132` | Alert/retry + namespaced URL state |
| Bundle detailใช้ราคาปกติเท่านั้นในการ compare | `bundles/[slug]/page.tsx:45,75,269,288-293` | current-separate total + regular context |
| Bundle breadcrumb ไม่ใช้ชื่อจริง และ hero price ซ้ำ action Card | `bundles/[slug]/page.tsx:203,208,213-229` | actual title + evidence-only hero facts |
| runtime mobile/desktop ไม่มี console error | Playwright `/courses`, ready Course Detail, unavailable Bundle at 390/1440 | preserve current responsive shell and Sheet behavior |

## Minimum implementation sequence

1. สร้าง effective-price/readiness/formatting decision-facts seam พร้อม unit tests รอบ promotion boundaries
2. ทำ catalog query normalization, effective price filter/sort, active chips และ canonical Pagination
3. ปรับ CourseCard/Bundle card action truth, readiness, verified rating และ image dimensions โดยรัน Home contract ด้วย
4. เปลี่ยน Course Detail section nav semantics, review heading/error/URL state และเพิ่ม review summary จาก read model
5. เพิ่ม Bundle decision facts และ current-separate comparison; แสดง partial ownership โดยไม่แก้ payment policy
6. เพิ่ม deterministic fixtures: active/expired/future promo, promo-to-free, ready/unready, no review/review/error, bundle saving/equal/more-expensive และ partially owned bundle
7. ตรวจ 320/390/768/1024/1440 px, long Thai, keyboard/focus, reduced motion, URL back/forward, no horizontal overflow และไม่มี CTA flicker

## Explicit non-goals

- ไม่เพิ่ม side-by-side compare feature, wishlist, recommendation engine หรือ Bundle search/filter ใหม่
- ไม่เพิ่ม outcomes/audience/prerequisites schema หรือเดาข้อมูลจาก rich text
- ไม่เพิ่ม bundle-level reviews หรือสร้าง rating ปลอม
- ไม่เปลี่ยน Home composition/copy, Course Detail order หรือเพิ่ม mobile sticky CTA
- ไม่เปลี่ยน promotion authority, bundle price, coupon, payment, enrollment, partial-ownership pricing หรือ fulfillment behavior
- ไม่เปลี่ยน visual identity, tokens, typography, icon library หรือ shadcn preset

## Owner reaction requested

โปรดยืนยันหรือแก้ 5 จุดนี้:

1. ใช้ “ราคาปัจจุบัน” เป็นฐานเดียวสำหรับ filter/sort/card และใช้ “ราคาซื้อแยกวันนี้” เป็นฐานของคำว่า “ประหยัด” บน Bundle
2. คง published course/Bundle ที่ยังไม่พร้อมไว้ใน discovery แต่ต้องติด “กำลังเตรียมเนื้อหา” ตั้งแต่ card และห้ามสื่อว่าพร้อมลงทะเบียน
3. CourseCard ใช้ “ดูรายละเอียด” เสมอ; “มีบทเรียนทดลอง” เป็น Badge ไม่ใช่ action ที่อ้างว่าจะเปิด preview ทันที
4. คง Course Detail ตาม ADR 0005 และแก้เฉพาะ section-nav semantics, verified review summary, error/URL state และ duplicate heading
5. Bundle Detail แสดง partial ownership count แต่ยังไม่เปลี่ยนราคา/เครดิตใน ticket นี้ โดยส่ง policy และ server-quote decision ไป ticket enrollment/payment
