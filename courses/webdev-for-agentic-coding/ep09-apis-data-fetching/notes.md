# EP09: API & การดึงข้อมูล (APIs & Data Fetching)

## สิ่งที่จะได้เรียนรู้
- API คืออะไร
- REST API & HTTP Methods
- JSON format
- Fetch API & async/await
- Error Handling
- Loading States

---

## 1. API คืออะไร

**API** = **A**pplication **P**rogramming **I**nterface

- "ช่องทาง" ที่ให้โปรแกรมคุยกัน
- เว็บไซต์ใช้ API เพื่อดึงข้อมูลจาก Server โดยไม่ต้อง refresh หน้า
- ตัวอย่าง: แอป weather ดึงข้อมูลอากาศจาก weather API

### เปรียบเทียบ
เหมือน **พนักงานเสิร์ฟ** ในร้านอาหาร:
- คุณ (Client) → สั่งอาหาร (Request)
- พนักงาน (API) → ไปบอกครัว (Server)
- ครัว (Server) → ทำอาหาร (Process)
- พนักงาน (API) → เสิร์ฟอาหาร (Response)

---

## 2. REST API

### REST คืออะไร
- **RE**presentational **S**tate **T**ransfer
- รูปแบบการออกแบบ API ที่ได้รับความนิยมที่สุด
- ใช้ **HTTP Methods** + **URL** เพื่อระบุการกระทำ

### CRUD Operations
| Operation | HTTP Method | URL | ทำอะไร |
|-----------|-------------|-----|--------|
| **C**reate | POST | `/api/users` | สร้าง user ใหม่ |
| **R**ead | GET | `/api/users` | ดึง users ทั้งหมด |
| **R**ead | GET | `/api/users/1` | ดึง user ID 1 |
| **U**pdate | PUT/PATCH | `/api/users/1` | อัปเดต user ID 1 |
| **D**elete | DELETE | `/api/users/1` | ลบ user ID 1 |

### API Response
```json
// GET /api/users → ได้ array ของ users
[
  { "id": 1, "name": "สมชาย", "email": "somchai@email.com" },
  { "id": 2, "name": "สมหญิง", "email": "somying@email.com" }
]

// GET /api/users/1 → ได้ user เดียว
{ "id": 1, "name": "สมชาย", "email": "somchai@email.com" }

// POST /api/users → ได้ user ที่สร้างใหม่
{ "id": 3, "name": "สมศักดิ์", "email": "somsak@email.com" }
```

---

## 3. JSON — JavaScript Object Notation

### รูปแบบ JSON
```json
{
  "id": 1,
  "name": "สมชาย",
  "email": "somchai@email.com",
  "age": 25,
  "isActive": true,
  "skills": ["HTML", "CSS", "JavaScript"],
  "address": {
    "city": "กรุงเทพ",
    "country": "ไทย"
  },
  "avatar": null
}
```

### กฎของ JSON
- Key ต้องอยู่ใน `" "` เสมอ (double quotes)
- Value เป็นได้: string, number, boolean, array, object, null
- ไม่มี comment ใน JSON
- ไม่มี trailing comma

### แปลง JSON ⟷ JavaScript
```javascript
// JSON string → JavaScript object
const obj = JSON.parse('{"name": "สมชาย"}');

// JavaScript object → JSON string
const json = JSON.stringify({ name: "สมชาย" });
```

---

## 4. Fetch API

### GET — ดึงข้อมูล
```javascript
// แบบง่าย
const response = await fetch("https://api.example.com/users");
const users = await response.json();
console.log(users);
```

### POST — ส่งข้อมูล
```javascript
const response = await fetch("https://api.example.com/users", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "สมชาย",
    email: "somchai@email.com",
  }),
});
const newUser = await response.json();
```

### PUT — อัปเดตข้อมูล
```javascript
const response = await fetch("https://api.example.com/users/1", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "สมชาย (แก้ไขแล้ว)",
  }),
});
```

### DELETE — ลบข้อมูล
```javascript
const response = await fetch("https://api.example.com/users/1", {
  method: "DELETE",
});
```

---

## 5. Async / Await

### ทำไมต้อง async/await
- การดึงข้อมูลจาก API ใช้เวลา (ส่ง request → รอ response)
- JavaScript ไม่รอ — ทำงานต่อทันที (Asynchronous)
- `async/await` ทำให้เราเขียนโค้ดที่ "รอ" ได้อย่างอ่านง่าย

### วิธีใช้
```javascript
// ฟังก์ชันต้องมี async
async function getUsers() {
  const response = await fetch("/api/users");  // รอ response
  const data = await response.json();          // รอ parse JSON
  return data;
}

// Arrow function
const getUsers = async () => {
  const response = await fetch("/api/users");
  const data = await response.json();
  return data;
};
```

### Promise (แบบเก่า — ดูเป็น chain)
```javascript
fetch("/api/users")
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => console.error(error));
```

> 💡 `async/await` อ่านง่ายกว่า `.then()` chain มาก — แนะนำใช้ async/await

---

## 6. Error Handling

