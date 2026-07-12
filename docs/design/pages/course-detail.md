# Course Detail Design Notes

## Purpose

หน้า `/courses/[slug]` ช่วยให้ผู้เรียนเข้าใจผลลัพธ์ของคอร์ส ตรวจเนื้อหา ราคา โปรโมชัน และสถานะการสมัครเรียนก่อนตัดสินใจ โดยคงข้อมูล การชำระเงิน และ enrollment behavior เดิมทั้งหมด

## Approved Composition

- ใช้ Light Editorial surface และ 12-column alignment ต่อเนื่องจาก Courses Catalog
- Hero เป็น decision summary ที่มีชื่อ คำอธิบาย tag ผู้สอน จำนวนบท และระยะเวลา โดยไม่ใช้ gradient marketing treatment
- ลำดับหลักคือรายละเอียดคอร์ส เนื้อหาคอร์ส และรีวิว
- Enrollment summary อยู่ด้านขวาและ sticky บน desktop แต่กลับเป็น content ปกติบน tablet/mobile
- ราคา โปรโมชัน ปุ่มสมัคร และสิทธิ์ที่ได้รับอยู่ใน surface เดียวเพื่อช่วยตัดสินใจ
- ใช้ semantic tokens, radius และ focus vocabulary เดิม ไม่เพิ่ม dependency
- รักษา CourseDetailProvider, lesson access, preview video, review และ payment flow เดิม
- Curriculum ใช้ semantic ordered list และ button ที่มี accessible state สำหรับ preview, enrolled และ locked
- Loading skeleton ใช้ composition เดียวกับหน้าจริง เพื่อลด layout shift และ visual discontinuity

## Responsive Decisions

- Desktop ใช้ main content กับ enrollment rail ขนาด 360px
- Tablet วาง enrollment summary ก่อนเนื้อหาและยกเลิก sticky
- Mobile ลด display scale, ให้ metadata เป็น 2-column rail และรักษา touch target ของ CTA อย่างน้อย 48px

## Verification

- `npm run lint`
- `npm run build`
- ตรวจ responsive visual flow เมื่อมีข้อมูลคอร์สใน local database
