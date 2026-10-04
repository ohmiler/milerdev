// Content for the public /stack page: what MilerDev is built with and how the parts connect.
// Keep it at the level of "what we use and why". Never list secrets, env names, internal endpoints,
// or how the anti-fraud checks work.

export type StackLayerId = 'people' | 'app' | 'data' | 'services' | 'delivery';

export type StackLayer = {
  id: StackLayerId;
  name: string;
  summary: string;
  color: string;
};

export type StackNode = {
  id: string;
  layer: StackLayerId;
  name: string;
  tag: string;
  does: string;
  why: string;
};

export type StackEdge = { from: string; to: string; label: string };

export type StackJourneyStep = { from: string; to: string; caption: string };

export type StackJourney = { id: string; name: string; summary: string; steps: StackJourneyStep[] };

export const STACK_LAYERS: StackLayer[] = [
  { id: 'people', name: 'ผู้ใช้', summary: 'สิ่งที่อยู่ในมือผู้เรียน', color: '#63d7d0' },
  { id: 'app', name: 'แอป', summary: 'โค้ดของ MilerDev ที่รันบน Railway', color: '#33bcff' },
  { id: 'data', name: 'ข้อมูล', summary: 'ที่เก็บข้อมูลถาวร', color: '#a9e768' },
  { id: 'services', name: 'บริการภายนอก', summary: 'งานเฉพาะทางที่ให้ผู้เชี่ยวชาญแต่ละด้านทำ', color: '#ffb547' },
  { id: 'delivery', name: 'การส่งขึ้นเว็บ', summary: 'เส้นทางจากโค้ดในเครื่องไปถึงเว็บจริง', color: '#c4a1ff' },
];

