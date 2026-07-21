import ContactForm from '@/components/contact/ContactForm';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import PublicPageHeader from '@/components/layout/PublicPageHeader';
import styles from './contact.module.css';

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <PublicPageHeader
          variant="task"
          eyebrow="Contact / MilerDev"
          title="บอกเราได้ว่าคุณกำลังติดเรื่องไหน"
          description="สอบถามเรื่องคอร์ส การเรียน การชำระเงิน หรือเสนอความร่วมมือ ส่งรายละเอียดมาให้ครบเพื่อให้ทีมตอบกลับได้ตรงประเด็น"
        />

        <section className={styles.body} aria-labelledby={'contact-form-title'}>
          <div className={`container ${styles.grid}`}>
            <aside className={styles.info} aria-label={'ข้อมูลการติดต่อ'}>
              <p className={styles.sectionLabel}>Contact desk</p>
              <h2>ช่องทางติดต่อ</h2>
              <dl>
                <div>
                  <dt>อีเมล</dt>
                  <dd><a href={'mailto:milerdev.official@gmail.com'}>milerdev.official@gmail.com</a></dd>
                </div>
                <div>
                  <dt>เวลาทำการ</dt>
                  <dd>จันทร์ถึงศุกร์<br />09:00 ถึง 18:00 น.</dd>
                </div>
                <div>
                  <dt>เรื่องที่ติดต่อได้</dt>
                  <dd>คอร์สและการเรียน<br />การชำระเงิน<br />งานวิทยากรและความร่วมมือ</dd>
                </div>
              </dl>
              <p className={styles.note}>หลีกเลี่ยงการส่งรหัสผ่าน ข้อมูลบัตร หรือข้อมูลส่วนตัวที่ไม่จำเป็นผ่านแบบฟอร์มนี้</p>
            </aside>

            <div className={styles.formPanel}>
              <div className={styles.formHead}>
                <p className={styles.sectionLabel}>Send a message</p>
                <h2 id={'contact-form-title'}>ส่งรายละเอียดให้ทีม MilerDev</h2>
                <p>กรอกข้อมูลที่จำเป็น ทีมจะใช้ข้อมูลนี้เพื่อตอบกลับคำถามของคุณเท่านั้น</p>
              </div>
              <ContactForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
