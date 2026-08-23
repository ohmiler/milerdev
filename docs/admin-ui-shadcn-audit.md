# Admin UI shadcn Audit and Implementation Plan

วันที่ตรวจ: 2026-08-23
สาขาที่ตรวจ: `feat/admin-ui-redesign`
สถานะ: Phase 1 เสร็จแล้วเมื่อ 2026-08-24; Phase 2–5 ยังไม่ได้ดำเนินการ

## สถานะการดำเนินงาน

### Phase 1: เสร็จแล้ว (2026-08-24)

- เปลี่ยน `TagSelector` เป็น searchable multi-select ด้วย shadcn `Popover + Command` พร้อม loading, empty, error, retry และ keyboard interaction
- เพิ่ม `popover` และ `command` ผ่าน shadcn พร้อมใช้ `Badge` สำหรับแท็กที่เลือก
- ทำ certificate color normalization ให้ schema, create/edit form และ API ใช้ canonical default `#2563eb`
- แยก draft/committed color state และ validate รูปแบบ `#RRGGBB`
- เพิ่ม URL normalization, preview fallback และ error recovery ให้ `ImageUpload`
- เพิ่ม targeted tests ใน `tests/lib/admin-media-inputs.test.ts` และ `tests/components/admin-media-inputs.test.tsx`
- generate และ review migration `drizzle/0014_green_epoch.sql` แล้ว แต่ยังไม่ได้ apply กับฐานข้อมูล

ผลตรวจหลังจบ Phase 1:

- `npm run lint`: ผ่าน
- `npm run test -- --run`: ผ่าน 80 files / 538 tests
- `npm run check:admin-text`: ผ่าน
- `npm run build`: ผ่าน
- `git diff --check`: ผ่าน โดยมีเฉพาะคำเตือน line ending LF → CRLF
- authenticated visual QA ผ่านสำหรับ `/admin/courses/new` และ `/admin/courses/[id]/edit` ที่ 1440×1000, 1024×768 และ 390×844
- color dialog, invalid hex state, image/tag empty state และ responsive layout แสดงผลถูกต้อง; mobile ไม่มี horizontal overflow และ browser console ไม่มี error

ข้อจำกัดที่ยังเหลือจาก Phase 1:

- ข้อมูล local ที่ใช้ visual QA ไม่มีแท็กและภาพปก จึงตรวจ interaction/fallback เหล่านี้ด้วย automated component tests แทน
- migration ยังไม่ถูก apply และไม่ได้ backfill ค่าเดิมในฐานข้อมูล; UI/API จะ normalize legacy value เมื่ออ่านหรือบันทึก
- ยังไม่ได้ commit, deploy หรือเปลี่ยน production data

## เป้าหมาย

เอกสารนี้เก็บผลตรวจ UI ฝั่ง admin หลังการย้ายมาใช้ shadcn/ui เพื่อให้ session ถัดไปสามารถ implement ต่อได้โดยไม่ต้องอาศัยประวัติแชต

ขอบเขตการตรวจ:

- `src/app/admin/**`
- `src/components/admin/**`
- `src/app/admin/admin-theme.css`
- shadcn project configuration และ components ที่ติดตั้ง
- static source analysis และภาพหน้าจอหน้า `/admin/courses/new`

ข้อจำกัดของ audit:

- Chrome runtime เปิดไม่ได้เนื่องจาก Windows sandbox ACL จึงยังไม่ได้ตรวจทุก route ผ่าน browser จริง
- Findings ด้าน interaction ที่อยู่นอกภาพต้องยืนยันด้วย visual QA หลังแก้
- ห้ามอ่านหรือแก้ `.env*`

## สรุปสถานะ migration

- มี admin `page.tsx` 27 หน้า
- 25 หน้า import shadcn component โดยตรง
- `/admin/analytics` เป็น redirect
- `/admin/courses/[id]/enrollments` เป็นหน้าเดียวที่ยังใช้ markup และ CSS เดิมเกือบทั้งหมด
- `admin-theme.css` มี 2,546 บรรทัด
- จากการเทียบ literal class token ใน admin TS/TSX พบ CSS token ที่ไม่ถูกใช้งาน 139 จาก 166 หรือประมาณ 83.7%
- พบ `<NativeSelect>` 32 จุด
- พบ `space-y-*` 42 จุด
- พบ native `<button>` 4 จุด
- ไม่พบการใช้ `Select`, `Tabs` หรือ `InputGroup` ใน admin
- มี `ToggleGroup` ใช้แล้วหนึ่งจุดในหน้า reconciliation
- `showToast` เป็น wrapper ของ Sonner อยู่แล้ว ไม่ถือเป็น legacy implementation