### ประเภท Errors
| ประเภท | สาเหตุ | วิธีจัดการ |
|--------|--------|-----------|
| **Network Error** | ไม่มี Internet, Server ล่ม | `catch` block |
| **HTTP Error** | 404, 403, 500 | ตรวจ `response.ok` |
| **Parse Error** | Response ไม่ใช่ JSON | `try/catch` ตอน `.json()` |
| **Validation Error** | ข้อมูลไม่ถูกต้อง | อ่าน error message จาก response |

### Error Handling Pattern
```javascript
async function fetchData(url) {
  try {
    const response = await fetch(url);

    // ตรวจ HTTP status
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Network error หรือ error ที่เรา throw
    console.error("เกิดข้อผิดพลาด:", error.message);
    return null;
  }
}
```

### HTTP Status Codes ที่พบบ่อย
| Status | ความหมาย | ผู้ใช้ควรเห็นอะไร |
|--------|----------|-------------------|
| 200 | สำเร็จ | แสดงข้อมูล |
| 400 | ข้อมูลไม่ถูกต้อง | "กรุณาตรวจสอบข้อมูล" |
| 401 | ไม่ได้ login | "กรุณาเข้าสู่ระบบ" |
| 403 | ไม่มีสิทธิ์ | "คุณไม่มีสิทธิ์เข้าถึง" |
| 404 | ไม่พบข้อมูล | "ไม่พบข้อมูลที่ต้องการ" |
| 500 | Server พัง | "เกิดข้อผิดพลาด กรุณาลองใหม่" |

---

## 7. Loading States

ทุกการดึงข้อมูลต้องจัดการ **3 สถานะ**:

```javascript
let loading = true;   // กำลังโหลด?
let error = null;     // มี error?
let data = null;      // ข้อมูลที่ได้

async function loadUsers() {
  loading = true;
  error = null;

  try {
    const response = await fetch("/api/users");
    if (!response.ok) throw new Error("Failed to fetch");
    data = await response.json();
  } catch (e) {
    error = e.message;
  } finally {
    loading = false;
  }
}
```

### แสดงผลตามสถานะ
```javascript
if (loading) {
  // แสดง spinner หรือ skeleton
  showSpinner();
} else if (error) {
  // แสดง error message + ปุ่ม retry
  showError(error);
} else if (data) {
  // แสดงข้อมูล
  renderUsers(data);
}
```

---

## 8. Headers & Authentication

### Common Headers
```javascript
const response = await fetch("/api/data", {
  headers: {
    "Content-Type": "application/json",       // บอกว่าส่ง JSON
    "Authorization": "Bearer YOUR_TOKEN",     // Authentication
    "Accept": "application/json",             // ต้องการ response เป็น JSON
  },
});
```

### API Key
```javascript
// ส่ง API key ผ่าน header
const response = await fetch("https://api.example.com/data", {
  headers: {
    "X-API-Key": "your-api-key",
  },
});

// หรือส่งผ่าน query parameter
const response = await fetch(
  "https://api.example.com/data?api_key=your-api-key"
);
```

> ⚠️ **ห้ามใส่ API Key ใน client-side code!** ควรส่งผ่าน Server (API Route)

---

## 9. Public APIs สำหรับฝึก

| API | ข้อมูล | URL | ต้อง Key? |
|-----|--------|-----|-----------|
| JSONPlaceholder | Users, Posts (จำลอง) | jsonplaceholder.typicode.com | ❌ |
| PokéAPI | ข้อมูล Pokémon | pokeapi.co/api/v2 | ❌ |
| REST Countries | ข้อมูลประเทศ | restcountries.com | ❌ |
| Dog CEO | รูปสุนัข random | dog.ceo/api | ❌ |
| OpenWeather | สภาพอากาศ | openweathermap.org | ✅ (ฟรี) |

### ตัวอย่าง JSONPlaceholder
```javascript
// ดึง posts ทั้งหมด
const posts = await fetch("https://jsonplaceholder.typicode.com/posts")
  .then(res => res.json());

// ดึง post เดียว
const post = await fetch("https://jsonplaceholder.typicode.com/posts/1")
  .then(res => res.json());
```

---

## แบบฝึกหัด

### ฝึกหัดที่ 1: Fetch Users
1. ใช้ JSONPlaceholder API ดึงรายชื่อ users
2. แสดง users ในหน้าเว็บเป็นรายการ
3. เพิ่ม loading spinner ขณะรอข้อมูล

### ฝึกหัดที่ 2: Pokédex
1. ใช้ PokéAPI ดึงข้อมูล Pokémon ตัวแรก 20 ตัว
2. แสดงชื่อ + รูป
3. คลิกเพื่อดูรายละเอียด

### ฝึกหัดที่ 3: Search App
1. สร้างช่อง search ที่พิมพ์แล้วดึงข้อมูลจาก API
2. แสดงผลลัพธ์
3. จัดการ loading + error states

---

## อ่านเพิ่มเติม
- [MDN: Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [MDN: Using Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [MDN: async/await](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises)
- [JSONPlaceholder](https://jsonplaceholder.typicode.com/)
