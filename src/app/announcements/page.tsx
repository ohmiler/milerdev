import type { Metadata } from 'next';
import AnnouncementFeed from '@/components/content/AnnouncementFeed';
import PublicContentHeader from '@/components/content/PublicContentHeader';
import styles from '@/components/content/public-content.module.css';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'ประกาศ',
  description: 'ข่าวสาร การแจ้งเตือน และประกาศล่าสุดที่เกี่ยวข้องกับผู้เรียน MilerDev',
};

export default function AnnouncementsPage() {
  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <PublicContentHeader
          eyebrow="Public notice / MilerDev"
          title="ประกาศที่ควรรู้ ก่อนเรียนต่อ"
          lede="ติดตามข่าวสาร การเปลี่ยนแปลงบริการ และข้อความสำคัญจากทีม MilerDev โดยระบบจะแสดงเฉพาะประกาศที่เกี่ยวข้องกับบัญชีของคุณ"
          evidence={(
            <dl className={styles.heroEvidence} aria-label="ภาพรวมหน้าประกาศ">
              <div><dt>ลำดับ</dt><dd>ล่าสุดก่อน</dd></div>
              <div><dt>จำนวน</dt><dd>สูงสุด 10</dd></div>
              <div><dt>ขอบเขต</dt><dd>ตามบัญชี</dd></div>
            </dl>
          )}
        />
        <section className={styles.announcementSection} aria-labelledby="announcement-feed-title">
          <div className={['container', styles.announcementGrid].join(' ')}>
            <aside className={styles.feedIntro}>
              <p className={styles.sectionLabel}>Notice stream</p>
              <h2 id="announcement-feed-title">ข่าวสารล่าสุด</h2>
              <p>เรียงจากประกาศใหม่ไปเก่า พร้อมประเภท เวลาเผยแพร่ และผู้ประกาศเมื่อมีข้อมูล</p>
              <dl>
                <div><dt>INFO</dt><dd>ข้อมูลทั่วไป</dd></div>
                <div><dt>NOTICE</dt><dd>เรื่องที่ควรติดตาม</dd></div>
                <div><dt>IMPORTANT</dt><dd>ประกาศสำคัญ</dd></div>
              </dl>
            </aside>
            <AnnouncementFeed />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
