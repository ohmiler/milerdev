// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import HomeHeroActions from '@/components/home/HomeHeroActions';

afterEach(cleanup);

describe('Home hero actions', () => {
  it('invites a visitor to a free lesson, with the catalogue as the primary action', () => {
    render(<HomeHeroActions forVisitor />);

    expect(screen.getByRole('link', { name: 'ดูคอร์สทั้งหมด' }).getAttribute('data-variant')).toBe('hero');
    expect(screen.getByRole('link', { name: 'ทดลองบทเรียนฟรี' })).toBeTruthy();
    expect(screen.getByText('บทเรียนทดลองเปิดดูได้โดยไม่ต้องสมัคร')).toBeTruthy();
  });

  it('does not pitch a free lesson or sign-up facts to a learner, and leaves the primary action to the continue bar', () => {
    render(<HomeHeroActions forVisitor={false} />);

    expect(screen.getByRole('link', { name: 'ดูคอร์สทั้งหมด' }).getAttribute('data-variant')).toBe('heroOutline');
    expect(screen.queryByRole('link', { name: 'ทดลองบทเรียนฟรี' })).toBeNull();
    expect(screen.queryByText('บทเรียนทดลองเปิดดูได้โดยไม่ต้องสมัคร')).toBeNull();
  });
});