export const STACK_NODES: StackNode[] = [
  {
    id: 'browser', layer: 'people', name: 'เบราว์เซอร์', tag: 'คอม · มือถือ',
    does: 'ผู้เรียนดูคอร์ส ซื้อคอร์ส และเรียนผ่านเว็บโดยตรง',
    why: 'ไม่ต้องติดตั้งแอป เปิดจากเครื่องไหนก็เรียนต่อจากที่ค้างไว้ได้',
  },
  {
    id: 'bank-app', layer: 'people', name: 'แอปธนาคาร', tag: 'พร้อมเพย์',
    does: 'สแกน QR พร้อมเพย์ที่ใส่ยอดไว้แล้ว โอนเงิน แล้วออกสลิปให้',
    why: 'คนไทยส่วนใหญ่จ่ายด้วยพร้อมเพย์อยู่แล้ว ไม่ต้องมีบัตร',
  },
  {
    id: 'nextjs', layer: 'app', name: 'Next.js', tag: 'App Router · Server Components',
    does: 'สร้างหน้าเว็บบนเซิร์ฟเวอร์ แล้วส่ง HTML ที่พร้อมอ่านไปให้เบราว์เซอร์',
    why: 'หน้าโหลดเร็ว Google อ่านเนื้อหาได้ทันที และหน้าเว็บกับ API อยู่ในโปรเจกต์เดียวกัน',
  },
  {
    id: 'ui', layer: 'app', name: 'React UI', tag: 'React · Tailwind · shadcn/ui',
    does: 'ส่วนที่โต้ตอบได้ในเบราว์เซอร์ เช่น หน้าชำระเงิน ตัวเล่นวิดีโอ และเครื่องมือแอดมิน',
    why: 'ใช้คอมโพเนนต์ชุดเดียวกันทั้งเว็บ หน้าตาจึงไปทางเดียวกันและแก้ที่เดียวได้',
  },
  {
    id: 'api', layer: 'app', name: 'API Routes', tag: 'TypeScript · Zod',
    does: 'รับคำขอที่เปลี่ยนข้อมูล เช่น สร้างรายการชำระเงิน สร้าง QR ตรวจสลิป และบันทึกความคืบหน้า',
    why: 'ตรวจข้อมูลที่ส่งเข้ามาและตรวจสิทธิ์บนเซิร์ฟเวอร์ทุกครั้ง ไม่เชื่อสิ่งที่เบราว์เซอร์บอก',
  },
  {
    id: 'auth', layer: 'app', name: 'Auth.js', tag: 'NextAuth v5',
    does: 'จัดการการสมัครและล็อกอินด้วย Google หรืออีเมล แล้วบอกทุกหน้าว่าใครกำลังใช้งาน',
    why: 'เป็นตัวมาตรฐานของ Next.js รองรับหลายวิธีล็อกอินในระบบเดียว',
  },
  {
    id: 'drizzle', layer: 'data', name: 'Drizzle ORM', tag: 'TypeScript → SQL',
    does: 'แปลงโค้ด TypeScript เป็นคำสั่ง SQL และจัดการ migration เวลาเปลี่ยนโครงสร้างตาราง',
    why: 'TypeScript เช็กชื่อตารางและคอลัมน์ให้ตั้งแต่ตอนเขียน ไม่ต้องรอไปพังตอนรัน',
  },
  {
    id: 'mysql', layer: 'data', name: 'MySQL', tag: 'ฐานข้อมูล',
    does: 'เก็บผู้ใช้ คอร์ส บทเรียน การลงทะเบียน การชำระเงิน ความคืบหน้า และใบประกาศ',
    why: 'ข้อมูลเงินและสิทธิ์เรียนต้องถูกต้องเสมอ ฐานข้อมูลแบบตารางที่มี transaction จึงเหมาะ',
  },
  {
    id: 'stripe', layer: 'services', name: 'Stripe', tag: 'บัตรเครดิต · เดบิต',
    does: 'รับชำระด้วยบัตรบนหน้าของ Stripe แล้วแจ้งผลกลับมาที่ระบบ',
    why: 'เว็บเราไม่ต้องเห็นหรือเก็บเลขบัตรเลย',
  },
  {
    id: 'slipok', layer: 'services', name: 'SlipOK', tag: 'ตรวจสลิป',
    does: 'อ่าน QR บนสลิปแล้วเช็กกับข้อมูลธนาคารว่าโอนจริงและยอดถึง',
    why: 'เปิดสิทธิ์เรียนได้เองภายในไม่กี่วินาที ไม่ต้องรอแอดมินเช็กยอด',
  },
  {
    id: 'bunny', layer: 'services', name: 'Bunny.net', tag: 'Stream · CDN',
    does: 'เก็บและสตรีมวิดีโอบทเรียน รวมถึงรูปคอร์ส ผ่านเซิร์ฟเวอร์ที่อยู่ใกล้ผู้เรียน',
    why: 'วิดีโอเล่นลื่นและถูกกว่าเก็บเอง ลิงก์วิดีโอหมดอายุเองและออกให้เฉพาะผู้มีสิทธิ์',
  },
  {
    id: 'email', layer: 'services', name: 'Resend', tag: 'อีเมล',
    does: 'ส่งอีเมลยืนยันการสมัคร รีเซ็ตรหัสผ่าน ยืนยันการชำระเงิน และใบประกาศ',
    why: 'ไม่ต้องดูแลเมลเซิร์ฟเวอร์เอง และส่งถึงกล่องจดหมายได้ดีกว่าส่งเอง',
  },
  {
    id: 'google', layer: 'services', name: 'Google', tag: 'Sign-In',
    does: 'ให้ผู้เรียนล็อกอินด้วยบัญชี Google ที่มีอยู่แล้ว',
    why: 'ไม่ต้องตั้งและจำรหัสผ่านใหม่',
  },
  {
    id: 'github', layer: 'delivery', name: 'GitHub', tag: 'โค้ด · Pull Request',
    does: 'เก็บโค้ดทั้งหมด ทุกการเปลี่ยนแปลงเข้ามาเป็น Pull Request ที่ตรวจได้ก่อน',
    why: 'ย้อนดูได้ว่าอะไรเปลี่ยน เมื่อไหร่ และเพราะอะไร',
  },
  {
    id: 'ci', layer: 'delivery', name: 'GitHub Actions', tag: 'Vitest · Playwright',
    does: 'ทุก Pull Request ต้องผ่าน lint, type check, เทสต์อัตโนมัติ และเทสต์บนเบราว์เซอร์จริงกับ MySQL ก่อน merge',
    why: 'จับบั๊กก่อนถึงผู้เรียน โดยเฉพาะเรื่องเงินและสิทธิ์เรียน',
  },
  {
    id: 'railway', layer: 'delivery', name: 'Railway', tag: 'โฮสต์',
    does: 'build โค้ดล่าสุด อัปเดตโครงสร้างฐานข้อมูล แล้วสลับไปใช้เวอร์ชันใหม่เมื่อเช็กแล้วว่าทำงาน',
    why: 'merge แล้ว deploy เอง ถ้าขั้นไหนพัง เวอร์ชันเดิมยังให้บริการต่อ',
  },
];

