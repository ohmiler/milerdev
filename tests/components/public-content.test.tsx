import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LegalDocument, { LegalSection } from '@/components/content/LegalDocument';

const quote = String.fromCharCode(34);

const privacySource = readFileSync('src/app/privacy/page.tsx', 'utf8');
const termsSource = readFileSync('src/app/terms/page.tsx', 'utf8');
const legalDocumentSource = readFileSync('src/components/content/LegalDocument.tsx', 'utf8');

describe('public content contracts', () => {
  it('preserves all policy sections and high-risk published statements', () => {
    expect(privacySource.match(/<LegalSection/g)).toHaveLength(9);
    expect(privacySource).toContain('อัปเดตล่าสุด: 13 กันยายน 2569');
    expect(privacySource).toContain('เราไม่เก็บข้อมูลบัตรเครดิต');
    expect(privacySource).toContain('Argon2id สำหรับรหัสผ่านที่ตั้งใหม่');
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
