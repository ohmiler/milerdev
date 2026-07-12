# Login Page Design Notes

## Purpose

หน้า `/login` ช่วยให้ผู้เรียนกลับเข้าสู่บัญชีและเรียนต่อได้อย่างมั่นใจ โดยไม่เปลี่ยน authentication behavior หรือเปิดเผยข้อมูลว่าบัญชีใดมีอยู่ในระบบ

## Sources of Truth

- `PRODUCT.md`
- `DESIGN.md`
- `src/app/login/page.tsx`
- `src/lib/auth.ts`
- `e2e/auth.spec.ts`
- `e2e/smoke.spec.ts`

## Composition

- ใช้ split composition: Dark Focus learning context และ Light Product login form
- Dark panel อธิบายงานหลังเข้าสู่ระบบ ได้แก่เปิดคอร์ส กลับไปบทเรียนล่าสุด และดู progress
- Light panel ใช้ affordance มาตรฐานสำหรับ email, password, visibility toggle, recovery, submit และ Google OAuth
- รักษา `signIn('credentials')`, `signIn('google')`, redirect, error mapping และ generic invalid-credentials message เดิม
- เพิ่ม explicit labels, autocomplete, visible focus, `role="alert"` และ `aria-pressed` สำหรับ password toggle
- รักษาข้อความและ selector ที่ E2E ใช้ตรวจ login flow
- รองรับ desktop, tablet และ mobile

## Verification

- `npm run lint`
- `npm run build`
- targeted Playwright login tests
- `git diff --check`