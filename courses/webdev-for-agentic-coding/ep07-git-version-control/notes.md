# EP07: Git & Version Control

## สิ่งที่จะได้เรียนรู้
- Version Control คืออะไร ทำไมต้องใช้
- Git Workflow พื้นฐาน
- คำสั่ง Git ที่ใช้บ่อย
- Branches
- GitHub & Remote Repositories
- .gitignore

---

## 1. Version Control คืออะไร

ระบบที่ **ติดตามการเปลี่ยนแปลง** ของไฟล์ตลอดเวลา — เหมือนเซฟเกมที่สามารถย้อนกลับไปจุดไหนก็ได้

### ทำไมต้องใช้
1. **ย้อนกลับ** — ทำพังก็ย้อนกลับได้
2. **ทำงานร่วมกัน** — หลายคนแก้โค้ดพร้อมกันได้โดยไม่ conflict
3. **ติดตาม** — รู้ว่าใครแก้อะไร เมื่อไหร่ ทำไม
4. **ทดลอง** — สร้าง branch ทดลองฟีเจอร์ใหม่โดยไม่กระทบโค้ดหลัก
5. **Agentic Coding** — AI tools ใช้ Git เป็นพื้นฐานในการจัดการโค้ด

---

## 2. Git คืออะไร

- **Distributed Version Control System** ที่ได้รับความนิยมที่สุดในโลก
- สร้างโดย Linus Torvalds (คนสร้าง Linux) ในปี 2005
- ทำงานแบบ **offline** ได้ — ไม่ต้องเชื่อมต่อ Internet ตลอดเวลา

