# MilerDev Design System

Design system สำหรับ redesign เว็บ MilerDev ให้เป็น LMS สอนเขียนโค้ดที่ดูสะอาด น่าเชื่อถือ ใช้งานง่าย และมีคาแรกเตอร์ของโรงเรียนออนไลน์สาย developer โดยใช้ธีมหลักฟ้า-ขาว สีหลัก `#02abff`

## Design Direction

MilerDev ควรรู้สึกเหมือน "coding studio ที่เปิดไฟสว่าง" ไม่ใช่เว็บคอร์สที่เต็มไปด้วยกล่อง marketing ทั่วไป จุดยืนภาพรวมคือ precise, calm, technical, friendly

- สว่าง อ่านง่าย เหมาะกับการเรียนต่อเนื่องนานๆ
- ใช้สีฟ้าเป็นสัญญาณของ action, progress, focus และ trust
- UI ต้องให้ความรู้สึกเป็น product มากกว่า landing page
- หน้าเรียนต้องลดสิ่งรบกวน เหลือแค่ video, lesson content, progress และ next action
- หน้า admin/dashboard ต้อง dense แต่ไม่รก เหมาะกับการ scan ข้อมูลซ้ำๆ

## Brand Personality

- ชัดเจน: อธิบายง่าย ตัดสินใจได้เร็ว
- มืออาชีพ: spacing, alignment, state และ copy ต้องนิ่ง
- เป็นมิตร: ภาษาไทยธรรมชาติ ปุ่ม/empty state ไม่แข็ง
- Developer-native: ใช้ code surface, monospace, terminal cue และ progress pattern อย่างพอดี

## Color System

### Core Tokens

```css
:root {
  --color-brand: #02abff;
  --color-brand-50: #eefaff;
  --color-brand-100: #d8f3ff;
  --color-brand-200: #ace7ff;
  --color-brand-300: #73d7ff;
  --color-brand-400: #2fc2ff;
  --color-brand-500: #02abff;
  --color-brand-600: #0089d6;
  --color-brand-700: #006dab;
  --color-brand-800: #075b8d;
  --color-brand-900: #0b4c75;

  --color-ink: #102033;
  --color-ink-soft: #34465c;
  --color-muted: #64758b;
  --color-subtle: #91a1b5;

  --color-canvas: #ffffff;
  --color-surface: #f7fbff;
  --color-surface-raised: #ffffff;
  --color-line: #dbe8f2;
  --color-line-strong: #bed3e3;

  --color-success: #11a66a;
  --color-warning: #f5a524;
  --color-danger: #e5484d;
  --color-info: #02abff;

  --color-code-bg: #0b1220;
  --color-code-panel: #111a2e;
  --color-code-line: #22314d;
  --color-code-text: #d8e6f7;
}
```

### Usage Rules

- `#02abff` ใช้กับ primary button, active navigation, progress, selected tab, focus ring และ link สำคัญ
- หลีกเลี่ยงการใช้ฟ้าเต็มพื้นใหญ่ทั้งหน้า ให้ใช้เป็น accent บนพื้นขาว/ฟ้าอ่อน
- ใช้ `--color-ink` สำหรับ heading และข้อความสำคัญ ไม่ใช้ดำสนิท
- ใช้ dark code surface เฉพาะส่วนที่เกี่ยวกับ coding เช่น editor mockup, code block, terminal, lesson examples
- สี promo/discount ใช้ amber หรือ magenta อย่างจำกัด ไม่ใช้ม่วงเป็นสีรองหลักของเว็บ

### Page Backgrounds

- Public pages: `#ffffff` ผสม section band `#f7fbff`
- Dashboard: `#f6f9fc`
- Learning page: video area ใช้ dark navy, sidebar/content ใช้ white หรือ near-white
- Admin: neutral operational background `#f5f8fb` พร้อม accent ฟ้าเฉพาะ state/action

## Typography

ระบบปัจจุบันใช้ `Noto Sans Thai` และ `Inter` อยู่แล้ว สามารถใช้ต่อได้เพื่อความเข้ากันกับ Next font setup

