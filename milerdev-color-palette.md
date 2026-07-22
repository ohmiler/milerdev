# MilerDev Web Color Palette

สีหลักและ semantic defaults สำหรับประสบการณ์เรียนโค้ดของ MilerDev โดยใช้ `#00ABFF` เป็น brand anchor ไม่ใช่ข้อจำกัดว่าทุกหน้าต้องใช้ neutral SaaS composition แบบเดียวกัน

Public UI ใช้ light mode เป็นค่าเริ่มต้น แต่การ redesign ที่ได้รับอนุญาตสามารถเพิ่ม supporting colors, tint, texture หรือ surface roles ได้เมื่อมีเหตุผลจากผู้ใช้ งาน เนื้อหา และ design thesis โดยต้องรักษา contrast และ semantic meaning

## Brand Accent

| Token | Color | Usage |
|---|---:|---|
| `accent` | `#00ABFF` | ปุ่มหลัก ลิงก์ และ Active state |
| `on-accent` | `#061923` | ข้อความและไอคอนบนพื้น `#00ABFF` |
| `on-accent-strong` | Contextual | สีตัวอักษรบน accent hover/pressed: ขาวบน light-theme deep blue และเข้มบน dark-theme bright blue |
| `accent-hover` | `#33BCFF` | ปุ่มและลิงก์เมื่อ Hover ใน Dark theme |
| `accent-pressed` | `#0089CC` | สถานะเมื่อกด |
| `accent-soft-dark` | `#003D5C` | Badge หรือ Highlight บนพื้นมืด |
| `accent-soft-light` | `#E0F5FF` | Badge หรือ Highlight บนพื้นสว่าง |

## Dark Theme

| Token | Color | Usage |
|---|---:|---|
| `background` | `#080B0F` | พื้นหลังหลัก |
| `surface` | `#10151C` | Card, Navbar และ Sidebar |
| `surface-hover` | `#17202A` | Surface เมื่อ Hover |
| `border` | `#26313D` | เส้นขอบและเส้นแบ่ง |
| `text-primary` | `#F5F8FA` | หัวข้อและข้อความหลัก |
| `text-secondary` | `#9AA8B5` | คำอธิบายและข้อความรอง |
| `text-muted` | `#657483` | Metadata และ Placeholder |

## Light Theme

| Token | Color | Usage |
|---|---:|---|
| `background` | `#F7F9FB` | พื้นหลังหลัก |
| `surface` | `#FFFFFF` | Card, Navbar และ Sidebar |
| `surface-hover` | `#F0F5F8` | Surface เมื่อ Hover |
| `border` | `#D8E1E8` | เส้นขอบและเส้นแบ่ง |
| `text-primary` | `#111820` | หัวข้อและข้อความหลัก |
| `text-secondary` | `#52616D` | คำอธิบายและข้อความรอง |
| `text-muted` | `#7A8995` | Metadata และ Placeholder |

## Semantic Colors

| Token | Color | Usage |
|---|---:|---|
| `success` | `#22C55E` | สำเร็จ ออนไลน์ หรือผ่าน |
| `warning` | `#F59E0B` | คำเตือนหรือสิ่งที่ต้องตรวจสอบ |
| `promo` | `#C5163A` | ราคาพิเศษ โปรโมชัน และส่วนลดที่กำลังใช้งาน |
| `error` | `#F43F5E` | Error การลบ หรือสถานะอันตราย |

## CSS Variables

```css
:root {
  color-scheme: light;

  --color-accent: #00abff;
  --color-accent-hover: #008ed6;
  --color-accent-pressed: #0075b3;
  --color-accent-soft: #e0f5ff;
  --color-on-accent: #061923;
  --color-on-accent-strong: #ffffff;

  --color-background: #f7f9fb;
  --color-surface: #ffffff;
  --color-surface-hover: #f0f5f8;
  --color-border: #d8e1e8;

  --color-text-primary: #111820;
  --color-text-secondary: #52616d;
  --color-text-muted: #7a8995;

  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-promo: #c5163a;
  --color-error: #f43f5e;
}

[data-theme="dark"] {
  color-scheme: dark;

  --color-accent: #00abff;
  --color-accent-hover: #33bcff;
  --color-accent-pressed: #0089cc;
  --color-accent-soft: #003d5c;
  --color-on-accent-strong: #061923;

  --color-background: #080b0f;
  --color-surface: #10151c;
  --color-surface-hover: #17202a;
  --color-border: #26313d;

  --color-text-primary: #f5f8fa;
  --color-text-secondary: #9aa8b5;
  --color-text-muted: #657483;
}
```

## Usage Example

```css
body {
  color: var(--color-text-primary);
  background: var(--color-background);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.button-primary {
  color: var(--color-on-accent);
  background: var(--color-accent);
}

.button-primary:hover {
  background: var(--color-accent-hover);
}

:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
  outline-offset: 3px;
}
```

## Composition Guidance

- ใช้ neutral, surface และ accent ตาม hierarchy ของแต่ละหน้า ไม่ใช่สัดส่วนตายตัวทั้งระบบ
- `#00ABFF` ต้องคงบทบาทเป็นสีระบุตัวตนและ state สำคัญ แต่สามารถใช้เป็น field, progress path หรือพื้นที่เด่นขนาดใหญ่ได้เมื่อ thesis ต้องการ
- Supporting colors ควรมีชื่อและบทบาทที่ชัด เช่น warm teaching surface, project highlight หรือ community proof ไม่เพิ่มสีเพื่อการตกแต่งล้วน ๆ
- Dark surfaces ใช้เมื่อเนื้อหาต้องการ focus จริง เช่น code, video และ learning workspace ไม่ใช้เป็น technical branding อัตโนมัติ
- การขยาย palette ต้องตรวจ contrast, hover, focus, disabled, success, warning และ error ที่เกี่ยวข้อง
