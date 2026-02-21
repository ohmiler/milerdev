# EP10: เริ่มต้น Agentic Coding

## สิ่งที่จะได้เรียนรู้
- Agentic Coding คืออะไร ต่างจาก AI ทั่วไปอย่างไร
- เครื่องมือ Agentic Coding ที่มีอยู่
- วิธีเขียน Prompt ที่ดี
- วิธีอ่านและตรวจสอบโค้ดที่ AI สร้าง
- Workflow การทำงานกับ AI
- Best Practices & ข้อผิดพลาดที่ควรหลีกเลี่ยง

---

## 1. Agentic Coding คืออะไร

### AI Chatbot vs Agentic Coding

| | AI Chatbot (เดิม) | Agentic Coding (ใหม่) |
|--|-------------------|----------------------|
| **วิธีทำงาน** | ตอบคำถาม แนะนำโค้ด | อ่านโค้ด เขียนโค้ด รันคำสั่ง |
| **คุณต้องทำ** | Copy-paste โค้ดเอง | Review และ approve |
| **Context** | จำแค่ใน chat | อ่านทั้งโปรเจกต์ได้ |
| **ความสามารถ** | สร้างโค้ดชิ้นเดียว | แก้หลายไฟล์ รัน terminal ได้ |

### Agentic = มี Agency
- AI ไม่ใช่แค่ตอบคำถาม — มัน **ลงมือทำ** ได้จริง
- อ่าน codebase → วิเคราะห์ → เขียนโค้ด → รันทดสอบ → แก้ไข
- เหมือนมี **คู่โปรแกรมเมอร์** (Pair Programmer) ที่ทำงานให้คุณ

---

## 2. เครื่องมือ Agentic Coding

### IDE-based (ทำงานในตัว Editor)
| เครื่องมือ | จุดเด่น |
|-----------|---------|
| **Windsurf (Cascade)** | AI Agent เต็มรูปแบบ — อ่าน เขียน รันโค้ดใน IDE |
| **Cursor** | AI-powered editor — autocomplete + chat + composer |
| **GitHub Copilot** | AI autocomplete — เขียนโค้ดต่อให้อัตโนมัติ |

### Chat-based (ถามตอบ)
| เครื่องมือ | จุดเด่น |
|-----------|---------|
| **Claude** | เก่งเรื่อง coding ละเอียด อธิบายดี |
| **ChatGPT** | เอนกประสงค์ ใช้งานหลากหลาย |
| **Gemini** | รวม Google services |

### เลือกใช้อะไรดี
- **เริ่มต้น:** Windsurf หรือ Cursor (ฟรี + ทำงานใน IDE)
- **เสริม:** Claude/ChatGPT สำหรับถามคำถามหรืออธิบาย concept

---

## 3. AI อ่านโค้ดอย่างไร

AI เข้าใจโปรเจกต์จาก:

1. **ชื่อไฟล์ & โฟลเดอร์** — `UserProfile.tsx` บอกว่าเป็น component แสดงโปรไฟล์
2. **Import statements** — รู้ว่าใช้ library อะไร เช่น React, Next.js, Tailwind
3. **Type definitions** — TypeScript types ช่วย AI เข้าใจรูปแบบข้อมูล
4. **Function/Variable names** — ชื่อที่สื่อความหมาย = AI เข้าใจจุดประสงค์
5. **Comments & README** — context เพิ่มเติมเกี่ยวกับโปรเจกต์
6. **Error messages** — ข้อมูลสำคัญสำหรับ debug

> ✅ **ยิ่งโค้ดเขียนดี ตั้งชื่อชัด มี type** → **AI ยิ่งช่วยได้ดีขึ้น!**

---

## 4. วิธีเขียน Prompt ที่ดี

### สูตร: Context + Task + Details + Constraints

```
บริบท: "ในโปรเจกต์ Next.js ที่ใช้ Tailwind CSS และ TypeScript..."
งาน: "สร้าง component สำหรับแสดง user card..."
รายละเอียด: "ต้องมีรูป avatar, ชื่อ, email, ปุ่ม follow..."
ข้อจำกัด: "ต้อง responsive, รองรับ dark mode, ไม่ใช้ library เพิ่ม..."
```

### ตัวอย่าง Prompt ที่ดี

#### สร้างฟีเจอร์ใหม่
```
สร้างหน้า login ด้วย Next.js + Tailwind CSS ที่มี:
- ช่อง email (มี validation)
- ช่อง password
- ปุ่ม "เข้าสู่ระบบ"
- ลิงก์ "ลืมรหัสผ่าน"
- รองรับ responsive (mobile + desktop)
```

