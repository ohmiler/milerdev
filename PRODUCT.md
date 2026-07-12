# MilerDev Product

MilerDev คือ coding learning studio ภาษาไทยสำหรับคนที่ต้องการเรียนการเขียนโปรแกรมผ่านการลงมือสร้างผลงานจริง ระบบต้องช่วยให้ผู้เรียนเข้าใจว่าจะเรียนอะไร เรียนไปเพื่ออะไร สมัครอย่างมั่นใจ และกลับมาเรียนต่อได้โดยไม่เสียจังหวะ

เอกสารนี้เป็น product strategy และประสบการณ์ที่ระบบต้องส่งมอบ ส่วนกฎด้าน visual, component และ interaction อยู่ใน [DESIGN.md](DESIGN.md)

## Product Register

- Product: MilerDev
- Category: Thai-language coding LMS และ course commerce platform
- Primary experience: เรียน coding ผ่านคอร์ส วิดีโอ บทเรียน และโปรเจกต์
- Secondary experience: ค้นหาคอร์ส ซื้อคอร์ส จัดการ progress ใบประกาศ และงานปฏิบัติการของทีม
- Brand direction: Swiss Editorial + Minimal Modern + Developer-focused Dark/Light System

## Product Thesis

MilerDev ไม่ควรให้ความรู้สึกเหมือน marketplace ที่มีรายการคอร์สจำนวนมาก แต่ควรให้ความรู้สึกเหมือน coding studio ที่มีเส้นทางชัดเจนและพาผู้เรียนลงมือทำได้จริง

ผู้เรียนควรตอบคำถามเหล่านี้ได้ภายในเวลาไม่นาน:

1. ฉันกำลังจะสร้างหรือทำอะไรได้
2. คอร์สนี้เหมาะกับระดับและเป้าหมายของฉันหรือไม่
3. ฉันควรเริ่มจากจุดไหน
4. ราคาและขั้นตอนสมัครมีความชัดเจนและปลอดภัยหรือไม่
5. หลังจากกลับมาเรียน ฉันควรทำอะไรต่อ

## Users

### Learners

ผู้เรียนหลักเป็นคนไทยที่ต้องการพัฒนาทักษะ web development และ programming ตั้งแต่ผู้เริ่มต้น นักศึกษา คนที่เตรียม portfolio ไปจนถึง developer ที่ต้องการต่อยอดไปสู่โปรเจกต์จริง

ผู้เรียนมักเข้ามาด้วยเป้าหมายที่จับต้องได้ เช่น:

- เข้าใจ HTML, CSS และ JavaScript ตั้งแต่พื้นฐาน
- สร้างเว็บหรือ web application ที่ใช้งานได้จริง
- เรียน React, Next.js, Node.js หรือฐานข้อมูลอย่างเป็นระบบ
- มีผลงานสำหรับ portfolio หรือการสมัครงาน
- กลับมาเรียนต่อจากบทเรียนเดิมโดยไม่ต้องจำว่าเคยหยุดไว้ตรงไหน

### Instructors

ผู้สอนต้องสื่อสารผลลัพธ์ของคอร์ส สร้างบทเรียน จัดลำดับเนื้อหา อัปเดตสื่อ และติดตามคุณภาพของหลักสูตรได้โดยไม่ต้องต่อสู้กับเครื่องมือที่ซับซ้อน

### Admins and Operators

ผู้ดูแลระบบต้องจัดการคอร์ส บทเรียน bundle การสมัคร การชำระเงิน ใบประกาศ ผู้ใช้ บทความ และประกาศได้อย่างรวดเร็ว ตรวจสอบสถานะได้ชัดเจน และกู้คืนจากข้อผิดพลาดได้

## Core User Jobs

### Discover

ช่วยผู้เรียนค้นหาเส้นทางและคอร์สที่เหมาะกับเป้าหมาย โดยแสดง outcome, level, lesson count, ราคา และ next action อย่างชัดเจน

### Decide

ช่วยให้ผู้เรียนตัดสินใจโดยใช้ข้อมูลจริง ไม่ใช้คำโฆษณาที่เกินหลักฐาน หน้าคอร์สต้องสื่อว่าเหมาะกับใคร ต้องมีพื้นฐานอะไร และจะสร้างอะไรได้

### Enroll

ทำให้การสมัครและชำระเงินโปร่งใส ตรวจสอบได้ และไม่ทำให้ผู้เรียนกังวลเรื่องสิทธิ์การเข้าถึงหรือสถานะการชำระเงิน

### Learn

ทำให้การเรียนเป็น flow ต่อเนื่อง: เปิดบทเรียน เข้าใจเนื้อหา ทำตามตัวอย่าง ทำแบบฝึกหัดหรือโปรเจกต์ และไปบทถัดไปได้ทันที

### Return

เมื่อผู้เรียนกลับมา ระบบต้องพาไปยังคอร์สและบทเรียนที่ควรเรียนต่อ พร้อมแสดง progress และ next action ที่เข้าใจได้ทันที

### Operate