## Findings

### P1 (เสร็จแล้ว): TagSelector ใช้ component ไม่เหมาะกับ multi-select

ไฟล์สำคัญ:

- `src/components/admin/TagSelector.tsx:32`
- `src/components/admin/TagSelector.tsx:86`
- `src/components/ui/dropdown-menu.tsx:34`

อาการจากภาพ:

- เมนูเลือกแท็กลอยทับ section ถัดไป
- เมื่อไม่มีแท็ก จะเห็น floating surface กว้างเท่า trigger แต่มีข้อความเพียงบรรทัดเดียว
- shadow ทำให้ดูเหมือน layout ของการ์ดถัดไปเสีย

สาเหตุ:

- `TagSelector` ใช้ `DropdownMenu` ซึ่ง render content ผ่าน Portal และมี `z-50`
- content กว้างเท่า trigger ตาม implementation ของ `DropdownMenuContent`
- `DropdownMenu` เหมาะกับ action menu มากกว่าการเลือกข้อมูลหลายค่าที่อาจต้องค้นหา

บั๊กเพิ่มเติม:

- fetch `/api/admin/tags` ไม่ตรวจ `response.ok`
- error ถูกส่งเข้า `console.error` แล้ว UI แสดงเหมือนระบบไม่มีแท็ก
- loading, empty และ error state แยกจากกันไม่ได้
- `DropdownMenuCheckboxItem` ไม่ได้อยู่ใน `DropdownMenuGroup`
- ไม่มี search สำหรับรายการแท็กจำนวนมาก
- selected tag ทำเป็น `<span>` เองแทน semantic `Badge`

แนวทางแก้:

1. ถ้าต้องการไม่ให้ content ทับ section ถัดไป ให้ใช้ `Command` แบบ inline ภายใน collapsible panel
2. ถ้ายอมรับ floating popup ให้ใช้ searchable Combobox ด้วย `Popover + Command`
3. ติดตั้ง `popover` และ `command` ผ่าน shadcn ก่อนใช้ เพราะยังไม่มีในโปรเจกต์
4. เพิ่ม state `loading`, `error`, `empty`, `ready` แยกกัน
5. ตรวจ `response.ok` และแสดง `Alert` พร้อมปุ่มลองใหม่เมื่อโหลดไม่สำเร็จ
6. ใช้ `Badge` สำหรับแท็กที่เลือกและปุ่มนำออกที่มี accessible label
7. เพิ่ม component/integration test สำหรับ empty, API error, selection และ keyboard interaction

### P2: Compatibility CSS override shadcn ทุก admin route

ไฟล์สำคัญ:

- `src/app/admin/layout.tsx:6`
- `src/app/admin/layout.tsx:32`
- `src/app/admin/admin-theme.css:38`
- `src/app/admin/admin-theme.css:45`
- `src/app/admin/admin-theme.css:59`
- `src/app/admin/admin-theme.css:93`
- `src/app/admin/admin-theme.css:174`
- `tests/components/admin-operations-ui.test.tsx:167`

ปัญหา:

- `.admin-route-surface > *` บังคับ route root เป็น grid และกำหนด `gap: 24px`
- ล้าง `margin`, `padding` และ `max-width` ด้วย `!important`
- route ที่กำหนด `space-y-6` มีโอกาสได้ทั้ง margin spacing และ grid gap ทำให้ช่องว่างเป็นสองเท่า
- `mx-auto` และ `max-w-7xl` ที่หน้าแต่ละหน้าตั้งไว้ถูก override
- selector `:first-child:has(h1)` ล้าง background, border, radius และ shadow ของ header/card แรก
- selector ที่ค้นจาก inline style เช่น `[style*="box-shadow"]` และ `[style*="position: fixed"]` เปราะและอาจชน overlay/component ในอนาคต
- generic selectors สำหรับ table, label, button และ native form controls ครอบทุก route
- test ปัจจุบัน assert ว่า compatibility selectors เหล่านี้ต้องมี ทำให้ test ล็อก workaround ไว้แทนที่จะตรวจ behavior

แนวทางแก้:

1. ทำ visual baseline ของ route ตัวแทนก่อนแก้ CSS
2. ลบกฎ layout จาก `.admin-route-surface > *` และให้แต่ละหน้าเป็นเจ้าของ layout ของตัวเอง
3. ลบ heuristic selectors ที่อิง `:has()` และข้อความใน `style` attribute
4. ให้ shadcn components ควบคุม table, overlay, field และ button styling ผ่าน `data-slot`
5. ปรับ test ให้ตรวจ semantic behavior และ visual contract แทนการ assert selector workaround
6. ตรวจ desktop, tablet และ mobile หลังแต่ละชุดการเปลี่ยนแปลง