export const STACK_EDGES: StackEdge[] = [
  { from: 'browser', to: 'nextjs', label: 'หน้าเว็บ' },
  { from: 'browser', to: 'ui', label: 'ปุ่ม ฟอร์ม ตัวเล่นวิดีโอ' },
  { from: 'browser', to: 'auth', label: 'ล็อกอิน' },
  { from: 'browser', to: 'bank-app', label: 'สแกน QR' },
  { from: 'browser', to: 'stripe', label: 'กรอกบัตรบนหน้า Stripe' },
  { from: 'browser', to: 'bunny', label: 'สตรีมวิดีโอ' },
  { from: 'ui', to: 'api', label: 'ส่งคำขอ' },
  { from: 'nextjs', to: 'auth', label: 'ใครกำลังใช้งาน' },
  { from: 'api', to: 'auth', label: 'เช็กสิทธิ์' },
  { from: 'nextjs', to: 'drizzle', label: 'อ่านข้อมูลมาแสดง' },
  { from: 'api', to: 'drizzle', label: 'บันทึกข้อมูล' },
  { from: 'auth', to: 'drizzle', label: 'บัญชีผู้ใช้' },
  { from: 'drizzle', to: 'mysql', label: 'SQL' },
  { from: 'api', to: 'stripe', label: 'สร้างหน้าชำระเงิน · รับผล' },
  { from: 'api', to: 'slipok', label: 'ตรวจสลิป' },
  { from: 'nextjs', to: 'bunny', label: 'ลิงก์วิดีโอเฉพาะผู้มีสิทธิ์' },
  { from: 'api', to: 'email', label: 'ส่งอีเมล' },
  { from: 'auth', to: 'google', label: 'ล็อกอินด้วย Google' },
  { from: 'github', to: 'ci', label: 'ทุก Pull Request' },
  { from: 'github', to: 'railway', label: 'merge แล้ว deploy' },
  { from: 'railway', to: 'mysql', label: 'migration' },
  { from: 'railway', to: 'nextjs', label: 'รันเวอร์ชันใหม่' },
];

