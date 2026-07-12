# Contact Page Design Notes

## Purpose

หน้า `/contact` ช่วยให้ผู้ใช้ส่งคำถามเรื่องคอร์ส การเรียน การชำระเงิน หรืองานความร่วมมือ พร้อมให้ทีมได้รับรายละเอียดที่จำเป็นต่อการตอบกลับ

## Sources of Truth

- `PRODUCT.md`
- `DESIGN.md`
- `docs/design/REDESIGN-ROADMAP.md`
- `src/app/contact/page.tsx`
- `src/app/api/contact/route.ts`

## Composition

- ใช้ Light Editorial hero แบบเดียวกับ public discovery pages
- จัดหน้าเป็น contact information rail และ form work area บน grid เดียวกัน
- ใช้ ruled information rows แทน icon cards
- Form มี explicit labels, autocomplete, min/max lengths ที่ตรงกับ Zod schema, visible focus และข้อความ placeholder ที่อ่านได้ตาม WCAG AA
- รักษา API payload, honeypot, form timing, rate limit และ email notification behavior เดิม
- Error ใช้ `role="alert"`; success ใช้ `role="status"` และมี action ส่งข้อความใหม่
- เพิ่มคำเตือนไม่ให้ส่งรหัสผ่าน ข้อมูลบัตร หรือข้อมูลส่วนตัวที่ไม่จำเป็น
- รองรับ desktop, tablet และ mobile

## Verification

- `npm run lint`
- `npm run build`
- `git diff --check`