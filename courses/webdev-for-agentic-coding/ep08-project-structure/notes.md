# EP08: โครงสร้างโปรเจกต์ (Project Structure)

## สิ่งที่จะได้เรียนรู้
- ทำไมโครงสร้างโปรเจกต์ถึงสำคัญ
- โครงสร้างโปรเจกต์ HTML/CSS/JS พื้นฐาน
- โครงสร้างโปรเจกต์ Next.js (React)
- Config Files ที่สำคัญ
- การตั้งชื่อไฟล์และโฟลเดอร์
- โครงสร้างที่ AI เข้าใจง่าย

---

## 1. ทำไมโครงสร้างถึงสำคัญ

1. **หาไฟล์ง่าย** — รู้ว่าอะไรอยู่ที่ไหน
2. **ทำงานเป็นทีมได้** — ทุกคนเข้าใจตรงกัน
3. **Scale ได้** — โปรเจกต์โตขึ้นก็ไม่รก
4. **AI เข้าใจง่าย** — Agentic Coding ทำงานได้ดีขึ้น
5. **Convention over Configuration** — Framework มีมาตรฐานที่ทุกคนรู้จัก

---

## 2. โปรเจกต์ HTML/CSS/JS พื้นฐาน

```
my-website/
├── index.html              # หน้าหลัก
├── about.html              # หน้าเกี่ยวกับ
├── contact.html            # หน้าติดต่อ
├── css/
│   ├── style.css           # สไตล์หลัก
│   ├── responsive.css      # Media queries
│   └── components.css      # Component styles
├── js/
│   ├── script.js           # JavaScript หลัก
│   └── utils.js            # Helper functions
├── images/
│   ├── logo.png
│   ├── hero.jpg
│   └── icons/
├── fonts/                  # Custom fonts
├── .gitignore
└── README.md
```

---

## 3. โปรเจกต์ Next.js (React Framework)

```
my-app/
├── public/                 # ไฟล์ static (เข้าถึงได้โดยตรง)
│   ├── favicon.ico
│   ├── images/
│   └── fonts/
├── src/
│   ├── app/                # App Router (Pages & Routes)
│   │   ├── layout.tsx      # Root layout (ครอบทุกหน้า)
│   │   ├── page.tsx        # หน้าแรก (/)
│   │   ├── globals.css     # Global styles
│   │   ├── about/
│   │   │   └── page.tsx    # /about
│   │   ├── blog/
│   │   │   ├── page.tsx    # /blog (รายการบทความ)
│   │   │   └── [slug]/
│   │   │       └── page.tsx # /blog/xxx (บทความเดี่ยว)
│   │   └── api/
│   │       └── hello/
│   │           └── route.ts # API endpoint
│   ├── components/         # UI Components
│   │   ├── ui/             # พื้นฐาน (Button, Input, Card)
│   │   ├── layout/         # Layout (Header, Footer, Sidebar)
│   │   └── features/       # Feature-specific components
│   ├── lib/                # Utilities & Helpers
│   │   ├── utils.ts
│   │   └── db.ts
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript types
│   └── styles/             # Additional styles
├── package.json
├── package-lock.json
├── tsconfig.json           # TypeScript config
├── tailwind.config.js      # Tailwind CSS config
├── next.config.js          # Next.js config
├── .eslintrc.json          # Linting rules
├── .gitignore
├── .env.local              # Environment variables (ห้าม commit!)
└── README.md
```

---

## 4. Config Files ที่สำคัญ

| ไฟล์ | ทำอะไร |
|------|--------|
| `package.json` | Dependencies, scripts, metadata |
| `package-lock.json` | Lock exact versions (ต้อง commit) |
| `tsconfig.json` | TypeScript compiler options |
| `next.config.js` | Next.js configuration |
| `tailwind.config.js` | Tailwind CSS customization |
| `.eslintrc.json` | Code linting rules |
| `.prettierrc` | Code formatting rules |
| `.gitignore` | Files to exclude from Git |
| `.env` / `.env.local` | Environment variables |
| `README.md` | Project documentation |

---

## 5. โฟลเดอร์ที่พบบ่อย

| โฟลเดอร์ | ความหมาย |
|----------|----------|
| `src/` | Source code หลัก |
| `public/` | Static files (รูป, fonts, favicon) |
| `app/` หรือ `pages/` | Pages / Routes |
| `components/` | Reusable UI components |
| `lib/` หรือ `utils/` | Helper functions, utilities |
| `hooks/` | Custom React hooks |
| `types/` | TypeScript type definitions |
| `styles/` | CSS / Tailwind styles |
| `api/` | API routes / Backend logic |
| `tests/` หรือ `__tests__/` | Test files |
| `config/` | Configuration files |