### P1 (เสร็จแล้ว): CertificateColorPicker รับค่าเริ่มต้นที่ไม่ใช่สีแบบ HTML color

ไฟล์สำคัญ:

- `src/app/admin/courses/new/page.tsx:39`
- `src/app/admin/courses/[id]/edit/page.tsx:54`
- `src/app/admin/courses/[id]/edit/page.tsx:80`
- `src/components/admin/CertificateColorPicker.tsx:31`
- `src/components/admin/CertificateColorPicker.tsx:46`
- `src/components/admin/CertificateColorPicker.tsx:89`
- `src/lib/db/schema.ts:73`
- `src/app/api/admin/courses/route.ts:69`

ปัญหา:

- create/edit form ใช้ค่าเริ่มต้น `var(--primary)`
- database default เป็น `blue`
- `<input type="color">` รับได้เฉพาะรูปแบบ `#rrggbb`
- browser อาจ fallback เป็น `#000000` ทำให้ picker และ preview ไม่ตรงกัน
- text field อนุญาตให้ state เป็นค่า hex ที่ยังไม่ครบ เช่น `#2` ระหว่างพิมพ์
- create API fallback เป็น `#2563eb` แต่ fallback ไม่ทำงานเมื่อ form ส่ง `var(--primary)` ที่เป็น non-empty string

แนวทางแก้:

1. กำหนด canonical default เป็น hex เช่น `#2563eb` ให้ตรงกันทั้ง schema, form และ API
2. เพิ่ม helper normalize legacy values เช่น `blue` และ `var(--primary)`
3. แยก draft text state ออกจาก committed color
4. commit ค่าใหม่เมื่อครบ `^#[0-9A-Fa-f]{6}$` เท่านั้น
5. เพิ่ม test สำหรับ legacy value, invalid value, preset และ native color input
6. ถ้าต้องแก้ schema default ให้ generate และ review migration ก่อน และถามผู้ใช้ก่อนทำ destructive data operation

### P2: หน้า course enrollments ยังเป็น legacy ทั้งหน้า

ไฟล์สำคัญ:

- `src/app/admin/courses/[id]/enrollments/page.tsx:90`
- `src/app/admin/courses/[id]/enrollments/page.tsx:107`
- `src/app/admin/courses/[id]/enrollments/page.tsx:166`
- `src/app/admin/courses/[id]/enrollments/page.tsx:200`
- `src/app/admin/courses/[id]/enrollments/page.tsx:222`
- `src/app/admin/admin-theme.css:902`
- `src/app/admin/admin-theme.css:1177`

ส่วนที่ยังทำเอง:

- hero/header
- metric cards
- card/panel
- table
- progress bar
- status badge
- empty state
- pagination
- action links

บั๊กที่พบ:

- local variable `--muted` ถูกตั้งเป็น `var(--muted-foreground)`
- `.status.idle` ใช้ `var(--muted)` เป็นทั้ง background และ text color ทำให้ข้อความกลืนกับพื้นหลัง
- panel/pagination บางจุดใช้ `--muted` ในความหมาย background ทั้งที่ถูกเปลี่ยนให้เป็น foreground token
- `Math.max(1, parseInt(pageStr || '1'))` ให้ค่า `NaN` เมื่อ query เป็น `?page=abc` และค่าอาจไหลไปถึง database offset
- avatar URL ถูกส่งเข้า `next/image` โดยไม่ normalize

แนวทาง migrate:

- `AdminPageHeader`
- `AdminMetricCard`
- `Card`
- `Table`
- `Progress`
- `Badge` หรือ `AdminStatusBadge`
- `Pagination`
- `Button asChild`
- `Empty`

ต้อง sanitize page query ด้วย `Number.isFinite`, clamp ให้อยู่ในช่วง และกำหนด fallback เป็นหน้า 1

### P2: DraggableLessonList ยังเป็น hybrid component ขนาดใหญ่

ไฟล์สำคัญ:

- `src/components/admin/DraggableLessonList.tsx:320`
- `src/components/admin/DraggableLessonList.tsx:346`
- `src/components/admin/DraggableLessonList.tsx:360`
- `src/components/admin/DraggableLessonList.tsx:388`
- `src/components/admin/DraggableLessonList.tsx:444`

ปัญหา:

