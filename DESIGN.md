# MilerDev Design System

ระบบออกแบบสำหรับ MilerDev coding learning studio ภาษาไทย

ทิศทางหลักคือ **Swiss Editorial + Minimal Modern + Developer-focused Dark/Light System**

เอกสารนี้เป็น visual และ interaction contract สำหรับการ redesign ทีละส่วน หากกฎในเอกสารนี้ขัดกับ [PRODUCT.md](PRODUCT.md) ให้แก้ให้กลับไปสอดคล้องกับ product job ก่อนเสมอ

## Design Direction

MilerDev ควรให้ความรู้สึกเหมือน coding studio ที่จัดวางอย่างเป็นระบบ มีความนิ่งแบบ Swiss editorial และมี visual language ของ developer tool เฉพาะในจุดที่ช่วยให้ผู้เรียนโฟกัส

### Swiss Editorial

- ใช้ grid, alignment, rhythm และ whitespace เป็นตัวสร้าง hierarchy
- ให้ typography และการจัดวางทำหน้าที่แทน decoration
- ใช้เส้นแบ่ง, section band, caption และ annotation อย่างมีเหตุผล
- ใช้ asymmetry ได้เมื่อช่วยนำสายตาหรือแสดงความสัมพันธ์ของ content
- ไม่ใช้เลข section marker หรือ eyebrow ซ้ำทุก section เป็นโครงสำเร็จรูป

### Minimal Modern

- ลดสิ่งที่ไม่ช่วยให้ผู้ใช้เข้าใจหรือทำ action
- ใช้ surface เท่าที่จำเป็น ไม่ซ้อน card หลายชั้น
- ขอบและเงาต้องมีหน้าที่แยกชั้นข้อมูล ไม่ใช่ใส่เพื่อความสวยอย่างเดียว
- component vocabulary ต้องคงที่ทั้งระบบ
- animation ใช้เพื่อบอก state หรือช่วย orientation ไม่ใช้เป็น choreography

### Developer-focused

- ใช้ code, editor, terminal, prompt และ progress เป็น signature motif เมื่อเกี่ยวข้องกับ task
- Dark surface ใช้กับ learning, video, code และ focus state
- Monospace ใช้กับ code และ technical metadata ไม่ใช้กับ body copy ทั้งเว็บ
- visual ต้องสะท้อนการสร้างของจริง ไม่ทำเป็น dashboard theater หรือ fake metric

## Surface Architecture

ระบบมี 4 surface และแต่ละ surface มี default mode ของตัวเอง

| Surface | Theme | Layout register | Priority |
| --- | --- | --- | --- |
| Public / Commerce | Light Editorial | wide grid, readable sections, clear CTA | outcome, discovery, trust |
| Learning / Code | Dark Focus | focus shell, video/content split, lesson rail | content, progress, next action |
| Dashboard | Light Product | compact modules, continue-learning first | resume, progress, status |
| Admin | Light Operational | sidebar, toolbar, table-first | scan, filter, mutate safely |

## Theme Architecture

ใช้ semantic tokens และให้ page/surface เป็นผู้เลือก mode ไม่ให้ component ผูกกับสีดิบ

แนวทาง implementation เป้าหมาย:

```html
<body data-theme="light" data-surface="public">
```

หน้าเรียนสามารถใช้:

```html
<body data-theme="dark" data-surface="learning">
```

ผู้เรียนสลับ `data-theme` ภายใน learning surface ได้ และ preference ต้องถูกจำไว้ใน scope ของผู้เรียน โดยไม่เปลี่ยน public หรือ admin ให้กลายเป็น dark ทั้งระบบ

## Token System

### Foundation Tokens

