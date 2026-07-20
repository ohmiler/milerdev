import Link from 'next/link';
import FAQAccordion from '@/components/faq/FAQAccordion';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { FAQ_CATEGORIES } from './faq-data';
import styles from './faq.module.css';

const questionCount = FAQ_CATEGORIES.reduce((total, category) => total + category.items.length, 0);

export default function FAQPage() {
  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={`container ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.meta}>Help desk / 04</p>
              <h1>คำตอบที่ช่วยให้ไปต่อได้</h1>
              <p>รวมข้อมูลเรื่องการเริ่มเรียน คอร์ส การชำระเงิน และบัญชี เพื่อให้คุณตัดสินใจหรือแก้ปัญหาได้จากจุดเดียว</p>
            </div>
            <dl className={styles.heroEvidence} aria-label={'ภาพรวมคำถามที่พบบ่อย'}>
              <div><dt>คำถาม</dt><dd>{questionCount}</dd></div>
              <div><dt>หมวด</dt><dd>{FAQ_CATEGORIES.length}</dd></div>
              <div><dt>ทางเลือกถัดไป</dt><dd><Link href={'/contact'}>ติดต่อทีม</Link></dd></div>
            </dl>
          </div>
        </header>

        <section className={styles.body} aria-labelledby={'faq-index-title'}>
          <div className={`container ${styles.layout}`}>
            <aside className={styles.index}>
              <p className={styles.sectionLabel}>Question index</p>
              <h2 id={'faq-index-title'}>เลือกหัวข้อ</h2>
              <nav aria-label={'หมวดคำถาม'}>
                {FAQ_CATEGORIES.map((category, index) => (
                  <a href={`#faq-category-${index + 1}`} key={category.title}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {category.title}
                  </a>
                ))}
              </nav>
            </aside>

            <div className={styles.categories}>
              {FAQ_CATEGORIES.map((category, index) => (
                <section id={`faq-category-${index + 1}`} className={styles.category} aria-labelledby={`faq-category-title-${index + 1}`} key={category.title}>
                  <div className={styles.categoryHead}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <p>{category.items.length} คำถาม</p>
                      <h2 id={`faq-category-title-${index + 1}`}>{category.title}</h2>
                    </div>
                  </div>
                  <FAQAccordion categoryIndex={index} items={category.items} />
                </section>
              ))}

              <section className={styles.contactCta} aria-labelledby={'faq-contact-title'}>
                <p className={styles.sectionLabel}>Still need help?</p>
                <h2 id={'faq-contact-title'}>ยังไม่เจอคำตอบที่ตรงกับเรื่องของคุณ</h2>
                <p>ส่งรายละเอียดให้ทีม MilerDev พร้อมข้อมูลที่จำเป็น เราจะตอบกลับผ่านอีเมลที่คุณระบุ</p>
                <Link href={'/contact'}>ติดต่อทีม MilerDev <span aria-hidden={true}>→</span></Link>
              </section>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