```css
--font-display: var(--font-inter), var(--font-noto-thai), sans-serif;
--font-body: var(--font-noto-thai), var(--font-inter), sans-serif;
--font-code: "Fira Code", "JetBrains Mono", "Cascadia Code", monospace;
```

### Type Scale

| Token | Size | Line height | Usage |
| --- | ---: | ---: | --- |
| Display XL | 56 | 1.12 | Home hero only |
| Display L | 44 | 1.16 | Page hero |
| H1 | 36 | 1.22 | Page title |
| H2 | 28 | 1.28 | Section title |
| H3 | 22 | 1.35 | Card group / course title |
| Body L | 18 | 1.75 | Hero/supporting copy |
| Body | 16 | 1.75 | Default Thai body |
| Body S | 14 | 1.65 | Meta, helper text |
| Caption | 12 | 1.5 | Badge, table meta |

### Thai Text Rules

- Body ภาษาไทยควร line-height `1.7-1.8`
- Heading ภาษาไทยใช้ line-height อย่างน้อย `1.25` เพื่อกันสระ/วรรณยุกต์ชน
- ห้ามใช้ negative letter-spacing กับ body ไทย
- จำกัดความกว้าง paragraph ที่ `64-72ch` หรือประมาณ `680px`

## Spacing & Layout

### Spacing Scale

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
```

### Containers

- Main container: `max-width: 1200px`
- Wide product container: `max-width: 1320px`
- Reading container: `max-width: 760px`
- Learn page content: video/content flexible + lesson sidebar `340-380px`

### Responsive Breakpoints

- Mobile: `< 640px`
- Tablet: `640-1023px`
- Desktop: `1024-1279px`
- Wide: `>= 1280px`

## Radius, Shadow, Border

ควบคุมความรู้สึกให้เป็น product UI ที่ crisp ไม่กลมจนเหมือน toy

```css
--radius-xs: 4px;
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--shadow-sm: 0 1px 2px rgba(16, 32, 51, 0.06);
--shadow-md: 0 8px 24px rgba(16, 32, 51, 0.08);
--shadow-lg: 0 20px 48px rgba(16, 32, 51, 0.12);
--focus-ring: 0 0 0 3px rgba(2, 171, 255, 0.28);
```

- Buttons, inputs, tabs: `8px`
- Cards: `8-12px`
- Modal/dropdown: `12px`
- Thumbnail/media: `12px`
- ใช้ border ก่อน shadow สำหรับ UI ทั่วไป ใช้ shadow เฉพาะ raised/overlay/hover

## Component System

### Buttons

Primary button:

- Background `#02abff`, hover `#0089d6`
- Text white, weight `600`
- Height `40px` small, `48px` default, `56px` large
- Radius `8px`
- Focus ring ต้องชัด

Secondary button:

- White background, border `--color-line`
- Text `--color-ink`
- Hover background `--color-brand-50`

Ghost button:

- Transparent, text muted/ink
- ใช้ใน navbar, table action, toolbar

Danger button:

- ใช้เฉพาะ destructive action
- ไม่ใช้เป็น primary CTA ของ flow ปกติ

### Inputs

- Height default `44px`
- Border `--color-line`
- Focus border `--color-brand-500`, focus ring `--focus-ring`
- Label อยู่บน input เสมอ
- Error text สี danger พร้อมข้อความชัดเจน
- Search/filter inputs ในหน้า courses/admin ควรมี icon และ clear state

### Navigation

Navbar:

- Sticky top, white translucent เมื่อ scroll
- Active link ใช้ text ฟ้า + background `--color-brand-50`
- Login เป็น ghost/secondary, Register เป็น primary
- Mobile menu เป็น full-width panel ไม่ซ้อนหลาย card

User menu:

- Avatar + name + email
- แยก section ด้วย border
- Notification badge ใช้ danger red เฉพาะ unread count

### Course Card

Course card เป็น component สำคัญที่สุดใน catalog

- Aspect thumbnail `16:9`
- Title line clamp 2
- Description line clamp 2
- Meta row: lesson count, level/duration, instructor
- Price badge ชัด แต่ไม่บัง thumbnail สำคัญ
- Free course ใช้ success badge
- Promo ใช้ warning/magenta accent แบบจำกัด
- Hover ยกขึ้นเล็กน้อย `translateY(-2px)` และ border ฟ้าอ่อน