- มี `<style jsx>` สองชุด
- global style ชุดหลักยาวประมาณบรรทัด 444–853
- filter tabs ใช้ native `<button>`
- มี progress, badge, empty state และ row/card styling ทำเอง
- container ใช้ `role="tablist"` แต่ child ใช้ `aria-pressed` โดยไม่มี `role="tab"` และ `aria-selected`

แนวทางแก้:

- ใช้ `ToggleGroup` สำหรับ filter ที่เป็น mutually exclusive หรือใช้ `Tabs` หากเป็น tab panel จริง
- ใช้ `Progress`, `Badge`, `Empty`, `Button` และ `Field`
- เก็บ inline style เฉพาะค่าที่เป็น dynamic จริง เช่น progress width หรือ dnd transform
- ย้าย layout จาก embedded global CSS ไป Tailwind composition ใน JSX
- ทดสอบ keyboard sorting/filtering และ drag behavior หลัง refactor

### P1 (เสร็จแล้ว): ImageUpload อาจพังเมื่อเปิดข้อมูล URL เก่า

ไฟล์สำคัญ:

- `src/components/admin/ImageUpload.tsx:25`
- `src/components/admin/ImageUpload.tsx:81`
- `src/components/admin/ImageUpload.tsx:84`

ปัญหา:

- `next/image` รับ `value` โดยตรง
- ไม่มี URL normalization
- ไม่มี `onError` หรือ fallback preview
- repository มีหลายจุดที่ต้องเติม `https://` หรือใช้ `normalizeUrl()` กับ thumbnail เดิม แสดงว่าข้อมูล bare-domain มีโอกาสมีอยู่จริง

แนวทางแก้:

1. ใช้ URL normalization helper เดียวกับหน้า public/admin list
2. แสดง error state หาก URL parse หรือโหลดไม่ได้
3. อย่าให้ preview error ทำให้ทั้ง edit form render พัง
4. เพิ่ม test สำหรับ absolute URL, relative URL, bare hostname และ broken image

## shadcn composition debt ที่ยังเหลือ

รายการนี้ไม่ใช่ legacy CSS ทั้งหมด แต่ไม่ตรง pattern แนะนำของ shadcn ในโปรเจกต์นี้:

- เปลี่ยน predefined client-side dropdown ที่เหมาะสมจาก `NativeSelect` เป็น `Select`
- ใช้ `InputGroup` กับ slug prefix, search icon และ password action
- แทน `space-y-*` ด้วย `flex/grid + gap` โดยเฉพาะ route root ที่โดน compatibility grid gap
- ใช้ `Tabs` หรือ `ToggleGroup` ใน `src/app/admin/reports/page.tsx:269`
- ใช้ `Tabs` หรือ `ToggleGroup` ใน `src/app/admin/settings/page.tsx:117`
- ใส่ `data-icon` ให้ Lucide icons ภายใน Button และไม่กำหนด icon size ซ้ำเมื่อ Button จัดให้แล้ว
- ใช้ `DropdownMenuGroup` เมื่อยังมี dropdown menu ที่ประกอบด้วย item groups

ข้อสังเกต:

- `NativeSelect` เป็น shadcn component จึงไม่ควรถูกเรียกว่า CSS เก่า แต่ควรเปลี่ยนเฉพาะจุดที่ต้องการ rich client interaction
- editor content CSS ของ TipTap อาจจำเป็น ไม่ควรลบทิ้งแบบเหมารวม
- dynamic inline styles สำหรับ progress width, dnd transform และสี preview สามารถเก็บไว้ได้เมื่อเป็นค่าจาก runtime จริง

## Dead CSS ที่ตรวจพบ

class groups ต่อไปนี้ไม่พบการใช้งานใน admin TS/TSX ปัจจุบัน:

- `.new-course-*`: 41 token
- `.admin-edit-course-*`: 30 token
- `.admin-edit-lesson-*`: 20 token
- `.admin-lesson-*` ของหน้า course lesson รุ่นเก่า: 21 token
- `.admin-users-*` และ `.admin-user-*`: 15 token

ตำแหน่ง block โดยประมาณใน `src/app/admin/admin-theme.css`:

- users compatibility block: บรรทัด 281–461
- course edit block: บรรทัด 462–901
- course enrollments block ซึ่งยัง active: บรรทัด 902–1279
- new course block: บรรทัด 1280–1733
- lesson edit block: บรรทัด 1734–2159
- course lessons page block: บรรทัด 2160–2546