---

## 6. การตั้งชื่อ (Naming Conventions)

### ไฟล์ & โฟลเดอร์
| Convention | ใช้กับ | ตัวอย่าง |
|-----------|--------|----------|
| PascalCase | React Components | `UserProfile.tsx`, `NavBar.tsx` |
| camelCase | Utilities, hooks | `useAuth.ts`, `formatDate.ts` |
| kebab-case | CSS, routes, configs | `style.css`, `blog-post/` |
| SCREAMING_SNAKE | Constants | `MAX_RETRY`, `API_URL` |

### Component Files
```
components/
├── Button.tsx          # Component
├── Button.test.tsx     # Test
├── Button.module.css   # Scoped styles
└── index.ts            # Re-export
```

---

## 7. README.md — เอกสารสำคัญที่สุด

```markdown
# Project Name

คำอธิบายสั้นๆ ว่าโปรเจกต์นี้คืออะไร

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
เปิด http://localhost:3000

## Tech Stack
- **Framework:** Next.js 14
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** MySQL + Drizzle ORM

## Project Structure
อธิบายโครงสร้างโฟลเดอร์สำคัญ

## Environment Variables
อธิบายว่าต้องตั้งค่า .env อะไรบ้าง (ไม่ใส่ค่าจริง!)
```

---

## 8. โครงสร้างที่ AI / Agentic Coding ชอบ

### หลักการ
1. **ตั้งชื่อสื่อความหมาย** — `UserProfile.tsx` ไม่ใช่ `comp1.tsx`
2. **แยกไฟล์ตาม feature** — ไม่ยัดทุกอย่างในไฟล์เดียว
3. **ไฟล์ไม่ยาวเกินไป** — แต่ละไฟล์ทำหน้าที่เดียว (< 200-300 บรรทัด)
4. **มี README ชัดเจน** — AI อ่านแล้วเข้าใจโปรเจกต์ทันที
5. **ใช้ TypeScript** — type information ช่วย AI เข้าใจโค้ด
6. **ใช้ convention ของ framework** — ไม่ต้องคิดเอง

### ทำไม AI ต้องการโครงสร้างที่ดี
- AI อ่านชื่อไฟล์/โฟลเดอร์เพื่อ **เข้าใจ context**
- โครงสร้างชัด = AI รู้ว่าจะ **วางโค้ดใหม่ที่ไหน**
- Type information ช่วย AI สร้างโค้ดที่ **ถูกต้อง**
- README ช่วย AI เข้าใจ **วัตถุประสงค์** ของโปรเจกต์

---

## 9. Build Tools Overview

| Tool | ทำอะไร |
|------|--------|
| **Bundler** (Webpack, Vite, Turbopack) | รวมไฟล์ JS/CSS หลายไฟล์เป็นไฟล์เดียว |
| **Transpiler** (Babel, SWC) | แปลง JS/TS เวอร์ชันใหม่ให้ Browser เก่ารัน |
| **Linter** (ESLint) | ตรวจโค้ดหาปัญหาและบังคับ style |
| **Formatter** (Prettier) | จัดรูปแบบโค้ดให้สวยงามเหมือนกัน |
| **Type Checker** (TypeScript) | ตรวจ type errors ก่อนรัน |

---

## แบบฝึกหัด

### ฝึกหัดที่ 1: สร้างโครงสร้าง HTML Project
สร้างโฟลเดอร์โปรเจกต์ที่มี:
- `index.html`, `about.html`
- โฟลเดอร์ `css/`, `js/`, `images/`
- `README.md` อธิบายโปรเจกต์

### ฝึกหัดที่ 2: สำรวจ Next.js Project
1. สร้าง Next.js project ใหม่: `npx create-next-app@latest`
2. สำรวจโครงสร้างที่สร้างมาให้
3. ระบุว่าแต่ละไฟล์/โฟลเดอร์ทำอะไร

### ฝึกหัดที่ 3: เขียน README
เขียน README.md สำหรับโปรเจกต์สมมติ ที่มี:
- ชื่อและคำอธิบาย
- วิธีติดตั้งและรัน
- Tech Stack
- Project Structure

---

## อ่านเพิ่มเติม
- [Next.js Project Structure](https://nextjs.org/docs/getting-started/project-structure)
- [React Project Structure](https://react.dev/learn/thinking-in-react)
- [How to write a good README](https://www.makeareadme.com/)