#### แก้ bug
```
แก้ bug: เมื่อกดปุ่ม "ส่ง" ในฟอร์มติดต่อ หน้าเว็บ refresh
แทนที่จะส่งข้อมูลผ่าน API

ไฟล์ที่เกี่ยวข้อง: src/components/ContactForm.tsx
Error ใน console: ไม่มี error แต่หน้า refresh

คาดว่าน่าจะลืม e.preventDefault() ใน onSubmit handler
```

#### อธิบายโค้ด
```
อธิบายโค้ดในไฟล์ src/lib/auth.ts ให้หน่อย
โดยเฉพาะส่วน middleware ที่ตรวจสอบ JWT token
อธิบายเป็นภาษาไทย ให้เข้าใจง่ายสำหรับมือใหม่
```

### เทคนิคเพิ่มเติม
- **ให้ตัวอย่าง** — "เหมือน component X ที่มีอยู่แล้ว"
- **บอก style** — "ใช้ Tailwind ไม่ใช้ inline CSS"
- **บอก framework** — "ใช้ React hooks ไม่ใช้ class component"
- **แบ่งงานย่อย** — ทำทีละส่วน ไม่ใช่ทีละโปรเจกต์
- **ให้ error message** — copy error จาก Console ให้ AI อ่าน

---

## 5. อ่านและตรวจสอบโค้ดที่ AI สร้าง

### Checklist ก่อน Accept
- [ ] **อ่านทุกบรรทัด** — เข้าใจว่าโค้ดทำอะไร
- [ ] **ตรวจ imports** — library ที่ใช้มีอยู่ในโปรเจกต์ไหม
- [ ] **ตรวจ logic** — ถูกต้องตาม requirements ไหม
- [ ] **ตรวจ naming** — ตั้งชื่อเหมาะสม ตรง convention ไหม
- [ ] **ตรวจ security** — ไม่มี hardcoded secrets, ไม่มีช่องโหว่
- [ ] **ทดสอบ** — รันจริง ทดสอบ happy path + edge cases
- [ ] **ดู DevTools** — ไม่มี error ใน Console, Network ถูกต้อง

### สิ่งที่ AI มักทำผิด
| ปัญหา | วิธีตรวจ |
|--------|---------|
| ใช้ API/function ที่ไม่มีอยู่ | ตรวจ docs ของ library |
| Import path ผิด | ตรวจว่าไฟล์อยู่ตรงที่ระบุจริง |
| Logic ไม่สมบูรณ์ | ทดสอบ edge cases (ค่าว่าง, null, error) |
| ไม่ handle error | ตรวจว่ามี try/catch |
| ลืม responsive | ทดสอบบนมือถือ (Device Mode) |
| Outdated code | ตรวจ version ของ library ที่ใช้ |

---

## 6. Agentic Coding Workflow

### ขั้นตอน
```
1. วางแผน     → คิดก่อนว่าจะทำอะไร
2. Commit      → บันทึกจุดปัจจุบัน (safety net)
3. สั่ง AI     → เขียน prompt ชัดเจน
4. Review      → อ่านโค้ดที่ AI สร้าง
5. ทดสอบ      → รันจริง ดู DevTools
6. ปรับแก้     → แก้ไขถ้าไม่ถูกต้อง
7. Commit      → บันทึกเมื่อสำเร็จ
8. ทำซ้ำ      → กลับขั้นตอน 1
```

### เคล็ดลับ
- **Commit ก่อนให้ AI แก้โค้ดใหญ่** — ย้อนกลับได้ถ้าพัง
- **ทำทีละส่วน** — ไม่ให้ AI ทำทุกอย่างในคำสั่งเดียว
- **ใช้ Git branch** — ทดลองฟีเจอร์ใหม่ใน branch แยก
- **ดู diff ก่อน commit** — ตรวจว่า AI แก้อะไรบ้าง

---

## 7. พื้นฐาน Web Dev ช่วย Agentic Coding อย่างไร

