# User UI strict shadcn re-audit and migration plan

- วันที่ตรวจ baseline: 2026-08-26
- สถานะ: Complete; authenticated browser QA ผ่านแล้ว
- ขอบเขต: ทุก user-facing route และ shared component นอก `src/app/admin/**` และ `src/components/admin/**`
- Project UI context: Next.js App Router, RSC, Tailwind CSS v4, `radix-maia`, Radix base, Lucide icons
- Related decisions: ADR 0001, ADR 0002, ADR 0003 และ ADR 0004

## เหตุผลของเอกสารนี้

ADR 0004 บันทึกว่าการย้าย non-admin UI รอบก่อนเสร็จแล้วในความหมายของ route-level redesign, CSS Module removal และการเริ่มใช้ source-owned shadcn primitives อย่างไรก็ตาม current-state audit ภายใต้กติกา shadcn ที่เข้มขึ้นพบว่า implementation ฝั่ง user ยังมี composition debt จำนวนมาก เช่น raw interactive controls, custom form wrappers, inline CSS, custom menu/toast/empty state และการ override primitive styling ด้วย raw palette

เอกสารนี้ไม่ยกเลิก ADR 0004 แต่เป็น re-audit ของ source ปัจจุบัน และเป็น execution checklist สำหรับย้ายจาก “ใช้ shadcn บางส่วน” ไปเป็น “shadcn-first composition อย่างเคร่งครัด”

## เป้าหมาย

1. UI control ที่ผู้ใช้โต้ตอบได้ต้องใช้ shadcn primitive เมื่อมี primitive ที่เหมาะสม
2. Forms ใช้ `FieldGroup`, `Field`, `FieldLabel`, `FieldDescription` และ `InputGroup` ตามโครงสร้างมาตรฐาน
3. Loading, empty, error, success, pending และ status states ใช้ `Skeleton`, `Empty`, `Alert`, `Spinner`, `Badge` และ Sonner
4. Navigation, menus, dialogs, sheets และ popovers ใช้ accessible primitives แทน manual focus/outside-click/overlay behavior
5. Component styling ใช้ built-in variants และ semantic tokens ก่อน raw class overrides
6. Payment, authentication, authorization, enrollment, coupon, upload และ notification behavior เดิมต้องไม่เปลี่ยน
7. ลบ dead legacy CSS/component หลัง consumer ทั้งหมดถูกย้ายแล้ว

## ขอบเขตที่ไม่แก้ความหมายทางธุรกิจ

- ไม่เปลี่ยน API endpoint หรือ request payload ของ payment/enrollment flows
- ไม่เปลี่ยนเงื่อนไข grant enrollment
- ไม่เปลี่ยน Stripe, PromptPay, SlipOK หรือ webhook trust boundary
- ไม่เปลี่ยน server authorization/session checks
- ไม่เปลี่ยน schema หรือ migration
- ไม่อ่านหรือแก้ `.env*`
- ไม่เปลี่ยน Home information architecture ที่ ADR 0002 freeze ไว้

## Baseline metrics

ตรวจจาก user-facing TSX 115 ไฟล์ โดยตัด admin และ API routes ออก:

| Indicator | Baseline |
| --- | ---: |
| ไฟล์ที่ import shadcn โดยตรง | 68 |
| raw visible/native `<button>` | 55 จุดใน 19 ไฟล์ |
| raw `<input>` | 5 |
| raw `<select>` | 6 |
| raw `<label>` | 10 |
| ไฟล์ที่มี `<form>` | 9 |
| `Field` imports ใน user forms | 0 |
| `InputGroup` imports ใน user forms | 0 |
| `space-x-*` / `space-y-*` | 38 |
| raw Tailwind palette utilities | 132 |
| direct white/black utilities | 77 |
| arbitrary color/value utilities | 54 |
| `style={{ ... }}` | 29 |
| component-local `<style>` blocks | 3 |
| raw SVG | 32 จุดใน 14 ไฟล์ |
| `globals.css` | 977 บรรทัด |
| hex values ใน `globals.css` | 156 |
| `!important` ใน `globals.css` | 65 |

ตัวเลข raw color เป็น debt indicator ไม่ใช่คำสั่งให้แทนทุกสีแบบ mechanical เพราะ marketing artwork, code highlighting และ document/media surfaces มีข้อยกเว้นที่ระบุไว้ด้านล่าง

