// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock('next-auth/react', () => ({ useSession }));

import ContactForm from '@/components/contact/ContactForm';
import { CONTACT_TOPICS } from '@/lib/content/contact';

const visitor = { data: null, status: 'unauthenticated' };
const member = {
  data: { user: { id: 'member-1', name: 'Miler', email: 'miler@example.test', role: 'student' }, expires: '2099-01-01' },
  status: 'authenticated',
};
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

afterEach(cleanup);
beforeEach(() => useSession.mockReset());

describe('Contact form topics and member details', () => {
  it('offers the topics as one required choice, each a subject the API accepts', () => {
    useSession.mockReturnValue(visitor);
    render(<ContactForm />);

    const topics = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(topics.map((topic) => topic.value)).toEqual([...CONTACT_TOPICS]);
    for (const topic of topics) {
      expect(topic.name).toBe('subject');
      expect(topic.required).toBe(true);
      expect(topic.value.length).toBeGreaterThanOrEqual(2);
      expect(topic.value.length).toBeLessThanOrEqual(200);
    }
  });

  it('fills in a signed-in member, and leaves a visitor to type their own', () => {
    useSession.mockReturnValue(member);
    render(<ContactForm />);
    expect(field('ชื่อ').value).toBe('Miler');
    expect(field('อีเมล').value).toBe('miler@example.test');
    cleanup();

    useSession.mockReturnValue(visitor);
    render(<ContactForm />);
    expect(field('ชื่อ').value).toBe('');
    expect(field('อีเมล').value).toBe('');
  });

  it('does not overwrite what a member already typed when their session arrives', () => {
    useSession.mockReturnValue(visitor);
    const { rerender } = render(<ContactForm />);
    fireEvent.change(field('ชื่อ'), { target: { value: 'ชื่อที่พิมพ์เอง' } });

    useSession.mockReturnValue(member);
    rerender(<ContactForm />);

    expect(field('ชื่อ').value).toBe('ชื่อที่พิมพ์เอง');
    expect(field('อีเมล').value).toBe('miler@example.test');
  });

  it('points a member asking about a payment to their payment history', () => {
    useSession.mockReturnValue(member);
    render(<ContactForm />);
    expect(screen.queryByRole('link', { name: 'ประวัติการชำระเงิน' })).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: 'การชำระเงิน' }));

    expect(screen.getByRole('link', { name: 'ประวัติการชำระเงิน' }).getAttribute('href')).toBe('/dashboard/payments');
  });

  it('asks a visitor with a payment question for the course and date instead', () => {
    useSession.mockReturnValue(visitor);
    render(<ContactForm />);

    fireEvent.click(screen.getByRole('radio', { name: 'การชำระเงิน' }));

    expect(screen.queryByRole('link', { name: 'ประวัติการชำระเงิน' })).toBeNull();
    expect(screen.getByText('บอกชื่อคอร์สและวันที่ชำระมาด้วย เพื่อให้ตรวจสอบได้เร็วขึ้น')).toBeTruthy();
  });
});
