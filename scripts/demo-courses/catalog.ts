// Demo catalog for local development: realistic Thai courses that exercise sections,
// free previews, promotions, quizzes, reviews and a bundle. Local only (see target.ts).
//
// Lesson videos are public videos from the MilerDev YouTube channel (the channel linked in
// the site footer), played through YouTube's own embed. Each one was checked on 2026-10-06
// to allow embedding, and each duration below is the video's real length in seconds.

export type DemoVideo = { youtubeId: string; seconds: number; title: string };

export const DEMO_VIDEO_CHANNEL = 'MilerDev';

export const DEMO_VIDEOS = {
  liveServer: { youtubeId: 'GcMZUsDrrdI', seconds: 905, title: 'เขียนเว็บไม่ต้องกด F5 สอนติดตั้ง Live Server' },
  htmlStructure: { youtubeId: 'A1K-gZ5wq8s', seconds: 1138, title: 'เจาะลึกการวางโครงสร้างเว็บด้วย HTML' },
  cssCommon: { youtubeId: 'Wq__AEkzigw', seconds: 661, title: 'คำสั่งที่ใช้งานบ่อยๆ ใน CSS มีอะไรบ้าง' },
  cssUnderline: { youtubeId: '6Me0CrxfYF8', seconds: 232, title: 'CSS - เทคนิคการทำเส้นใต้ตัวอักษรด้วย Pseudo Class' },
  flexboxLayouts: { youtubeId: 'MzhS5CSdcXY', seconds: 1073, title: '8 CSS Layout ที่ใช้ Flexbox ในการทำได้ง่ายมากๆ' },
  mediaQuery: { youtubeId: 'dlCnXnBdIsI', seconds: 1201, title: 'การทำเว็บให้ Responsive รองรับทุกขนาดหน้าจอด้วย Media Query' },
  vercelDomain: { youtubeId: '_STVkvOANqk', seconds: 858, title: 'มีเงิน 70 บาท ก็เปิดเว็บได้! สอนจดโดเมน + Deploy ฟรีบน Vercel' },
  practiceProjects: { youtubeId: '8YDKFR8V9ig', seconds: 837, title: 'อยากเขียน HTML CSS JS ให้เก่งๆ ฝึกทำโปรเจคแบบนี้' },
  javascriptIntro: { youtubeId: '7ju26Pb6f4U', seconds: 654, title: 'JavaScript ใช้ยังไง (สำหรับมือใหม่)' },
  varLetConst: { youtubeId: '0ExdEZj8bHY', seconds: 559, title: 'JavaScript ES6: Var, Let, Const' },
  defaultParameters: { youtubeId: 'hX5XD3KRVvg', seconds: 201, title: 'JavaScript ES6: Default Parameters' },
  restSpread: { youtubeId: 'Od8-QikRnlI', seconds: 949, title: 'JavaScript ES6: Rest Parameter & Spread Operator' },
  arrayMethods: { youtubeId: 'S3_GNV4hx44', seconds: 1472, title: '9 JavaScript Array Method ที่ทุกคนจะได้ใช้แน่นอนทุกโปรเจค' },
  destructuring: { youtubeId: 'fNxidcVXR2Y', seconds: 504, title: 'JavaScript ES6: Array and Object Destructuring' },
  asyncAwait: { youtubeId: '1dVoeqdDGCU', seconds: 991, title: 'สอนใช้ Async & Await ใน JavaScript แบบเซียน' },
  cleanJavascript: { youtubeId: 'dZTXiq_l_2A', seconds: 898, title: 'รวมเทคนิคเขียน JavaScript ให้ดี ให้ Clean ให้ Optimized' },
  whyReact: { youtubeId: 'eijQpcLnRc8', seconds: 668, title: 'ทำไมถึงควรใช้ ReactJS แทนการใช้ HTML + JS ธรรมดา' },
  vite: { youtubeId: 'OXDpG15Iw2E', seconds: 1142, title: 'ViteJS เครื่องมือที่ดีที่สุดสำหรับ Front-End Developer' },
  thinkingInReact: { youtubeId: 'ebSypZkNXtc', seconds: 1111, title: 'Thinking in React' },
  useStateCases: { youtubeId: 'OpfwntKAjnY', seconds: 966, title: '5 Use case การใช้งาน useState Hook ใน ReactJS' },
  reactApiErrors: { youtubeId: '2DSpsN0pfIA', seconds: 896, title: 'วิธีเชื่อมต่อ API และจัดการ Error ใน ReactJS' },
  customHook: { youtubeId: 'WPRHtmPGcDg', seconds: 990, title: 'สร้าง Reusable Custom React Hook สำหรับ Fetching Data' },
  reactBestPractices: { youtubeId: '5Mx029Y232k', seconds: 455, title: 'หลักการเขียน ReactJS ที่ดี (ReactJS Best Practices)' },
  freeApis: { youtubeId: 'j2UYuKzfGHY', seconds: 830, title: 'แจก API ฟรี! ไว้ทำโปรเจกต์ใส่ Portfolio' },
  whyNext: { youtubeId: 'R1OqniSTExU', seconds: 593, title: 'ทำไม NextJS มันดีจัง' },
  nextTypeScript: { youtubeId: 'GRzN5KBZGlw', seconds: 1216, title: 'ปรับพื้นฐาน NextJS + TypeScript ใน 20 นาที' },
  nextSetup: { youtubeId: 'whnZfbcTuuA', seconds: 912, title: 'การติดตั้ง NextJS 15 และวิธีตั้งค่าต่างๆ ในการพัฒนาโปรเจค' },
  useClient: { youtubeId: 'uwYmSbFFLc0', seconds: 457, title: 'การใช้ Use Client ใน NextJS' },
  tailwind: { youtubeId: 'OD8ckD1P-Jk', seconds: 866, title: 'ทำความเข้าใจ Tailwind CSS' },
  parallelRequests: { youtubeId: '32GEiZ3c8w8', seconds: 502, title: 'ยิง API หลายๆ เส้นพร้อมกันทำยังไง (NextJS)' },
  deployNext: { youtubeId: '7W5VBCNKj0k', seconds: 447, title: 'สอน Deploy NextJS App' },
  gitTracking: { youtubeId: 'DlNEactRR1Y', seconds: 874, title: 'การใช้ Git ในการพัฒนาโปรเจค เพื่อติดตามการเปลี่ยนแปลง' },
  gitBasics: { youtubeId: '4Z8fGcx5N2A', seconds: 869, title: 'พื้นฐานการใช้งาน Git & GitHub (init, add, commit, remote, push)' },
  gitignore: { youtubeId: 'voznFsh1_vI', seconds: 488, title: 'ไฟล์ .gitignore ใช้ยังไง มีไว้ทำไม' },
  gitTeamwork: { youtubeId: 'q62jbg2f4l0', seconds: 1817, title: 'ฝึกทำงานเป็นทีมด้วย Git' },
  dangerousGit: { youtubeId: 'X8gw2yHVoDw', seconds: 484, title: 'คำสั่งห้ามใช้ใน Git โคตรอันตราย' },
  aiDifference: { youtubeId: 'H4q3EXlGUco', seconds: 835, title: 'ใครก็ใช้ AI ทำ Software ได้ แล้วอะไรคือความแตกต่าง?' },
  goodPrompts: { youtubeId: 'VK5aAgrHz3k', seconds: 891, title: 'วิธีเขียน Prompt ที่ดีสำหรับการทำงานกับ AI' },
  agentBestPractices: { youtubeId: 'TlBL5pBp-ZE', seconds: 728, title: 'ใช้ AI Agent ยังไง ไม่ให้โค้ดพังทั้งโปรเจกต์' },
  apiTests: { youtubeId: 'VCyF6Jx7C60', seconds: 1354, title: 'การเขียน Test ให้กับ API ใน NodeJS' },
  webSecurity: { youtubeId: '3l44ONkjpXs', seconds: 812, title: 'ความปลอดภัยในการพัฒนา Web Application' },
  aiWorkflow: { youtubeId: '9nOZQ-5gDaw', seconds: 1477, title: 'Workflow ใช้ AI เขียนโค้ดแบบนี้ สบายใจ ปลอดภัย ไม่พัง' },
  nodeServer: { youtubeId: 'ey1X_7pjmTE', seconds: 967, title: 'NodeJS ตอนที่ 1 - การสร้าง Server และลอง Hello World' },
  restApi: { youtubeId: 'qwi7FkkUAHE', seconds: 613, title: 'เข้าใจ RESTful API แบบบรรลุ' },
} as const satisfies Record<string, DemoVideo>;

