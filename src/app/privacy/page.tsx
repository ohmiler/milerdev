import type { Metadata } from 'next';
import Link from 'next/link';
import LegalDocument, { LegalSection } from '@/components/content/LegalDocument';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'นโยบายความเป็นส่วนตัว',
  description: 'รายละเอียดการเก็บ ใช้ แบ่งปัน และดูแลข้อมูลส่วนตัวของผู้ใช้ MilerDev',
};

const sections = [
  { id: 'privacy-collection', title: 'ข้อมูลที่เราเก็บรวบรวม' },
  { id: 'privacy-purpose', title: 'วัตถุประสงค์ในการใช้ข้อมูล' },
  { id: 'privacy-sharing', title: 'การแบ่งปันข้อมูล' },
  { id: 'privacy-cookies', title: 'คุกกี้ (Cookies)' },
  { id: 'privacy-security', title: 'การรักษาความปลอดภัย' },
  { id: 'privacy-rights', title: 'สิทธิ์ของคุณ' },
  { id: 'privacy-minors', title: 'ผู้เยาว์' },
  { id: 'privacy-changes', title: 'การเปลี่ยนแปลงนโยบาย' },
  { id: 'privacy-contact', title: 'ติดต่อเรา' },
];

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="bg-[var(--academy-canvas)]">
        <LegalDocument
          title="นโยบายความเป็นส่วนตัว"
          lede="ข้อมูลเกี่ยวกับสิ่งที่ MilerDev เก็บ เหตุผลที่ใช้ข้อมูล ผู้ให้บริการที่เกี่ยวข้อง และช่องทางสำหรับใช้สิทธิ์ของคุณ"
          updatedLabel="อัปเดตล่าสุด: 1 มกราคม 2568"
          sections={sections}
        >
          <LegalSection id="privacy-collection" number="01" title="ข้อมูลที่เราเก็บรวบรวม">
            <p>เมื่อคุณใช้งาน MilerDev เราอาจเก็บรวบรวมข้อมูลดังต่อไปนี้:</p>
            <ul>
              <li><strong>ข้อมูลบัญชี:</strong> ชื่อ, อีเมล, รูปโปรไฟล์ ที่คุณให้เมื่อสมัครสมาชิก</li>
              <li><strong>ข้อมูลการชำระเงิน:</strong> ประวัติการชำระเงิน, สลิปโอนเงิน (เราไม่เก็บข้อมูลบัตรเครดิต เนื่องจากใช้ระบบ Stripe ในการประมวลผล)</li>
              <li><strong>ข้อมูลการเรียน:</strong> ประวัติการลงทะเบียน, ความคืบหน้าการเรียน, ใบรับรองที่ได้รับ</li>
              <li><strong>ข้อมูลการใช้งาน:</strong> ข้อมูลการเข้าใช้เว็บไซต์, ประเภทเบราว์เซอร์, ที่อยู่ IP</li>
            </ul>
          </LegalSection>

          <LegalSection id="privacy-purpose" number="02" title="วัตถุประสงค์ในการใช้ข้อมูล">
            <p>เราใช้ข้อมูลของคุณเพื่อ:</p>
            <ul>
              <li>ให้บริการแพลตฟอร์มเรียนออนไลน์และจัดการบัญชีผู้ใช้</li>
              <li>ประมวลผลการชำระเงินและออกใบรับรอง</li>
              <li>ส่งอีเมลยืนยันการลงทะเบียน, การชำระเงิน และใบรับรอง</li>
              <li>แจ้งประกาศสำคัญและข่าวสารเกี่ยวกับคอร์สที่คุณลงทะเบียน</li>
              <li>ปรับปรุงและพัฒนาคุณภาพของแพลตฟอร์ม</li>
              <li>ป้องกันการใช้งานที่ไม่เหมาะสมและรักษาความปลอดภัย</li>
            </ul>
          </LegalSection>

          <LegalSection id="privacy-sharing" number="03" title="การแบ่งปันข้อมูล">
            <p>เราจะไม่ขาย แลกเปลี่ยน หรือเปิดเผยข้อมูลส่วนตัวของคุณให้กับบุคคลที่สาม ยกเว้นในกรณีดังนี้:</p>
            <ul>
              <li><strong>ผู้ให้บริการชำระเงิน:</strong> Stripe สำหรับการประมวลผลบัตรเครดิต/เดบิต</li>
              <li><strong>ผู้ให้บริการอีเมล:</strong> สำหรับการส่งอีเมลยืนยันและแจ้งเตือน</li>
              <li><strong>กรณีที่กฎหมายกำหนด:</strong> เมื่อได้รับคำสั่งจากหน่วยงานที่มีอำนาจตามกฎหมาย</li>
            </ul>
          </LegalSection>

          <LegalSection id="privacy-cookies" number="04" title="คุกกี้ (Cookies)">
            <p>เราใช้คุกกี้เพื่อ:</p>
            <ul>
              <li><strong>คุกกี้ที่จำเป็น:</strong> สำหรับการล็อกอินและรักษาเซสชั่นการใช้งาน</li>
              <li><strong>คุกกี้ด้านฟังก์ชัน:</strong> จดจำการตั้งค่าและความชอบของคุณ</li>
            </ul>
            <p>คุณสามารถตั้งค่าเบราว์เซอร์เพื่อปฏิเสธคุกกี้ได้ แต่อาจส่งผลต่อการใช้งานบางฟีเจอร์</p>
          </LegalSection>

          <LegalSection id="privacy-security" number="05" title="การรักษาความปลอดภัย">
            <p>เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสมเพื่อปกป้องข้อมูลของคุณ:</p>
            <ul>
              <li>การเข้ารหัสรหัสผ่านด้วย bcrypt</li>
              <li>การเชื่อมต่อผ่าน HTTPS เพื่อเข้ารหัสข้อมูลระหว่างการส่ง</li>
              <li>การจำกัดการเข้าถึงข้อมูลเฉพาะผู้ที่ได้รับอนุญาต</li>
              <li>การประมวลผลบัตรเครดิตผ่าน Stripe ซึ่งผ่านมาตรฐาน PCI DSS</li>
            </ul>
          </LegalSection>

          <LegalSection id="privacy-rights" number="06" title="สิทธิ์ของคุณ">
            <p>คุณมีสิทธิ์ดังต่อไปนี้เกี่ยวกับข้อมูลส่วนตัวของคุณ:</p>
            <ul>
              <li><strong>สิทธิ์ในการเข้าถึง:</strong> ขอดูข้อมูลส่วนตัวที่เราเก็บเกี่ยวกับคุณ</li>
              <li><strong>สิทธิ์ในการแก้ไข:</strong> ขอแก้ไขข้อมูลที่ไม่ถูกต้อง</li>
              <li><strong>สิทธิ์ในการลบ:</strong> ขอให้ลบข้อมูลของคุณ (ภายใต้เงื่อนไขที่กฎหมายอนุญาต)</li>
              <li><strong>สิทธิ์ในการคัดค้าน:</strong> คัดค้านการใช้ข้อมูลของคุณเพื่อวัตถุประสงค์บางอย่าง</li>
            </ul>
            <p>หากต้องการใช้สิทธิ์ใดๆ กรุณาติดต่อเราผ่านอีเมล milerdev.official@gmail.com</p>
          </LegalSection>

          <LegalSection id="privacy-minors" number="07" title="ผู้เยาว์">
            <p>หากคุณอายุต่ำกว่า 18 ปี กรุณาขอความยินยอมจากผู้ปกครองก่อนใช้งาน MilerDev หรือให้ข้อมูลส่วนตัวใดๆ</p>
          </LegalSection>

          <LegalSection id="privacy-changes" number="08" title="การเปลี่ยนแปลงนโยบาย">
            <p>เราอาจปรับปรุงนโยบายความเป็นส่วนตัวเป็นครั้งคราว การเปลี่ยนแปลงจะมีผลเมื่อเผยแพร่บนเว็บไซต์ เราแนะนำให้คุณตรวจสอบหน้านี้เป็นระยะ</p>
          </LegalSection>

          <LegalSection id="privacy-contact" number="09" title="ติดต่อเรา">
            <p>หากมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัว สามารถติดต่อได้ที่:</p>
            <ul>
              <li>อีเมล: milerdev.official@gmail.com</li>
              <li>Facebook: MilerDev</li>
              <li>หน้าติดต่อ: <Link href="/contact">milerdev.com/contact</Link></li>
            </ul>
          </LegalSection>
        </LegalDocument>
      </main>
      <Footer />
    </>
  );
}