Recommended structure:

1. Thumbnail + status badge
2. Tags หรือ level
3. Course title
4. Short outcome
5. Meta row
6. Price + CTA affordance

### Lesson Player

หน้าเรียนต้องให้ความรู้สึก focus mode

- Header สูงไม่เกิน `56px`
- Video area ใช้ dark navy และไม่ใส่ decorative background
- Lesson content อยู่ใน readable container
- Sidebar บทเรียนใช้ progress state ชัดเจน: not started, current, completed, locked
- ปุ่ม next lesson เป็น primary, previous เป็น secondary
- Mobile sidebar เป็น sheet จากขวา พร้อม overlay

### Progress

- Progress bar background `--color-brand-100`
- Fill `--color-brand-500`
- Completed check ใช้ success
- Current lesson ใช้ฟ้า + left accent border
- Locked lesson ใช้ muted icon/state

### Dashboard Cards

- ใช้สำหรับ repeated items เท่านั้น เช่น enrolled course, certificate, payment item
- Dashboard summary ใช้ compact metric blocks มากกว่า decorative cards
- Metric มี label, value, change/status และ optional icon
- อย่าใช้ card ซ้อน card

### Admin UI

Admin ต้องเป็น operational tool:

- Sidebar fixed/ sticky
- Table first สำหรับ list-heavy pages
- Filters อยู่บน table เป็น toolbar เดียว
- Primary action อยู่ขวาบน
- Bulk action แสดงเมื่อเลือก item แล้วเท่านั้น
- Row action ใช้ icon/menu ลดความรก
- Status badge ต้องมีสี semantic และ label ที่อ่านออก

### Rich Content & Code

Blog/course content:

- Reading width `720-760px`
- Code block ใช้ dark surface
- Inline code ใช้ `--color-brand-50` หรือ neutral code pill ไม่ใช้สีแดงจัดเป็น default
- Copy button อยู่มุมขวาบน และแสดงเมื่อ hover/focus
- Table ในบทความต้อง scroll แนวนอนได้บน mobile

## Page Patterns

### Home

First viewport ต้องสื่อว่า MilerDev คือเว็บเรียน coding ทันที

- Hero: headline + outcome + primary CTA + secondary CTA
- ด้านขวาใช้ code editor/course preview ที่เป็น product-specific visual
- แสดง course/recommendation section โผล่ให้เห็นใน first viewport
- ไม่ทำ hero เป็น marketing card ซ้ายขวาทั่วไป

### Courses Catalog

- Header compact พร้อม search/filter ชัด
- Course grid: mobile 1 column, tablet 2, desktop 3
- Filter chips ใช้ segmented/chip pattern
- Empty state แนะนำ action ต่อ เช่น reset filter

### Course Detail

- Hero มี thumbnail/video preview + course outcome + price/enroll CTA
- Sticky enroll summary บน desktop
- Curriculum แสดง lesson count/duration/progress
- Reviews และ FAQ อยู่หลัง curriculum
- CTA ซ้ำท้ายหน้าแบบ compact

### Learn Page

- Default เป็น focus mode
- Video/content ซ้าย, lesson playlist ขวา
- Progress บนสุดของ sidebar
- ปุ่ม complete/next อยู่ใกล้จุดจบบทเรียน
- Breadcrumb เล็กมากพอ ไม่แย่ง attention

### Dashboard

- Greeting + continue learning เป็น section แรก
- My courses เป็น list/grid ที่เห็น progress ชัด
- Certificates, payments, announcements เป็น secondary
- อย่าเริ่มด้วย metric cards ถ้าผู้เรียนกลับมาเพื่อเรียนต่อ

### Auth Pages

- Layout split ได้ แต่ form ต้องเป็นจุดสนใจ
- ใช้ social proof หรือ benefit สั้นๆ ได้
- Form width `400-440px`
- Error state อ่านง่าย ไม่ใช้ toast อย่างเดียว

## Motion