| EP | ความรู้ | ช่วยอย่างไร |
|----|---------|------------|
| EP01 | How Web Works | เข้าใจ client-server, HTTP, URLs |
| EP02 | HTML | อ่าน/แก้ HTML ที่ AI สร้าง |
| EP03 | CSS | ปรับ UI, layout, responsive |
| EP04 | JavaScript | เข้าใจ logic, debug โค้ด |
| EP05 | DevTools | หา error, ดู network, debug |
| EP06 | Terminal | รันคำสั่ง, install packages |
| EP07 | Git | ย้อนกลับเมื่อพัง, ทำงานเป็นทีม |
| EP08 | Project Structure | จัดโครงสร้างที่ AI เข้าใจ |
| EP09 | APIs | เข้าใจ data flow, fetch data |

---

## 8. ข้อผิดพลาดที่ควรหลีกเลี่ยง

1. **Accept โดยไม่อ่าน** — AI เขียนผิดบ่อย ต้องอ่านทุกครั้ง
2. **ไม่เข้าใจโค้ดที่ AI สร้าง** — ถ้าไม่เข้าใจ ถาม AI ให้อธิบาย!
3. **ไม่ใช้ Git** — พอ AI ทำพัง ย้อนกลับไม่ได้
4. **Prompt ไม่ชัด** — ผลลัพธ์ไม่ตรง → เสียเวลาแก้
5. **ไม่ทดสอบ** — โค้ดดูถูกแต่รันจริงไม่ทำงาน
6. **พึ่ง AI 100%** — ต้องมีพื้นฐานเพื่อ verify
7. **ไม่เรียนรู้** — ใช้ AI สร้างโค้ดแต่ไม่อ่าน = ไม่พัฒนาตัวเอง

---

## 9. Best Practices

1. **Commit บ่อยๆ** — ก่อนให้ AI แก้โค้ดใหญ่ commit ก่อนเสมอ
2. **เริ่มจากเล็กไปใหญ่** — ให้ AI ทำทีละส่วน ไม่ใช่ทั้งโปรเจกต์ทีเดียว
3. **ถามให้อธิบาย** — ไม่เข้าใจอะไร ถาม AI ได้เสมอ
4. **เรียนรู้จากโค้ดที่ AI สร้าง** — ใช้เป็นสื่อการเรียนรู้
5. **ฝึกเขียนเองด้วย** — ไม่ควรพึ่ง AI 100%
6. **ทดสอบเสมอ** — รัน, ดู DevTools, ทดสอบ edge cases
7. **อ่าน Documentation** — AI อาจจะ outdated ให้ตรวจ docs ล่าสุดเสมอ

---

## 10. เส้นทางการเรียนรู้ต่อ

### ระดับ 1: เริ่มต้น
- ใช้ AI สร้างหน้าเว็บง่ายๆ (HTML/CSS/JS)
- ปรับแต่ง, แก้ไข, deploy ขึ้น Netlify/Vercel
- ฝึก Git workflow

### ระดับ 2: กลาง
- สร้าง React/Next.js app
- ใช้ API ดึงข้อมูลจริง
- ทำ responsive design
- เพิ่ม features ด้วย AI

### ระดับ 3: ขั้นสูง
- Full-stack app (frontend + backend + database)
- Authentication (login/register)
- Deploy to production (Railway, Vercel, etc.)
- CI/CD pipeline

### ระดับ 4: มืออาชีพ
- สร้างโปรเจกต์จริงที่ใช้งานได้
- ขาย/เปิดบริการ
- ทำงานเป็น Developer
- สอนคนอื่น

---

## แบบฝึกหัด

### ฝึกหัดที่ 1: สร้างเว็บแรกด้วย AI
1. เปิด Windsurf (หรือ AI tool ที่ชอบ)
2. สั่ง AI สร้างหน้า Portfolio ส่วนตัวที่มี: header, about, skills, contact
3. Review โค้ด → ปรับแต่ง → Deploy

### ฝึกหัดที่ 2: Debug ด้วย AI
1. สร้างเว็บที่มี bug ตั้งใจ (เช่น ลืม preventDefault)
2. Copy error จาก DevTools
3. ส่ง error ให้ AI แก้ → ตรวจสอบว่าแก้ถูกไหม

### ฝึกหัดที่ 3: Full Project
1. วางแผนเว็บ Todo App
2. ให้ AI สร้างทีละส่วน (UI → Logic → Storage)
3. Review + Test แต่ละส่วน
4. Deploy ขึ้น Vercel/Netlify

---

## อ่านเพิ่มเติม
- [Windsurf Documentation](https://docs.windsurf.com/)
- [Cursor Documentation](https://cursor.sh/docs)
- [GitHub Copilot](https://github.com/features/copilot)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