export const STACK_JOURNEYS: StackJourney[] = [
  {
    id: 'promptpay', name: 'ซื้อคอร์สด้วยพร้อมเพย์', summary: 'จากกดซื้อ ถึงได้สิทธิ์เรียนโดยไม่ต้องรอแอดมิน',
    steps: [
      { from: 'browser', to: 'ui', caption: 'กดซื้อคอร์สแล้วเลือกพร้อมเพย์' },
      { from: 'ui', to: 'api', caption: 'ขอสร้างรายการชำระเงิน ระบบคิดราคาจากฐานข้อมูลเอง' },
      { from: 'api', to: 'drizzle', caption: 'บันทึกรายการพร้อมยอดที่ต้องจ่าย' },
      { from: 'drizzle', to: 'mysql', caption: 'เก็บรายการลงฐานข้อมูล' },
      { from: 'api', to: 'ui', caption: 'ส่ง QR ที่ใส่ยอดไว้แล้วกลับไปแสดง' },
      { from: 'browser', to: 'bank-app', caption: 'สแกน QR โอนเงิน แล้วได้สลิป' },
      { from: 'ui', to: 'api', caption: 'แนบสลิปของรายการนี้' },
      { from: 'api', to: 'slipok', caption: 'ส่งสลิปไปเช็กกับข้อมูลธนาคาร' },
      { from: 'slipok', to: 'api', caption: 'ยืนยันว่าโอนจริงและยอดถึง' },
      { from: 'api', to: 'drizzle', caption: 'เปิดสิทธิ์เรียนพร้อมบันทึกการชำระเงิน' },
      { from: 'api', to: 'email', caption: 'ส่งอีเมลยืนยันการชำระเงิน' },
    ],
  },
  {
    id: 'card', name: 'ซื้อคอร์สด้วยบัตร', summary: 'จ่ายบนหน้าของ Stripe แล้วระบบเปิดสิทธิ์เมื่อได้รับผล',
    steps: [
      { from: 'browser', to: 'ui', caption: 'กดซื้อคอร์สแล้วเลือกจ่ายด้วยบัตร' },
      { from: 'ui', to: 'api', caption: 'ขอสร้างหน้าชำระเงิน' },
      { from: 'api', to: 'stripe', caption: 'สร้างหน้าชำระเงินด้วยราคาจากฐานข้อมูล' },
      { from: 'browser', to: 'stripe', caption: 'กรอกบัตรบนหน้าของ Stripe' },
      { from: 'stripe', to: 'api', caption: 'Stripe แจ้งผลการชำระกลับมา' },
      { from: 'api', to: 'drizzle', caption: 'เปิดสิทธิ์เรียนพร้อมบันทึกการชำระเงิน' },
      { from: 'api', to: 'email', caption: 'ส่งอีเมลยืนยันการชำระเงิน' },
    ],
  },
  {
    id: 'video', name: 'เปิดดูวิดีโอบทเรียน', summary: 'ระบบเช็กสิทธิ์ก่อน แล้ววิดีโอวิ่งจาก CDN ตรงถึงผู้เรียน',
    steps: [
      { from: 'browser', to: 'nextjs', caption: 'เปิดหน้าบทเรียน' },
      { from: 'nextjs', to: 'auth', caption: 'เช็กว่าล็อกอินแล้ว' },
      { from: 'nextjs', to: 'drizzle', caption: 'เช็กว่ามีสิทธิ์เรียนคอร์สนี้' },
      { from: 'drizzle', to: 'mysql', caption: 'อ่านการลงทะเบียนจากฐานข้อมูล' },
      { from: 'nextjs', to: 'bunny', caption: 'ออกลิงก์วิดีโอที่หมดอายุเอง' },
      { from: 'bunny', to: 'browser', caption: 'สตรีมวิดีโอจากเซิร์ฟเวอร์ใกล้ผู้เรียน' },
      { from: 'ui', to: 'api', caption: 'บันทึกความคืบหน้าเมื่อเรียนจบบท' },
    ],
  },
  {
    id: 'login', name: 'ล็อกอินด้วย Google', summary: 'ยืนยันตัวตนกับ Google แล้วจำการล็อกอินไว้',
    steps: [
      { from: 'browser', to: 'auth', caption: 'กดล็อกอินด้วย Google' },
      { from: 'auth', to: 'google', caption: 'ส่งไปยืนยันตัวตนกับ Google' },
      { from: 'google', to: 'auth', caption: 'Google ยืนยันกลับมา' },
      { from: 'auth', to: 'drizzle', caption: 'หาบัญชีเดิมหรือสร้างบัญชีใหม่' },
      { from: 'drizzle', to: 'mysql', caption: 'อ่านและบันทึกบัญชีผู้ใช้' },
      { from: 'auth', to: 'browser', caption: 'ออก session ที่เข้ารหัสไว้ในคุกกี้' },
    ],
  },
  {
    id: 'deploy', name: 'ส่งโค้ดขึ้นเว็บจริง', summary: 'ทุกการเปลี่ยนแปลงต้องผ่านเทสต์ก่อนถึงผู้เรียน',
    steps: [
      { from: 'github', to: 'ci', caption: 'เปิด Pull Request แล้ว CI รันเทสต์ทั้งหมด' },
      { from: 'ci', to: 'github', caption: 'ทุกด่านผ่าน พร้อม merge' },
      { from: 'github', to: 'railway', caption: 'merge เข้า master แล้ว Railway เริ่ม deploy' },
      { from: 'railway', to: 'mysql', caption: 'อัปเดตโครงสร้างฐานข้อมูลก่อน' },
      { from: 'railway', to: 'nextjs', caption: 'สลับไปใช้เวอร์ชันใหม่เมื่อเช็กแล้วว่าทำงาน' },
    ],
  },
];

