# Courses Catalog Design Notes

## Purpose

หน้า `/courses` ช่วยให้ผู้เรียนค้นหา กรอง เปรียบเทียบ และเปิดดูคอร์สหรือ bundle ที่เหมาะกับเป้าหมาย โดยคง query parameters และ server-rendered catalog behavior เดิม

## Sources of Truth

- `PRODUCT.md`
- `DESIGN.md`
- `docs/design/REDESIGN-ROADMAP.md`
- `src/app/page.tsx` เป็น visual reference เท่านั้น
- `src/app/courses/page.tsx`

ไฟล์ `docs/design/foundations.md` ที่ระบุในงานไม่มีอยู่ใน worktree ณ วันที่ปรับหน้า

## Approved Composition

- ใช้ Light Editorial surface และ 12-column alignment แต่ไม่คัดลอก section order หรือ hero split ของ Home
- เปิดหน้าด้วย catalog heading ที่บอกงานของหน้าและจำนวนคอร์ส
- แสดง bundle เป็น comparison rail แบบมีเส้นแบ่ง ไม่ใช้ gradient marketing cards
- ใช้ labeled search/filter toolbar ที่รองรับ keyboard focus และ mobile stacking
- แสดงคอร์สด้วย responsive 3 / 2 / 1 catalog grid โดย reuse `CourseCard` และลด radius/shadow เฉพาะใน scope หน้า Courses
- รักษา search, price, tag, sort, pagination, bundle links และ course links เดิม
- Empty state ต้องมี recovery action กลับไปดูคอร์สทั้งหมด

## Verification

- `npm run lint`
- `git diff --check`
- Responsive rules ครอบคลุม desktop, tablet และ mobile ใน `courses-*` namespace