# Visual consistency specimen

สถานะ: รอความเห็นจาก owner\nตั๋ว: [จัดระเบียบ visual consistency และ design-system usage](https://github.com/ohmiler/milerdev/issues/16)

เอกสารนี้เป็น prototype ระดับต่ำสำหรับตกลงทิศทางก่อนลงมือแก้ UI จริง ไม่ใช่ข้อเสนอ redesign, rebrand หรือสร้าง design system ใหม่

## Thesis ที่คงไว้

MilerDev ใช้ภาพแบบ Academy-light: พื้นสว่าง อ่านภาษาไทยง่าย ใช้สีน้ำเงิน accent เพื่อชี้การกระทำสำคัญ และใช้ navy เฉพาะบริบทที่ต้องเน้นหลักฐาน สื่อ หรือสถานะ

ความกลมกลืนควรมาจากลำดับชั้นที่เดาได้ ไม่ใช่ทำให้ทุกหน้าหน้าตาเหมือนกัน:

1. แต่ละ region มี primary action เดียว
2. แต่ละหน้ามี surface ที่เด่นที่สุดเพียงจุดเดียว
3. supporting content ใช้ border และ spacing ก่อนเพิ่มสีหรือเงา
4. feedback state ใช้ primitive เดิมตามความหมาย
5. media/artwork ที่ต้องมืดหรือมีสีเฉพาะเนื้อหาเป็นข้อยกเว้นที่ตั้งชื่อและจำกัดขอบเขต

## Specimen: current → canonical

### A. Public catalog/editorial header

Current pattern กระจายอยู่ใน `/courses`, `/blog`, `/faq`, `PublicContentHeader` และ `PublicPageHeader` โดยต่างกันเพียงตำแหน่ง radial accent, gap และรายละเอียดเล็กน้อย

```text
CURRENT (หลาย implementation)              CANONICAL (PublicPageHeader)
┌────────────────────────────────┐          ┌────────────────────────────────┐
│  ◌ accent คนละตำแหน่งทุกหน้า │          │  ◌ accent 1 จุดตาม variant     │
│  H1 4xl / 5xl / 6xl            │    →     │  H1 public tier 4 / 5 / 6      │
│  lede หรือ evidence card        │          │  lede + optional evidence slot  │
└────────────────────────────────┘          └────────────────────────────────┘
```

Canonical contract:

- ใช้ `PublicPageHeader` เป็น seam เดียวสำหรับหน้า public ระดับ collection/support
- คง spacing `py-16 sm:py-20 lg:py-24`, container gutters และ type scale ปัจจุบัน
- จำกัด variant ตามบทบาท เช่น `story`, `catalog`, `task`; variant เปลี่ยนตำแหน่ง accent หรือ layout ได้ แต่ไม่รับ arbitrary gradient/class จาก route
- evidence เป็น optional slot สำหรับสถิติหรือทางเลือกถัดไป; หน้าที่ไม่มี evidence ใช้ title/description split เดิม
- article detail และ course detail คง header เฉพาะ journey เพราะ hierarchy ต่างจาก collection page

### B. Account shell navigation

```text
CURRENT                                  CANONICAL
┌──────────────┬──────────────────┐      ┌──────────────┬──────────────────┐
│ ● หน้าปัจจุบัน│                  │      │ [icon] ปัจจุบัน│                  │
│ ↗ ใบรับรอง    │     content      │  →   │ [icon] ใบรับรอง│     content      │
│ ↗ การชำระเงิน │                  │      │ [icon] ชำระเงิน│                  │
└──────────────┴──────────────────┘      └──────────────┴──────────────────┘
  raw Link styles + glyphs                  navigation Button contract
```

Canonical contract:

- ใช้ `Button` แบบ `navigation` หรือ primitive ที่ compose จาก contract เดียวกัน
- active state มี `aria-current="page"`, foreground/background ที่อ่านได้ และไอคอน Lucide ที่มีความหมาย
- inactive state ไม่ใช้ glyph `↗` เพราะ link ภายในระบบไม่ได้เปิดปลายทางภายนอก
- mobile เปลี่ยน layout ได้ แต่ลำดับ เมนู และ active semantics ต้องเหมือน desktop

### C. Surface hierarchy

```text
Public discovery  : academy canvas → default cards → 1 primary action
Commerce detail   : light evidence → 1 dominant conversion card
Auth/account      : academy canvas → 1 white task card (+ optional navy context card)
Learning          : light workspace → dark player only → neutral curriculum
Proof/status      : navy evidence slab → white action/recovery slab
```

กติกา card:

- `Card` default ใช้กับ containment ทั่วไป; supporting card ใช้ border/ring โดยไม่เพิ่มเงาเฉพาะหน้า
- เงาชัดใช้เฉพาะ dominant/overlay surface
- `homeMedia`, `homeProgress`, `homeNext` คงเป็น Home-only variants
- dark player, course artwork, receipt media และ certificate เป็น scoped exceptions; ควร encapsulate ชื่อบทบาทแทนการกระจาย raw palette

### D. Action and feedback states

| Intent | Canonical primitive | กติกา |
|---|---|---|
| primary task | `Button` default | หนึ่งจุดเด่นต่อ region |
| secondary task | `Button` outline | ไม่แข่งกับ primary |
| tertiary/navigation | `Button` ghost/navigation | รักษา hit target และ focus state เดียวกัน |
| irreversible action | destructive variant / `AlertDialog` | ต้องระบุผลลัพธ์ก่อนยืนยัน |
| inline status | `Alert` | ใช้ info/warning/success/destructive ตามความหมาย |
| no results/no data | `Empty` | มีสาเหตุสั้น ๆ และ next action เมื่อมี |
| initial predictable loading | `Skeleton` | geometry ต้องใกล้เนื้อหาจริง |
| named task dialog | `DialogShell` | title/description/focus contract เดียวกัน |
| transient acknowledgement | Sonner toast | ไม่ใช้แทน error ที่ผู้ใช้ต้องแก้ |

ทุก interactive state ต้องมี default, hover, focus-visible, disabled และ pending เมื่อการกระทำนั้น async; animation ระบุ property ที่เปลี่ยนและเคารพ reduced motion

## Token and rhythm contract

| Dimension | Keep | Normalize |
|---|---|---|
| Fonts | Prompt สำหรับภาษาไทย, Inter สำหรับ Latin | ไม่เพิ่ม font family ใหม่ |
| Brand color | accent blue + academy navy/canvas | ใช้ semantic token แทน hex/raw slate เมื่อไม่ได้เป็น artwork/media exception |
| Public H1 | `4xl → 5xl → 6xl`, semibold | ใช้ผ่าน page-family seam เดียว |
| Detail H1 | `4xl → 5xl`, bold | คงเฉพาะ product/course detail |
| Task H1 | `3xl → 4xl` หรือ `4xl`, medium/bold | เลือกตาม Auth หรือ Account shell ไม่กำหนดเองทุก route |
| Learning H1 | `2xl → 4xl` | คง hierarchy ที่ไม่แย่ง video player |
| Thai body | relaxed line-height; prose ไม่เกินประมาณ `68ch` | lede และ helper text ใช้ tier เดียวกันใน page family |
| Gutters | `16px` mobile, `24px` ขึ้นไป | ใช้ container/shell เดิม |
| Public header | `64 / 80 / 96px` | รวม implementation ไม่เปลี่ยน rhythm |
| Home sections | `64 / 80 / 96px` | frozen ตาม ADR; ไม่แตะ composition |
| Cards | padding หลัก `24px`, compact `16px` | เลี่ยง one-off padding ถ้าไม่มีเหตุผลจาก content |
| Action stack | gap ขั้นต่ำ `12px` | ไม่วาง destructive ชิด primary โดยไม่มีการแบ่งกลุ่ม |

## Evidence inventory

| Finding | Evidence | Decision |
|---|---|---|
| public header ถูกทำซ้ำ | `src/app/courses/page.tsx:334`, `src/app/blog/page.tsx:199`, `src/app/faq/page.tsx:23`, `src/components/content/PublicContentHeader.tsx:7`, `src/components/layout/PublicPageHeader.tsx:16` | รวมเป็น canonical variants โดยไม่เปลี่ยนภาพรวม |
| account nav มี style/glyph เฉพาะ | `src/components/account/LearnerAccountShell.tsx:46` | compose จาก navigation primitive และใช้ semantic icon |
| raw accent หลุด token | `src/app/page.tsx:235` | เปลี่ยนเป็น semantic accent token; Home layout คงเดิม |
| raw slate กระจายใน surface | `src/app/bundles/[slug]/page.tsx:253`, `src/app/dashboard/page.tsx:160`, `src/components/proof/TransactionReceipt.tsx:79` | แยก semantic media/evidence surface หรือบันทึก scoped exception |
| dark player มี raw surface/shadow | `src/components/course/LearnPageClient.tsx:254` | คง dark player แต่ encapsulate เป็น learning-media contract |
| primitive ใช้ `transition-all` | `src/components/ui/accordion.tsx:48`, `badge.tsx:8`, `switch.tsx:20`, `tabs.tsx:66` | ระบุเฉพาะ property ที่ animate และคง reduced-motion behavior |
| artwork มี palette หลายชุด | `src/components/course/CourseArtwork.tsx:9` | เก็บไว้ เป็น content artwork ไม่ใช่ application surface |
| certificate มีสีเฉพาะ artifact | ADR 0004 และ certificate module | เก็บไว้ เป็น accepted exception |

## Minimum change set

ลำดับนี้ตั้งใจให้รีวิวและ rollback ได้เป็นช่วงเล็ก ๆ:

1. **Shared public header seam** — ขยาย `PublicPageHeader` ด้วย constrained optional evidence/variant แล้ว migrate collection/support pages; ไม่แตะ course/article detail
2. **Account navigation contract** — normalize active/inactive/focus state และ icon โดยไม่เปลี่ยน routes หรือ authorization
3. **Feedback contract** — migrate custom empty/status/loading presentation ที่ซ้ำไปยัง `Empty`, `Alert`, `Skeleton`, `DialogShell` ตาม intent
4. **Token hygiene** — แทน raw application colors และ `transition-all`; ทำ allowlist สำหรับ media/artwork/certificate/brand marks
5. **Scoped dark surfaces** — ตั้งชื่อ player/evidence/media recipes ให้ raw palette ไม่แพร่ไป route ใหม่
6. **Contract verification** — ตรวจ public header variants, interaction states, Thai wrapping, 320/768/1024/1440 widths และ affected E2E journeys; ทดสอบ behavior ไม่ผูกกับ class ภายใน ยกเว้น token/variant ที่ประกาศเป็น contract ในตั๋วนี้

## Explicit non-goals

- ไม่เปลี่ยนโลโก้ สีหลัก ฟอนต์ radius หรือ shadcn preset
- ไม่เพิ่ม dark mode หรือ animation language ใหม่
- ไม่ทำให้ Home, commerce, learning และ status ใช้ layout เดียวกัน
- ไม่เปลี่ยน information architecture, copy journey, auth, enrollment หรือ payment behavior
- ไม่ปรับ route-specific artwork ให้กลายเป็นสีเดียวกัน

## Owner reaction requested

โปรดตรวจ 3 จุดนี้ก่อนอนุมัติ:

1. เห็นด้วยหรือไม่ว่า `PublicPageHeader` ควรเป็น canonical seam ของ collection/support pages
2. เห็นด้วยหรือไม่กับหลัก “หนึ่ง dominant surface + หนึ่ง primary action ต่อ region”
3. มี dark/artwork surface ใดที่ควรถือเป็นข้อยกเว้นเพิ่มหรือตัดออกจากรายการนี้