```css
:root {
  --font-ui: var(--font-ibm-plex-sans-thai), var(--font-inter), sans-serif;
  --font-body: var(--font-ibm-plex-sans-thai), var(--font-inter), sans-serif;
  --font-code: "Fira Code", "JetBrains Mono", "Cascadia Code", monospace;

  --brand-blue: #02abff;
  --brand-blue-strong: #0089d6;
  --brand-blue-deep: #006dab;
  --brand-blue-soft: #eaf8ff;
  --editorial-red: #d9573f;
  --developer-lime: #a9e768;
  --developer-cyan: #63d7d0;

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

  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  --shadow-sm: 0 1px 2px rgba(16, 32, 51, 0.06);
  --shadow-md: 0 8px 24px rgba(16, 32, 51, 0.08);
  --focus-ring: 0 0 0 3px rgba(2, 171, 255, 0.3);
}
```

### Light Editorial Tokens

Light is the default for public discovery and commerce. It is crisp, readable and restrained.

```css
[data-theme="light"] {
  --canvas: #ffffff;
  --surface: #f7f9fb;
  --surface-raised: #ffffff;
  --surface-subtle: #eef4f8;
  --ink: #111b27;
  --ink-soft: #34475a;
  --ink-muted: #64778a;
  --ink-subtle: #8798a8;
  --line: #d9e3ea;
  --line-strong: #b7c8d5;
  --accent: var(--brand-blue);
  --accent-strong: var(--brand-blue-strong);
  --accent-soft: var(--brand-blue-soft);
  --code-bg: #101a29;
  --code-panel: #172235;
  --code-text: #dcecf7;
  --code-line: #2a3d56;
}
```

### Dark Focus Tokens

Dark is the default for learning and code-oriented surfaces. It must remain readable for long sessions and must not rely on saturated decoration.

```css
[data-theme="dark"] {
  --canvas: #0b1220;
  --surface: #101a29;
  --surface-raised: #172235;
  --surface-subtle: #1c2a3d;
  --ink: #edf6fb;
  --ink-soft: #c8d9e5;
  --ink-muted: #9eb2c2;
  --ink-subtle: #71889a;
  --line: #2a3d52;
  --line-strong: #40576c;
  --accent: #63d7ff;
  --accent-strong: #a4e9ff;
  --accent-soft: #173b51;
  --code-bg: #070d16;
  --code-panel: #101a29;
  --code-text: #e4f4fb;
  --code-line: #263c53;
}
```

### Semantic Tokens

Semantic colors must stay distinct from theme colors and must be paired with text or icon labels.

```css
:root {
  --success: #087f5b;
  --success-soft: #e8f7f1;
  --warning: #9a6700;
  --warning-soft: #fff6d9;
  --danger: #b42318;
  --danger-soft: #ffebe9;
  --info: #075b8d;
  --info-soft: #e7f6ff;
}

[data-theme="dark"] {
  --success: #67e2ae;
  --success-soft: #153e32;
  --warning: #f4c66b;
  --warning-soft: #493615;
  --danger: #ff9b91;
  --danger-soft: #4a2323;
  --info: #8cddff;
  --info-soft: #173b51;
}
```

### Token Rules

- Primary blue ใช้กับ action, link สำคัญ, focus, selected state และ progress
- Editorial red ใช้เป็น annotation, editorial marker หรือ limited promo signal ไม่ใช้เป็นสีหลักของปุ่มทุกหน้า
- Developer lime และ cyan ใช้ใน code/learning context เท่านั้น
- ห้ามใช้ gradient text
- ห้ามทำพื้นหลังทั้งหน้าเป็น saturated brand color
- ห้ามผูก component กับสีดิบโดยตรงในไฟล์ใหม่
- ระหว่าง migration ให้รักษา alias ของ `--primary-*` ที่มีอยู่จนกว่าจะย้าย component ครบ

## Typography

### Font Roles

- `IBM Plex Sans Thai`: UI, headings, body และ Thai content
- `Inter`: Latin fallback และ numeric metadata
- `Fira Code` หรือ monospace ที่มีอยู่: code, terminal และ technical labels

ไม่เพิ่ม display font แยกโดยไม่มีเหตุผล เพราะ product UI ต้องนิ่งและอ่านง่าย

### Type Scale

