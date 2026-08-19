import type { Metadata } from 'next';
import Link from 'next/link';
import LegalDocument, { LegalSection } from '@/components/content/LegalDocument';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'เงื่อนไขการใช้งาน',
  description: 'เงื่อนไขเกี่ยวกับบัญชี การเรียน การชำระเงิน ใบรับรอง และการใช้งาน MilerDev',
};

const sections = [
  { id: 'terms-acceptance', title: 'การยอมรับเงื่อนไข' },
  { id: 'terms-account', title: 'บัญชีผู้ใช้' },
  { id: 'terms-learning', title: 'การเรียนและเนื้อหาคอร์ส' },
  { id: 'terms-payment', title: 'การชำระเงิน' },
  { id: 'terms-certificate', title: 'ใบรับรอง (Certificate)' },
  { id: 'terms-prohibited', title: 'สิ่งที่ห้ามทำ' },
  { id: 'terms-liability', title: 'การจำกัดความรับผิดชอบ' },
  { id: 'terms-changes', title: 'การเปลี่ยนแปลงเงื่อนไข' },
  { id: 'terms-contact', title: 'การติดต่อ' },
];

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[var(--academy-canvas)]">
        <LegalDocument
          title="เงื่อนไขการใช้งาน"
          lede="ข้อตกลงเกี่ยวกับบัญชี การเข้าถึงบทเรียน การชำระเงิน ใบรับรอง และขอบเขตการใช้บริการ MilerDev"
          updatedLabel="อัปเดตล่าสุด: 1 มกราคม 2568"
          sections={sections}
        >
          <LegalSection id="terms-acceptance" number="01" title="การยอมรับเงื่อนไข">
            <p>การเข้าใช้งานเว็บไซต์ MilerDev (milerdev.com) ถือว่าคุณยอมรับและตกลงที่จะปฏิบัติตามเงื่อนไขการใช้งานทั้งหมดที่ระบุไว้ในหน้านี้ หากคุณไม่เห็นด้วยกับเงื่อนไขข้อใดข้อหนึ่ง กรุณาหยุดใช้งานเว็บไซต์ทันที</p>
          </LegalSection>

          <LegalSection id="terms-account" number="02" title="บัญชีผู้ใช้">
            <ul>
              <li>คุณต้องให้ข้อมูลที่ถูกต้องและเป็นจริงในการสมัครสมาชิก</li>
              <li>คุณมีหน้าที่รักษาความปลอดภัยของบัญชีและรหัสผ่านของตนเอง</li>
              <li>ห้ามแชร์บัญชีให้ผู้อื่นใช้งาน 1 บัญชีต่อ 1 คนเท่านั้น</li>
              <li>คุณต้องรับผิดชอบต่อกิจกรรมทั้งหมดที่เกิดขึ้นภายใต้บัญชีของคุณ</li>
              <li>ทีมงานสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีที่ละเมิดเงื่อนไข</li>
            </ul>
          </LegalSection>

          <LegalSection id="terms-learning" number="03" title="การเรียนและเนื้อหาคอร์ส">
            <ul>
              <li>เนื้อหาคอร์สเรียนเป็นทรัพย์สินทางปัญญาของ MilerDev และผู้สอน</li>
              <li>ห้ามคัดลอก ดาวน์โหลด บันทึก หรือเผยแพร่เนื้อหาคอร์สโดยไม่ได้รับอนุญาต</li>
              <li>ห้ามแชร์วิดีโอหรือเอกสารประกอบการเรียนให้ผู้ที่ไม่ได้ลงทะเบียน</li>
              <li>การลงทะเบียนเรียนเป็นสิทธิ์ส่วนบุคคล ไม่สามารถโอนให้ผู้อื่นได้</li>
              <li>เมื่อลงทะเบียนแล้ว สามารถเรียนได้ไม่จำกัดเวลา ตราบเท่าที่คอร์สยังเปิดให้บริการ</li>
            </ul>
          </LegalSection>

          <LegalSection id="terms-payment" number="04" title="การชำระเงิน">
            <ul>
              <li>ราคาคอร์สเป็นสกุลเงินบาท (THB) และรวมภาษีมูลค่าเพิ่มแล้ว (ถ้ามี)</li>
              <li>การชำระเงินรองรับผ่าน PromptPay (โอนเงิน) และบัตรเครดิต/เดบิต (Stripe)</li>
              <li>เมื่อชำระเงินสำเร็จแล้ว จะไม่สามารถขอคืนเงินได้ เนื่องจากเป็นสินค้าดิจิทัล</li>
              <li>MilerDev สงวนสิทธิ์ในการเปลี่ยนแปลงราคาคอร์สโดยไม่ต้องแจ้งล่วงหน้า แต่จะไม่ส่งผลกระทบต่อการลงทะเบียนที่ชำระเงินแล้ว</li>
              <li>โปรโมชั่นและส่วนลดมีระยะเวลาจำกัด และอาจเปลี่ยนแปลงได้โดยไม่ต้องแจ้งล่วงหน้า</li>
            </ul>
          </LegalSection>

          <LegalSection id="terms-certificate" number="05" title="ใบรับรอง (Certificate)">
            <ul>
              <li>ใบรับรองจะออกให้อัตโนมัติเมื่อเรียนจบครบทุกบทเรียนในคอร์ส</li>
              <li>ใบรับรองเป็นหลักฐานยืนยันการเรียนจบจาก MilerDev เท่านั้น ไม่ใช่วุฒิการศึกษาหรือใบรับรองวิชาชีพ</li>
              <li>ห้ามปลอมแปลงหรือแก้ไขใบรับรอง</li>
            </ul>
          </LegalSection>

          <LegalSection id="terms-prohibited" number="06" title="สิ่งที่ห้ามทำ">
            <ul>
              <li>ห้ามใช้งานเว็บไซต์เพื่อวัตถุประสงค์ที่ผิดกฎหมาย</li>
              <li>ห้ามพยายามเจาะระบบ แฮก หรือทำให้ระบบเสียหาย</li>
              <li>ห้ามส่งสแปม โฆษณา หรือเนื้อหาที่ไม่เหมาะสม</li>
              <li>ห้ามแอบอ้างเป็นผู้อื่นหรือให้ข้อมูลเท็จ</li>
              <li>ห้ามใช้บอทหรือเครื่องมืออัตโนมัติในการเข้าถึงเว็บไซต์</li>
            </ul>
          </LegalSection>

          <LegalSection id="terms-liability" number="07" title="การจำกัดความรับผิดชอบ">
            <p>MilerDev ให้บริการ &quot;ตามสภาพที่เป็นอยู่&quot; เราพยายามอย่างดีที่สุดในการให้บริการที่มีคุณภาพ แต่ไม่รับประกันว่าเว็บไซต์จะทำงานได้อย่างต่อเนื่องหรือปราศจากข้อผิดพลาด MilerDev ไม่รับผิดชอบต่อความเสียหายที่เกิดจากการใช้งานเว็บไซต์หรือเนื้อหาคอร์สเรียน</p>
          </LegalSection>

          <LegalSection id="terms-changes" number="08" title="การเปลี่ยนแปลงเงื่อนไข">
            <p>MilerDev สงวนสิทธิ์ในการแก้ไขเงื่อนไขการใช้งานเมื่อใดก็ได้ การเปลี่ยนแปลงจะมีผลทันทีเมื่อเผยแพร่บนเว็บไซต์ การใช้งานเว็บไซต์ต่อหลังจากมีการเปลี่ยนแปลง ถือว่าคุณยอมรับเงื่อนไขใหม่</p>
          </LegalSection>

          <LegalSection id="terms-contact" number="09" title="การติดต่อ">
            <p>หากมีคำถามเกี่ยวกับเงื่อนไขการใช้งาน สามารถติดต่อได้ที่:</p>
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
