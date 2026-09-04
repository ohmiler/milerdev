import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AnnouncementFeedView } from '@/components/content/AnnouncementFeed';
import LegalDocument, { LegalSection } from '@/components/content/LegalDocument';

const quote = String.fromCharCode(34);

const announcementsPageSource = readFileSync('src/app/announcements/page.tsx', 'utf8');
const announcementFeedSource = readFileSync('src/components/content/AnnouncementFeed.tsx', 'utf8');
const privacySource = readFileSync('src/app/privacy/page.tsx', 'utf8');
const termsSource = readFileSync('src/app/terms/page.tsx', 'utf8');
const legalDocumentSource = readFileSync('src/components/content/LegalDocument.tsx', 'utf8');
const announcementApiSource = readFileSync('src/app/api/announcements/route.ts', 'utf8');

describe('public content contracts', () => {
  it('keeps announcement fetching in a narrow client feed with metadata on the server page', () => {
    expect(announcementsPageSource).not.toContain("'use client'");
    expect(announcementsPageSource).toContain('export const metadata');
    expect(announcementsPageSource).toContain('<AnnouncementFeed');
    expect(announcementFeedSource).toContain("fetch('/api/announcements'");
    expect(announcementFeedSource).toContain('if (!response.ok)');
    expect(announcementFeedSource).toContain('Array.isArray(data.announcements)');
    expect(announcementsPageSource).toContain('ตรงกับประเภทผู้ใช้งานของคุณ');
    expect(announcementsPageSource).toContain('แสดงตามประเภทผู้ใช้งาน');
    expect(announcementApiSource).toContain(`error: 'โหลดประกาศไม่สำเร็จ'`);
  });

  it('renders loading, empty, and recoverable error announcement states', () => {
    const loading = renderToStaticMarkup(
      <AnnouncementFeedView status="loading" announcements={[]} onRetry={vi.fn()} />,
    );
    const empty = renderToStaticMarkup(
      <AnnouncementFeedView status="ready" announcements={[]} onRetry={vi.fn()} />,
    );
    const error = renderToStaticMarkup(
      <AnnouncementFeedView status="error" announcements={[]} onRetry={vi.fn()} />,
    );

    expect(loading).toContain('กำลังตรวจสอบประกาศล่าสุด');
    expect(loading).toContain('aria-live="polite"');
    expect(loading).toContain('data-feedback-state="loading"');
    expect(empty).toContain('ยังไม่มีประกาศที่ต้องติดตาม');
    expect(empty).toContain('data-feedback-state="empty"');
    expect(error).toContain('โหลดประกาศไม่สำเร็จ');
    expect(error).toContain('data-feedback-state="error"');
    expect(error).toContain('aria-live="assertive"');
    expect(error).toContain('<button');
    expect(error).toContain('ลองอีกครั้ง');
  });

  it('renders announcement type, real content, author, and Thai date without emoji-only state', () => {
    const html = renderToStaticMarkup(
      <AnnouncementFeedView
        status="ready"
        onRetry={vi.fn()}
        announcements={[{
          id: 'notice-1',
          title: 'ปรับเวลาบำรุงรักษาระบบ',
          content: 'ระบบจะกลับมาเปิดตามเวลาที่ประกาศ',
          type: 'warning',
          creatorName: 'ทีม MilerDev',
          createdAt: '2026-07-21T02:30:00.000Z',
        }]}
      />,
    );

    expect(html).toContain('แจ้งเตือน');
    expect(html).toContain('ปรับเวลาบำรุงรักษาระบบ');
    expect(html).toContain('ระบบจะกลับมาเปิดตามเวลาที่ประกาศ');
    expect(html).toContain('ทีม MilerDev');
    expect(html).toMatch(/2569/);
    expect(html).toContain('data-announcement-type="warning"');
  });

  it('preserves all policy sections and high-risk published statements', () => {
    expect(privacySource.match(/<LegalSection/g)).toHaveLength(9);
    expect(privacySource).toContain('อัปเดตล่าสุด: 1 มกราคม 2568');
    expect(privacySource).toContain('เราไม่เก็บข้อมูลบัตรเครดิต');
    expect(privacySource).toContain('การเข้ารหัสรหัสผ่านด้วย bcrypt');
    expect(privacySource).toContain('milerdev.official@gmail.com');

    expect(termsSource.match(/<LegalSection/g)).toHaveLength(9);
    expect(termsSource).toContain('อัปเดตล่าสุด: 1 มกราคม 2568');
    expect(termsSource).toContain('เมื่อชำระเงินสำเร็จแล้ว จะไม่สามารถขอคืนเงินได้');
    expect(termsSource).toContain('ไม่ใช่วุฒิการศึกษาหรือใบรับรองวิชาชีพ');
    expect(termsSource).toContain('milerdev.official@gmail.com');

    expect(legalDocumentSource).not.toContain('1 ม.ค. 2568');
    expect(legalDocumentSource).toContain('{updatedLabel}');
    expect(legalDocumentSource).toContain('สารบัญบนมือถือ');
    expect(legalDocumentSource).toContain('tabIndex={-1}');
  });

  it('renders one legal update label across evidence and content with mobile and desktop anchors', () => {
    const updatedLabel = 'อัปเดตล่าสุด: 1 มกราคม 2568';
    const html = renderToStaticMarkup(
      <LegalDocument
        title={'เอกสารทดสอบ'}
        lede={'รายละเอียดเอกสาร'}
        updatedLabel={updatedLabel}
        sections={[
          { id: 'legal-one', title: 'หัวข้อแรก' },
          { id: 'legal-two', title: 'หัวข้อถัดไป' },
        ]}
      >
        <LegalSection id={'legal-one'} number={'01'} title={'หัวข้อแรก'}>
          <p>รายละเอียด</p>
        </LegalSection>
      </LegalDocument>,
    );

    expect(html.match(new RegExp(updatedLabel, 'g'))).toHaveLength(2);
    expect(html).toContain(`aria-label=${quote}สารบัญบนมือถือ${quote}`);
    expect(html).toContain(`aria-expanded=${quote}false${quote}`);
    expect(html).toContain('2 หัวข้อ');
    expect(html).toContain(`href=${quote}#legal-one${quote}`);
    expect(html).toContain(`id=${quote}legal-one${quote}`);
    expect(html).toContain(`tabindex=${quote}-1${quote}`);
  });
});
