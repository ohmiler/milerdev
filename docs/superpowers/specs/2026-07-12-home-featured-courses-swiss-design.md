# Homepage Featured Courses Swiss Design

## Goal

ให้ผู้เยี่ยมชมเห็นคอร์สที่เริ่มเรียนได้ทันทีหลัง hero และทำให้หน้าแรกมีจังหวะ Swiss ที่ชัดขึ้น โดยรักษา data flow, course links, ราคา, promo state และ responsive behavior เดิมของ LMS

## User outcome

หลังอ่าน hero ผู้ใช้ควรเลือกได้ทันทีว่าจะเปิดดูคอร์สแนะนำหรือไปดูคอร์สทั้งหมด โดยไม่ต้องผ่าน learning path หรือ trust section ก่อน

## Approved direction

ใช้แนวทาง Swiss 12-column grid:

- ลำดับส่วนหลัก: `Hero → Featured Courses → Learning Path → Why MilerDev`
- rail ซ้ายของ Featured Courses ใช้สำหรับ heading, short copy และ link ไป catalog
- พื้นที่ขวาใช้ CourseCard เดิม สูงสุด 3 ใบต่อแถว
- desktop ใช้เส้นแบ่งและ alignment เป็นตัวสร้าง hierarchy แทน gradient หรือ shadow ที่ไม่จำเป็น
- สี `#02abff` ใช้กับ CTA, link, focus และสถานะสำคัญเท่านั้น
- mobile เปลี่ยนเป็น single column โดยหัวข้ออยู่ก่อน cards และปุ่ม/ข้อความต้องไม่ล้น

## Scope

### `src/app/page.tsx`

- ย้าย Featured Courses section มาอยู่ถัดจาก Hero
- ไม่ render Featured Courses ซ้ำในตำแหน่งเดิม
- เปลี่ยน CTA หลักของ hero ให้ชี้ไป `#featured-courses`
- คง `getFeaturedCourses`, `CourseCard` props, published filter, pricing และ promo calculation เดิม

### `src/app/globals.css`

- เพิ่ม/ปรับ homepage featured-course layout ให้เป็น Swiss grid
- ปรับ featured card ให้มี surface, border, thumbnail และ CTA ที่เรียบขึ้น
- เอา gradient/shadow เฉพาะส่วนที่ทำให้ card ดูเป็น marketing tile ออกจาก featured variant
- เพิ่ม responsive rules สำหรับ tablet/mobile
- คง general `CourseCard` variant อื่นและ shared layout behavior เดิม

## Non-goals

- ไม่เปลี่ยน schema, query, enrollment, payment หรือ course detail flow
- ไม่เพิ่ม dependency หรือ image asset ใหม่
- ไม่ redesign learning path, navbar, footer หรือ admin surface ในงานนี้

## Accessibility and interaction

- ใช้ heading hierarchy และ landmark เดิมของหน้า
- CourseCard ยังคงเป็น link ที่คลิกได้ทั้งใบ และ CTA ภายในเป็น visual affordance เท่านั้น
- focus-visible ต้องเห็นชัดบน card และ CTA
- hover ใช้การเปลี่ยนสี/เส้นแบบสั้น ไม่ animate layout
- รองรับ `prefers-reduced-motion` ตามกฎ homepage เดิม
- Thai copy ต้องใช้ line-height ตาม token และไม่บังคับความสูงจนข้อความล้น

## Verification

- รัน targeted homepage/unit checks ที่มีอยู่ถ้าเกี่ยวข้อง
- รัน `npm run lint`
- รัน `npm run build`
- ตรวจหน้าแรกด้วย browser ที่ desktop และ mobile viewport
- ตรวจว่า hero CTA, course links, promo/free price และ course count ยังทำงานตามเดิม

## Acceptance criteria

1. Featured Courses อยู่ต่อจาก Hero ใน DOM และมองเห็นได้ก่อน Learning Path
2. หน้าแรกไม่มี Featured Courses ซ้ำสองตำแหน่ง
3. CTA หลักของ Hero scroll ไปยัง `#featured-courses`
4. Desktop เห็น rail หัวข้อและ grid คอร์สในแนว Swiss ที่ alignment ชัด
5. Mobile เรียงเนื้อหาเป็นลำดับหัวข้อ → คอร์ส และไม่มี overflow แนวนอน
6. CourseCard ยังคงพาไป `/courses/[slug]` พร้อมราคาและ promo state ถูกต้อง
7. lint และ build ผ่าน หรือมี failure ที่ระบุได้ชัดเจนว่าเกิดจากสิ่งใด