- Duration: `120ms` สำหรับ hover, `180ms` สำหรับ dropdown, `240ms` สำหรับ sheet/modal
- Easing: `cubic-bezier(.2,.8,.2,1)`
- Page reveal ใช้เฉพาะหน้า marketing/public
- Dashboard/admin ลด motion เหลือ state transition
- เคารพ `prefers-reduced-motion`

## Accessibility

- Text contrast ผ่าน WCAG AA
- Focus state ต้องเห็นทุก interactive element
- ปุ่ม icon-only ต้องมี `aria-label`
- Form field ต้องมี label จริง
- Error ไม่พึ่งสีอย่างเดียว
- Video/lesson content ต้องใช้ heading hierarchy ถูกต้อง
- Tap target อย่างน้อย `40x40px`

## Content Voice

ภาษาไทยควรตรงและเป็นมิตร

- CTA: "เริ่มเรียน", "ดูคอร์สทั้งหมด", "เรียนต่อ", "ไปบทถัดไป"
- Empty: "ยังไม่มีคอร์สที่ตรงกับตัวกรองนี้"
- Error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง"
- Success: "บันทึกเรียบร้อย"
- หลีกเลี่ยงคำฟุ่มเฟือย เช่น "สุดยอด", "เปลี่ยนชีวิต", "ครบจบในที่เดียว" ถ้าไม่มีหลักฐานรองรับ

## Implementation Guidance

### Phase 1: Tokens

1. ปรับ `src/app/globals.css` ให้ token หลักใช้ `#02abff`
2. เพิ่ม utility class สำหรับ button, input, card, badge, surface
3. ลดการ hard-code สี `#2563eb`, `#3b82f6` ใน component ใหม่

### Phase 2: Shell

1. Redesign `Navbar`, `Footer`, `PageHeader`
2. สร้าง shared primitives เช่น `Button`, `Input`, `Badge`, `Card`, `Tabs`
3. ทำ active/focus/disabled state ให้ครบ

### Phase 3: LMS Core

1. Redesign `CourseCard`
2. Redesign courses catalog และ course detail
3. Redesign learn page ให้เป็น focus mode
4. ปรับ rich content/code block ให้ consistent

### Phase 4: Product Surfaces

1. Dashboard: continue learning first
2. Certificates/payment/settings
3. Admin table/forms/filter toolbars

## CSS Starter

ใช้เป็นจุดเริ่มต้นเมื่อลงมือ refactor `globals.css`

```css
:root {
  --brand: #02abff;
  --brand-hover: #0089d6;
  --brand-soft: #eefaff;
  --ink: #102033;
  --muted: #64758b;
  --canvas: #ffffff;
  --surface: #f7fbff;
  --line: #dbe8f2;
  --radius: 8px;
  --focus: 0 0 0 3px rgba(2, 171, 255, 0.28);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px;
  border-radius: var(--radius);
  font-weight: 600;
  line-height: 1;
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.btn-primary {
  color: #fff;
  background: var(--brand);
  border: 1px solid var(--brand);
}

.btn-primary:hover {
  background: var(--brand-hover);
  border-color: var(--brand-hover);
  transform: translateY(-1px);
}

.btn:focus-visible,
.input:focus-visible {
  outline: none;
  box-shadow: var(--focus);
}
```

## Design QA Checklist

- หน้าแรกเห็นชัดทันทีว่าเป็น LMS สอน coding
- สีหลัก `#02abff` ถูกใช้กับ action/progress/focus อย่างสม่ำเสมอ
- ไม่มี section ที่เป็น card ซ้อน card
- Course card อ่านชื่อ ราคา และจำนวนบทเรียนได้ภายใน 3 วินาที
- หน้าเรียนไม่มี visual noise รอบ video/content
- Mobile menu, sidebar และ table ใช้งานได้จริงบนจอเล็ก
- Focus state ใช้งาน keyboard ได้ครบ
- Thai text ไม่ชน ไม่แน่น และไม่ล้นปุ่ม
- Admin pages scan ข้อมูลได้เร็วกว่าเดิม
- Hard-coded inline styles ลดลงเมื่อ component ถูก refactor