| Role | Size | Line height | Use |
| --- | ---: | ---: | --- |
| Display | 56px max | 1.08-1.18 | public hero เท่านั้น |
| Page title | 36px | 1.2-1.3 | route title |
| Section title | 28px | 1.25-1.35 | section heading |
| Component title | 22px | 1.3-1.4 | course, panel, group |
| Body large | 18px | 1.7-1.8 | hero support, intro |
| Body | 16px | 1.7-1.8 | default Thai text |
| Body small | 14px | 1.6-1.7 | metadata, helper |
| Caption | 12px | 1.45-1.55 | table metadata, status |
| Code | 13-15px | 1.55-1.7 | code and terminal |

### Typography Rules

- ใช้ `text-wrap: balance` กับ h1-h3
- ใช้ `text-wrap: pretty` กับ prose ยาว
- ไม่ใช้ negative letter-spacing กับ body ภาษาไทย
- Display heading letter-spacing ไม่ต่ำกว่า `-0.04em`
- จำกัด prose width ประมาณ 65-75ch และ reading content อยู่ราว 720-760px
- ห้ามใช้ all caps กับประโยคยาว ใช้ได้เฉพาะ label สั้นหรือ technical metadata

## Grid and Layout

### Containers

- Main public container: max-width 1200px
- Wide product container: max-width 1320px
- Reading container: max-width 760px
- Learn content: flexible content area + lesson rail 320-380px
- Admin: full width ภายใน shell โดยมี side padding ที่คงที่

### Grid

- Desktop public ใช้ 12-column grid
- Catalog ใช้ `repeat(auto-fit, minmax(280px, 1fr))` เมื่อเหมาะสม
- Grid ใช้สำหรับความสัมพันธ์แบบ 2D, flex ใช้สำหรับ row, toolbar และ 1D alignment
- Section rhythm สร้างด้วย spacing และ band background ไม่ใช่ card ครอบทั้ง section
- จัด alignment ให้เส้นซ้ายของ heading, body และ action ช่วยสร้าง editorial rhythm

### Breakpoints

- Mobile: `< 640px`
- Tablet: `640-1023px`
- Desktop: `1024-1279px`
- Wide: `>= 1280px`

The public navbar uses a component-specific compact breakpoint at `<= 840px` because its three-zone rail needs more horizontal room than the base page grid. The desktop rail resumes at `841px`.

Responsive behavior ต้องเป็น structural composition:

- Navbar เปลี่ยนเป็น full-width mobile panel
- Public hero เปลี่ยนจาก text/visual split เป็น text แล้ว visual
- Course grid เปลี่ยน 1, 2 และ 3 columns ตามพื้นที่จริง
- Learn rail เปลี่ยนเป็น sheet หรือ drawer บน mobile
- Admin table ต้อง scroll แนวนอนหรือเปลี่ยนเป็น row summary ที่ยังเข้าถึง action ได้

## Page Shell

### Public Shell

- Sticky navbar พื้นขาวหรือ surface light ที่ไม่แย่งความสนใจ
- Logo และ navigation อยู่บน baseline เดียวกัน
- Active link ใช้ accent-soft และ accent text
- Login ใช้ secondary/ghost, register หรือ primary conversion ใช้ primary
- Footer แบ่ง content ตาม task และมี contact/support ที่ชัดเจน

#### Public Navbar Contract

- Swiss Rail composition with three desktop zones: brand lockup, text navigation, and auth actions.
- Public rail is 72px on desktop and 64px on mobile, with a full-width 1px line below.
- Default links are text-only. The active route uses accent text plus a 2px bottom rule, not a filled pill.
- Sign in is a quiet secondary action. Registration is the single solid accent CTA and never uses a gradient.
- The mobile state is a full-width panel below the rail, grouped with line separators and 44px controls. It scrolls within the viewport when account/admin links make the menu taller than the available screen.
- Public navigation has no theme toggle. Learning owns the theme control because the mode follows the learner's task.

### Learning Shell