export function findStackNode(id: string) {
  return STACK_NODES.find((node) => node.id === id);
}

export function stackNeighbors(id: string) {
  return STACK_EDGES.flatMap((edge) => {
    if (edge.from === id) return [{ id: edge.to, label: edge.label }];
    if (edge.to === id) return [{ id: edge.from, label: edge.label }];
    return [];
  });
}

export function isStackEdge(a: string, b: string) {
  return STACK_EDGES.some((edge) => (edge.from === a && edge.to === b) || (edge.from === b && edge.to === a));
}

export type StackTourStop = { layer: StackLayerId; text: string };

// The guided tour visits the layers top to bottom, then hands over to the PromptPay journey.
export const STACK_TOUR: StackTourStop[] = [
  { layer: 'people', text: 'เริ่มจากผู้เรียน เปิดเว็บด้วยเบราว์เซอร์ และใช้แอปธนาคารตอนจ่ายด้วยพร้อมเพย์' },
  { layer: 'app', text: 'โค้ดของ MilerDev เอง Next.js สร้างหน้าเว็บ React ทำส่วนที่กดได้ API รับคำขอ และ Auth.js ดูแลการล็อกอิน' },
  { layer: 'data', text: 'ข้อมูลทั้งหมดอยู่ใน MySQL โดยโค้ดคุยกับฐานข้อมูลผ่าน Drizzle ที่ TypeScript ตรวจให้' },
  { layer: 'services', text: 'งานเฉพาะทางให้ผู้เชี่ยวชาญทำ เงินผ่าน Stripe และ SlipOK วิดีโอผ่าน Bunny อีเมลผ่าน Resend และล็อกอินผ่าน Google' },
  { layer: 'delivery', text: 'โค้ดทุกบรรทัดผ่าน GitHub และเทสต์อัตโนมัติก่อน แล้ว Railway จึง deploy ขึ้นเว็บจริง' },
];

export const STACK_TOUR_FINALE = 'promptpay';

// Shareable views: ?part=<node>, ?flow=<journey> or ?tour. Only known ids are accepted.
export type StackView = { part: string | null; flow: string | null; tour: boolean };

export function parseStackView(search: string): StackView | null {
  const params = new URLSearchParams(search);
  const flow = params.get('flow');
  const part = params.get('part');
  const view = {
    part: part && findStackNode(part) ? part : null,
    flow: flow && STACK_JOURNEYS.some((journey) => journey.id === flow) ? flow : null,
    tour: params.has('tour'),
  };
  return view.part || view.flow || view.tour ? view : null;
}

export function stackViewQuery(view: StackView) {
  if (view.tour) return '?tour';
  if (view.flow) return `?flow=${view.flow}`;
  if (view.part) return `?part=${view.part}`;
  return '';
}
