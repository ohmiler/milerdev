# Learning workspace and continuity specimen

สถานะ: รอความเห็นจาก owner

Ticket: [[UI Improvement] ปรับปรุง learning workspace และ learning continuity](https://github.com/ohmiler/milerdev/issues/23)

ขอบเขตนี้เป็น localized planning specimen สำหรับ `/courses/[slug]/learn`, `/courses/[slug]/learn/[lessonId]`, learning workspace components, player event bridge และ `/api/progress` เท่านั้น ยังไม่แก้ source code, schema, enrollment/payment/certificate policy, production data หรือ Bunny library settings

## Design thesis

รักษา Academy-light workspace และ one-way completion UI ตาม ADR 0006 แต่ทำให้คำว่า “เรียนต่อ” เป็น contract ที่ตรวจสอบได้:

1. กลับเข้าบทที่เหมาะสม
2. เห็นว่าค้างตรงไหนและสถานะใดถูกบันทึกแล้ว
3. ไปบทก่อนหน้า/ถัดไปหรือค้นหาบทอื่นได้โดยไม่เสียบริบท
4. เมื่อ player หรือการบันทึกล้มเหลว มี recovery action ที่อยู่ใน workspace เดิม

งานนี้ไม่ redesign shell ใหม่ ไม่เพิ่ม module/section model และไม่เพิ่ม auto-next สิ่งที่ต้องแก้ก่อน visual polish คือ server-to-client data boundary และ player event boundary เพราะทั้งสองจุดมีผลต่อสิทธิ์เข้าถึงและความถูกต้องของ progress

หลักที่ต้องรักษา:

- server-side enrollment/free-preview checks เป็น authority
- signed Bunny URL และ server-side rich-content sanitization ยังอยู่ฝั่ง server
- UI ส่ง `completed: true` เท่านั้น; ไม่มี uncomplete action
- วิดีโอจบแล้วบันทึก progress แต่ไม่เปลี่ยนบทอัตโนมัติ
- completed lesson และ completed course ยังเปิดทบทวนได้
- global ArrowLeft/ArrowRight navigation ไม่กลับมา
- progress หลักอยู่ใน curriculum; header มีเพียง compact summary
- curriculum ยังเป็น ordered flat lesson list และยังใช้ 20 รายการต่อหน้า

## 1. Canonical continuity vocabulary

| Term | Authority | ความหมายใน UI | ไม่ใช่ |
| --- | --- | --- | --- |
| บทที่เรียนต่อ | `selectContinuationLesson()` | บทที่ดูค้างล่าสุด; ถ้าไม่มีให้ใช้บทแรกที่ยังไม่ครบ; ถ้าครบทุกบทให้เริ่มทบทวนจากบทแรก | ตำแหน่งวิดีโอที่ resume แล้วเสมอ |
| ตำแหน่งที่ดูล่าสุด | `lessonProgress.watchTimeSeconds` ที่ server อ่านให้เจ้าของ | วินาทีสำหรับขอ seek หลัง trusted player ready | หลักฐานว่าเรียนจบ |
| เรียนครบทุกบท | completed lesson records ครบ current lesson set | เปิด review presentation ใน workspace | `enrollments.completedAt`, ใบรับรอง |
| เรียนจบบทนี้ | lesson progress record `completed = true` | สถานะ one-way ของบท | course completion |
| บทที่เปิดได้ | enrollment หรือ `isFreePreview` | link ไป lesson route ได้ | การมี URL ของวิดีโอใน client payload |
| บทที่ล็อก | ไม่มี enrollment และไม่ใช่ free preview | เปิด enrollment dialog; player ปัจจุบันไม่เปลี่ยน | hidden lesson record ที่ serialize มาฝั่ง client |

คำว่า “เรียนต่อจากจุดเดิม” ใช้ได้เมื่อ player seek สำเร็จเท่านั้น หากรองรับเพียงการกลับมาบทเดิม ให้ใช้ “กลับมาเรียนบทล่าสุด” เพื่อไม่สัญญาเกินระบบ

## 2. Current journey and preserved behavior

```text
/courses/{slug}/learn
├── ไม่มี session → Login พร้อม exact callbackUrl
├── ไม่มี enrollment/course → not found ตาม access contract เดิม
├── มีบทเรียน → selectContinuationLesson() → lesson route
└── ไม่มีบทเรียน → honest empty workspace + Dashboard/Course/Contact

/courses/{slug}/learn/{lessonId}
├── server ตรวจ course + lesson ownership + enrollment/free preview
├── server sanitize rich content และ sign Bunny URL ของบทปัจจุบัน
├── workspace: header → title → optional player → lesson status
│              → optional content → previous/next
├── desktop: curriculum rail ด้านซ้าย
└── mobile: curriculum เดิมใน Sheet ด้านซ้าย
```

สิ่งที่มีหลักฐานและต้องคงไว้:

- resume-selection tests ครอบคลุม new learner, watched unfinished, first incomplete และ all-complete review
- locked lesson ใช้ AlertDialog และคืน focus ให้ trigger
- mobile Sheet คืน focus ให้ curriculum trigger
- no-video/no-content และ empty-course states มีข้อความ/ทางออกที่ตรงไปตรงมา
- loading Skeleton mirror geometry ของ workspace
- focused baseline tests ผ่าน 14/14 เมื่อ 31 ส.ค. 2569

## 3. P0 — minimal server-to-client learning DTO

ปัจจุบัน lesson route ใช้ `.select()` กับ course, current lesson และทุก lesson แล้วส่ง objects เหล่านั้นเข้า `LearnPageClient` โดยตรง TypeScript interface ที่แคบกว่าไม่ได้ตัด fields ตอน serialize ดังนั้น browser อาจได้รับ `content` และ `videoUrl` ของบทที่ล็อก รวมถึง fields ที่ UI ไม่ใช้

ใช้ server-only read model/projection ที่ authorize ก่อนและคืน DTO ต่ำสุด:

```ts
type LearningCourseDTO = {
  id: string;
  slug: string;
  title: string;
};

type CurrentLessonDTO = {
  id: string;
  title: string;
  content: string | null;       // sanitized แล้ว
  playbackUrl: string | null;   // signed เมื่อเป็น Bunny
  videoDuration: number | null;
  isFreePreview: boolean;
};

type CurriculumLessonDTO = {
  id: string;
  title: string;
  videoDuration: number | null;
  isFreePreview: boolean;
};

type CurrentProgressDTO = {
  completed: boolean;
  watchTimeSeconds: number;
};
```

- current lesson content/playback URL ออกหลัง access check เท่านั้น
- curriculum projection ห้ามมี `content`, `videoUrl`, timestamps หรือ internal course fields
- locked lesson title/duration/free-preview เป็น catalog metadata เท่านั้น; URL/content ไม่ข้าม RSC boundary
- query ของ completed IDs และ current watch position จำกัดด้วย user + current course เสมอ
- เพิ่ม `import 'server-only'` ที่ read-model boundary และ test DTO keys โดยตรง

นี่สอดคล้องกับ [Next.js 16 Data Security](https://nextjs.org/docs/app/guides/data-security) ที่ให้ authorize ใน DAL/read boundary และส่ง safe minimal DTO เข้า Client Components

## 4. P0 — trusted player bridge and truthful resume

`BunnyPlayer` ปัจจุบันอ่าน `window.message` แบบ ad hoc แต่ไม่ตรวจ `event.source`, origin หรือ Player.js context และตีความ payload เป็น `data.currentTime` ขณะที่ Player.js ใช้ event subscription และ `value.seconds` การนับ watch time/ended จึงยังไม่มีหลักฐานว่าเชื่อถือได้ และ generic message สามารถชน callback ได้

ยืนยัน provider contract สำหรับ slice แรก:

### Bunny

- ใช้ Player.js integration ที่ Bunny รองรับ แทน global message parser ที่เขียนเอง
- subscribe `ready`, `play`, `pause`, `timeupdate`, `ended`, `error` จาก iframe instance เดียว
- รับ event เฉพาะ current iframe/provider origin; cleanup subscription เมื่อ URL/lesson เปลี่ยน
- `timeupdate.seconds` อัปเดต transient ref; sync ทุก 30 วินาที, pause, ended และ route cleanup ตามเดิม
- หลัง `ready` ให้ seek ไป `watchTimeSeconds` เมื่อมากกว่า threshold ที่ตกลง (เสนอ 10 วินาที) และน้อยกว่า `duration - 10` เพื่อไม่เปิดบทที่เกือบจบไว้ท้ายวิดีโอ
- แสดง inline status “กลับมาเรียนต่อที่ 08:42” เมื่อ seek สำเร็จ; ถ้า seek ไม่สำเร็จ player ยังเล่นจากต้นและไม่อ้างว่า resume สำเร็จ
- trusted `ended` เรียก completion เพียงครั้งเดียว; manual completion ยังอยู่และ idempotent

Bunny ประกาศว่า Stream player รองรับ [Player.js, events และ seek/current-time methods](https://bunny.net/blog/introducing-player-js-support-for-bunny-stream-advanced-player-control-and-monitoring-api/) และ [Player.js spec](https://github.com/embedly/player.js/blob/master/SPEC.rst) กำหนด `ready`, event subscription, `value.seconds` และ `setCurrentTime`

### YouTube/Vimeo/unknown legacy URLs

- ยังเล่นได้ตาม embed contract เดิม
- ใน slice นี้ไม่สัญญา exact-position resume หรือ automatic completion จนมี provider adapter ที่ตรวจสอบแล้ว
- status copy ใช้ “ทำเครื่องหมายว่าเรียนจบ” ไม่ใช้ “ดูวิดีโอจนจบแล้วระบบจะบันทึก” สำหรับ provider ที่ไม่มี trusted bridge
- ห้ามนำ raw cross-origin message มา map เป็น completion เพื่อเลียนแบบ Bunny

เพิ่ม `title={`วิดีโอบทเรียน ${lessonTitle}`}` ให้ iframe และทำ slow-load state เป็น recovery surface ที่มี “ลองโหลดวิดีโออีกครั้ง” พร้อมข้อความว่าความคืบหน้าที่ยัง sync ไม่สำเร็จอาจต้องลองใหม่

ไม่ย้าย Bunny library จาก legacy player ไป Player v2 ใน ticket นี้ เพราะเป็น production provider setting ที่ต้องทดสอบ captions, signed URLs และ player compatibility แยก

## 5. Completion state and failure recovery

สถานะบทเรียนอยู่จุดเดียวใต้ player/content และใช้ภาษาแยก lesson progress จาก course completion:

| Facts | Heading | Action |
| --- | --- | --- |
| free preview, anonymous | บทเรียนทดลองฟรี | สมัครเรียนจากหน้าคอร์ส |
| enrolled, incomplete | เรียนตามจังหวะของคุณ | ทำเครื่องหมายว่าเรียนจบ |
| completion pending | กำลังบันทึกบทเรียน… | disabled + Spinner |
| completion failed | ยังบันทึกบทนี้ไม่ได้ | ลองบันทึกอีกครั้ง |
| lesson completed | เรียนจบบทนี้แล้ว | ไม่มี uncomplete |
| all current lessons completed | ครบทุกบทแล้ว · โหมดทบทวน | เลือกบทเพื่อทบทวน |

- ใช้ inline `role="status"`/`aria-live="polite"` สำหรับ success และ retryable error; toast เป็น feedback เสริม
- success ของ last lesson บอกเพียง “ครบทุกบทแล้ว” ไม่สรุปว่า certificate พร้อม
- certificate/completion recovery ใช้ resolution ของ issue #22 และไม่สร้าง issuance logic ซ้ำใน workspace
- `/api/progress` เพิ่ม Zod validation สำหรับ `lessonId`, finite non-negative `watchTimeSeconds` และ optional boolean `completed` โดยคง auth, enrollment/free-preview authorization, monotonic watch time, rate limit และ public response contract
- contract ที่ API ยังรับ `completed: false` ไม่ถูกเปลี่ยนเงียบ ๆ ใน UI ticket นี้; ต้องตัดสินร่วมกับ completion/certificate implementation เพราะอาจกระทบ `completedAt`

## 6. Curriculum search and progress

รักษา curriculum เดียวสำหรับ desktop/Sheet และ progress bar จุดเดียว แต่ลด friction ของ search:

- search input ใช้ `name="lessonSearch"`, `autoComplete="off"`, `type="search"`, label เดิม และ placeholder “ค้นหาบทเรียน…”
- normalize ด้วย `trim()` + `toLocaleLowerCase('th')`
- แสดง “พบ N บท” และปุ่ม “ล้างคำค้น” เมื่อมี query; empty result มี action ล้างคำค้นใน Empty
- search results ยัง paginate 20 รายการต่อหน้า ไม่ render ผลทั้งหมดพร้อมกัน
- เปลี่ยน query แล้วเริ่มหน้า 1; clear query แล้วกลับหน้าที่มี current lesson
- pagination buttons คง accessible names และ current lesson scroll เฉพาะเมื่อไม่ reduce motion
- search เป็น transient navigation aid ภายใน workspace จึงไม่ sync URL ใน slice นี้; lesson URL ยังคงเป็น source of truth ของบทปัจจุบัน
- completed/current/locked ใช้ทั้ง icon, text และ `aria-current`; ไม่พึ่งสีอย่างเดียว
- scrolling curriculum ใน Sheet ใช้ `overscroll-behavior: contain`

## 7. Previous/next, responsive and keyboard continuity

- desktop คง 2-column navigation row
- ต่ำกว่า `sm` ให้ previous/next stack เป็น full-width เพื่ออ่านชื่อไทยยาวและมี touch target ชัด; ถ้ามี action เดียวให้เต็มแถว
- link text ยังคงชื่อบทเต็มสำหรับ accessible name แม้ visual ใช้ line clamp
- locked next เปิด dialog เดิมและไม่เปลี่ยน current player
- เพิ่ม skip link “ข้ามไปเนื้อหาบทเรียน” ไปยัง `<main id="lesson-content">`
- หลัง client navigation ไปบทใหม่ ให้ heading/main เป็น logical focus/announcement target โดยไม่ auto-focus player
- Sheet/Dialog ต้อง trap focus, Escape ได้ และคืน focus ให้ trigger เดิม; behavior ที่มีอยู่ต้องมี interaction test ไม่ใช่ source-string test อย่างเดียว
- current-item smooth scroll ตรวจ `prefers-reduced-motion`; reduced mode ใช้ `behavior: 'auto'`
- sticky header/rail ไม่บัง focused heading, search, pagination หรือ previous/next controls ที่ 320–1440 px

## 8. Loading, empty and error continuity

- คง shared Skeleton และ geometry ปัจจุบัน
- generic `/learn` ยัง redirect ไป continuation lesson หรือ honest empty workspace; ไม่ render fake lesson list
- no-video lesson ไม่ render player; no-video/no-content แสดง Empty เดิมและยังไป previous/next ได้
- เพิ่ม localized `error.tsx` สำหรับ learning routes: “ยังโหลดพื้นที่เรียนไม่ได้”, action “ลองอีกครั้ง”, “กลับแดชบอร์ด” และ “ดูหน้าคอร์ส” เมื่อ safe slug พร้อม
- player slow/error เป็น local recovery ไม่แทนทั้ง page ด้วย error boundary
- error copy ต้องบอก next step และไม่เปิดเผย provider URL, signed token, database detail หรือ customer data

## 9. Server performance without redesign

- resolve independent `auth()`/`params` และ metadata course/lesson reads แบบขนานเมื่อไม่มี dependency
- หลัง authorize course/current lesson แล้ว ให้ curriculum projection, completed IDs และ current progress query ทำพร้อมกัน
- ไม่ pass full Drizzle rows ผ่าน RSC boundary; DTO ลดทั้ง exposure และ page payload
- ไม่ lazy-load above-the-fold player เพียงเพราะเป็น Client Component; component ปัจจุบันเป็น iframe wrapper ขนาดเล็กและยังไม่มี bundle evidence ว่าต้อง dynamic import
- ใช้ server component เป็น default และจำกัด client state ที่ Sheet, search, progress mutation และ player bridge

## 10. Web Interface Guidelines findings

### `src/app/courses/[slug]/learn/[lessonId]/page.tsx`

- `src/app/courses/[slug]/learn/[lessonId]/page.tsx:42` — full course row ถูกส่งเข้า Client Component ทั้งที่ใช้เพียง id/title/slug
- `src/app/courses/[slug]/learn/[lessonId]/page.tsx:51` — full current lesson row ข้าม RSC boundary; projection ยังไม่บังคับ fields
- `src/app/courses/[slug]/learn/[lessonId]/page.tsx:80` — full rows ของทุกบท รวม content/video URL ถูกโหลดเพื่อ curriculum และส่ง client
- `src/app/courses/[slug]/learn/[lessonId]/page.tsx:94` — current watch position ไม่ถูกอ่าน จึง resume ได้เฉพาะบท ไม่ใช่ตำแหน่ง

### `src/components/video/BunnyPlayer.tsx`

- `src/components/video/BunnyPlayer.tsx:37` — global `message` handler ไม่ตรวจ iframe source/origin/context ก่อนส่ง progress/completion callbacks
- `src/components/video/BunnyPlayer.tsx:43` — payload parser ไม่ตรง Player.js `value.seconds` contract
- `src/components/video/BunnyPlayer.tsx:138` — addEventListener อย่างเดียวแต่ไม่มี Player.js event subscriptions/ready lifecycle
- `src/components/video/BunnyPlayer.tsx:173` — lesson iframe ไม่มี accessible `title`
- `src/components/video/BunnyPlayer.tsx:183` — slow-load overlay บอกสาเหตุแต่ไม่มี retry action

### `src/components/course/LearnPageClient.tsx`

- `src/components/course/LearnPageClient.tsx:136` — watch time reset เป็น 0 ทุกบทและไม่มี initial server position
- `src/components/course/LearnPageClient.tsx:164` — completion result ใช้ toast ชั่วคราวโดยไม่มี persistent inline failure/retry state
- `src/components/course/LearnPageClient.tsx:286` — “กำลังบันทึก...” → “กำลังบันทึก…”
- `src/components/course/LearnPageClient.tsx:312` — mobile บังคับ previous/next เป็น 2 คอลัมน์ ทำให้ชื่อไทยยาวเหลือพื้นที่น้อย
- `src/components/course/LearnPageClient.tsx:346` — Sheet curriculum ยังไม่มี explicit overscroll containment
- `src/components/course/LearnPageClient.tsx:375` — decorative dialog icon ไม่มี `aria-hidden`

### `src/components/course/LearningCurriculum.tsx`

- `src/components/course/LearningCurriculum.tsx:79` — search input ไม่มี meaningful `name`/autocomplete policy
- `src/components/course/LearningCurriculum.tsx:84` — placeholder ใช้ `...` แทน `…`

### `src/components/course/LessonList.tsx`

- `src/components/course/LessonList.tsx:62` — search bypass 20-item pagination และอาจ render list ใหญ่ทั้งหมด
- `src/components/course/LessonList.tsx:71` — smooth scroll ไม่เคารพ `prefers-reduced-motion`
- `src/components/course/LessonList.tsx:86` — no-result state ไม่มี direct clear-search action

### `src/app/api/progress/route.ts`

- `src/app/api/progress/route.ts:23` — sensitive mutation body ใช้ `request.json()` โดยไม่มี Zod validation

ผลตรวจอิง [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) ฉบับที่ดึงเมื่อ 31 ส.ค. 2569 และ shadcn docs ของ [Sheet](https://ui.shadcn.com/docs/components/radix/sheet), [Alert Dialog](https://ui.shadcn.com/docs/components/radix/alert-dialog), [Progress](https://ui.shadcn.com/docs/components/radix/progress), [Input Group](https://ui.shadcn.com/docs/components/radix/input-group), [Empty](https://ui.shadcn.com/docs/components/radix/empty) และ [Button](https://ui.shadcn.com/docs/components/radix/button)

## Evidence inventory

| Surface | หลักฐานปัจจุบัน | Friction/risk |
| --- | --- | --- |
| Generic learning entry | continuation helper + route tests | เลือกบทถูก แต่ exact playback position ยังไม่ resume |
| Server data boundary | full Drizzle selects + Client props | locked content/video URL และ unused fields อาจถูก serialize |
| Player | ad hoc `message` bridge | payload/subscription ไม่ตรง Player.js; source/origin ไม่ถูกตรวจ |
| Completion | local Set + `/api/progress` | success เห็นทันที; failure มี toast อย่างเดียว; body ไม่มี Zod |
| Curriculum | shared desktop/Sheet component | search ดีสำหรับรายการสั้น แต่ bypass pagination และไม่มี clear action |
| Previous/next | semantic Links/Buttons | mobile 2 columns บีบชื่อไทยยาว |
| Empty/loading | dedicated Empty + mirrored Skeleton | ผ่าน contract เดิม; ยังไม่มี localized learning error recovery |
| Focus | Sheet/Dialog manual return refs | source contract มี แต่ยังไม่มี behavior-level interaction test/skip link |
| Runtime | local anonymous browser | `/learn` redirect ไป Login พร้อม exact callback ถูกต้อง; ไม่มี free-preview fixture จึงตรวจ authenticated workspace รอบนี้ไม่ได้ |
| Visual artifacts | existing desktop/mobile/curriculum/dialog PNG names | ACL อนุญาตให้เห็นชื่อแต่ไม่อนุญาตเปิดภาพ จึงไม่นับเป็น visual evidence รอบนี้ |
| Tests | focused Vitest baseline | 2 files, 14/14 ผ่าน; ส่วนใหญ่ workspace assertions เป็น source-string ไม่ใช่ interaction/runtime |

## 11. Minimum implementation sequence

1. ทำ server-only learning read model + minimal DTO และ tests ว่า locked curriculum records ไม่มี content/video URL
2. เพิ่ม current progress projection; แยก “resume lesson” จาก “resume playback position” ใน presenter/copy
3. แทน ad hoc Bunny message handler ด้วย trusted Player.js bridge; test source/origin, subscriptions, payload, cleanup, seek และ exactly-once ended
4. เพิ่ม iframe title, player retry/error surface และ provider-aware completion copy
5. เพิ่ม Zod ที่ `/api/progress` พร้อม auth/access/monotonic/replay/error tests โดยไม่เปลี่ยน completion policy เงียบ ๆ
6. เพิ่ม persistent completion pending/success/failure state และ retry; คง one-way/no-auto-next
7. paginate search results 20 รายการ, result count, clear action, input attributes และ Thai normalization
8. ปรับ mobile previous/next, skip link, overscroll containment และ reduced-motion scrolling
9. เพิ่ม localized learning `error.tsx` และ interaction tests ของ Sheet/Dialog focus return
10. ลด independent query waterfalls แล้ววัด RSC payload/query count ก่อน-หลัง
11. browser checks: 320/390/768/1024/1440, keyboard-only, reduced motion, long Thai titles, 0/1/21/50+ lessons, content-only/video-only/empty, locked/free preview/enrolled/review, network/player/progress failures

## Explicit non-goals

- ไม่ redesign Academy-light shell, global Navbar/Footer, tokens หรือ player controls
- ไม่เพิ่ม module/section/chapter domain model, lesson reorder หรือ curriculum hierarchy
- ไม่เพิ่ม auto-next, countdown หรือ global arrow-key navigation
- ไม่เปลี่ยน enrollment/free-preview access, payment truth, course completion หรือ certificate issuance/revocation policy
- ไม่เพิ่ม uncomplete action และไม่แก้ `completed: false` API contract โดยไม่มี cross-ticket domain decision
- ไม่เปิดเผย raw/signed video URL หรือ rich content ของ locked lessons
- ไม่เพิ่ม notes, bookmarks, quiz, streak, gamification, watch analytics dashboard หรือ offline download
- ไม่ย้าย Bunny library ไป Player v2 และไม่เพิ่ม provider SDK ทั้งหมดใน slice เดียว
- ไม่สร้าง test user, enrollment หรือแก้ local/production database เพื่อทำ visual audit

## Owner reaction requested

โปรดยืนยันหรือแก้ 6 decisions นี้:

1. ให้ minimal authorized learning DTO และ trusted player bridge เป็น P0 ก่อน visual polish เพราะปัจจุบัน locked lesson fields อาจข้าม RSC boundary และ Player.js event contract ยังไม่ถูกต้อง
2. นิยาม “กลับมาเรียนบทล่าสุด” กับ “เรียนต่อจากตำแหน่งเดิม” แยกกัน; slice แรก seek exact position เฉพาะ Bunny ที่ผ่าน Player.js ready/seek และใช้ manual completion สำหรับ legacy providers
3. คง one-way completion/no-auto-next; เพิ่ม persistent inline save/retry state และใช้ “ครบทุกบทแล้ว · โหมดทบทวน” โดยไม่สรุปว่า certificate พร้อม
4. Search ยังเป็น local transient state แต่ผลลัพธ์ paginate 20 รายการ มี count/clear action และคืนหน้าที่มี current lesson หลัง clear
5. Mobile previous/next stack เต็มความกว้าง, เพิ่ม skip link/reduced-motion/overscroll และรักษา Sheet/Dialog focus return เดิม
6. เพิ่ม localized learning error recovery และ Zod validation ของ `/api/progress`; ไม่เปลี่ยน enrollment/completion/certificate policy หรือ Bunny Player v2 setting ใน ticket นี้
