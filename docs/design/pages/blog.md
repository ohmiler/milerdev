# Blog Index Design Notes

## Purpose

หน้า `/blog` ช่วยให้ผู้ใช้ค้นหาและเลือกอ่านบทความด้านการพัฒนา software โดยเห็นหัวข้อ เนื้อหาโดยย่อ ผู้เขียน และวันที่เผยแพร่ได้เร็ว

## Sources of Truth

- `PRODUCT.md`
- `DESIGN.md`
- `docs/design/REDESIGN-ROADMAP.md`
- `src/app/page.tsx` และ `src/app/courses/page.tsx` เป็น visual-system references
- `src/app/blog/page.tsx`

## Composition

- ใช้ Light Editorial surface และ grid alignment ของ MilerDev โดยไม่คัดลอก layout ของ Home หรือ Courses
- หน้าแรกที่ไม่มี filter ใช้บทความล่าสุดเป็น image-led lead story
- ผลค้นหา หน้าที่สองขึ้นไป และรายการที่กรองแล้วใช้ editorial index เท่ากันทุกผลลัพธ์ เพื่อไม่สร้างลำดับความสำคัญที่ผิด
- บทความที่เหลือเป็น ruled rows พร้อม thumbnail, tag, title, excerpt, author, date และ action
- ใช้ topic navigation แบบเส้น active แทน pill badges
- รักษา search, tag query, pagination และ article links เดิม
- ใช้ thumbnail จริงเมื่อมีข้อมูล และ fallback แบบ developer journal เมื่อไม่มีภาพ
- รองรับ desktop, tablet, mobile, keyboard focus และ reduced motion

## Verification

- `npm run lint`
- `npm run build`
- `git diff --check`