- Header สูงไม่เกิน 56px
- Video และ lesson content เป็น visual priority
- Dark canvas ต่อเนื่องรอบ video/code เพื่อรักษา focus
- Lesson rail แสดง current, complete, locked และ progress อย่างสม่ำเสมอ
- Theme toggle อยู่ใน learning controls และไม่ซ่อนอยู่ใน settings ลึกเกินไป

#### Learning Navbar Contract

- Learning navigation is a separate 56px Developer Focus header, not a dark variant of the public navbar.
- The header exposes course and lesson context, progress, lesson rail controls, exit, and the persisted theme toggle.
- The learning root uses data-surface="learning" and defaults to data-theme="dark". Light mode changes the shell canvas, text, borders, and controls without changing code readability.
- Learning controls use the shared SVG icon vocabulary with accessible labels and titles; platform-dependent text glyphs are not used as control icons.

### Product Shell

- Dashboard มี continue learning เป็น section แรก
- Sidebar และ top bar ใช้ spacing ที่ dense กว่า public
- Primary action อยู่ตำแหน่งเดิมใน route category เดียวกัน
- Status และ progress อ่านได้โดยไม่ต้องเปิด modal

## Component Vocabulary

### Button

บทบาทหลัก:

- Primary: action สำคัญหนึ่งรายการต่อบริบท
- Secondary: action รองที่ยังสำคัญ
- Ghost: toolbar, nav และ low-emphasis action
- Danger: destructive action เท่านั้น

กฎ:

- min-height 40px, default 44-48px
- radius 8px, ไม่ใช้ radius ใหญ่กับ control
- primary ใช้ solid accent หรือ surface ที่มี contrast ชัด ไม่ใส่ gradient เป็น default
- ทุกปุ่มต้องมี hover, focus, disabled, loading state
- label ใช้ verb + object

### Input and Form

- label ต้องอยู่กับ field อย่างชัดเจน
- default height อย่างน้อย 44px
- focus ใช้ accent border และ focus ring
- error text อยู่ใกล้ field และบอกวิธีแก้
- loading state ต้องไม่ทำให้ผู้ใช้กดซ้ำ
- form ที่เกี่ยวกับ payment, upload และ admin ต้องมี confirmation/recovery ที่ชัดเจน

### Card and Surface

- ใช้ card เมื่อ item ต้องถูกแยกจากรายการหรือมี action ของตัวเอง
- ไม่ใช้ card ซ้อน card
- radius ของ card อยู่ราว 8-12px
- ใช้ border หรือ shadow เป็นหลัก ไม่จับคู่ border หนักกับ shadow กว้างเพื่อ decoration
- section ใช้ canvas/surface band และ whitespace เมื่อไม่จำเป็นต้องเป็น card

### CourseCard

CourseCard เป็น discovery component ที่สำคัญที่สุด ต้องอ่านได้ภายในเวลาไม่นาน:

1. thumbnail และ status
2. tag หรือ level เมื่อมีข้อมูลที่ช่วยตัดสินใจ
3. course title
4. outcome หรือ excerpt สั้น
5. lesson count และ instructor/meta
6. price และ action affordance

ห้ามให้ promo badge บังภาพหรือทำให้ราคาเดิม/ราคาใหม่อ่านสับสน

### CodePanel

- ใช้เฉพาะ content ที่เป็น code, terminal หรือ technical preview
- มี tab/title ที่สื่อ context
- code text ต้อง readable และมี contrast
- fixed height ใช้เมื่อจำเป็น พร้อม overflow ที่เข้าถึงได้
- copy action ต้องมี accessible label และ feedback หลัง copy

### Progress

- background ใช้ accent-soft หรือ surface-subtle
- fill ใช้ accent
- completed ใช้ success พร้อม icon/label
- current ใช้ accent และ state ที่อ่านได้โดยไม่พึ่งสีอย่างเดียว
- locked ใช้ muted state และอธิบายเหตุผลเมื่อจำเป็น

### Status

