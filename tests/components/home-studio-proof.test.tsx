// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import StudioProofSection from '@/components/home/StudioProofSection';

describe('Home studio proof instructor card', () => {
  afterEach(cleanup);

  it('names the instructor with facts a visitor can check on the channel', () => {
    render(<StudioProofSection />);
    const section = screen.getByRole('region', { name: /สอนจากประสบการณ์จริง/ });

    expect(within(section).getByRole('heading', { level: 3, name: 'ปฏิภาณ เพ็งเภา' })).toBeTruthy();
    expect(within(section).getByText('ผู้ก่อตั้งและผู้สอน MilerDev')).toBeTruthy();
    // Rounded down from 196K subscribers and 3.7K videos (2026-10-07) so it stays true.
    expect(within(section).getByText(/ผู้ติดตามกว่า 190,000 คน และวิดีโอกว่า 3,700 คลิป/)).toBeTruthy();
  });

  it('links to the channel and page in a new tab without leaking the opener', () => {
    render(<StudioProofSection />);

    for (const [name, href] of [
      ['ช่อง YouTube', 'https://www.youtube.com/@MilerDev'],
      ['เพจ Facebook', 'https://www.facebook.com/milerdevpro'],
    ]) {
      const link = screen.getByRole('link', { name });
      expect(link.getAttribute('href')).toBe(href);
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('keeps the photo decorative so the studio still has exactly three described images', () => {
    render(<StudioProofSection />);
    const section = screen.getByRole('region', { name: /สอนจากประสบการณ์จริง/ });

    expect(within(section).getAllByRole('img')).toHaveLength(3);
    expect(within(section).queryAllByRole('button')).toHaveLength(0);
  });
});
