# About Page Design Notes

## Purpose

หน้า `/about` อธิบายว่า MilerDev คือใคร สอนด้วยแนวคิดแบบไหน และผู้เรียนควรคาดหวังประสบการณ์อะไร โดยไม่ใช้คำโฆษณาหรือข้อมูลบุคคลที่ไม่มีหลักฐานใน repository

## Sources of Truth

- `PRODUCT.md`
- `DESIGN.md`
- `docs/design/REDESIGN-ROADMAP.md`
- `src/app/page.tsx` เป็น visual-system และ evidence reference
- `src/app/about/page.tsx`
- `public/milerdev-logo-transparent.png`
- `public/showcase/*.webp`

## Composition

- ใช้ Light Editorial hero แบบ flow เดียวกับ Courses และ Blog เพื่อเชื่อม public system
- เล่า MilerDev ในฐานะ Thai coding learning studio ที่เน้นการลงมือสร้าง
- Manifesto ใช้ brand logo บน developer-dark surface แทนภาพบุคคลที่ไม่มี asset ยืนยัน
- Learning method เป็นลำดับ 3 ขั้น เพราะลำดับมีความหมายจริง: เข้าใจ เขียน สร้าง
- Principles ใช้ description list แบบ ruled rows แทน feature-card grid
- Proof section ใช้ภาพงานบรรยายจริง 3 ภาพ และข้อความหลักฐานจาก Home
- ปิดด้วย CTA ไปดูคอร์สและช่องทางติดต่อ
- รองรับ desktop, tablet, mobile, keyboard focus และ reduced motion

## Verification

- `npm run lint`
- `npm run build`
- `git diff --check`