Status badge ต้องใช้ semantic role เดียวกันทั้ง public, dashboard และ admin:

- Draft
- Published
- Pending
- Verifying
- Completed
- Failed
- Refunded
- Archived

## Surface Patterns

### Homepage

First viewport ต้องสื่อสามเรื่อง:

1. MilerDev คือ coding learning studio
2. ผู้เรียนจะสร้างหรือทำอะไรได้
3. action ถัดไปคืออะไร

โครงสร้างเป้าหมาย:

- editorial hero: headline, outcome, primary CTA, secondary CTA และ product-specific code visual
- learning path หรือ recommendation ที่มี order จริง
- featured courses ที่ใช้ CourseCard อย่างมี rhythm
- trust หรือ proof ที่มีข้อมูลจริง ไม่สร้าง fake metrics
- final CTA ที่กระชับและไม่ซ้ำข้อความเดิม

ไม่ใช้ hero metric template, decorative blobs หรือ grid ของ marketing cards ที่เหมือนกันทั้งหมด

### Courses Catalog

- header compact พร้อม search และ filter
- filter อยู่ใน toolbar เดียวกันและมี clear state
- course grid จัดลำดับตาม relevance/intent ที่อธิบายได้
- empty state บอกว่าไม่พบอะไรและเสนอ action reset filter
- mobile ต้องเข้าถึง filter ได้โดยไม่ทำให้ content หาย

### Course Detail

- hero แสดง thumbnail/preview, outcome, level, instructor และ price
- enroll summary sticky บน desktop เมื่อไม่รบกวนการอ่าน
- curriculum เป็นแกนหลักก่อน reviews และ FAQ
- payment/enrollment status อยู่ใกล้ CTA และอ่านได้ทันที
- CTA ท้ายหน้ามีเฉพาะเมื่อช่วยให้ตัดสินใจต่อ ไม่ทำซ้ำทุก section

### Learn Page

- default เป็น Dark Focus
- video, lesson title, progress และ next action อยู่ใน visual hierarchy แรก
- sidebar มี progress และ state ของแต่ละ lesson
- content reading width ไม่กว้างเกินไป
- complete/next อยู่ใกล้จุดจบของ lesson
- mobile ใช้ lesson sheet จากด้านข้าง พร้อม overlay และ keyboard escape

### Dashboard

- เริ่มด้วย greeting และ continue learning
- my courses แสดง progress และ next lesson
- certificates, payments และ announcements เป็น secondary modules
- summary metric ใช้เฉพาะข้อมูลที่ช่วยตัดสินใจ ไม่ใช้เป็น decoration

### Admin

- sidebar หรือ top navigation ต้องคงที่ตาม admin shell
- page header มี title, context และ primary action
- filter toolbar อยู่เหนือ table
- bulk action แสดงเมื่อมี selection เท่านั้น
- row action ใช้ menu หรือ action group ที่สม่ำเสมอ
- destructive action มี confirmation และ feedback
- loading ใช้ skeleton/table placeholder ไม่ใช้ spinner กลางข้อมูลอย่างเดียว

## Interaction and Motion

- hover: ประมาณ 120-160ms
- dropdown: ประมาณ 180ms
- sheet/modal: ประมาณ 220-260ms
- easing: `cubic-bezier(.2, .8, .2, 1)`
- ไม่ animate layout properties หากไม่จำเป็น
- public อาจมี reveal เล็กน้อย แต่ content ต้องมองเห็นได้แม้ animation ไม่ทำงาน
- dashboard, admin และ learn ใช้ motion เพื่อ state transition ไม่ใช้ page-load choreography
- ทุก motion ต้องมี `prefers-reduced-motion` fallback

## Accessibility and Content Rules

- WCAG AA contrast เป็น baseline
- body Thai line-height ประมาณ 1.7-1.8
- ห้ามใช้สีเป็นข้อมูลเพียงอย่างเดียว
- focus-visible ต้องเห็นชัดในทุก interactive control
- icon-only control ต้องมี accessible label
- ใช้ semantic heading และ landmark
- long Thai labels ต้องไม่ล้นปุ่มหรือ table cell
- error ต้องบอกปัญหาและ next recovery action
- empty state ต้องสอนผู้ใช้ว่าควรทำอะไรต่อ