ทำให้ทีม MilerDev จัดการข้อมูลจำนวนมากได้อย่างมั่นใจ โดยเน้น table, filter, status, auditability และ action ที่ recover ได้

## Product Surface Model

| Surface | ผู้ใช้หลัก | Default mode | งานหลัก | ความรู้สึกที่ต้องส่งมอบ |
| --- | --- | --- | --- | --- |
| Public discovery | ผู้เยี่ยมชมและผู้เรียนใหม่ | Light Editorial | เข้าใจแบรนด์ ค้นหาเส้นทาง และเลือกคอร์ส | ชัด มีจังหวะ น่าเชื่อถือ |
| Commerce | ผู้ซื้อและผู้สมัคร | Light Editorial | ดูราคา สมัคร ชำระเงิน และตรวจสถานะ | โปร่งใส conservative และปลอดภัย |
| Learning | ผู้เรียนที่กำลังเรียน | Dark Focus | ดูวิดีโอ อ่านเนื้อหา ติดตามบทเรียน และเรียนต่อ | สงบ โฟกัส และ developer-native |
| Learner dashboard | ผู้เรียนที่กลับมา | Light Product | เรียนต่อ ดู progress ใบประกาศ และรายการชำระเงิน | กลับมาทำงานต่อได้เร็ว |
| Admin operations | Admin และ instructor | Light Operational | จัดการคอร์ส ผู้เรียน การเงิน และ content | หนาแน่น แต่ scan ง่ายและไม่ผิดพลาด |

## Experience Model

เส้นทางหลักของผู้เรียนควรเดินตามลำดับนี้:

1. เห็นเป้าหมายหรือปัญหาที่ตัวเองต้องการแก้
2. สำรวจเส้นทางหรือคอร์สที่เกี่ยวข้อง
3. อ่าน outcome, curriculum, ราคา และเงื่อนไขอย่างมั่นใจ
4. สมัครหรือชำระเงินโดยเห็นสถานะชัดเจน
5. เริ่มบทเรียนแรกได้ทันที
6. กลับมาเรียนต่อจาก progress ล่าสุด
7. จบคอร์สและได้รับหลักฐานความสำเร็จที่นำไปใช้ต่อได้

ทุกหน้าควรมี next action เดียวที่เด่นที่สุดในบริบทนั้น และไม่ควรบังคับให้ผู้ใช้เดาสิ่งที่ต้องทำต่อ

## Product Principles

### Lead with the learning job

เริ่มจากสิ่งที่ผู้เรียนต้องการสร้างหรือทำให้สำเร็จ ไม่เริ่มจากรายการ feature ของ platform

### Make outcomes concrete

ใช้ชื่อโปรเจกต์ ทักษะ และผลลัพธ์ที่สังเกตได้ แทนคำอย่าง “เก่งขึ้น” หรือ “ครบจบ” ที่ไม่มีเกณฑ์วัด

### Preserve focus during learning

หน้าเรียนให้ video, lesson content, progress และ next action อยู่เหนือ decoration, promotion และ navigation ที่ไม่จำเป็น

### Make commerce trustworthy

ราคา ส่วนลด payment status, enrollment status และ error recovery ต้องอ่านเข้าใจง่ายและไม่สร้างความคลุมเครือ

### Keep operations scannable

Admin และ instructor tools ต้องเหมาะกับงานซ้ำ ใช้ table และ filter เมื่อข้อมูลมีจำนวนมาก และให้ destructive action มีการยืนยันที่เหมาะสม

### Use visual change to signal work context

Light ใช้กับการค้นหา อ่าน และตัดสินใจ ส่วน dark ใช้กับการโฟกัส เรียน และเขียนโค้ด การเปลี่ยน mode ต้องมีเหตุผลจากงาน ไม่ใช่ decoration

## Dark and Light Product Model

MilerDev ใช้ Adaptive Dual System ไม่ใช่ global theme ที่เปลี่ยนทุกหน้าเหมือนกัน

- Public, course catalog, course detail, bundle, blog, checkout และ auth ใช้ Light เป็นค่าเริ่มต้น
- Learning และ code-oriented surface ใช้ Dark Focus เป็นค่าเริ่มต้น
- ผู้เรียนมี theme toggle ภายในหน้าเรียน และระบบจำ preference ของผู้เรียน
- Dashboard ใช้ Light Product เป็นค่าเริ่มต้นเพื่ออ่าน progress และรายการต่าง ๆ ได้ง่าย
- Admin ใช้ Light Operational เป็นค่าเริ่มต้นเพื่อความชัดเจนของตารางและ status
- ทุก mode ใช้ semantic roles เดียวกัน สี success, warning, danger และ focus ต้องสื่อความหมายคงที่

## Brand and Content Voice

บุคลิกของ MilerDev คือ precise, calm, technical และ friendly ภาษาต้องเหมือนผู้สอนที่เข้าใจงานจริงและช่วยให้ผู้เรียนตัดสินใจได้ ไม่ใช่เสียงโฆษณาที่เร่งเร้า

### Voice rules

