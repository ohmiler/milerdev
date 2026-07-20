import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import styles from './about.module.css';

export const metadata: Metadata = {
  title: 'เกี่ยวกับเรา',
  description: 'รู้จัก MilerDev coding learning studio ภาษาไทยที่เน้นการเรียนผ่านการลงมือสร้างโปรเจกต์จริง',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'เกี่ยวกับ MilerDev',
    description: 'coding learning studio ภาษาไทยที่ช่วยให้ผู้เรียนเข้าใจโค้ดผ่านการลงมือสร้าง',
    url: '/about',
    siteName: 'MilerDev',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'เกี่ยวกับเรา - MilerDev',
    description: 'coding learning studio ภาษาไทยที่ช่วยให้ผู้เรียนเข้าใจโค้ดผ่านการลงมือสร้าง',
  },
};

const learningMethod = [
  { title: 'เข้าใจเหตุผล', description: 'เริ่มจากปัญหาและเป้าหมายของงาน เพื่อให้รู้ว่าเครื่องมือแต่ละชิ้นมีไว้ทำอะไร' },
  { title: 'เขียนไปพร้อมกัน', description: 'เรียนแนวคิดผ่านโค้ด ตัวอย่าง และการลงมือทำ ไม่หยุดอยู่ที่การจำ syntax' },
  { title: 'จบด้วยผลงาน', description: 'เชื่อมบทเรียนเป็นโปรเจกต์ที่อธิบายได้ ทดสอบได้ และนำไปพัฒนาต่อได้' },
];

const principles = [
  ['สอนจากงานจริง', 'เลือกเนื้อหาที่เชื่อมกับการสร้างเว็บไซต์และ software ที่ใช้งานได้'],
  ['อธิบายให้เห็นภาพ', 'ทำให้ technical concept เข้าใจได้โดยไม่ลดทอนสาระสำคัญ'],
  ['วางเส้นทางให้ชัด', 'ผู้เรียนควรรู้ว่ากำลังเรียนอะไร เรียนไปเพื่ออะไร และควรทำอะไรต่อ'],
  ['เรียนต่อได้ไม่เสียจังหวะ', 'บทเรียน progress และ next action ต้องช่วยให้กลับมาทำต่อได้ทันที'],
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={'container'}>
            <p className={styles.meta}>About / MilerDev</p>
            <h1>พื้นที่เรียนโค้ดสำหรับคนที่อยากสร้างจริง</h1>
            <p className={styles.lede}>MilerDev คือ coding learning studio ภาษาไทย เราออกแบบคอร์สและบทเรียนให้ผู้เรียนเข้าใจแนวคิดผ่านการเขียนโค้ดและสร้างโปรเจกต์ด้วยตัวเอง</p>
          </div>
        </header>

        <section className={styles.manifesto} aria-labelledby={'about-manifesto-title'}>
          <div className={`container ${styles.manifestoGrid}`}>
            <div className={styles.manifestoMark} aria-hidden={true}>
              <Image src={'/milerdev-logo-transparent.png'} alt={''} width={280} height={280} priority />
              <span>CODE / BUILD / EXPLAIN</span>
            </div>
            <div className={styles.manifestoContent}>
              <p className={styles.sectionLabel}>Why we teach</p>
              <h2 id={'about-manifesto-title'}>การเรียนเขียนโปรแกรมควรพาคุณไปไกลกว่าการทำตาม</h2>
              <p>เป้าหมายของเราไม่ใช่การรวบรวมวิดีโอให้ได้มากที่สุด แต่คือการจัดลำดับความรู้ให้ผู้เรียนเห็นความสัมพันธ์ระหว่างแนวคิด โค้ด และผลลัพธ์ที่เกิดขึ้นจริง</p>
              <p>เมื่อจบบทเรียน ผู้เรียนควรอธิบายสิ่งที่ตัวเองสร้างได้ แก้ปัญหาต่อได้ และรู้ว่าควรพัฒนาทักษะส่วนไหนเป็นลำดับถัดไป</p>
            </div>
          </div>
        </section>

        <section className={styles.method} aria-labelledby={'about-method-title'}>
          <div className={'container'}>
            <div className={styles.sectionHead}>
              <h2 id={'about-method-title'}>วิธีเรียนแบบ MilerDev</h2>
              <p>ทุกคอร์สเดินจากความเข้าใจ ไปสู่การลงมือเขียน และจบด้วยสิ่งที่ตรวจสอบได้</p>
            </div>
            <ol className={styles.methodList}>
              {learningMethod.map((item, index) => (
                <li key={item.title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.principles} aria-labelledby={'about-principles-title'}>
          <div className={`container ${styles.principlesGrid}`}>
            <div className={styles.principlesIntro}>
              <p className={styles.sectionLabel}>Studio principles</p>
              <h2 id={'about-principles-title'}>หลักที่ใช้ตัดสินใจทุกบทเรียน</h2>
            </div>
            <dl>
              {principles.map(([title, description]) => (
                <div key={title}>
                  <dt>{title}</dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className={styles.proof} aria-labelledby={'about-proof-title'}>
          <div className={'container'}>
            <div className={`${styles.sectionHead} ${styles.sectionHeadLight}`}>
              <h2 id={'about-proof-title'}>จากห้องเรียนสู่เวทีแบ่งปันความรู้</h2>
              <p>MilerDev เคยได้รับเชิญจากองค์กรและมหาวิทยาลัยให้เป็นวิทยากรด้านการเขียนโปรแกรมและการพัฒนาเว็บไซต์</p>
            </div>
            <div className={styles.proofImages}>
              {[1, 5, 9].map((number) => (
                <figure key={number}>
                  <Image src={`/showcase/${String(number).padStart(2, '0')}-showcase-1024x768.webp`} alt={`บรรยากาศงานบรรยายของ MilerDev ภาพที่ ${number}`} width={1024} height={768} sizes={'(max-width: 640px) 100vw, 33vw'} />
                  <figcaption>Field note / {String(number).padStart(2, '0')}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <div className={`container ${styles.ctaGrid}`}>
            <h2>เลือกทักษะที่อยากพัฒนา แล้วเริ่มสร้างโปรเจกต์แรก</h2>
            <p>ดูรายละเอียด ผลลัพธ์ และเนื้อหาของแต่ละคอร์สก่อนตัดสินใจเรียน</p>
            <div className={styles.ctaActions}>
              <Link href={'/courses'}>ดูคอร์สทั้งหมด <span aria-hidden={true}>→</span></Link>
              <Link href={'/contact'}>ติดต่อ MilerDev</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
