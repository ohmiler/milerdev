# Enrollment and payment clarity specimen

สถานะ: รอความเห็นจาก owner

Ticket: [[UI Improvement] เพิ่มความชัดเจนของ enrollment และ payment](https://github.com/ohmiler/milerdev/issues/20)

ขอบเขตนี้เป็น localized planning specimen สำหรับ Course, Bundle, coupon, Stripe, PromptPay/SlipOK, payment-success และ `/dashboard/payments` เท่านั้น ไม่แก้ business rules, provider integration, authorization, payment truth หรือ enrollment safeguards

## Design thesis

ผู้ซื้อควรรู้ตลอดเวลาว่า “เงินอยู่สถานะใด”, “สิทธิ์เรียนอยู่สถานะใด” และ “ทำอะไรต่อได้อย่างปลอดภัย” โดยไม่ต้องตีความคำกว้างอย่าง “สำเร็จ”, “รอดำเนินการ” หรือ “ลองใหม่” เอง

ใช้ Academy-light และ shared primitives เดิมต่อไป จุดเด่นของ flow นี้ไม่ใช่ decoration ใหม่ แต่เป็น **authoritative status strip** ที่ใช้ภาษาและ next action ชุดเดียวกันตั้งแต่ product action card, payment dialog, Stripe return, PromptPay verification ไปจนถึง payment history

หลักที่ต้องรักษา:

- การสมัครสมาชิกไม่ใช่การลงทะเบียนเรียน
- การสร้าง checkout/payment intent ไม่ใช่การชำระเงินสำเร็จ
- การส่งสลิปไม่ใช่หลักฐานว่าสำเร็จจน SlipOK และ fulfillment ยืนยัน
- การชำระเงินสำเร็จไม่ควรถูกสื่อว่า “พร้อมเรียน” จน enrollment ถูกสร้างครบ
- client state, query string, uploaded preview และ payment-success route name ไม่เป็น authority
- ห้ามชวนจ่ายซ้ำเมื่อระบบกำลัง verify หรือ fulfillment ยังไม่จบ

## 1. Canonical state vocabulary

สถานะฐานข้อมูลยังคงเดิม แต่ UI ต้องแยก payment attempt ออกจาก access state และ derive ข้อความตาม method/context

| Domain fact | คำที่ผู้ใช้เห็น | ความหมาย | ห้ามสื่อว่า |
| --- | --- | --- | --- |
| ยังไม่มี payment attempt | ยังไม่ได้เริ่มชำระ | ยังเลือกหรือเริ่มวิธีชำระได้ | มีรายการรอตรวจแล้ว |
| Stripe `pending` | ยังชำระไม่เสร็จ | checkout ถูกสร้าง แต่ยังไม่มี paid confirmation | เงินถูกตัดแล้ว |
| PromptPay `pending`, intent ยังไม่หมดเวลา | รอแนบสลิป | มีรายการและยอดที่ server ล็อกไว้ กำลังรอหลักฐาน | ได้สิทธิ์แล้ว |
| PromptPay `pending`, เกิน TTL | รายการหมดเวลา | intent เดิมใช้ตรวจสลิปไม่ได้ ต้องเริ่มรายการใหม่ | payment failed หรือเงินหาย |
| `verifying` | กำลังตรวจสอบสลิป | ระบบ claim รายการแล้ว ห้าม submit หรือจ่ายซ้ำ | ต้องลองตรวจซ้ำทันที |
| `completed`, enrollment ยังไม่ครบ | ชำระแล้ว · กำลังเปิดสิทธิ์ | payment truth สำเร็จ แต่ access repair/fulfillment ยังไม่เสร็จ | ต้องชำระใหม่ |
| `completed`, enrollment ครบ | ชำระแล้ว · พร้อมเรียน | payment และ access authority ยืนยันครบ | — |
| `failed` | รายการไม่สำเร็จ | attempt นี้จบโดยไม่ให้สิทธิ์ เริ่มใหม่ได้จาก product | enrollment ถูกยกเลิก |
| `refunded` | คืนเงินแล้ว | payment ถูกคืน; access เป็น fact แยกที่ server ตัดสิน | ยังมีสิทธิ์เสมอ |

“ลงทะเบียนสำเร็จ” ใช้เฉพาะเมื่อ enrollment ถูกสร้างแล้ว เช่น คอร์สฟรี, คูปอง 100% ที่ revalidate สำเร็จ หรือ payment fulfillment สำเร็จ

## 2. One flow, two authorities

```text
หน้าสินค้า
  │  server price/readiness/access facts
  ▼
ตรวจรายการ + ใช้คูปอง (Course เท่านั้น)
  │  server revalidates price/coupon
  ▼
เลือกวิธีชำระ ───────────────┐
  │                          │
  ├─ Stripe                  └─ PromptPay
  │   explicit handoff          create immutable intent
  │   paid session              exact amount + expiresAt
  │                             upload slip
  └──────────────┬──────────────┘
                 ▼
       authoritative verification
       payment status + fulfillment
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
  payment not done     payment completed
  recover safely       check enrollment
                           │
                    ┌──────┴──────┐
                    ▼             ▼
               access pending  ready to learn
```

payment authority ตอบว่าเงินสำเร็จหรือไม่ ส่วน enrollment authority ตอบว่าเข้าเรียนได้หรือยัง UI ต้องรับ discriminated result จาก server แทนการลดทั้งหมดเหลือ boolean `accessReady`

## 3. Product action card and Stripe cancel return

### Preserve

- Course/Bundle readiness และ state-aware enrolled action จาก ADR 0005
- server-resolved effective price และ canonical price vocabulary จาก discovery ticket
- guest callback ไป product route เดิมก่อนเริ่ม checkout
- action card ใน mobile document flow ไม่มี sticky payment CTA

### Repair

1. Primary paid action ใช้ “เลือกวิธีชำระเงิน · ฿2,490” เพื่อบอกว่าคลิกแล้วยังไม่ตัดเงิน
2. Dialog เปิดด้วย order review ก่อน provider handoff: สินค้า, ราคาปัจจุบัน, coupon discount, ยอดชำระ
3. การเลือก method เปลี่ยน selection เท่านั้น แล้วใช้ explicit CTA:
   - “ไปชำระผ่าน Stripe”
   - “ดูข้อมูลโอนและแนบสลิป”
4. `?payment=cancelled` แสดง Alert ใกล้ action card:
   - Title: “ยกเลิกการชำระแล้ว”
   - Copy: “ยังไม่มีการยืนยันการชำระเงินและยังไม่ได้เพิ่มสิทธิ์เรียน คุณเลือกวิธีชำระใหม่ได้เมื่อพร้อม”
   - Primary: “เลือกวิธีชำระอีกครั้ง”
   - Secondary: “กลับไปดูรายละเอียด”
5. หลัง dismiss/เริ่มใหม่ ให้ canonicalize URL โดยเอาเฉพาะ arrival-state `payment=cancelled` ออก ไม่ทำให้ Back กลับมาแสดง Alert ซ้ำ

ก่อน:

```text
[ ซื้อคอร์สนี้ ฿2,490 ]
เลือก radio “Stripe” → เริ่ม request/redirect ทันที
กลับจาก Stripe ?payment=cancelled → หน้าเดิม ไม่มี feedback
```

หลัง:

```text
┌ ตัวอย่างและการสมัครเรียน ───────────────┐
│ ราคาปัจจุบัน                  ฿2,490     │
│ ระบบเพิ่มสิทธิ์หลังตรวจสอบการชำระแล้ว   │
│ [ เลือกวิธีชำระเงิน · ฿2,490 ]          │
└──────────────────────────────────────────┘

cancel return:
┌ ยกเลิกการชำระแล้ว ──────────────────────┐
│ ยังไม่มีการยืนยันการชำระหรือเพิ่มสิทธิ์  │
│ [เลือกวิธีชำระอีกครั้ง] [ดูรายละเอียด] │
└──────────────────────────────────────────┘
```

## 4. Payment method dialog

ใช้ `Dialog`, `Field`, `InputGroup`, `ToggleGroup`, `Alert`, `Card`, `Button` และ `Spinner` ที่มีอยู่ ไม่สร้าง payment-control markup ชุดใหม่

```text
┌ เลือกช่องทางชำระเงิน ───────────────────┐
│ Course: TypeScript Foundations           │
│ ราคาปัจจุบัน                 ฿2,490.00   │
│ คูปอง SAVE500               -฿500.00     │
│ ──────────────────────────────────────── │
│ ยอดชำระ                     ฿1,990.00   │
│                                          │
│ โค้ดส่วนลด [ SAVE500             ][ใช้] │
│                                          │
│ (•) บัตรเครดิต/เดบิต · Stripe           │
│ ( ) โอนเงิน / PromptPay + แนบสลิป       │
│                                          │
│ [ยกเลิก]       [ไปชำระผ่าน Stripe →]   │
└──────────────────────────────────────────┘
```

Contract:

- Coupon เป็น advisory display จน checkout/enrollment endpoint revalidate อีกครั้ง
- เมื่อ coupon ทำให้ยอดเป็น 0 CTA เปลี่ยนเป็น “ยืนยันลงทะเบียนด้วยคูปอง” และไม่สร้าง payment attempt
- Course และ Bundle ใช้ payment-method composition เดียวกัน แต่ Bundle ไม่แสดง coupon field เพราะ policy ปัจจุบันไม่รองรับ
- pending button ล็อกเฉพาะเมื่อ request เริ่มแล้ว มี spinner และ `aria-busy`; selection ยังไม่ก่อ external side effect
- error ของ checkout creation อยู่ใน dialog ใกล้ action และคง selection/coupon เพื่อ retry ไม่โยนไป generic “เกิดข้อผิดพลาด” ที่ไม่มีบริบท
- amount ทุกจุดใช้ `Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' })` ผ่าน formatter เดียว

## 5. PromptPay: exact amount, expiry, privacy, and verification

`POST /api/promptpay/intents` ส่ง `paymentId`, authoritative `amount`, `itemTitle`, `expiresAt` อยู่แล้ว UI ควรใช้ facts เหล่านี้แทน fallback จาก client price

```text
┌ โอนเงินและแนบสลิป ──────────────────────┐
│ รายการนี้ใช้ได้ถึง 14:35 น.              │
│ 1 ตรวจชื่อบัญชีและยอด                    │
│ 2 โอนยอดตรง ฿1,990.00                    │
│ 3 แนบสลิปเพื่อให้ระบบตรวจสอบ             │
│                                          │
│ ธนาคาร …       เลขบัญชี …                │
│ ชื่อบัญชี …     ยอดที่ต้องตรง ฿1,990.00 │
│                                          │
│ [ เลือกรูปสลิป ]                         │
│ JPG, PNG หรือ WEBP ไม่เกิน 5 MB          │
│ ไฟล์จะถูกส่งเมื่อตรวจสอบรายการนี้เท่านั้น│
│                                          │
│ [กลับ]          [ตรวจสอบสลิปและยืนยัน]  │
└──────────────────────────────────────────┘
```

### Verification outcomes

| Server result | Presentation | Safe next action |
| --- | --- | --- |
| invalid type/size | inline `FieldError`; clear invalid file | เลือกไฟล์ใหม่ |
| slip rejected/amount mismatch | destructive `Alert`; keep intent, clear or keep fileตามสาเหตุ | ตรวจข้อมูล/เลือกไฟล์แล้วส่งใหม่ |
| network failure before claim | “ยังเชื่อมต่อระบบตรวจสลิปไม่ได้” | ส่งตรวจใหม่ด้วย intent เดิม |
| provider timeout after claim | “ระบบรับรายการไว้ตรวจสอบแล้ว” | ปิด dialogได้, ไปประวัติการชำระเงิน, ห้ามชำระหรือ submit ซ้ำ |
| `PAYMENT_INTENT_EXPIRED` | “รายการนี้หมดเวลาแล้ว” | กลับ product และเริ่มรายการใหม่; ห้าม reuse paymentId |
| `PAYMENT_STATUS_VERIFYING` | “รายการนี้กำลังตรวจสอบ” | ไปประวัติ/ตรวจสถานะ; ไม่มี retry payment CTA |
| `alreadyFulfilled` | success from existing authority | ไปการเรียนของฉัน |
| duplicate slip reference | “สลิปนี้ถูกใช้กับรายการอื่นแล้ว” | ใช้หลักฐานของรายการนี้หรือติดต่อพร้อมเลขอ้างอิง |

stable server codes ถูก map เป็น Thai copy และ next action ที่ boundary เดียว ห้ามแสดง `PAYMENT_STATUS_VERIFYING`, `Duplicate slip reference` หรือ generic `Failed to verify slip` ตรง ๆ แก่ผู้ใช้

ระหว่าง `verifying` dialog ปิดด้วย Escape/backdrop/close button ไม่ได้ ปุ่มและ upload ถูกล็อก และ live status บอก “กำลังตรวจสอบสลิป…” เมื่อ server ตอบว่าเก็บรายการไว้ตรวจต่อ จึงค่อยเปลี่ยนเป็น recoverable status surface ที่ออกจากหน้าได้

## 6. Payment-success becomes an exact attempt status page

คง route เดิมไว้สำหรับ provider callback แต่ presentation ไม่ควร assume success จากชื่อ route หรือเลือก “latest payment” ของ product

### Data contract

- ผูก receipt กับ exact Stripe session/payment metadata ที่ผ่าน owner + target validation
- ถ้าไม่มี valid `session_id` หรือ session ถูก reject ห้าม fallback เป็น current product price และห้ามหยิบ latest unrelated attempt มาเป็นหลักฐาน
- query payment, fulfillment และ enrollment หลัง authoritative fallback แล้วคืน discriminated presentation state
- order reference, amount, method, item title และ created time มาจาก exact immutable attempt

### Three primary surfaces

```text
A. completed + access ready
   ชำระแล้ว พร้อมเริ่มเรียน
   [เริ่มเรียน] [ดูใบรายการ/ประวัติ]

B. completed + access pending
   ชำระแล้ว กำลังเปิดสิทธิ์
   อย่าชำระซ้ำ
   [ตรวจสถานะอีกครั้ง] [ดูประวัติการชำระเงิน] [ติดต่อพร้อมเลขอ้างอิง]

C. unconfirmed/rejected/missing attempt
   ยังยืนยันรายการนี้ไม่ได้
   ไม่มีข้อความว่า “ระบบได้รับเงินแล้ว”
   [กลับไปหน้าสินค้า] [ดูประวัติการชำระเงิน]
```

failed และ refunded เป็น surface แยก ไม่ใช้ pending receipt ร่วมกัน และ action ไป product/contact ตามสถานะจริง

Bundle receipt แสดงจำนวนสิทธิ์ที่เปิดแล้ว `X/Y` เมื่อ fulfillment บางส่วนยังไม่ครบ Primary action เป็น “ไปการเรียนของฉัน” เมื่อพร้อมครบ ไม่เดาสุ่มคอร์สแรกเป็นปลายทางหลัก

## 7. Bundle partial ownership must be explicit

business rule ปัจจุบันยังคิดราคาชุดเต็มแม้สมาชิกมี enrollment บางคอร์ส และ fulfillment จะ skip คอร์สที่มีสิทธิ์แล้ว Specimen นี้ไม่เพิ่ม credit/proration

ก่อนเปิด payment dialog ให้แสดง:

```text
มีสิทธิ์แล้ว 2 จาก 5 คอร์ส
ราคาชุดปัจจุบัน ฿4,990.00
ยอดนี้เป็นราคาชุดเต็ม ระบบจะเพิ่มสิทธิ์เฉพาะ 3 คอร์สที่เหลือ
[เลือกวิธีชำระเงิน · ฿4,990.00]
```

ถ้า owner ไม่ยืนยันข้อความและ policy visibility นี้ ต้องแยก business decision เรื่อง partial-ownership price/credit ออกจาก UI map; ห้ามแอบคำนวณส่วนลดจากราคาคอร์สที่มีสิทธิ์แล้วบน client

ผู้มีสิทธิ์ครบทุกคอร์สไม่เห็นราคา urgency หรือ payment actions และใช้ “ไปการเรียนของฉัน” ตาม discovery resolution

## 8. Payment history is the recovery home

หน้า `/dashboard/payments` คง summary และรายการล่าสุด แต่แต่ละ attempt ต้องตอบ 4 ข้อ: ซื้ออะไร, ยอดเท่าไร, ตอนนี้อยู่สถานะใด, ทำอะไรต่อได้

```text
┌ TypeScript Foundations               ┐
│ พร้อมเพย์ · 31 ส.ค. 2569 14:05 น.   │
│ ฿1,990.00        กำลังตรวจสอบสลิป   │
│ Ref: A12B34C56D78                    │
│ ระบบกำลังตรวจรายการนี้ อย่าชำระซ้ำ  │
│ [ตรวจสถานะอีกครั้ง] [ดูคอร์ส]       │
└──────────────────────────────────────┘
```

Server read model derive `displayState` และ `recoveryAction` จาก method, raw status, createdAt/PromptPay TTL, target และ access state:

- completed + access: “ไปการเรียนของฉัน”
- completed + access pending: “ตรวจสิทธิ์อีกครั้ง”
- PromptPay pending + valid: “แนบสลิปต่อ” โดย server owner-check paymentId อีกครั้ง
- PromptPay expired: “เริ่มรายการใหม่” ที่ product
- verifying: “ตรวจสถานะอีกครั้ง”; ไม่มี pay/re-submit action
- Stripe pending/failed: “กลับไปเลือกวิธีชำระ” โดยสร้าง attempt ใหม่เมื่อผู้ใช้ยืนยัน
- refunded: “ดูรายละเอียดสินค้า” และช่องทางติดต่อ

ถ้า resume PromptPay intent ยังไม่ implement ใน slice แรก ต้องใช้ copy ที่ซื่อสัตย์ว่า “กลับไปเริ่มรายการใหม่” และเตือนผู้ที่โอนแล้วแต่ยังแนบสลิปไม่ได้ให้ติดต่อพร้อมเลขอ้างอิง ห้ามแสดงปุ่ม “ดำเนินการต่อ” ที่ไปต่อไม่ได้จริง

## 9. Shared payment presentation seam

Course และ Bundle components ปัจจุบันทำ method/transfer/upload/error UI ซ้ำ ควรมี shared presentation/state machine แต่เก็บ mutation endpoints และ server authority เดิม

```ts
type PaymentPresentation = {
  target: { type: 'course' | 'bundle'; id: string; title: string; href: string };
  quote: {
    regularPrice?: string;
    effectivePrice: string;
    couponDiscount?: string;
    amountDue: string;
    currency: 'THB';
  };
  ownership?: { enrolledCount: number; totalCount: number };
  attempt?: {
    id: string;
    method: 'stripe' | 'promptpay' | 'bank_transfer';
    rawStatus: 'pending' | 'verifying' | 'completed' | 'failed' | 'refunded';
    displayState: string;
    expiresAt?: string;
  };
  access: { state: 'none' | 'partial' | 'ready'; enrolledCount?: number; totalCount?: number };
  recovery: { kind: 'none' | 'resume_slip' | 'refresh' | 'restart' | 'contact'; href?: string };
};
```

แนวคิดนี้เป็น read/presentation model ไม่ใช่ payment authority ทุก mutation ยังคง re-read server state, validate owner/target/amount/readiness/coupon และ fulfill ผ่าน boundary เดิม

Course payment adapters รองรับ coupon; Bundle adapter ไม่รองรับ coupon และส่ง ownership facts เพิ่ม UI composition, status mapping, formatter และ receipt ใช้ร่วมกันเพื่อลด copy drift

## 10. Accessibility, responsive, and trust checks

- method selection มี visible label และ explicit submit; keyboard เลือกได้โดยไม่ redirect ทันที
- focus เข้า dialog ที่ heading/first meaningful control และกลับ purchase trigger เมื่อปิด
- error อยู่ใกล้ field/action; async status ใช้ polite live region และ verifying button ใช้ `aria-busy`
- Dialog มี Title/Description, `overscroll-behavior: contain`, safe-area spacing และไม่เกิน viewport ที่ 390 px
- amount/reference ใช้ tabular numerals; Thai title/error รองรับข้อความยาวและ `break-words`
- input มี `name`, file label และ accepted formats; placeholder ใช้ “…” ตาม guideline
- ไม่ persist slip preview ใน URL/local storage, ไม่ log file/payment payload และไม่แสดงข้อมูลลูกค้าคนอื่น
- reduced motion ปิด nonessential transitions; pending feedback ไม่อาศัย animation อย่างเดียว
- back/forward: cancel arrival state ถูก canonicalize, dialog stateไม่ pretend ว่ากู้คืนได้; recoverable attempt stateมาจาก server
- ทดสอบ timezone boundary ของ promotion/coupon/PromptPay expiry และ format ผ่าน `Intl`

## Evidence inventory

| Surface | หลักฐานปัจจุบัน | Friction/risk |
| --- | --- | --- |
| Course payment UI | `src/components/course/EnrollButton.tsx` | method selection เริ่ม provider action ทันที; generic modal; `expiresAt` ถูกละเลย; raw server error อาจหลุดสู่ UI |
| Bundle payment UI | `src/components/bundle/BundleEnrollButton.tsx` | flow ซ้ำกับ Course, ไม่มี partial ownership truth, success copy อ้าง shape เก่าของ `enrolled` |
| Stripe checkout | `src/app/api/stripe/checkout/route.ts`, `bundle-checkout/route.ts` | server price/owner/readiness/idempotency ดี แต่ cancel URL ไม่มี consumer feedback |
| PromptPay intent | `src/app/api/promptpay/intents/route.ts`, `src/lib/commerce/promptpay-intent.ts` | immutable owner-bound attempt + 30-minute TTL ดี แต่ UI ไม่แสดง expiry/recovery |
| Slip verification | `src/lib/commerce/promptpay-slip-handler.ts`, fulfillment helpers | claim/release/idempotency ดี; timeout เป็น verifying แต่ UI ยังเสนอ retry แบบเดียวกับ rejection |
| Payment return | Course/Bundle `payment-success/page.tsx` | strict fulfillment fallback ดี แต่ receipt ใช้ latest payment/current price fallback และยุบสถานะเหลือ enrollment boolean |
| Receipt | `src/components/proof/TransactionReceipt.tsx` | ไม่เปิด learning ก่อน enrollment ดี แต่ “ระบบได้รับรายการแล้ว” กว้างเกินไปเมื่อไม่มี exact valid attempt |
| Payment history | `src/app/dashboard/payments/PaymentHistory.tsx` | loading/error/empty/precision ดี; status ไม่มี explanation/reference/recovery action |
| Runtime | `/courses/...?...payment=cancelled` ที่ 1440 px | query อยู่ใน URL แต่ไม่มี cancellation feedback; browser console 0 errors/0 warnings |
| Tests | focused Vitest baseline | 126/127 ผ่านตอนรันขนาน; 1 timeout ผ่านครบเมื่อ rerun เดี่ยว (6/6, 724 ms) |

## Minimum implementation sequence

1. นิยาม shared server-derived `PaymentPresentation`/status mapping และ exact-attempt receipt contract พร้อม tests ของ owner/target/amount/access separation
2. ทำ shared Course/Bundle order review + explicit method selection โดยรักษา mutation endpoints และ server revalidation
3. แสดง coupon breakdown/100% enrollment path และ Bundle partial ownership/full-price disclosure
4. ทำ PromptPay expiry, stable-error mapping, timeout/verifying surface และ slip privacy copy
5. consume Stripe `payment=cancelled` บน product action card และ canonicalize arrival URL
6. เปลี่ยน payment-success ให้ผูก exact attempt และแสดง completed-ready/completed-access-pending/unconfirmed/failed/refunded แยกกัน
7. เพิ่ม server-derived recovery descriptors และ next actions ใน payment history; ทำ resume intent เฉพาะเมื่อ contract owner-check ครบ
8. deterministic tests/fixtures: guest return, coupon valid/expired/100%, Stripe cancel/reject/paid, PromptPay valid/expired/rejected/timeout/replay, partial Bundle ownership, completed-without-access, refunded
9. browser checks 390/768/1024/1440, keyboard/focus/Escape, reduced motion, back-forward, long Thai, no overflow และ no duplicate payment prompt

## Explicit non-goals

- ไม่เปลี่ยนราคา, promotion, coupon eligibility, Bundle coupon policy หรือ THB boundary
- ไม่เพิ่ม installment, wallet, QR generator, save-card, auto refund หรือ provider ใหม่
- ไม่ grant/revoke enrollment จาก client state หรือ payment page presentation
- ไม่ลด owner/target/amount validation, rate limit, idempotency, webhook replay protection, slip duplicate protection หรือ fulfillment recovery
- ไม่ persist/display slip contents หลัง local preview และไม่เปลี่ยน production data
- ไม่ redesign Product Detail, Dashboard หรือ visual identity ทั้งหน้า
- ไม่แก้ partial-ownership credit/proration ใน UI; หากต้องการต้องเป็น business decision แยก

## Owner reaction requested

โปรดยืนยันหรือแก้ 6 decisions นี้:

1. เลือก payment method ก่อน แล้วกด CTA ชัดเจนอีกครั้ง; selection ไม่ redirect/create intent ทันที
2. Stripe cancel return แสดง “ยังไม่มีการยืนยันการชำระหรือเพิ่มสิทธิ์” พร้อมเลือกวิธีใหม่ และล้าง arrival query หลังใช้
3. PromptPay timeout/verifying ใช้ “อย่าชำระซ้ำ” + payment history เป็น recovery home; raw codes ไม่ออกสู่ UI
4. payment-success ผูก exact attempt และแยก “ชำระแล้วพร้อมเรียน”, “ชำระแล้วกำลังเปิดสิทธิ์”, “ยังยืนยันไม่ได้”
5. Partial Bundle ownership แสดงจำนวนสิทธิ์เดิมและบอกตรง ๆ ว่าราคาชุดเต็ม/เพิ่มเฉพาะคอร์สที่เหลือ โดยไม่ทำ proration
6. Payment history แสดง reference, contextual status explanation และ next action ที่ server derive; resume PromptPay ทำเมื่อมี owner-checked contract จริงเท่านั้น