อย่าลบ `.admin-course-enrollments-*` ก่อน migrate หน้า course enrollments เพราะทั้ง 15 class ยังใช้งานจริง

ก่อนลบ CSS ให้ค้นซ้ำทั้ง static class และ class ที่ประกอบแบบ dynamic และทำ visual regression check

## ช่องว่างในการทดสอบ

เพิ่ม targeted automated tests แล้วสำหรับ:

- `TagSelector`
- `CertificateColorPicker`
- `ImageUpload`

ยังไม่พบ targeted automated tests สำหรับ:

- `DraggableLessonList`
- `/admin/courses/[id]/enrollments`

`tests/components/admin-operations-ui.test.tsx` ตรวจ source literals และ visual tokens เป็นหลัก จึงไม่จับ:

- dropdown overlay
- loading/error/empty state ที่แยกไม่ออก
- invalid color input value
- broken image preview
- keyboard semantics ของ tablist
- responsive layout regression

## Implementation phases

### Phase 1: Direct user-facing bugs — เสร็จแล้ว 2026-08-24

- [x] แก้ `TagSelector`
- [x] แก้ certificate color normalization
- [x] แก้ ImageUpload URL/error handling
- [x] เพิ่ม tests เฉพาะ component เหล่านี้

### Phase 2: Remove cross-route CSS risk — ขั้นตอนถัดไป

- ทำ route visual baseline
- ลด `.admin-route-surface` ให้เหลือเฉพาะ width/shell responsibility ที่จำเป็น
- ลบ `!important` และ heuristic selectors
- ปรับ source-literal tests ที่ล็อก compatibility selectors

### Phase 3: Migrate remaining legacy route

- ย้าย `/admin/courses/[id]/enrollments` ไปใช้ shadcn/admin operations components
- แก้ pagination parsing, muted token collision และ avatar normalization
- ลบ `.admin-course-enrollments-*` เมื่อ migration และ tests ผ่านแล้ว

### Phase 4: Refactor hybrid shared components

- migrate `DraggableLessonList`
- migrate manual tab bars ใน Reports และ Settings
- เปลี่ยน `NativeSelect` เป็น `Select` เฉพาะจุดที่เหมาะสม
- ใช้ `InputGroup` ใน compound inputs

### Phase 5: Cleanup and visual verification

- ลบ dead CSS blocks
- รัน visual QA ทุก breakpoint
- ตรวจ keyboard navigation และ focus state
- ตรวจ dark/light theme หากระบบรองรับ

## Verification checklist

หลังแต่ละ phase ให้รัน narrowest meaningful test ก่อน จากนั้นก่อน handoff ให้รันเมื่อ practical:

```text
npm run lint
npm run test -- --run
npm run check:admin-text
npm run build
git diff --check
git status --short
```

Visual routes อย่างน้อย:

- `/admin`
- `/admin/courses`
- `/admin/courses/new`
- `/admin/courses/[id]/edit`
- `/admin/courses/[id]/lessons`
- `/admin/courses/[id]/enrollments`
- `/admin/users`
- `/admin/payments`
- `/admin/reports`
- `/admin/settings`

ตรวจที่ desktop, tablet และ mobile โดยเฉพาะ:

- overlay/collision
- double spacing
- max-width
- sticky sidebar/card
- table overflow
- dialog height
- focus ring
- empty/error/loading states

## Safety constraints

- รักษา authorization, validation, lifecycle และ payment behavior เดิม
- ห้ามเปลี่ยน enrollment/payment state จากงาน UI
- ห้ามเข้าถึง production data
- schema change ต้อง update `schema.ts`, generate migration และ review migration
- ต้องถามผู้ใช้ก่อน destructive schema/data operation
- รักษาข้อความภาษาไทยเป็น UTF-8 และรัน `npm run check:admin-text`
- ห้ามลบ CSS block จนกว่าหน้า/component ที่ใช้งานจะ migrate และผ่าน visual QA
- อย่า commit, push, merge หรือ deploy จนกว่าผู้ใช้จะสั่งโดยตรง

## Prompt สำหรับเริ่มงานรอบหน้า

ใช้ข้อความนี้ได้ทันที:

> อ่าน `docs/admin-ui-shadcn-audit.md` ให้ครบ แล้ว implement ต่อจาก Phase 2 โดยใช้ `$shadcn` รักษา behavior และ authorization เดิม เพิ่ม tests ตาม findings และหยุดสรุปผลหลังแต่ละ phase พร้อมรายงานไฟล์ที่เปลี่ยน checks ที่รัน และความเสี่ยงที่ยังเหลือ ห้าม commit หรือ deploy