## Implementation Phases

### Phase 1: Foundation

- ย้าย global colors ไป semantic tokens
- ทำ light/dark theme contract
- ปรับ typography, spacing, grid และ focus rules
- ทำ Button, Input, Badge, Status, Surface และ shared layout primitives

### Phase 2: Shared Shell

- Redesign `Navbar`, `Footer`, page header และ responsive navigation
- ทำ public shell และ learning shell แยกจากกัน
- ลด inline style และ hard-coded visual values ในไฟล์ที่แตะ

### Phase 3: Public Discovery

- Homepage
- CourseCard
- Courses catalog
- Course detail และ bundle
- Checkout/status surfaces

### Phase 4: Learning and Learner Product

- Learn page
- LearnSidebar
- video/code panels
- progress และ next lesson
- dashboard, certificates, payments และ settings

### Phase 5: Operations

- admin shell
- table, filter, form และ status vocabulary
- course/lesson management
- payment, enrollment และ certificate workflows

ทุก phase ต้องผ่าน visual QA ที่ desktop, tablet และ mobile ก่อนเริ่ม phase ถัดไป

## Migration Rules

- `PRODUCT.md` และ `DESIGN.md` เป็น source of truth ของ direction ใหม่นี้
- ใช้ component และ icon system ที่มีอยู่ก่อนเพิ่ม dependency ใหม่
- รักษา data behavior, auth, payment และ enrollment behavior เดิม เว้นแต่มี design decision แยกต่างหาก
- เปลี่ยน visual system แบบเป็น phase ไม่ทำ big-bang rewrite ที่ทำให้ทุก route เสียพร้อมกัน
- เมื่อแก้ component ให้ย้าย hard-coded color ไป semantic token ในขอบเขตเดียวกัน
- รักษา alias ของ `--primary-*` ระหว่าง migration เพื่อไม่ทำให้หน้าเก่าพัง
- ไม่เขียนลง `.next`, `dist` หรือ build output โดยตรง

## Design QA Checklist

### Product clarity

- หน้าแรกบอกได้ทันทีว่า MilerDev สอนอะไรและผู้เรียนจะได้อะไร
- CourseCard อ่านชื่อ outcome ราคา และ lesson count ได้เร็ว
- ทุกหน้ามี primary next action ที่ชัด
- payment และ enrollment status ไม่คลุมเครือ

### Visual system

- Light public, dark learning และ light operational มีเหตุผลจาก task
- typography ใช้ family และ scale อย่างสม่ำเสมอ
- ไม่มี gradient text, decorative glassmorphism หรือ card nesting
- สี accent ใช้กับ action/focus/progress ไม่ใช่ decoration ทั่วไป
- Swiss grid และ alignment ชัดในทุก viewport

### Accessibility

- contrast ผ่าน WCAG AA
- keyboard focus เห็นชัด
- ทุก icon-only control มี label
- status ไม่พึ่งสีเพียงอย่างเดียว
- reduced motion ถูกเคารพ

### Responsive

- ไม่มีข้อความหรือปุ่มล้นบน mobile
- nav, filter, lesson rail และ table ใช้งานได้บนจอเล็ก
- heading ภาษาไทยไม่ชนและอ่านง่าย
- touch target ไม่เล็กเกินไป

### State coverage

- default, hover, focus, active และ disabled
- loading และ skeleton
- empty state พร้อม next action
- error state พร้อม recovery action
- long content, short content และ data ที่หายไปบางส่วน

### Engineering handoff

- targeted tests ยังผ่าน
- lint/build ผ่านเมื่อ phase มี code change
- ไม่มี console error ที่เกิดจากหน้าที่แก้
- ใช้ route และ component boundary ที่ดูแลต่อได้
