# Learner Dashboard Design Notes

## Purpose

หน้า `/dashboard` ช่วยให้ผู้เรียนกลับมาเรียนต่อได้ทันที เห็น progress ของทุกคอร์ส และเข้าถึงใบรับรอง การชำระเงิน และการตั้งค่าบัญชี

## Sources of Truth

- `PRODUCT.md`
- `DESIGN.md`
- `src/app/dashboard/page.tsx`
- `src/lib/auth.ts`
- `src/lib/db/schema.ts`
- `e2e/auth.spec.ts`

## Composition

- ใช้ Light Product surface และ fixed product typography scale
- วางคอร์สที่กำลังเรียนล่าสุดเป็น next action หลักก่อนสถิติและรายการอื่น
- สถิติเป็น compact ruled rail แทน card grid
- คอร์สหลักใช้ image-led split composition พร้อม progress และ action
- คอร์สที่เหลือเป็น ruled rows พร้อม lesson count, progress, status และ action
- Empty state อธิบาย next action และพาไป catalog
- รักษา `auth()` redirect, enrollment ordering, batched lesson/progress queries, certificate/payment counts และ course links เดิม
- รองรับ desktop, tablet, mobile, keyboard focus และ reduced motion

## Verification

- `npm run lint`
- `npm run build`
- protected-route Playwright check
- `git diff --check`