import MainContent from '@/components/layout/MainContent';
import type { Metadata } from 'next';
import AnnouncementFeed from '@/components/content/AnnouncementFeed';
import PublicContentHeader from '@/components/content/PublicContentHeader';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'ประกาศ',
  description: 'ข่าวสาร การแจ้งเตือน และประกาศล่าสุดที่เกี่ยวข้องกับผู้เรียน MilerDev',
};

export default function AnnouncementsPage() {
  return (
    <>
      <Navbar />
      <MainContent className="bg-[var(--academy-canvas)]">
        <PublicContentHeader
          title="ประกาศที่ควรรู้ ก่อนเรียนต่อ"
          lede="ติดตามข่าวสาร การเปลี่ยนแปลงบริการ และข้อความสำคัญจากทีม MilerDev โดยระบบจะแสดงเฉพาะประกาศที่เกี่ยวข้องกับบัญชีของคุณ"
          evidence={(
            <Card><CardContent className="grid grid-cols-3 gap-3 pt-6 text-center text-sm"><div><dt className="text-xs text-muted-foreground">ลำดับ</dt><dd className="mt-2 font-semibold">ล่าสุดก่อน</dd></div><div><dt className="text-xs text-muted-foreground">จำนวน</dt><dd className="mt-2 font-semibold">สูงสุด 10</dd></div><div><dt className="text-xs text-muted-foreground">ขอบเขต</dt><dd className="mt-2 font-semibold">ตามบัญชี</dd></div></CardContent></Card>
          )}
        />
        <section className="py-14 sm:py-20" aria-labelledby="announcement-feed-title">
          <div className="container grid gap-10 lg:grid-cols-[16rem_1fr] lg:items-start lg:gap-14">
            <aside className="top-24 lg:sticky">
              <h2 id="announcement-feed-title" className="text-2xl font-semibold">ข่าวสารล่าสุด</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">เรียงจากประกาศใหม่ไปเก่า พร้อมประเภท เวลาเผยแพร่ และผู้ประกาศเมื่อมีข้อมูล</p>
              <dl className="mt-6 flex flex-col gap-3 border-y py-5 text-xs"><div className="flex justify-between gap-3"><dt className="font-medium text-primary">ทั่วไป</dt><dd className="text-muted-foreground">ข้อมูลทั่วไป</dd></div><div className="flex justify-between gap-3"><dt className="font-medium text-primary">ติดตาม</dt><dd className="text-muted-foreground">เรื่องที่ควรติดตาม</dd></div><div className="flex justify-between gap-3"><dt className="font-medium text-primary">สำคัญ</dt><dd className="text-muted-foreground">ประกาศสำคัญ</dd></div></dl>
            </aside>
            <AnnouncementFeed />
          </div>
        </section>
      </MainContent>
      <Footer />
    </>
  );
}
