# Registration Page Design Notes

## Purpose

หน้า `/register` ช่วยให้ผู้เรียนสร้างบัญชีอย่างเข้าใจเงื่อนไขรหัสผ่านและผลที่เกิดหลังสมัคร โดยไม่เปลี่ยน validation, auto-login หรือ anti-enumeration behavior

## Sources of Truth

- `PRODUCT.md`
- `DESIGN.md`
- `src/app/register/page.tsx`
- `src/app/api/auth/register/route.ts`
- `tests/api/auth.test.ts`
- `e2e/auth.spec.ts`

## Composition

- ใช้ auth split system เดียวกับ Login โดยให้พื้นที่ฟอร์มมากกว่า dark context
- Dark context อธิบายสิ่งที่บัญชีบันทึกจริง ได้แก่ course access, progress และ certificates
- Light form ใช้ field layout ที่คุ้นเคย พร้อม explicit labels, autocomplete และ password visibility controls
- Password guidance แสดง strength meter และ checklist โดยแยกข้อบังคับจากอักขระพิเศษที่เป็นคำแนะนำ
- รักษา client validation, API schema, generic registration response, bcrypt hashing, welcome email, credentials auto-login และ Google OAuth เดิม
- Error ใช้ `role="alert"`; password match และ strength ใช้ live regions
- รองรับ desktop, tablet และ mobile

## Verification

- `npm run lint`
- `npm run build`
- focused auth API tests
- targeted Playwright Register tests
- `git diff --check`