export type DemoVideoKey = keyof typeof DEMO_VIDEOS;
export type DemoQuizQuestion = {
  prompt: string;
  options: { text: string; isCorrect: boolean }[];
  explanation?: string;
};
export type DemoLesson = {
  key: string;
  title: string;
  video?: DemoVideoKey;
  freePreview?: boolean;
  intro: string;
  points: string[];
  code?: { language: string; source: string };
  exercise?: string;
  quiz?: DemoQuizQuestion[];
};
export type DemoSection = { title: string; lessons: DemoLesson[] };
export type DemoReview = { name: string; rating: number; comment: string; daysAgo: number };
export type DemoCourse = {
  key: string;
  title: string;
  slug: string;
  price: string;
  promo?: { price: string; endsInDays: number };
  status: 'published' | 'draft';
  tags: string[];
  description: string;
  sections: DemoSection[];
  reviews: DemoReview[];
};

const single = (prompt: string, correct: string, wrong: string[], explanation?: string): DemoQuizQuestion => ({
  prompt,
  options: [{ text: correct, isCorrect: true }, ...wrong.map((text) => ({ text, isCorrect: false }))],
  explanation,
});

export const DEMO_COURSES: DemoCourse[] = [
  {
    key: 'html',
    title: 'HTML & CSS พื้นฐาน สร้างเว็บแรกของคุณ',
    slug: 'html-css-first-website',
    price: '0.00',
    status: 'published',
    tags: ['HTML', 'CSS'],
    description: '<p>คอร์สเริ่มต้นสำหรับคนที่ไม่เคยเขียนโค้ดมาก่อน เรียนจบแล้วจะสร้างหน้าเว็บโปรไฟล์ของตัวเองที่รองรับมือถือ และเผยแพร่ขึ้นออนไลน์ได้จริง</p><h3>สิ่งที่จะได้เรียน</h3><ul><li>โครงสร้างหน้าเว็บด้วย HTML และแท็กที่ใช้บ่อย</li><li>ตกแต่งด้วย CSS และจัดเลย์เอาต์ด้วย Flexbox</li><li>ทำเว็บให้รองรับทุกขนาดหน้าจอ แล้วเผยแพร่ฟรีบน Vercel</li></ul>',
    sections: [
      {
        title: 'เริ่มต้นกับการสร้างเว็บ',
        lessons: [
          {
            key: 'l1',
            title: 'เว็บไซต์ทำงานอย่างไร',
            freePreview: true,
            intro: 'ก่อนเขียนโค้ดบรรทัดแรก มาดูภาพรวมว่าเกิดอะไรขึ้นตั้งแต่พิมพ์ URL จนหน้าเว็บแสดงบนจอ',
            points: [
              'เบราว์เซอร์ส่งคำขอไปที่เซิร์ฟเวอร์ แล้วได้ไฟล์ HTML, CSS และ JavaScript กลับมา',
              'HTML บอกโครงสร้างและความหมายของเนื้อหา CSS บอกหน้าตา JavaScript เพิ่มการโต้ตอบ',
              'ทุกอย่างที่เรียนในคอร์สนี้ทำงานบนเบราว์เซอร์ ไม่ต้องติดตั้งเซิร์ฟเวอร์เอง',
            ],
            exercise: 'เปิดเว็บที่ใช้บ่อย คลิกขวาแล้วเลือก "ดูซอร์สของหน้า" ลองหาแท็ก <title> และ <h1>',
          },
          {
            key: 'l2',
            title: 'เตรียมเครื่องมือ: VS Code และ Live Server',
            video: 'liveServer',
            freePreview: true,
            intro: 'ตั้งค่าเครื่องมือให้พร้อม แก้โค้ดแล้วเห็นผลบนเบราว์เซอร์ทันทีโดยไม่ต้องกดรีเฟรช',
            points: ['ติดตั้ง VS Code และส่วนขยาย Live Server', 'คลิกขวาที่ index.html แล้วเลือก Open with Live Server', 'เก็บไฟล์ทั้งหมดของโปรเจกต์ไว้ในโฟลเดอร์เดียว'],
          },
        ],
      },
      {
        title: 'HTML: โครงสร้างของหน้าเว็บ',
        lessons: [
          {
            key: 'l3',
            title: 'วางโครงสร้างหน้าเว็บด้วย HTML',
            video: 'htmlStructure',
            freePreview: true,
            intro: 'รู้จักแท็กที่ใช้ในเกือบทุกหน้าเว็บ และเลือกแท็กให้ตรงกับความหมายของเนื้อหา',
            points: ['แบ่งหน้าเป็น header, main, footer ให้ชัดเจน', 'หัวข้อใช้ h1 ถึง h6 โดยมี h1 หน้าละหนึ่งตัว', 'รูปภาพต้องมี alt อธิบายภาพเสมอ'],
            code: {
              language: 'html',
              source: '<header>\n  <h1>สวัสดี ฉันชื่อมิน</h1>\n</header>\n<main>\n  <p>ฉันกำลังเรียนสร้างเว็บ</p>\n  <img src="me.jpg" alt="รูปโปรไฟล์ของมิน">\n</main>',
            },
            quiz: [
              single('แท็กใดเหมาะกับหัวข้อหลักของหน้า', '<h1>', ['<p>', '<title>', '<header>'], 'title แสดงบนแท็บเบราว์เซอร์ ส่วนหัวข้อหลักในหน้าใช้ h1'),
              single('ทำไมแท็ก img ต้องมี alt', 'เพื่ออธิบายภาพให้ผู้ใช้โปรแกรมอ่านหน้าจอและกรณีภาพโหลดไม่ขึ้น', ['เพื่อให้ภาพโหลดเร็วขึ้น', 'เพื่อกำหนดขนาดภาพ']),
            ],
          },
          {
            key: 'l4',
            title: 'ฟอร์มและการรับข้อมูลจากผู้ใช้',
            intro: 'ฟอร์มคือช่องทางที่ผู้ใช้ส่งข้อมูลถึงเรา ตั้งแต่ช่องค้นหาไปจนถึงหน้าสมัครสมาชิก',
            points: ['ทุกช่องกรอกควรมี label ผูกกับ id ของช่อง', 'เลือก type ให้ตรงข้อมูล เช่น email, tel, number', 'ใช้ required เพื่อบังคับกรอก'],
            code: {
              language: 'html',
              source: '<form>\n  <label for="email">อีเมล</label>\n  <input id="email" type="email" required>\n  <button type="submit">ส่ง</button>\n</form>',
            },
            exercise: 'สร้างฟอร์มติดต่อที่มีชื่อ อีเมล และข้อความ โดยทุกช่องมี label',
          },
        ],
      },
      {
        title: 'CSS: ตกแต่งให้สวยและอ่านง่าย',
        lessons: [
          {
            key: 'l5',
            title: 'คำสั่ง CSS ที่ใช้บ่อย',
            video: 'cssCommon',
            intro: 'คำสั่งชุดเล็ก ๆ ที่ใช้แทบทุกหน้าเว็บ เรียนให้คล่องแล้วตกแต่งได้เกือบทุกอย่าง',
            points: ['color, background และ font-size สำหรับตัวอักษรและพื้นหลัง', 'margin เว้นระยะนอกกล่อง padding เว้นระยะในกล่อง', 'เลือกฟอนต์ภาษาไทยที่อ่านง่าย เช่น Sarabun หรือ Noto Sans Thai'],
          },
          {
            key: 'l6',
            title: 'ทำเส้นใต้ตัวอักษรสวย ๆ ด้วย Pseudo Class',
            video: 'cssUnderline',
            intro: 'เพิ่มลูกเล่นเล็ก ๆ ให้ลิงก์ด้วย ::after และ :hover โดยไม่ต้องแก้ HTML',
            points: ['::after ต้องกำหนด content เสมอ แม้เป็นค่าว่าง', 'ใช้ transition ให้เส้นค่อย ๆ ขยาย'],
            code: { language: 'css', source: '.link { position: relative; }\n.link::after {\n  content: "";\n  position: absolute;\n  left: 0; bottom: -4px;\n  width: 0; height: 2px;\n  background: currentColor;\n  transition: width .2s;\n}\n.link:hover::after { width: 100%; }' },
          },
          {
            key: 'l7',
            title: 'จัดเลย์เอาต์ด้วย Flexbox',
            video: 'flexboxLayouts',
            intro: 'Flexbox ช่วยจัดเรียงกล่องในแนวนอนหรือแนวตั้ง และจัดกึ่งกลางได้ง่าย',
            points: ['ใส่ display: flex ที่กล่องแม่', 'justify-content จัดตามแกนหลัก align-items จัดตามแกนรอง', 'gap กำหนดระยะห่างระหว่างลูก'],
            code: { language: 'css', source: '.card-list {\n  display: flex;\n  gap: 16px;\n  justify-content: space-between;\n}' },
            quiz: [
              single('ต้องใส่ display: flex ที่ส่วนไหน', 'กล่องแม่ที่ครอบรายการ', ['ทุกกล่องลูก', 'แท็ก body เท่านั้น']),
              single('ถ้าต้องการเว้นระยะระหว่างกล่องลูกเท่า ๆ กัน ควรใช้ property ใด', 'gap', ['padding', 'line-height'], 'gap กำหนดช่องว่างระหว่างลูกโดยไม่เพิ่มระยะที่ขอบนอก'),
            ],
          },
          {
            key: 'l8',
            title: 'ทำเว็บให้รองรับมือถือด้วย Media Query',
            video: 'mediaQuery',
            intro: 'ผู้ใช้ส่วนใหญ่เปิดเว็บจากมือถือ ออกแบบจอเล็กก่อนแล้วค่อยขยาย',
            points: ['ใส่ meta viewport ทุกหน้า', 'เขียนสไตล์สำหรับจอเล็กก่อน แล้วใช้ min-width เพิ่มสำหรับจอใหญ่', 'ทดสอบด้วยโหมดมือถือใน DevTools'],
            code: { language: 'css', source: '.card-list { flex-direction: column; }\n@media (min-width: 768px) {\n  .card-list { flex-direction: row; }\n}' },
          },
        ],
      },
      {
        title: 'เผยแพร่เว็บแรกของคุณ',
        lessons: [
          {
            key: 'l9',
            title: 'เผยแพร่เว็บฟรีบน Vercel พร้อมโดเมนของตัวเอง',
            video: 'vercelDomain',
            intro: 'เอาเว็บขึ้นออนไลน์ให้คนอื่นเข้าได้ และผูกกับโดเมนของตัวเองในราคาไม่กี่สิบบาท',
            points: ['ไฟล์หน้าแรกต้องชื่อ index.html', 'เชื่อม Vercel กับ GitHub แล้วทุกการ push จะ deploy ให้อัตโนมัติ'],
          },
          {
            key: 'l10',
            title: 'โปรเจกต์ท้ายคอร์ส: หน้าโปรไฟล์ส่วนตัว',
            video: 'practiceProjects',
            intro: 'รวมทุกอย่างที่เรียนมาสร้างหน้าโปรไฟล์ที่ใช้งานได้จริง แล้วต่อยอดด้วยโปรเจกต์ฝึกเพิ่ม',
            points: ['ส่วนหัวมีชื่อและรูปพร้อม alt', 'ส่วนทักษะจัดเรียงด้วย Flexbox และรองรับมือถือ', 'ฟอร์มติดต่อที่มี label ครบ'],
            exercise: 'เผยแพร่บน Vercel แล้วนำลิงก์ไปใส่ในโปรไฟล์ GitHub ของคุณ',
          },
        ],
      },
    ],
    reviews: [
      { name: 'ปาริชาติ ส.', rating: 5, comment: 'ไม่เคยเขียนโค้ดมาก่อนเลย เรียนจบแล้วทำหน้าโปรไฟล์ขึ้นเว็บได้จริง อธิบายเข้าใจง่ายมาก', daysAgo: 12 },
      { name: 'ธนพล ก.', rating: 5, comment: 'ชอบที่มีแบบทดสอบท้ายบท ช่วยให้รู้ว่าตรงไหนยังไม่เข้าใจ', daysAgo: 30 },
      { name: 'ณัฐธิดา ว.', rating: 4, comment: 'เนื้อหาครบสำหรับมือใหม่ บท Media Query ช่วยได้มาก', daysAgo: 45 },
      { name: 'กิตติศักดิ์ พ.', rating: 5, comment: 'ฟรีแต่คุณภาพดีมาก ได้พื้นฐานไปต่อ JavaScript', daysAgo: 70 },
    ],
  },
  {
    key: 'js',
    title: 'JavaScript ตั้งแต่ศูนย์ถึงใช้งานจริง',
    slug: 'javascript-from-zero',
    price: '1290.00',
    promo: { price: '890.00', endsInDays: 10 },
    status: 'published',
    tags: ['JavaScript'],
    description: '<p>ปูพื้นฐาน JavaScript ให้แน่นตั้งแต่ตัวแปรไปจนถึง Async/Await พร้อมเทคนิคที่ใช้ในงานจริง เหมาะกับคนที่เขียน HTML และ CSS เป็นแล้ว</p><h3>หลังเรียนจบคุณจะ</h3><ul><li>อ่านและเขียนฟังก์ชัน จัดการ Array และ Object ได้คล่อง</li><li>เข้าใจ Promise และ Async/Await สำหรับดึงข้อมูลจาก API</li><li>สร้างแอปรายการสิ่งที่ต้องทำได้ด้วยตัวเอง</li></ul>',
    sections: [
      {
        title: 'พื้นฐานภาษา',
        lessons: [
          {
            key: 'l1',
            title: 'ภาพรวมของ JavaScript และสิ่งที่จะได้เรียน',
            video: 'javascriptIntro',
            freePreview: true,
            intro: 'JavaScript เป็นภาษาเดียวที่เบราว์เซอร์รันได้โดยตรง และยังใช้ฝั่งเซิร์ฟเวอร์ผ่าน Node.js',
            points: ['คอร์สนี้ใช้ Console ของเบราว์เซอร์ทดลองโค้ดตลอด', 'เปิด DevTools ด้วย F12 แล้วเลือกแท็บ Console'],
          },
          {
            key: 'l2',
            title: 'var, let และ const ต่างกันอย่างไร',
            video: 'varLetConst',
            intro: 'ตัวแปรคือกล่องเก็บค่า เลือก const เป็นค่าเริ่มต้น และใช้ let เมื่อค่าต้องเปลี่ยน',
            points: ['let และ const มี block scope ส่วน var ไม่มี', 'ใช้ === เปรียบเทียบเพื่อไม่ให้แปลงชนิดข้อมูลโดยไม่ตั้งใจ', 'Template literal ใช้ backtick และ ${} แทรกค่า'],
            code: { language: 'js', source: 'const name = "มิน";\nlet score = 80;\nscore += 5;\nconsole.log(`${name} ได้ ${score} คะแนน`);' },
            quiz: [
              single('ควรใช้อะไรประกาศตัวแปรที่ค่าไม่เปลี่ยน', 'const', ['let', 'var']),
              single('ผลของ 5 === "5" คืออะไร', 'false', ['true', 'error'], '=== เทียบทั้งค่าและชนิดข้อมูล number กับ string จึงไม่เท่ากัน'),
            ],
          },
        ],
      },
      {
        title: 'ฟังก์ชันและข้อมูล',
        lessons: [
          {
            key: 'l3',
            title: 'ฟังก์ชันและ Default Parameter',
            video: 'defaultParameters',
            intro: 'กำหนดค่าเริ่มต้นให้พารามิเตอร์ เพื่อให้ฟังก์ชันทำงานได้แม้ผู้เรียกไม่ส่งค่ามา',
            points: ['ค่าเริ่มต้นถูกใช้เมื่ออาร์กิวเมนต์เป็น undefined เท่านั้น'],
            code: { language: 'js', source: 'function greet(name = "ผู้เรียน") {\n  return `สวัสดี ${name}`;\n}\ngreet(); // "สวัสดี ผู้เรียน"' },
          },
          {
            key: 'l4',
            title: 'Rest Parameter และ Spread Operator',
            video: 'restSpread',
            intro: 'จุดสามจุด (...) ใช้ได้สองทาง: รวบอาร์กิวเมนต์เป็น Array หรือกระจาย Array และ Object',
            points: ['rest parameter ต้องอยู่ตัวสุดท้ายเสมอ', 'spread ใช้คัดลอกและรวม array หรือ object โดยไม่แก้ของเดิม'],
            code: { language: 'js', source: 'function sum(...numbers) {\n  return numbers.reduce((total, n) => total + n, 0);\n}\nconst all = [...[1, 2], ...[3]];\nsum(...all); // 6' },
          },
          {
            key: 'l5',
            title: 'Array Method ที่ใช้ทุกโปรเจกต์',
            video: 'arrayMethods',
            intro: 'map, filter, find และ reduce แทนการเขียน for loop เกือบทั้งหมด และอ่านง่ายกว่า',
            points: ['map แปลงทุกค่า filter เลือกบางค่า find หาค่าแรกที่ตรง', 'ลบค่าซ้ำด้วย [...new Set(array)]', 'method ส่วนใหญ่คืน Array ใหม่ ไม่แก้ของเดิม'],
            code: { language: 'js', source: 'const prices = [120, 450, 90, 450];\nconst discounted = prices.map((p) => p * 0.9);\nconst cheap = prices.filter((p) => p < 200);\nconst unique = [...new Set(prices)]; // [120, 450, 90]' },
            quiz: [
              single('ต้องการเฉพาะสินค้าที่ราคาต่ำกว่า 200 ควรใช้ method ใด', 'filter', ['map', 'forEach']),
              single('[...new Set([1, 1, 2])] ได้ผลอะไร', '[1, 2]', ['[1, 1, 2]', '{1, 2}']),
            ],
          },
        ],
      },
      {
        title: 'JavaScript สมัยใหม่',
        lessons: [
          {
            key: 'l6',
            title: 'Destructuring: ดึงค่าจาก Array และ Object',
            video: 'destructuring',
            intro: 'ดึงค่าออกมาเป็นตัวแปรในบรรทัดเดียว โค้ดสั้นและอ่านง่ายขึ้น',
            points: ['Object destructuring ใช้ชื่อ property', 'Array destructuring ใช้ตำแหน่ง', 'ตั้งค่าเริ่มต้นได้ เช่น { city = "กรุงเทพฯ" }'],
            code: { language: 'js', source: 'const user = { name: "มิน", city: "เชียงใหม่" };\nconst { name, city } = user;\nconst [first, second] = ["HTML", "CSS"];' },
          },
          {
            key: 'l7',
            title: 'Promise และ Async/Await',
            video: 'asyncAwait',
            intro: 'งานที่ต้องรอ เช่นดึงข้อมูลจากเซิร์ฟเวอร์ ไม่ควรทำให้หน้าเว็บค้าง',
            points: ['Promise แทนผลลัพธ์ที่จะได้ในอนาคต', 'await ใช้ได้ในฟังก์ชัน async', 'ครอบด้วย try/catch เพื่อจัดการข้อผิดพลาด'],
            code: { language: 'js', source: 'async function loadUsers() {\n  try {\n    const response = await fetch("/api/users");\n    return await response.json();\n  } catch (error) {\n    console.error("โหลดข้อมูลไม่สำเร็จ", error);\n    return [];\n  }\n}' },
            quiz: [
              single('ใช้ await ได้ที่ไหน', 'ภายในฟังก์ชันที่ประกาศด้วย async (หรือระดับบนสุดของ module)', ['ทุกที่ในไฟล์ script ปกติ', 'เฉพาะใน callback ของ setTimeout']),
              single('ถ้า Promise ถูก reject ระหว่าง await จะจัดการอย่างไร', 'ครอบด้วย try/catch', ['ใช้ if (error)', 'ไม่ต้องจัดการ เบราว์เซอร์จะลองใหม่ให้'], 'ข้อผิดพลาดจาก await จะถูกโยนออกมาเหมือน throw จึงจับได้ด้วย catch'),
            ],
          },
        ],
      },
      {
        title: 'ลงมือใช้งานจริง',
        lessons: [
          {
            key: 'l8',
            title: 'เทคนิคเขียน JavaScript ให้ Clean',
            video: 'cleanJavascript',
            intro: 'โค้ดถูกอ่านบ่อยกว่าถูกเขียน ตั้งชื่อดีและแยกฟังก์ชันให้ทำหน้าที่เดียว',
            points: ['ตั้งชื่อตัวแปรให้บอกความหมาย', 'return เร็วเมื่อเจอกรณีพิเศษ ลดการซ้อน if'],
          },
          {
            key: 'l9',
            title: 'Workshop: แอปรายการสิ่งที่ต้องทำ',
            intro: 'สร้างแอป To-do ที่เพิ่ม ลบ และติ๊กงานเสร็จได้ พร้อมบันทึกลง localStorage',
            points: ['เก็บรายการเป็น Array ของ object', 'เขียนฟังก์ชัน render แสดงผลจากข้อมูลทุกครั้งที่ข้อมูลเปลี่ยน', 'บันทึกด้วย JSON.stringify และอ่านกลับด้วย JSON.parse'],
            exercise: 'เพิ่มปุ่มกรอง "ทั้งหมด / ค้างอยู่ / เสร็จแล้ว"',
          },
        ],
      },
    ],
    reviews: [
      { name: 'วรเมธ จ.', rating: 5, comment: 'เข้าใจ async/await จริง ๆ ก็ตอนเรียนคอร์สนี้ ตัวอย่างใกล้กับงานจริง', daysAgo: 8 },
      { name: 'สุภาวดี ร.', rating: 5, comment: 'แบ่งหมวดชัด กลับมาทบทวนง่าย workshop ท้ายคอร์สสนุกมาก', daysAgo: 21 },
      { name: 'อนุชา ท.', rating: 4, comment: 'เนื้อหาดี อยากให้มีโจทย์ฝึกเพิ่มในหมวดฟังก์ชัน', daysAgo: 40 },
      { name: 'ศิริพร ม.', rating: 5, comment: 'จากที่กลัว JavaScript ตอนนี้เขียนเองได้แล้ว', daysAgo: 66 },
      { name: 'ภาณุวัฒน์ ด.', rating: 3, comment: 'เนื้อหาดี แต่ต้องทำแบบฝึกหัดตามเองถึงจะจำได้', daysAgo: 95 },
    ],
  },
  {
    key: 'react',
    title: 'React 19 สำหรับผู้เริ่มต้น',
    slug: 'react-19-for-beginners',
    price: '1590.00',
    status: 'published',
    tags: ['React', 'JavaScript'],
    description: '<p>เรียน React แบบลงมือทำ ตั้งแต่ Component, Props และ State ไปจนถึงดึงข้อมูลจาก API และสร้าง Custom Hook ใช้ซ้ำได้</p><h3>เหมาะกับใคร</h3><ul><li>คนที่เขียน JavaScript พื้นฐานได้แล้ว</li><li>คนที่อยากเปลี่ยนสายงานเป็น Frontend Developer</li></ul>',
    sections: [
      {
        title: 'รู้จัก React',
        lessons: [
          {
            key: 'l1',
            title: 'ทำไมต้อง React แทน HTML + JS ธรรมดา',
            video: 'whyReact',
            freePreview: true,
            intro: 'React ให้เราอธิบายหน้าจอจากข้อมูล เมื่อข้อมูลเปลี่ยน React อัปเดตเฉพาะส่วนที่จำเป็นให้',
            points: ['คิดหน้าเว็บเป็นชิ้นส่วนย่อยที่นำกลับมาใช้ซ้ำได้', 'ข้อมูลไหลจากบนลงล่างผ่าน props'],
          },
          {
            key: 'l2',
            title: 'สร้างโปรเจกต์ React ด้วย Vite',
            video: 'vite',
            intro: 'Vite สร้างโปรเจกต์ได้ในไม่กี่วินาที และรีโหลดหน้าเว็บเร็วมากระหว่างพัฒนา',
            points: ['ตัวแปร env ที่ใช้ฝั่ง client ต้องขึ้นต้นด้วย VITE_', 'อย่าเก็บ secret ใน env ของ frontend เพราะผู้ใช้เปิดดูได้'],
            code: { language: 'bash', source: 'npm create vite@latest my-app -- --template react\ncd my-app\nnpm install\nnpm run dev' },
          },
        ],
      },
      {
        title: 'Component, Props และ State',
        lessons: [
          {
            key: 'l3',
            title: 'Thinking in React: แยกหน้าเว็บเป็น Component',
            video: 'thinkingInReact',
            intro: 'เริ่มจากภาพหน้าจอ แบ่งเป็นกล่อง แล้วตัดสินใจว่าข้อมูลไหนควรเป็น state และอยู่ที่ Component ใด',
            points: ['ส่งข้อมูลเข้า Component ผ่าน props', 'props อ่านได้อย่างเดียว ห้ามแก้ค่าใน Component ลูก', 'เก็บ state ไว้ที่ Component แม่ที่ใกล้ที่สุดที่ใช้ร่วมกัน'],
            code: { language: 'jsx', source: 'function CourseCard({ title, price }) {\n  return (\n    <article>\n      <h3>{title}</h3>\n      <p>{price} บาท</p>\n    </article>\n  );\n}' },
          },
          {
            key: 'l4',
            title: 'useState: 5 แบบที่ใช้บ่อย',
            video: 'useStateCases',
            intro: 'State คือข้อมูลที่เปลี่ยนได้และทำให้ Component render ใหม่',
            points: ['เรียก setter แทนการแก้ค่าโดยตรง', 'ถ้าค่าใหม่ขึ้นกับค่าเดิม ให้ส่งฟังก์ชันเข้า setter', 'state ที่เป็น object หรือ array ต้องสร้างค่าใหม่ ไม่แก้ของเดิม'],
            code: { language: 'jsx', source: 'const [count, setCount] = useState(0);\n<button onClick={() => setCount((c) => c + 1)}>\n  กดแล้ว {count} ครั้ง\n</button>' },
            quiz: [
              single('วิธีที่ถูกต้องในการเพิ่มค่า state count คืออะไร', 'setCount((c) => c + 1)', ['count = count + 1', 'count++']),
              single('เมื่อเรียก setter ของ state จะเกิดอะไรขึ้น', 'React นัด render Component นั้นใหม่ด้วยค่าใหม่', ['หน้าเว็บโหลดใหม่ทั้งหน้า', 'ไม่มีอะไรเกิดจนกว่าจะเรียก render เอง']),
            ],
          },
          {
            key: 'l5',
            title: 'เชื่อมต่อ API และจัดการ Error',
            video: 'reactApiErrors',
            intro: 'ดึงข้อมูลจาก API ด้วย useEffect พร้อมแสดงสถานะกำลังโหลดและข้อผิดพลาดให้ผู้ใช้เห็น',
            points: ['ใส่ dependency array ให้ครบทุกค่าที่ effect ใช้', 'คืนฟังก์ชัน cleanup เพื่อยกเลิกคำขอที่ค้าง', 'แสดงสถานะ loading, error และไม่มีข้อมูลให้ครบ'],
            code: { language: 'jsx', source: 'useEffect(() => {\n  const controller = new AbortController();\n  fetch(`/api/courses?q=${query}`, { signal: controller.signal })\n    .then((res) => res.json())\n    .then(setCourses)\n    .catch(() => setError("โหลดคอร์สไม่สำเร็จ"));\n  return () => controller.abort();\n}, [query]);' },
            quiz: [
              single('useEffect ที่ไม่มี dependency array จะทำงานเมื่อใด', 'หลังทุกครั้งที่ Component render', ['ครั้งเดียวตอน mount', 'เฉพาะตอน unmount'], 'ถ้าต้องการให้ทำงานครั้งเดียวให้ส่ง [] และถ้าขึ้นกับค่าใดให้ใส่ค่านั้นใน array'),
            ],
          },
        ],
      },
      {
        title: 'เขียน React ให้เป็นระบบ',
        lessons: [
          {
            key: 'l6',
            title: 'สร้าง Custom Hook ใช้ซ้ำได้',
            video: 'customHook',
            intro: 'ย้าย logic การดึงข้อมูลไปไว้ใน Hook ของเราเอง แล้วใช้ซ้ำได้ทุก Component',
            points: ['ชื่อ Hook ต้องขึ้นต้นด้วย use', 'คืนค่าเป็น { data, error, isLoading } ให้ใช้ง่าย'],
          },
          {
            key: 'l7',
            title: 'หลักการเขียน React ที่ดี',
            video: 'reactBestPractices',
            intro: 'นิสัยเล็ก ๆ ที่ทำให้โปรเจกต์ React โตได้โดยไม่ยุ่งเหยิง',
            points: ['Component เล็กและทำหน้าที่เดียว', 'ตั้งชื่อไฟล์และโฟลเดอร์ให้สม่ำเสมอ', 'ใส่ key ที่คงที่ให้รายการเสมอ'],
          },
        ],
      },
      {
        title: 'ฝึกทำโปรเจกต์',
        lessons: [
          {
            key: 'l8',
            title: 'API ฟรีสำหรับทำโปรเจกต์ใส่ Portfolio',
            video: 'freeApis',
            intro: 'วิธีที่เร็วที่สุดในการเก่งคือทำโปรเจกต์จริงกับข้อมูลจริง',
            points: ['เริ่มจากโปรเจกต์ที่มีหน้าจอเดียว', 'ทุกโปรเจกต์ควรมีลิงก์ deploy และ README'],
          },
          {
            key: 'l9',
            title: 'โปรเจกต์ท้ายคอร์ส: แอปค้นหาภาพยนตร์',
            intro: 'สร้างแอปที่ค้นหาภาพยนตร์จาก API แสดงผลเป็นการ์ด และบันทึกรายการโปรด',
            points: ['แยก Component: SearchBar, MovieList, MovieCard', 'แสดงสถานะกำลังโหลดและเมื่อไม่พบผลลัพธ์', 'เก็บรายการโปรดใน localStorage'],
            exercise: 'deploy แล้วแชร์ลิงก์พร้อมสิ่งที่เรียนรู้จากโปรเจกต์นี้ 3 ข้อ',
          },
        ],
      },
    ],
    reviews: [
      { name: 'ชยพล อ.', rating: 5, comment: 'อธิบาย useEffect ชัดที่สุดเท่าที่เคยเรียนมา โปรเจกต์ท้ายคอร์สเอาไปใส่ portfolio ได้เลย', daysAgo: 5 },
      { name: 'กมลชนก บ.', rating: 5, comment: 'แบบทดสอบท้ายบทช่วยมาก ตอบผิดแล้วมีคำอธิบายให้', daysAgo: 19 },
      { name: 'ธีรภัทร ศ.', rating: 4, comment: 'คุ้มราคา อยากให้มีหมวด testing เพิ่ม', daysAgo: 52 },
      { name: 'นภัสสร ล.', rating: 5, comment: 'เปลี่ยนสายมาจากงานบัญชี เรียนตามได้ไม่หลง', daysAgo: 80 },
    ],
  },
  {
    key: 'next',
    title: 'Next.js App Router: สร้างเว็บแอปพร้อมใช้งานจริง',
    slug: 'nextjs-app-router-workshop',
    price: '1990.00',
    status: 'published',
    tags: ['Next.js', 'React', 'TypeScript'],
    description: '<p>ต่อยอดจาก React สู่การสร้างเว็บแอปเต็มรูปแบบด้วย Next.js App Router ทั้ง Routing, Server Components, การดึงข้อมูล และ deploy</p><h3>สิ่งที่ต้องมีก่อนเรียน</h3><ul><li>พื้นฐาน React (Component, Props, State)</li><li>ติดตั้ง Node.js เวอร์ชัน LTS บนเครื่อง</li></ul>',
    sections: [
      {
        title: 'เริ่มต้นกับ Next.js',
        lessons: [
          {
            key: 'l1',
            title: 'Next.js คืออะไร ทำไมถึงน่าใช้',
            video: 'whyNext',
            freePreview: true,
            intro: 'Next.js คือ framework ที่เพิ่ม routing, การ render ฝั่งเซิร์ฟเวอร์ และเครื่องมือ build ให้ React',
            points: ['หน้าเว็บ render บนเซิร์ฟเวอร์ได้ ทำให้โหลดเร็วและดีต่อ SEO', 'โครงสร้างโฟลเดอร์คือ URL ของเว็บ'],
          },
          {
            key: 'l2',
            title: 'ปรับพื้นฐาน TypeScript สำหรับ Next.js',
            video: 'nextTypeScript',
            intro: 'โปรเจกต์ Next.js ส่วนใหญ่ใช้ TypeScript ทบทวนพื้นฐานที่จะใช้บ่อยในคอร์สนี้',
            points: ['type และ interface สำหรับรูปร่างข้อมูล', 'union type เช่น "draft" | "published"', 'ระบุชนิดของ props ให้ทุก Component'],
          },
        ],
      },
      {
        title: 'Routing และ Rendering',
        lessons: [
          {
            key: 'l3',
            title: 'ติดตั้งโปรเจกต์และโครงสร้างโฟลเดอร์ app',
            video: 'nextSetup',
            intro: 'ทุกโฟลเดอร์ใน app ที่มีไฟล์ page.tsx จะกลายเป็นหน้าเว็บหนึ่งหน้า',
            points: ['layout.tsx ครอบหน้าลูกและคงอยู่ระหว่างเปลี่ยนหน้า', 'โฟลเดอร์ [slug] คือ dynamic route', 'loading.tsx และ error.tsx จัดการสถานะรอและผิดพลาด'],
            code: { language: 'text', source: 'app/\n  layout.tsx        -> โครงร่างทุกหน้า\n  page.tsx          -> /\n  courses/\n    page.tsx        -> /courses\n    [slug]/page.tsx -> /courses/react-basics' },
            quiz: [
              single('ไฟล์ใดทำให้ /courses กลายเป็นหน้าที่เปิดได้', 'app/courses/page.tsx', ['app/courses/index.html', 'pages/courses.json']),
              single('โฟลเดอร์ชื่อ [slug] ใช้ทำอะไร', 'รับค่าส่วนหนึ่งของ URL เป็นพารามิเตอร์', ['ซ่อนหน้าจาก Google', 'เก็บไฟล์รูปภาพ']),
            ],
          },
          {
            key: 'l4',
            title: 'Server Components กับ "use client"',
            video: 'useClient',
            intro: 'ค่าเริ่มต้นคือ Server Component ใส่ "use client" เฉพาะส่วนที่ต้องโต้ตอบกับผู้ใช้',
            points: ['Server Component อ่านฐานข้อมูลได้โดยตรงและไม่ส่ง JavaScript ไปที่เบราว์เซอร์', 'Client Component ใช้ state, effect และ event handler ได้', 'ห้ามส่ง secret ไปยัง Client Component'],
            quiz: [
              single('Component ใดใช้ useState ได้', 'Component ที่มี "use client" ที่บรรทัดแรก', ['ทุก Component ใน app', 'เฉพาะ layout.tsx']),
              single('ทำไมไม่ควรอ่าน API key ใน Client Component', 'เพราะโค้ดและค่าจะถูกส่งไปให้ผู้ใช้เปิดดูได้', ['เพราะจะทำให้ build ช้า', 'เพราะ TypeScript ไม่รองรับ'], 'ค่าที่ใช้ใน Client Component ไปอยู่ในไฟล์ JavaScript ที่ส่งไปเบราว์เซอร์'),
            ],
          },
        ],
      },
      {
        title: 'ตกแต่งและจัดการข้อมูล',
        lessons: [
          {
            key: 'l5',
            title: 'ตกแต่ง UI อย่างรวดเร็วด้วย Tailwind CSS',
            video: 'tailwind',
            intro: 'Tailwind ใช้ utility class ตกแต่งตรงใน JSX ลดการสลับไปมาระหว่างไฟล์',
            points: ['ใช้ prefix อย่าง sm: md: lg: ทำ responsive', 'แยกส่วนที่ใช้ซ้ำเป็น Component แทนการคัดลอก class ยาว ๆ'],
          },
          {
            key: 'l6',
            title: 'ดึงข้อมูลหลายแหล่งพร้อมกัน',
            video: 'parallelRequests',
            intro: 'Server Component เป็นฟังก์ชัน async ได้ จึง await ข้อมูลก่อน render ได้ทันที',
            points: ['ดึงข้อมูลที่ไม่ขึ้นต่อกันแบบขนานด้วย Promise.all', 'คิดก่อนว่าข้อมูลควรสดแค่ไหน แล้วเลือกกลยุทธ์ cache ให้ตรง'],
            code: { language: 'tsx', source: 'export default async function DashboardPage() {\n  const [courses, reviews] = await Promise.all([\n    getPublishedCourses(),\n    getLatestReviews(),\n  ]);\n  return <Dashboard courses={courses} reviews={reviews} />;\n}' },
          },
        ],
      },
      {
        title: 'เตรียมขึ้น Production',
        lessons: [
          {
            key: 'l7',
            title: 'Deploy Next.js และ Checklist ก่อนปล่อยจริง',
            video: 'deployNext',
            intro: 'ก่อนปล่อยให้ผู้ใช้จริงใช้งาน ตรวจสิ่งเหล่านี้ทุกครั้ง',
            points: ['npm run build ผ่านโดยไม่มี error', 'ตั้งค่า environment variable บนเซิร์ฟเวอร์ครบ', 'มีหน้า 404 และหน้า error ที่เป็นมิตร', 'ตั้ง metadata และ Open Graph ให้หน้าสำคัญ'],
            exercise: 'deploy โปรเจกต์ของคุณ แล้วทดสอบบนมือถือจริงอย่างน้อยหนึ่งเครื่อง',
          },
        ],
      },
    ],
    reviews: [
      { name: 'พีรพัฒน์ น.', rating: 5, comment: 'เข้าใจ Server Components จริง ๆ เอาไปใช้กับงานที่บริษัทได้เลย', daysAgo: 14 },
      { name: 'อรวรรณ ป.', rating: 4, comment: 'ดีมาก แต่ควรเรียน React มาก่อน ไม่อย่างนั้นจะตามยาก', daysAgo: 33 },
      { name: 'ณัฐวุฒิ ห.', rating: 5, comment: 'checklist ก่อน deploy มีประโยชน์มาก', daysAgo: 61 },
    ],
  },
  {
    key: 'git',
    title: 'Git & GitHub สำหรับทำงานเป็นทีม',
    slug: 'git-github-teamwork',
    price: '590.00',
    status: 'published',
    tags: ['Git'],
    description: '<p>ใช้ Git จัดการเวอร์ชันของโค้ด และทำงานร่วมกับทีมบน GitHub ด้วย Branch และ Pull Request แบบที่บริษัทใช้จริง</p>',
    sections: [
      {
        title: 'พื้นฐาน Git',
        lessons: [
          {
            key: 'l1',
            title: 'Git คืออะไร และทำไมนักพัฒนาทุกคนต้องใช้',
            video: 'gitTracking',
            freePreview: true,
            intro: 'Git บันทึกประวัติการแก้ไขโค้ดทุกครั้ง ย้อนกลับได้ และให้หลายคนทำงานพร้อมกันได้',
            points: ['Git ทำงานบนเครื่องเรา GitHub คือที่ฝากโค้ดออนไลน์', 'commit คือจุดบันทึกพร้อมข้อความอธิบาย'],
          },
          {
            key: 'l2',
            title: 'คำสั่งพื้นฐาน: init, add, commit, push',
            video: 'gitBasics',
            intro: 'คำสั่งชุดนี้ใช้ทุกวัน จำให้ขึ้นใจ',
            points: ['git add เลือกไฟล์เข้าสู่ staging', 'git commit บันทึกสิ่งที่อยู่ใน staging', 'ข้อความ commit ควรบอกว่าเปลี่ยนอะไรและทำไม'],
            code: { language: 'bash', source: 'git init\ngit add index.html\ngit commit -m "Add profile page"\ngit remote add origin https://github.com/you/profile.git\ngit push -u origin main' },
            quiz: [
              single('คำสั่งใดนำไฟล์เข้าสู่ staging area', 'git add', ['git commit', 'git push']),
              single('ข้อความ commit ที่ดีควรเป็นแบบใด', 'บอกว่าเปลี่ยนอะไรและทำไม เช่น "Fix login redirect after signup"', ['"update"', '"แก้นิดหน่อย"']),
            ],
          },
          {
            key: 'l3',
            title: 'ไฟล์ .gitignore ใช้ทำอะไร',
            video: 'gitignore',
            intro: 'บอก Git ว่าไฟล์ใดไม่ต้องติดตาม เช่น node_modules และไฟล์ความลับ',
            points: ['ใส่ .env และไฟล์ความลับไว้ใน .gitignore เสมอ', 'ถ้าเผลอ commit ความลับไปแล้ว ต้องเปลี่ยนค่านั้นใหม่ทันที'],
            code: { language: 'text', source: 'node_modules/\n.env*\n.next/\ndist/' },
          },
        ],
      },
      {
        title: 'ทำงานร่วมกันบน GitHub',
        lessons: [
          {
            key: 'l4',
            title: 'Branch, Merge และการทำงานเป็นทีม',
            video: 'gitTeamwork',
            intro: 'แยก branch สำหรับแต่ละงาน ทำให้ main พร้อมใช้งานเสมอ',
            points: ['ตั้งชื่อ branch ตามงาน เช่น feat/search', 'ดึง main ล่าสุดมารวมก่อนเปิด Pull Request'],
            code: { language: 'bash', source: 'git switch -c feat/search\n# ...แก้โค้ดและ commit...\ngit switch main\ngit pull\ngit merge feat/search' },
          },
          {
            key: 'l5',
            title: 'Pull Request และการรีวิวโค้ด',
            intro: 'Pull Request คือการขอให้ทีมตรวจและรวมโค้ดของเราเข้า main',
            points: ['อธิบายว่าเปลี่ยนอะไร ทดสอบอย่างไร และมีความเสี่ยงอะไร', 'PR เล็ก ๆ รีวิวง่ายและเร็วกว่า', 'ตอบทุกคอมเมนต์ แม้แค่บอกว่าแก้แล้ว'],
            quiz: [
              single('ข้อใดทำให้ Pull Request รีวิวง่ายที่สุด', 'แยกเป็น PR เล็กที่มีจุดประสงค์เดียว', ['รวมทุกงานของสัปดาห์ไว้ใน PR เดียว', 'ไม่ต้องเขียนคำอธิบาย']),
            ],
          },
          {
            key: 'l6',
            title: 'คำสั่ง Git ที่ต้องระวัง',
            video: 'dangerousGit',
            intro: 'บางคำสั่งลบงานหรือเขียนทับประวัติได้ รู้ไว้ก่อนจะได้ไม่พลาด',
            points: ['ระวัง git push --force บน branch ที่คนอื่นใช้ร่วม', 'git reset --hard ทิ้งงานที่ยังไม่ commit ทันที', 'ไม่แน่ใจให้สร้าง branch สำรองก่อนเสมอ'],
          },
          {
            key: 'l7',
            title: 'แก้ Merge Conflict แบบไม่ตื่นตระหนก',
            intro: 'Conflict เกิดเมื่อสอง branch แก้บรรทัดเดียวกัน Git จึงให้เราเลือกเอง',
            points: ['หาเครื่องหมาย <<<<<<< ======= >>>>>>> ในไฟล์', 'เลือกหรือรวมโค้ดที่ถูก แล้วลบเครื่องหมายออก', 'add และ commit เพื่อจบการ merge'],
            code: { language: 'text', source: '<<<<<<< HEAD\nconst title = "คอร์สทั้งหมด";\n=======\nconst title = "คอร์สของเรา";\n>>>>>>> feat/rename' },
          },
        ],
      },
    ],
    reviews: [
      { name: 'ชลธิชา ก.', rating: 5, comment: 'เข้าทำงานวันแรกใช้ Git กับทีมได้เลย ไม่ต้องกลัว conflict อีกแล้ว', daysAgo: 27 },
      { name: 'ศุภกร ต.', rating: 4, comment: 'สั้น กระชับ ได้ใจความ', daysAgo: 58 },
    ],
  },
  {
    key: 'ai',
    title: 'พัฒนาเว็บในยุค AI: สั่งงาน ตรวจ และส่งงานอย่างมืออาชีพ',
    slug: 'ai-assisted-web-development',
    price: '2490.00',
    status: 'published',
    tags: ['AI', 'JavaScript'],
    description: '<p>AI เขียนโค้ดได้เร็ว แต่คนที่ส่งงานต้องรับผิดชอบคุณภาพ คอร์สนี้สอนวิธีสั่งงาน AI ให้ชัด ตรวจโค้ดที่ได้ เขียนเทสต์ยืนยัน และป้องกันช่องโหว่ก่อนส่งงานจริง</p><h3>เหมาะกับ</h3><ul><li>คนที่เขียนเว็บพื้นฐานได้แล้ว และเริ่มใช้ AI ช่วยเขียนโค้ด</li><li>Junior Developer ที่อยากทำงานกับ AI ได้อย่างมั่นใจ</li></ul>',
    sections: [
      {
        title: 'ทำงานร่วมกับ AI',
        lessons: [
          {
            key: 'l1',
            title: 'ใครก็ใช้ AI ทำ Software ได้ แล้วอะไรคือความแตกต่าง',
            video: 'aiDifference',
            freePreview: true,
            intro: 'AI เปลี่ยนวิธีเขียนโค้ด แต่ไม่เปลี่ยนความรับผิดชอบต่อสิ่งที่ส่งให้ผู้ใช้',
            points: ['ใช้ AI ร่างโค้ด อธิบายโค้ด และหาบั๊ก', 'คนยังต้องตัดสินใจเรื่องการออกแบบ ความปลอดภัย และคุณภาพ'],
          },
          {
            key: 'l2',
            title: 'เขียน Prompt ให้ AI เข้าใจงาน',
            video: 'goodPrompts',
            intro: 'คำสั่งที่ดีเหมือนใบงานที่ดี บอกเป้าหมาย บริบท ข้อจำกัด และวิธีตรวจว่าเสร็จ',
            points: ['ระบุไฟล์และโค้ดที่เกี่ยวข้อง', 'บอกสิ่งที่ห้ามเปลี่ยน', 'ขอให้ AI อธิบายแผนก่อนลงมือเมื่องานใหญ่'],
            exercise: 'เขียนคำสั่งให้ AI เพิ่มช่องค้นหาในหน้ารายการสินค้า โดยระบุเงื่อนไขการทดสอบอย่างน้อย 3 ข้อ',
          },
        ],
      },
      {
        title: 'ตรวจงานที่ AI เขียน',
        lessons: [
          {
            key: 'l3',
            title: 'ใช้ AI Agent อย่างไรไม่ให้โค้ดพัง',
            video: 'agentBestPractices',
            intro: 'อ่านทุกบรรทัดที่จะ merge เหมือนรีวิวโค้ดของเพื่อนร่วมทีม',
            points: ['ตรวจว่าโค้ดทำตามที่ขอจริง ไม่ทำเกิน', 'ระวังฟังก์ชันหรือ library ที่ไม่มีอยู่จริง', 'รันโค้ดดูผลด้วยตัวเองทุกครั้ง'],
            quiz: [
              single('AI เสนอให้ import ฟังก์ชันจาก library ที่คุณไม่รู้จัก ควรทำอย่างไร', 'ตรวจในเอกสารทางการว่ามีอยู่จริงและใช้ถูกวิธี', ['เชื่อได้เลยเพราะ AI รู้มากกว่า', 'ลบ import ออกแล้วหวังว่าจะทำงาน']),
            ],
          },
          {
            key: 'l4',
            title: 'เขียนเทสต์เพื่อยืนยันว่าโค้ดทำงานถูก',
            video: 'apiTests',
            intro: 'เทสต์คือหลักฐานว่าโค้ดทำงานตามที่ตั้งใจ และช่วยจับเมื่อ AI แก้แล้วพังของเดิม',
            points: ['เทสต์พฤติกรรม ไม่ใช่รายละเอียดภายใน', 'ลองทำให้เทสต์ fail หนึ่งครั้งเพื่อยืนยันว่ามันตรวจจริง'],
            code: { language: 'ts', source: 'import { describe, expect, it } from "vitest";\nimport { applyDiscount } from "./price";\n\ndescribe("applyDiscount", () => {\n  it("never returns a negative price", () => {\n    expect(applyDiscount(100, 150)).toBe(0);\n  });\n});' },
          },
          {
            key: 'l5',
            title: 'ความปลอดภัย: สิ่งที่ห้ามปล่อยผ่าน',
            video: 'webSecurity',
            intro: 'โค้ดจาก AI อาจทำงานได้แต่ไม่ปลอดภัย ตรวจจุดเสี่ยงเหล่านี้ทุกครั้ง',
            points: ['ตรวจสิทธิ์ผู้ใช้ฝั่งเซิร์ฟเวอร์เสมอ ไม่เชื่อค่าจาก client', 'ห้ามใส่ secret ในโค้ดหรือส่งไปฝั่ง client', 'validate ข้อมูลทุกอย่างที่รับจากผู้ใช้'],
            quiz: [
              single('ปุ่ม "ลบผู้ใช้" ซ่อนไว้สำหรับแอดมินในหน้าเว็บแล้ว ต้องตรวจสิทธิ์ที่ API อีกหรือไม่', 'ต้องตรวจ เพราะใครก็เรียก API ตรงได้', ['ไม่ต้อง เพราะผู้ใช้ทั่วไปไม่เห็นปุ่ม']),
              single('ข้อใดไม่ควรทำกับ API key ของบริการชำระเงิน', 'ใส่ไว้ในโค้ด React เพื่อเรียกใช้ง่าย', ['เก็บไว้ฝั่งเซิร์ฟเวอร์เท่านั้น', 'จำกัดสิทธิ์ของ key ให้น้อยที่สุดที่ใช้งานได้']),
            ],
          },
        ],
      },
      {
        title: 'Workflow ส่งงานจริง',
        lessons: [
          {
            key: 'l6',
            title: 'Workflow ใช้ AI เขียนโค้ดแบบไม่พัง',
            video: 'aiWorkflow',
            intro: 'รวมทุกอย่างเป็นขั้นตอนเดียว: วางแผน ให้ AI ลงมือทีละส่วน ตรวจ ทดสอบ แล้วค่อย commit',
            points: ['แตกงานเป็นชิ้นเล็กที่ตรวจได้', 'commit บ่อยเพื่อย้อนกลับได้ง่าย', 'อ่าน diff ทุกครั้งก่อน merge'],
            exercise: 'เลือกฟีเจอร์เล็ก ๆ หนึ่งอย่าง ทำตาม workflow นี้ แล้วจดว่าตรงไหนที่คุณต้องแก้งานของ AI',
          },
        ],
      },
    ],
    reviews: [
      { name: 'ธนกฤต ส.', rating: 5, comment: 'เปลี่ยนวิธีใช้ AI ของผมไปเลย จากก๊อปวางเป็นรีวิวและเขียนเทสต์ก่อนส่ง', daysAgo: 9 },
      { name: 'พิมพ์ชนก อ.', rating: 4, comment: 'หมวดความปลอดภัยดีมาก อยากให้มีตัวอย่างโปรเจกต์ใหญ่ขึ้น', daysAgo: 36 },
    ],
  },
  {
    key: 'node',
    title: 'Node.js & Express: สร้าง REST API',
    slug: 'nodejs-express-rest-api',
    price: '1490.00',
    status: 'draft',
    tags: ['Node.js', 'JavaScript'],
    description: '<p>คอร์สที่กำลังเตรียมเนื้อหา: สร้าง REST API ด้วย Node.js และ Express ตั้งแต่ติดตั้งจนเชื่อมฐานข้อมูล</p>',
    sections: [
      {
        title: 'เริ่มต้นฝั่งเซิร์ฟเวอร์',
        lessons: [
          {
            key: 'l1',
            title: 'สร้างเซิร์ฟเวอร์แรกด้วย Node.js',
            video: 'nodeServer',
            intro: 'สร้างเซิร์ฟเวอร์ที่ตอบกลับได้ในไม่กี่บรรทัด แล้วต่อยอดเป็น Express',
            points: ['ใช้ Node.js เวอร์ชัน LTS', 'ใช้ node --watch ระหว่างพัฒนา'],
            code: { language: 'js', source: 'import express from "express";\nconst app = express();\napp.get("/api/health", (req, res) => res.json({ ok: true }));\napp.listen(3000);' },
          },
          {
            key: 'l2',
            title: 'ออกแบบ REST API ให้เข้าใจง่าย',
            video: 'restApi',
            intro: 'ตั้งชื่อ resource เป็นคำนาม แล้วใช้ HTTP method บอกการกระทำ',
            points: ['GET อ่าน POST สร้าง PATCH แก้บางส่วน DELETE ลบ', 'ตอบ status code ให้ตรงความหมาย เช่น 201, 400, 404'],
          },
        ],
      },
    ],
    reviews: [],
  },
];

export const DEMO_BUNDLE = {
  title: 'Frontend Starter Pack: JavaScript + React + Next.js',
  slug: 'frontend-starter-pack',
  price: '3990.00',
  description: 'เส้นทางครบตั้งแต่ JavaScript ถึงสร้างเว็บแอปด้วย Next.js ในราคาพิเศษเมื่อซื้อรวม',
  courseKeys: ['js', 'react', 'next'],
};

export const DEMO_INSTRUCTOR = { name: 'ทีมผู้สอน MilerDev', email: 'instructor@demo.milerdev.local' };
