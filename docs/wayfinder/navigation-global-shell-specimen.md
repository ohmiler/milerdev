# Navigation and global-shell specimen

สถานะ: รอความเห็นจาก owner  
ตั๋ว: [ปรับความชัดเจนของ navigation และ global shell](https://github.com/ohmiler/milerdev/issues/17)

เอกสารนี้เป็น localized prototype สำหรับตัดสินใจเรื่อง label, hierarchy, active state, responsive behavior และ cross-link เท่านั้น ไม่เปลี่ยน information architecture, visual identity หรือ business behavior

## Design thesis

Academy-light เดิมยังเป็นทิศทางที่ถูกต้อง สิ่งที่ต้องเพิ่มคือ “orientation cue” ที่คงเส้นคงวา: ผู้ใช้ควรตอบได้เสมอว่าตนอยู่ที่ไหน กลับไปจุดแม่อย่างไร และ action ใดพาไปงานหลัก โดยไม่ต้องเรียนรู้เมนูใหม่ในแต่ละ shell

คง Prompt + Inter, accent blue, academy canvas/navy, radius และ shadcn `radix-maia` เดิม ความเด่นใช้กับ current location เพียงจุดเดียว ไม่เพิ่ม gradient, color หรือ navigation layer ใหม่

## 1. Public navigation vocabulary

### Guest: current → proposed

```text
CURRENT
[MilerDev]  คอร์สทั้งหมด  บทความ  เกี่ยวกับเรา  ติดต่อ  |  เข้าสู่ระบบ  [สมัครเรียน]

PROPOSED
[MilerDev]  คอร์สทั้งหมด  บทความ  เกี่ยวกับเรา  ติดต่อ  |  เข้าสู่ระบบ  [สมัครสมาชิก]
```

`/register` สร้างบัญชีสมาชิกและยังไม่สร้าง enrollment จึงใช้ “สมัครสมาชิก” ทุก breakpoint; “ลงทะเบียนเรียน” สงวนไว้สำหรับการสร้าง enrollment จากคอร์สฟรี การชำระเงินที่ยืนยันแล้ว หรือ admin intent ตาม glossary

### Member: proposed account grouping

```text
[MilerDev]  คอร์สทั้งหมด  บทความ  เกี่ยวกับเรา  ติดต่อ  |  [bell] [avatar ▾]

avatar menu
┌────────────────────────────┐
│ ชื่อสมาชิก / อีเมล         │
├────────────────────────────┤
│ การเรียนของฉัน             │  /dashboard
│ ใบรับรอง                   │  /dashboard/certificates
│ การชำระเงิน                │  /dashboard/payments
├────────────────────────────┤
│ โปรไฟล์                    │  /profile
│ ตั้งค่าบัญชี               │  /settings
├────────────────────────────┤
│ ออกจากระบบ                 │
└────────────────────────────┘
```

- ใช้ “การเรียนของฉัน” เป็น task label ของ `/dashboard`; ไม่ใช้ “แดชบอร์ด” ใน user-facing navigation
- ใช้ “บัญชีสมาชิก” เป็นชื่อ context ของ account shell เพราะสมาชิกที่ยังไม่มี enrollment ก็เข้าถึง profile/settings/payment history ได้
- ย้าย “ประกาศ” ออกจาก account grouping ไปที่ Footer กลุ่ม “ข้อมูลและความช่วยเหลือ”; announcement alert ยัง deep-link ไปหน้ารวมเหมือนเดิม
- desktop และ mobile ใช้ config แหล่งเดียวกัน รวมถึง label, order, icon และ active policy

## 2. Mobile navigation states

```text
GUEST                         SESSION LOADING                 MEMBER
┌──────────────────────┐      ┌──────────────────────┐        ┌──────────────────────┐
│ MilerDev        ปิด  │      │ MilerDev        ปิด  │        │ MilerDev   bell  ปิด │
│ เลือกหน้าที่ต้องการ │      │ กำลังตรวจสอบบัญชี… │        │ ชื่อ / อีเมล          │
├──────────────────────┤      ├──────────────────────┤        ├──────────────────────┤
│ คอร์สทั้งหมด         │      │ skeleton menu rows   │        │ public links          │
│ บทความ               │      │ no auth CTA flash    │        ├──────────────────────┤
│ เกี่ยวกับเรา         │      │                      │        │ การเรียนของฉัน        │
│ ติดต่อ               │      │                      │        │ ใบรับรอง / ชำระเงิน  │
├──────────────────────┤      │                      │        │ โปรไฟล์ / ตั้งค่า     │
│ เข้าสู่ระบบ          │      │                      │        ├──────────────────────┤
│ [สมัครสมาชิก]        │      │                      │        │ ออกจากระบบ            │
└──────────────────────┘      └──────────────────────┘        └──────────────────────┘
```

Contract:

- session `loading` ต้องไม่แสดง guest CTA ชั่วคราว
- member เข้าถึง notification bell ได้ที่ mobile; ใช้ notification component/state เดียวกับ desktop ไม่สร้าง notifications route ปลอม
- Sheet มี title, description, focus trap/return focus, vertical scrolling, overscroll containment และ safe-area padding
- ปิด Sheet หลังเลือก route; logout ปิด Sheet ก่อนเปิด confirmation และคืน focus ที่ menu trigger เมื่อยกเลิก

## 3. Active-state policy

แยก exact current page ออกจาก parent section:

| State | Visual | Semantics |
|---|---|---|
| exact destination | active background/foreground | `aria-current="page"` |
| nested route under a public section | quieter section-active cue | `data-active="section"`; ไม่อ้างว่า parent link คือ current page |
| inactive | neutral | ไม่มี `aria-current` |
| location within document | active anchor cue | `aria-current="location"` |

ตัวอย่าง: `/dashboard/certificates` ทำให้ “ใบรับรอง” เป็น current page เพียงรายการเดียว ไม่ทำให้ `/dashboard` เป็น `aria-current="page"`; `/courses/typescript` อาจคง visual section cue ที่ “คอร์สทั้งหมด” แต่ breadcrumb เป็นตัวบอกหน้าปัจจุบัน

## 4. Shared account shell

```text
CURRENT DASHBOARD                         CURRENT ACCOUNT CHILD
┌────────────────────────────────┐        ┌────────────┬──────────────────┐
│ heading + 3 outline links      │        │ 5 raw links│ content          │
│ full-width learning content    │        │ with glyphs│                  │
└────────────────────────────────┘        └────────────┴──────────────────┘

PROPOSED: one account topology
┌────────────────────────────────────────────────────────┐
│ บัญชีสมาชิก · page title · description                 │
├───────────────┬────────────────────────────────────────┤
│ การเรียนของฉัน│ dashboard or account content            │
│ ใบรับรอง      │                                        │
│ การชำระเงิน   │                                        │
│ โปรไฟล์       │                                        │
│ ตั้งค่าบัญชี  │                                        │
└───────────────┴────────────────────────────────────────┘
```

- ขยาย account route model ให้รวม `dashboard`; ทุกปลายทางใช้ navigation primitive และ Lucide icon เดียวกัน
- desktop ใช้ sticky account index เดิม; mobile ใช้ horizontal scroll/Tabs-like navigation หรือ Sheet ที่ยังเห็น current label โดยไม่ซ่อนปลายทางทั้งหมดหลัง hamburger ซ้อนอีกชั้น
- dashboard content และ learning-continuity card คงลำดับเดิม; เปลี่ยนเฉพาะ shell/navigation seam
- loading state ต้องใช้ topology เดียวกับ resolved route ไม่ใช้ horizontal skeleton ที่ไม่ตรงกับ sidebar

## 5. Breadcrumb contract

ใช้ source-owned shadcn `Breadcrumb` เป็น shared primitive สำหรับ detail hierarchy และ derive visible breadcrumb กับ JSON-LD จาก data ชุดเดียวกัน

```text
Course : หน้าแรก / คอร์สทั้งหมด / {ชื่อคอร์ส}
Bundle : หน้าแรก / คอร์สทั้งหมด / {ชื่อชุดคอร์ส}
Article: หน้าแรก / บทความ / {ชื่อบทความ}
```

- final item ใช้ชื่อจริง, truncate/break safely และ `aria-current="page"`
- separator เป็น decorative
- mobile คง parent ที่ย้อนกลับได้อย่างน้อยหนึ่งระดับและ truncate เฉพาะ final item
- account routes ใช้ account index แทน breadcrumb; learning workspace ใช้ course/lesson context ใน focus header แทน breadcrumb

## 6. Learning focus header

โครงสร้างจาก ADR 0006 ยังเป็น canonical:

```text
[curriculum toggle]  MD  course title / lesson title  progress · 3/12  [กลับหน้าคอร์ส]
```

ปรับเฉพาะ semantics และทางออกซ้ำ:

- curriculum toggle ใช้ `aria-expanded={!sidebarCollapsed}` + `aria-controls` แทน `aria-pressed={sidebarCollapsed}`
- MilerDev mark เป็น non-interactive context mark; ไม่ link ไปหน้าคอร์สซ้ำกับ course-exit
- trailing “กลับหน้าคอร์ส” เป็นทางออกหลักเพียงจุดเดียวและคง label แบบข้อความที่ desktop
- mobile คง leading curriculum button, lesson title และ trailing icon exit; accessible name ต้องรวมชื่อคอร์ส
- auto-scroll ไป current lesson ต้องใช้ `auto` เมื่อ reduced motion
- ไม่เพิ่ม global Navbar/Footer ใน learning workspace และไม่คืน global Arrow key navigation

## 7. Global orientation and Footer

- เพิ่ม skip link “ข้ามไปเนื้อหาหลัก” เป็น focusable item แรกของ `Navbar` และ `LearningNavbar`; target main landmark ที่มี id เดียวกันในทุก non-admin shell
- sticky header และ in-page anchors ต้องมี scroll offset ที่ไม่บัง focused target
- Footer คงเป็น secondary navigation; เพิ่ม “ประกาศ” ในกลุ่ม “ข้อมูลและความช่วยเหลือ” และใช้ label จาก config เดียวกับปลายทางอื่น
- ไม่ย้าย FAQ, legal หรือ social links เข้า primary navigation

## Evidence inventory

| Finding | Evidence | Decision |
|---|---|---|
| register label ขัด glossary และ Home | `src/components/layout/PublicNavigationBar.tsx:126`, `src/components/layout/MobileNavigationPanel.tsx:108`; rendered guest snapshots; Home ใช้ “สมัครสมาชิกฟรี” | normalize เป็น “สมัครสมาชิก” |
| mobile แสดง guest state ระหว่าง session loading | `PublicNavigationBar.tsx:32-35`, `:167-173`; desktop มี Skeleton ที่ `:106-108` แต่ mobile panel รับเพียง `session` | เพิ่ม explicit loading presentation |
| notification เข้าถึงได้เฉพาะ desktop | `PublicNavigationBar.tsx:105-133`, `UserNavigationMenus.tsx:107-232` | extract/reuse notification trigger บน mobile |
| account destinations มี config ซ้ำและไม่ครบ | `navigation-config.tsx:28-33`, `LearnerAccountShell.tsx:17-23`, `dashboard/page.tsx:141-145` | account config/topology แหล่งเดียว |
| nested route ถูกประกาศเป็น current parent | `PublicNavigationBar.tsx:45-47`, `UserNavigationMenus.tsx:269-282`, `MobileNavigationPanel.tsx:62-76` | แยก exact current จาก section active |
| breadcrumbs ทำซ้ำและ final semantics ต่างกัน | `courses/[slug]/page.tsx:235-241`, `bundles/[slug]/page.tsx:198-204`, `blog/[slug]/page.tsx:231-235` | shared Breadcrumb + one data model |
| bundle visible breadcrumb ไม่ใช้ชื่อจริง | `bundles/[slug]/page.tsx:203` เทียบ JSON-LD `:166` | final item = bundle title |
| ไม่มี global skip link | `src/app/layout.tsx:74-104`; rendered mobile Tab แรกไป logo; มีเฉพาะ course detail ที่ `courses/[slug]/page.tsx:225` | shared skip-link contract |
| learning toggle semantics ไม่ตรง state | `LearningNavbar.tsx:35-50` | ใช้ expanded/controls |
| learning มี link กลับ course ซ้ำ | `LearningNavbar.tsx:65-68` และ `:82-91` | เหลือ explicit course-exit เดียว |
| lesson auto-scroll ไม่เคารพ reduced motion | `LessonList.tsx:70-72` | reduce → `auto` |

## Minimum implementation sequence

1. สร้าง canonical navigation model: public links, account links, exact/section-active helpers และ canonical labels
2. normalize desktop/mobile public navigation รวม session loading และ mobile notifications
3. รวม dashboard กับ account navigation topology โดยคง page content เดิม
4. เพิ่ม shadcn Breadcrumb และ migrate course/bundle/article detail พร้อม shared JSON-LD data
5. ปรับ learning header semantics/duplicate exit และ reduced-motion scroll
6. เพิ่ม skip-link/main-target contract และ Footer announcement cross-link
7. เพิ่ม behavior tests สำหรับ guest/loading/member, exact/nested active state, keyboard focus/return focus, 320/390/768/1024/1440 widths และ no horizontal overflow

## Explicit non-goals

- ไม่เพิ่ม route, mega-menu, command palette หรือ bottom navigation
- ไม่ย้าย information architecture หรือเพิ่ม notifications page
- ไม่เปลี่ยน auth, role, enrollment, payment หรือ notification persistence
- ไม่เพิ่ม global Navbar/Footer ใน learning focus workspace
- ไม่เปลี่ยน dashboard content order หรือ learning progression behavior
- ไม่เปลี่ยน brand token, typography, icon library หรือ shadcn preset

## Owner reaction requested

โปรดยืนยันหรือแก้ 4 จุดนี้:

1. `/register` ใช้ “สมัครสมาชิก” ทุก shell
2. `/dashboard` ใช้ “การเรียนของฉัน” และ account context ใช้ “บัญชีสมาชิก”
3. “ประกาศ” ย้ายจาก account menu ไป Footer/support แต่ announcement alert ยังคงเดิม
4. learning header เหลือ explicit course-exit เดียว โดย MilerDev mark ไม่เป็นลิงก์
