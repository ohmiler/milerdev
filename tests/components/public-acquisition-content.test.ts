import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const aboutSource = readFileSync('src/app/about/page.tsx', 'utf8');
const richContentCss = readFileSync('src/app/globals.css', 'utf8');

describe('Public acquisition content contracts', () => {
  it('keeps About evidence factual until named-event authority exists', () => {
    expect(aboutSource).toContain('ภาพจากกิจกรรมการสอนและเวทีแบ่งปันความรู้');
    expect(aboutSource).toContain('<figcaption');
    expect(aboutSource).not.toContain('องค์กรและมหาวิทยาลัย');
  });

  it('keeps long rich content inside the reading column', () => {
    expect(richContentCss).toContain('overflow-wrap: anywhere');
    expect(richContentCss).toContain('overscroll-behavior-inline: contain');
    expect(richContentCss).toContain('scroll-margin-top: 7rem');
  });
});