- ตรงและเป็นธรรมชาติในภาษาไทย
- ใช้คำกริยาที่บอก action และ outcome
- อธิบาย technical terms ด้วยคำที่ผู้เรียนใช้จริง
- รักษา tone ที่เป็นมิตรโดยไม่ infantilize ผู้เรียน
- ใช้ English เฉพาะคำที่เป็นศัพท์วงการหรือชื่อ technology

### Avoid

- คำโฆษณาที่ไม่มีหลักฐาน เช่น “เปลี่ยนชีวิต”, “ดีที่สุด”, “ครบจบในที่เดียว”
- ข้อความที่ทำให้ผู้เรียนรู้สึกผิดที่ยังเรียนไม่จบ
- CTA ที่ไม่บอกว่าจะเกิดอะไร เช่น “คลิกที่นี่” หรือ “ดูเพิ่มเติม”
- การใช้ความเร่งด่วนปลอมกับ payment หรือ enrollment

### CTA vocabulary

- เริ่มเรียน
- ดูคอร์สทั้งหมด
- ดูรายละเอียดคอร์ส
- เรียนต่อ
- ไปบทถัดไป
- สมัครคอร์ส
- ตรวจสอบการชำระเงิน
- ดาวน์โหลดใบประกาศ

## Trust and Commerce Requirements

- ราคาและราคาโปรโมชั่นต้องแสดงอย่างชัดเจน พร้อมเงื่อนไขที่เกี่ยวข้อง
- สถานะ payment และ enrollment ต้องมี label ที่อ่านได้ ไม่ใช้สีอย่างเดียว
- การส่งสลิปหรือการตรวจสอบ payment ต้องแจ้งสถานะ pending, verifying, completed และ failed อย่างปลอดภัย
- Duplicate submission และ webhook retry ต้องไม่สร้าง enrollment ซ้ำ
- Error message ให้บอก next recovery action โดยไม่เปิดเผย implementation detail หรือ secret
- ข้อมูลการชำระเงินและข้อมูลส่วนตัวต้องไม่ปรากฏใน log ที่ไม่จำเป็น

## Accessibility and Inclusion

- ตั้งเป้า WCAG AA สำหรับ text, controls และ status
- Body text ภาษาไทยใช้ line-height โดยทั่วไปประมาณ 1.7 ถึง 1.8
- ทุก keyboard interaction ต้องมี focus-visible state ที่มองเห็นได้
- Touch target ขั้นต่ำ 40x40px และ control สำคัญควรใหญ่กว่านั้นเมื่อเหมาะสม
- Icon-only control ต้องมี accessible label
- Error, progress และ status ต้องไม่ใช้สีเป็นสัญญาณเดียว
- Learning video และ content ต้องมี heading hierarchy ที่ถูกต้อง
- Motion ต้องเคารพ `prefers-reduced-motion`
- รองรับข้อความยาว ภาษาไทยที่ไม่มีการเว้นวรรคแบบภาษาอังกฤษ และ viewport แคบ

## Success Signals

ความสำเร็จของ product ควรติดตามจากพฤติกรรมที่บอกว่าผู้ใช้ทำงานสำเร็จ ไม่ใช่เพียงจำนวน page views

- ผู้ใช้ใหม่เข้าใจเส้นทางและเปิดดูคอร์สที่เกี่ยวข้องได้เร็วขึ้น
- Course detail มีการเริ่ม checkout หรือ enrollment ที่มีคุณภาพมากขึ้น
- ผู้เรียนกลับมาเริ่มจากบทเรียนล่าสุดได้โดยไม่ต้องค้นหาเอง
- อัตราการไปบทถัดไปและการกลับมาเรียนต่อดีขึ้น
- Payment และ enrollment มีสถานะค้างหรือ duplicate น้อยลง
- Admin ใช้เวลาน้อยลงในการค้นหา แก้ไข และตรวจสอบรายการ
- Support request ที่เกิดจากความสับสนเรื่องราคา สถานะ และ access ลดลง

## Scope and Non-goals

### In scope

- Product language และ information hierarchy
- Adaptive light/dark surface model
- Shared design tokens และ component vocabulary
- Public, learning, dashboard และ admin page patterns
- Accessibility, responsive behavior, motion และ state rules

### Not a goal of this redesign alone

- เปลี่ยน business model หรือ pricing strategy
- เปลี่ยนระบบ payment provider หรือ database schema
- เพิ่ม feature ที่ไม่ช่วย discovery, enrollment, learning หรือ operations
- ทำให้ทุกหน้ามี dark mode เพียงเพื่อความสม่ำเสมอ
- สร้าง visual decoration ที่ทำให้ content หรือ action สำคัญอ่านยากขึ้น

## Decision Record

- Direction: Swiss Editorial + Minimal Modern + Developer-focused Dark/Light System
- Theme model: Adaptive Dual System
- Public default: Light Editorial
- Learning default: Dark Focus
- Dashboard and admin default: Light Product / Light Operational
- Learner theme control: toggle ภายใน learning surface และจำ preference
- Primary brand signal: electric blue `#02abff` สำหรับ action, focus, progress และ link สำคัญ
- Typography baseline: IBM Plex Sans Thai สำหรับ UI/body และ monospace สำหรับ code