## Current-state audit หลัง migration

ตรวจซ้ำเมื่อ 2026-08-26 ด้วยขอบเขตเดียวกับ baseline:

| Indicator | Current state |
| --- | ---: |
| app-level raw visible `<button>` / `<select>` / `<label>` | 0 |
| raw `<input>` | 1 hidden query-state exception |
| actual forms | 10; ใช้ `Field` composition ครบ |
| `space-x-*` / `space-y-*` | 0 |
| `style={{ ... }}` | 3 accepted dynamic values |
| component-local `<style>` blocks | 0 |
| raw SVG | 6 brand icons ใน 3 ไฟล์ |
| `globals.css` | 660 บรรทัด |

Native `<input>`/`<select>` ภายใน source-owned shadcn primitives ไม่ถูกนับเป็น application debt. Inline styles ที่เหลือคือ reading progress width, Radix progress transform และ ToggleGroup gap variable. Raw SVG ทั้งหมดที่เหลือคือ Google, Facebook, X, LINE และ YouTube brand marks.

## Findings และ migration target

### P0 — Shared navigation, notification และ announcement

ไฟล์หลัก:

- `src/components/layout/PublicNavbar.tsx`
- `src/components/layout/NavbarUserMenu.tsx`
- `src/components/layout/MobileNavPanel.tsx`
- `src/components/layout/navigation-config.tsx`
- `src/components/notifications/NotificationProvider.tsx`
- `src/components/layout/AnnouncementBanner.tsx`

Baseline findings:

- `PublicNavbar` มี component-local style block ประมาณ 69 บรรทัด
- desktop user menu และ notification panel เขียน trigger, outside-click, Escape, focus move/restore, positioning และ overlay styling เอง
- notification badge, notification empty state และ avatar fallback เป็น custom markup
- `NotificationProvider` มี custom toast stack, `zIndex: 9999`, raw hex, timer state และ custom keyframe ทั้งที่ root layout render Sonner แล้ว
- `AnnouncementBanner` ใช้ raw color map, inline layout styles และ raw dismiss button
- mobile menu ใช้ Sheet แล้ว แต่ links, separator, avatar และ logout action ยังเป็น custom primitives

Migration target:

- `DropdownMenu` สำหรับ user actions
- `Popover` สำหรับ notification inbox
- `Avatar` + `AvatarImage` + `AvatarFallback`
- `Badge` สำหรับ unread count/status
- `Empty` สำหรับไม่มี notification
- `Button` สำหรับ triggers/actions
- `Separator` สำหรับ menu boundaries
- Sonner สำหรับ realtime notification toast
- `Alert` สำหรับ announcement
- ลบ component-local style block และ manual focus/outside-click logic ที่ primitive เป็นเจ้าของ

### P0 — Forms, authentication และ account settings

Actual form files:

- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`
- `src/components/contact/ContactForm.tsx`
- `src/app/profile/ProfileForm.tsx`
- `src/components/settings/ChangePasswordForm.tsx`
- `src/components/course/CourseCatalogFilters.tsx`
- `src/app/blog/page.tsx`

Legacy abstractions:

- `src/components/ui/FormControls.tsx`
- `src/components/auth/AuthFormLayout.tsx`
- `src/components/account/learner-account-styles.ts`

Baseline findings:

- Forms ไม่ใช้ `FieldGroup`/`Field`
- `AuthField` เป็น raw `div + Label`
- password action ใช้ raw absolute-position button
- `FormButton` เพิ่ม custom `pending` API และใช้ `LoaderCircle` แทน `Spinner`
- validation ไม่ได้วาง `data-invalid` ที่ `Field`
- success/error messages หลายจุดเป็น styled paragraphs
- account loading, empty, retry, status badge และ record surfaces ถูกจำลองด้วย style-string registry

Migration target:

- ทุก form ใช้ `FieldGroup` + `Field`
- password/search compound controls ใช้ `InputGroup`
- validation ใช้ `data-invalid` และ `aria-invalid` คู่กัน
- pending action ใช้ `Button` + `Spinner data-icon="inline-start"`
- feedback ใช้ `Alert`
- account status ใช้ `Badge`
- account loading/empty ใช้ `Skeleton`/`Empty`
- ลบ `FormControls.tsx` และ `learner-account-styles.ts` เมื่อไม่มี consumer

Accepted native-input exceptions:

- hidden honeypot field
- hidden query-state field
- file input ที่ยังคง native semantics แต่ต้องประกอบภายใน shadcn `Field`

### P0 — Course and bundle commerce

ไฟล์หลัก:

- `src/components/course/EnrollButton.tsx`
- `src/components/bundle/BundleEnrollButton.tsx`
- `src/components/ui/DialogShell.tsx`
- `src/components/ui/Modal.tsx`

Baseline findings:

- Course/Bundle enrollment มี raw buttons รวม 22 จุด
- ทั้งสองไฟล์มี style maps ที่จำลอง Button, payment-method card, coupon input, file upload, bank information, feedback panel และ spinner
- ใช้ `buttonVariants()` เป็น class ของ raw `<button>`/`Link` แทน `<Button>`
- payment method choice เป็น custom clickable cards
- `DialogShell` อนุญาต optional title ทั้งที่ Dialog ต้องมี `DialogTitle`
- wrapper สร้าง portal ซ้ำเหนือ primitive และมี custom tone/raw palette behavior

Migration target:

- ใช้ `Dialog` composition หรือ thin domain wrapper ที่บังคับ title
- ใช้ `Button`, `Spinner`, `Field`, `InputGroup`, `Alert`, `Card` และ `ToggleGroup`
- รวมเฉพาะ reusable presentation ระหว่าง course/bundle; business logic และ endpoint contracts แยกตาม flow เดิม
- preserve `COURSE_PAYMENT_CONTRACT` และ `BUNDLE_PAYMENT_CONTRACT`
- preserve allowed slip MIME types, 5 MB limit, payment ID field และ provider-specific endpoints

### P1 — Reviews and catalog filters

ไฟล์หลัก:

- `src/components/course/CourseReviews.tsx`
- `src/components/course/CourseCatalogFilters.tsx`
- `src/components/course/CourseFilters.tsx`

Baseline findings:

- Reviews มี raw buttons 7 จุด, raw select/labels, custom avatar, verified badge, empty state, success state, rating progress และ pagination
- Catalog filters มี raw selects 3 จุด, custom select class, `space-y-*` และ absolute search icon
- `CourseFilters.tsx` ไม่มี production consumer เป็น dead legacy component

Migration target:

- Reviews ใช้ `Button`, `Select`, `Field`, `Avatar`, `Badge`, `Empty`, `Alert`, `Progress`, `Pagination`
- Catalog GET form ใช้ `NativeSelect`, `FieldGroup`, `Field`, `InputGroup`
- ลบ `CourseFilters.tsx`

### P1 — Home and public marketing surfaces

ไฟล์หลัก:

- `src/app/page.tsx`
- `src/components/home/AffiliateBannerCarousel.tsx`
- `src/components/home/StudioProofSection.tsx`
- public support/editorial/catalog pages

Baseline findings:

- Home ใช้ shadcn `Button`/`Card` แล้ว แต่ override color, typography, radius, border และ shadow จำนวนมาก
- Card หลายใบไม่ใช้ full Card composition
- มี custom progress/empty surfaces
- icons ใน Button มี size classes และไม่มี `data-icon`
- Affiliate carousel มี component-local style blockประมาณ 240 บรรทัดและ raw arrow/dot buttons

Migration target:

- คง Home journey/copy/section order ตาม ADR 0002
- เปลี่ยน interactive UI และ repeated surfaces เป็น shadcn composition
- ใช้ semantic tokens แทน raw palette เมื่อสีมีความหมายเชิง UI
- gradients/artwork backgrounds ที่เป็นแบรนด์สามารถอยู่ใน Tailwind layout ได้
- ใช้ official shadcn Carousel หากติดตั้งเพิ่มจาก registry `@shadcn`

### P1 — Learning/video/status surfaces

ไฟล์หลัก:

- `src/components/video/BunnyPlayer.tsx`
- `src/components/course/CoursePreviewVideo.tsx`
- `src/components/course/LessonList.tsx`
- `src/components/course/CourseLessonList.tsx`
- `src/components/status/StatusSurface.tsx`
- `src/app/error.tsx`

Migration target:

- Empty/error/loading overlay ใช้ `Empty`, `Alert`, `Skeleton`, `Button`
- raw lesson action buttons ใช้ `Button`
- preview overlay ใช้ `Button` และ Dialog ที่มี title
- dynamic iframe geometry และ provider-specific media CSS เป็น accepted exception

### P2 — Icons

Baseline:

- Project configure Lucide แต่ยังมี raw SVG 32 จุด
- `src/components/ui/Icons.tsx` เป็น custom SVG registry รุ่นเก่า

Migration target:

- action/navigation/status icons ใช้ Lucide component objects
- icons ใน shadcn component ไม่กำหนด size class ซ้ำ
- icons ใน Button ใช้ `data-icon`
- brand icons เช่น Google, Facebook, X, LINE และ YouTube เป็น accepted custom SVG exception

### P2 — Global CSS cleanup

ไฟล์: `src/app/globals.css`

Dead or superseded candidates หลังย้าย consumers:

- `.gradient-text`
- `.btn`, `.btn-primary`, `.btn-secondary`
- `.card`
- `.feature-icon`
- `.stat-*`
- `.cta-section`
- `.animate-fade-in-up`, `.animate-float`, `.animate-fadeIn`
- `.hover-lift`

`.container` ยังมีประมาณ 30 consumer จึงต้องย้าย call sites ก่อนลบหรือเปลี่ยนเป็น shared page-container composition

`.rich-content` ถูกประกาศซ้ำสองชุดและต้องรวมเป็นชุดเดียว โดยรักษา sanitized HTML, code block และ syntax highlighting behavior

## CSS ที่อนุญาตให้คงอยู่

การเป็น shadcn-first ไม่ได้แปลว่า application ต้องไม่มี CSS ทุกชนิด ขอบเขตที่อนุญาตคือ:

- shadcn semantic variables, Tailwind v4 `@theme inline`, fonts, reset และ base typography
- sanitized `.rich-content` และ `.lesson-content`
- code syntax highlighting
- certificate print/image-export styling ใน `CertificateArtifact.module.css`
- Bunny iframe/media rules ที่ primitive ไม่สามารถเป็นเจ้าของได้
- dynamic values เช่น reading progress width
- brand artwork/gradient ที่ไม่จำลอง interactive primitive
- brand SVG ที่ Lucide ไม่มี

ไม่อนุญาตให้ใช้ข้อยกเว้นนี้กับ buttons, forms, cards, menus, dialogs, alerts, badges, empty states, skeletons, toast หรือ pagination

## Implementation batches

### Batch 1 — Foundation and shared shell

- [x] ตรวจ docs/API ของ components ที่จะใช้
- [x] เพิ่ม missing official components เฉพาะที่จำเป็นผ่าน `@shadcn`
- [x] เพิ่ม semantic status variants แบบ additive โดยไม่เปลี่ยน admin defaults
- [x] migrate navbar/user menu/mobile menu/avatar
- [x] migrate notification popover + Sonner
- [x] migrate announcement Alert
- [x] เพิ่ม/ปรับ navigation and notification tests

### Batch 2 — Forms and learner account

- [x] migrate auth forms
- [x] migrate contact form
- [x] migrate profile/settings forms
- [x] migrate payments/certificates states and badges
- [x] ลบ `FormControls.tsx`
- [x] ลบ `learner-account-styles.ts`
- [x] ปรับ tests จาก wrapper/class contracts เป็น semantics/behavior

### Batch 3 — Commerce

- [x] migrate Course enrollment UI
- [x] migrate Bundle enrollment UI
- [x] preserve payment contracts and validation
- [x] migrate feedback/dialog wrappers
- [x] เพิ่ม interaction tests สำหรับ coupon, method choice, file selection และ pending states

Commerce interaction coverage ตรวจซ้ำเมื่อ 2026-08-30 ครอบคลุม Stripe rejection/retry, invalid slip MIME, ไฟล์เกิน 5 MB, stale-file clearing, rejected HTTP verification response และ retry ที่คง payment ID/file contract เดิมสำหรับทั้ง course และ bundle

### Batch 4 — Reviews, catalog and learning

- [x] migrate CourseReviews
- [x] migrate CourseCatalogFilters
- [x] ลบ dead `CourseFilters.tsx`
- [x] migrate lesson/status/video controls
- [x] verify mobile Sheet and keyboard navigation

### Batch 5 — Home/public and cleanup

- [x] migrate Affiliate carousel
- [x] normalize Home/public component variants and semantic colors
- [x] replace custom empty/status/progress/card patterns
- [x] remove `space-x-*`/`space-y-*` in user scope
- [x] replace non-brand raw SVGs
- [x] remove dead global CSS
- [x] consolidate rich-content rules

### Batch 6 — Completion verification

- [x] affected component tests after each batch
- [x] `npm run lint`
- [x] `npm run test -- --run`
- [x] `npm run build`
- [x] `git diff --check`
- [x] `git status --short`
- [x] browser QA desktop/tablet/mobile สำหรับ authenticated routes
- [x] keyboard/focus/overlay QA สำหรับ authenticated navigation และ commerce dialogs
- [x] no horizontal overflow and no console errors ใน authenticated learner/commerce routes ที่ 390/768/1440 px
- [x] final source audit against baseline indicators and accepted exceptions

Authenticated browser QA รอบ 2026-08-30 ใช้ session/API mocks และ in-memory fixture ครอบคลุม learner records, profile/settings, learning workspace และ course/bundle commerce ที่ 390/768/1440 px โดยไม่พบ horizontal overflow หรือ console error; warning ที่พบเป็น Next.js dev-only logo preload warning

ระหว่าง QA พบ focus regression หลังปิด Stripe error dialog ซึ่งคืน focus ไปที่ document body เพราะ feedback Modal ไม่มี trigger ที่ยัง mount อยู่ แก้โดยส่ง enrollment trigger ผ่าน Modal ไปยัง DialogShell และเพิ่ม regression test ที่ยืนยัน focus return สำหรับ shared Modal

Browser QA ครอบคลุม Home, Login, Course catalog, Course detail, Bundle, learner collections, profile/settings, learning workspace และ commerce dialogs ที่ 390/768/1440 px รวมถึง Tabs keyboard navigation, mobile Sheet focus trap, notification Popover, user DropdownMenu, locked-lesson AlertDialog, payment Dialog และ logout AlertDialog พร้อมตรวจ Escape close/focus restore. ส่วน authenticated navigation และคอมโพเนนต์ที่ปกติอยู่หลัง server session ตรวจด้วย session/API mocks และ in-memory fixture เฉพาะใน browser; temporary QA harness ถูกลบหลังตรวจเสร็จและไม่มี application/database/payment state ถูกแก้ไข. หลักฐาน public QA อยู่ที่ `output/playwright/shadcn-strict-completion/` และ authenticated QA อยู่ที่ `output/playwright/shadcn-strict-authenticated-2026-08-30/`.

## Definition of done

งานนี้ถือว่าเสร็จเมื่อหลักฐาน current state ยืนยันทุกข้อ:

1. ไม่มี raw visible `<button>`, `<select>` หรือ `<label>` ใน user UI
2. raw `<input>` เหลือเฉพาะ documented hidden/file exceptions
3. ทุก actual form ใช้ `FieldGroup`/`Field`
4. compound password/search controls ใช้ `InputGroup`
5. ไม่มี component-local `<style>` ใน user UI
6. ไม่มี custom toast, manual dropdown หรือ custom empty state เมื่อมี shadcn primitive
7. ไม่มี `space-x-*`/`space-y-*` ใน user scope
8. non-brand icons ใช้ Lucide ตาม project configuration
9. Dialog/Sheet ทุกจุดมี accessible title
10. payment/auth/enrollment/notification behavior contracts ผ่าน
11. `lint`, full test suite, build และ `git diff --check` ผ่าน
12. visual QA ครอบคลุม representative public, auth, catalog, commerce, learner และ learning routes ที่ mobile/desktop

## Baseline test implications

- `tests/components/form-controls.test.tsx` ผูกกับ wrapper ที่ต้องถูกลบ จึงต้องแทนด้วย field/form behavior tests
- `tests/design/home-spacing-contract.test.ts` ผูกกับ legacy `.container` rule จึงต้องปรับเมื่อย้าย container composition
- `tests/design/brand-color-contract.test.ts` ควรรักษา contrast/token contract แต่ไม่ล็อก raw page classes
- enrollment tests ต้องรักษา endpoint/slip contracts
- learner account tests ต้องรักษา API boundaries, loading announcements, immutable email และ collapsed password behavior

## Worktree baseline

ก่อนเริ่ม implementation มี untracked paths ที่เป็นของผู้ใช้และต้องรักษา:

- `.agents/`
- `output/`
- `skills-lock.json`

ไม่มีการ commit, push, deploy หรือแก้ production data ใน migration นี้ เว้นแต่ผู้ใช้สั่งแยกต่างหาก