### ติดตั้ง
- **Windows:** ดาวน์โหลดจาก [git-scm.com](https://git-scm.com/)
- **Mac:** `xcode-select --install` หรือ `brew install git`
- **Linux:** `sudo apt install git`

### ตั้งค่าครั้งแรก
```bash
git config --global user.name "ชื่อของคุณ"
git config --global user.email "email@example.com"
```

---

## 3. Git Workflow พื้นฐาน

```
Working Directory  →  Staging Area  →  Repository
   (แก้ไฟล์)         (git add)       (git commit)
```

### 3 พื้นที่ของ Git
| พื้นที่ | คืออะไร |
|---------|---------|
| **Working Directory** | ไฟล์จริงที่คุณกำลังแก้ไข |
| **Staging Area** | ไฟล์ที่ "เตรียมไว้" สำหรับ commit ถัดไป |
| **Repository** | ประวัติทั้งหมดที่บันทึกไว้ (commits) |

---

## 4. คำสั่ง Git พื้นฐาน

### เริ่มต้น
```bash
# สร้าง Git repository ใหม่ในโฟลเดอร์ปัจจุบัน
git init

# Clone repo จาก GitHub
git clone https://github.com/user/repo.git
```

### ดูสถานะ
```bash
# ดูว่าไฟล์ไหนเปลี่ยน / ยังไม่ track / อยู่ใน staging
git status

# ดูรายละเอียดการเปลี่ยนแปลง
git diff              # ไฟล์ที่ยังไม่ add
git diff --staged     # ไฟล์ที่ add แล้ว
```

### เพิ่มไฟล์เข้า Staging
```bash
git add index.html          # เฉพาะไฟล์
git add src/                 # ทั้งโฟลเดอร์
git add .                    # ทุกไฟล์ที่เปลี่ยน
git add -A                   # ทุกไฟล์ (รวมที่ลบ)
```

### Commit (บันทึกประวัติ)
```bash
git commit -m "feat: เพิ่มหน้า homepage"
git commit -am "fix: แก้ bug ใน navbar"   # add + commit (เฉพาะ tracked files)
```

### ดูประวัติ
```bash
git log                 # ประวัติทั้งหมด
git log --oneline       # แบบย่อ (1 บรรทัดต่อ commit)
git log --oneline -5    # 5 commits ล่าสุด
git log --graph         # แสดงเป็น graph (เห็น branches)
```

### ย้อนกลับ
```bash
# ยกเลิกการแก้ไข (ก่อน add)
git checkout -- file.txt
git restore file.txt          # Git 2.23+

# ยกเลิก staging (หลัง add แต่ก่อน commit)
git reset HEAD file.txt
git restore --staged file.txt  # Git 2.23+

# ย้อน commit (สร้าง commit ใหม่ที่ยกเลิกการเปลี่ยนแปลง)
git revert HEAD
```

---

## 5. Commit Messages ที่ดี

### รูปแบบ
```
type: คำอธิบายสั้นๆ ว่าทำอะไร
```

### Types ที่นิยม
| Type | ใช้เมื่อ | ตัวอย่าง |
|------|---------|----------|
| `feat` | เพิ่มฟีเจอร์ใหม่ | `feat: เพิ่มหน้า login` |
| `fix` | แก้ bug | `fix: แก้ปุ่ม submit ไม่ทำงาน` |
| `style` | แก้ CSS / UI | `style: ปรับ navbar responsive` |
| `docs` | แก้เอกสาร | `docs: อัปเดต README` |
| `refactor` | ปรับโค้ดโดยไม่เปลี่ยนพฤติกรรม | `refactor: แยก component` |
| `chore` | งานทั่วไป | `chore: อัปเดต dependencies` |

### ตัวอย่าง ❌ vs ✅
```
❌ "fix"
❌ "update"
❌ "asdf"
✅ "fix: แก้ bug ราคาแสดงผิดในหน้า checkout"
✅ "feat: เพิ่มระบบ dark mode"
✅ "style: ปรับ card layout ให้ responsive"
```

---

## 6. Branches — แยกสายการทำงาน

### สร้างและสลับ Branch
```bash
# ดู branches ทั้งหมด
git branch

# สร้าง branch ใหม่
git branch feature-login

# สลับไป branch
git checkout feature-login

# สร้าง + สลับ (shortcut)
git checkout -b feature-login
git switch -c feature-login    # Git 2.23+
```

### Merge Branch
```bash
# กลับไป main ก่อน
git checkout main

# รวม feature branch เข้า main
git merge feature-login

# ลบ branch ที่ merge แล้ว
git branch -d feature-login
```

### Branch Strategy
- `main` / `master` — โค้ดหลัก (production)
- `develop` — โค้ดพัฒนา
- `feature/xxx` — ฟีเจอร์ใหม่
- `fix/xxx` — แก้ bug
- `hotfix/xxx` — แก้ bug เร่งด่วนใน production

---

## 7. GitHub & Remote Repositories

### GitHub คืออะไร
- บริการเก็บ Git repository บน **Cloud**
- ทำงานร่วมกัน, Code Review, CI/CD
- ทางเลือกอื่น: GitLab, Bitbucket

### คำสั่ง Remote
```bash
# เชื่อมต่อกับ remote repo
git remote add origin https://github.com/you/repo.git

# ดู remote ที่เชื่อมต่อ
git remote -v

# ส่งโค้ดขึ้น GitHub
git push -u origin main     # ครั้งแรก
git push                     # ครั้งต่อไป

# ดึงโค้ดจาก GitHub
git pull                     # ดึง + merge
git fetch                    # ดึงข้อมูลมาดูก่อน (ไม่ merge)

# Clone repo
git clone https://github.com/user/repo.git
```

### Pull Request (PR)
1. สร้าง branch ใหม่ → push ขึ้น GitHub
2. ไปที่ GitHub → สร้าง Pull Request
3. ทีม review โค้ด → อนุมัติ
4. Merge PR → โค้ดเข้า main

---

## 8. .gitignore

ไฟล์ที่บอก Git ว่า **ไม่ต้อง track** ไฟล์เหล่านี้

```gitignore
# Dependencies
node_modules/

# Environment variables
.env
.env.local
.env.production

# Build output
.next/
dist/
build/
out/

# OS files
.DS_Store
Thumbs.db

# Editor
.vscode/settings.json
.idea/

# Logs
*.log
npm-debug.log*
```

> ⚠️ **สำคัญมาก:** ห้าม commit ไฟล์ `.env` ที่มี API keys, passwords, หรือ secrets!

---

## 9. Git Workflow ประจำวัน

```bash
# 1. ดึงโค้ดล่าสุด
git pull

# 2. สร้าง branch สำหรับงานใหม่
git checkout -b feature-contact-form

# 3. เขียนโค้ด / แก้ไข
# ... coding ...

# 4. ดูสถานะ
git status

# 5. เพิ่มไฟล์ที่แก้
git add .

# 6. Commit
git commit -m "feat: เพิ่มฟอร์มติดต่อ"

# 7. Push ขึ้น GitHub
git push -u origin feature-contact-form

# 8. สร้าง Pull Request บน GitHub
# 9. Review → Merge → Done!
```

---

## แบบฝึกหัด

### ฝึกหัดที่ 1: First Commit
1. สร้างโฟลเดอร์ใหม่ → `git init`
2. สร้างไฟล์ `index.html` → เขียน HTML พื้นฐาน
3. `git add .` → `git commit -m "feat: initial commit"`
4. แก้ไขไฟล์ → commit อีกครั้ง
5. ใช้ `git log --oneline` ดูประวัติ

### ฝึกหัดที่ 2: Branching
1. สร้าง branch `feature-about`
2. เพิ่มไฟล์ `about.html` → commit
3. กลับไป `main` → สร้าง branch `feature-contact`
4. เพิ่มไฟล์ `contact.html` → commit
5. Merge ทั้งสอง branch กลับ main

### ฝึกหัดที่ 3: GitHub
1. สร้าง repo ใหม่บน GitHub
2. เชื่อมต่อ local repo กับ GitHub
3. Push โค้ดขึ้น GitHub
4. ลองแก้ไขไฟล์บน GitHub → Pull กลับมา

---

## อ่านเพิ่มเติม
- [Git Documentation](https://git-scm.com/doc)
- [GitHub Docs](https://docs.github.com/)
- [Atlassian Git Tutorial](https://www.atlassian.com/git/tutorials)
