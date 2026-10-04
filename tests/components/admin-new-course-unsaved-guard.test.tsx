// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Link from 'next/link';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NewCoursePage from '@/app/admin/courses/new/page';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/admin/courses/new',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/admin/RichTextEditor', () => ({ default: () => <div data-testid="editor" /> }));
vi.mock('@/components/admin/ImageUpload', () => ({ default: () => <div /> }));
vi.mock('@/components/admin/TagSelector', () => ({ default: () => <div /> }));
vi.mock('@/components/admin/CertificateColorPicker', () => ({ default: () => <div /> }));

function typeTitle(value: string) {
  fireEvent.change(screen.getByLabelText(/ชื่อคอร์ส/), { target: { value } });
}

function leaveEvent() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

// A cancelled click means the page held the navigation back.
function clickLink(name: string | RegExp, init: MouseEventInit = {}) {
  return fireEvent.click(screen.getByRole('link', { name }), init);
}

describe('new course form unsaved changes guard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    router.push.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('lets a clean form leave without asking', async () => {
    render(<NewCoursePage />);
    await screen.findByTestId('editor');

    expect(leaveEvent().defaultPrevented).toBe(false);
    expect(clickLink('ยกเลิก')).toBe(true);
    expect(screen.queryByText('ออกจากหน้านี้โดยไม่บันทึก')).toBeNull();
  });

  it('asks the browser to confirm reload or close once something is typed', async () => {
    render(<NewCoursePage />);
    await screen.findByTestId('editor');

    typeTitle('TypeScript');

    expect(leaveEvent().defaultPrevented).toBe(true);
  });

  it('holds back an in-app link and asks first', async () => {
    render(<NewCoursePage />);
    await screen.findByTestId('editor');
    typeTitle('TypeScript');

    expect(clickLink('ยกเลิก')).toBe(false);

    expect(await screen.findByText('ออกจากหน้านี้โดยไม่บันทึก')).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('keeps the typed data when the admin chooses to stay', async () => {
    render(<NewCoursePage />);
    await screen.findByTestId('editor');
    typeTitle('TypeScript');
    clickLink('ยกเลิก');

    fireEvent.click(await screen.findByRole('button', { name: 'อยู่ต่อ' }));

    await waitFor(() => expect(screen.queryByText('ออกจากหน้านี้โดยไม่บันทึก')).toBeNull());
    expect((screen.getByLabelText(/ชื่อคอร์ส/) as HTMLInputElement).value).toBe('TypeScript');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('navigates to the clicked link only after the admin confirms leaving', async () => {
    render(<NewCoursePage />);
    await screen.findByTestId('editor');
    typeTitle('TypeScript');
    clickLink('ยกเลิก');

    fireEvent.click(await screen.findByRole('button', { name: 'ออกโดยไม่บันทึก' }));

    expect(router.push).toHaveBeenCalledWith('/admin/courses');
  });

  it('stops warning once the admin clears what they typed', async () => {
    render(<NewCoursePage />);
    await screen.findByTestId('editor');
    typeTitle('TypeScript');
    typeTitle('');

    expect(leaveEvent().defaultPrevented).toBe(false);
    expect(clickLink('ยกเลิก')).toBe(true);
  });

  it('does not intercept new-tab or modified clicks', async () => {
    render(
      <>
        <NewCoursePage />
        <Link href="/admin/tags" target="_blank">แท็กแท็บใหม่</Link>
        <a href="https://example.com/docs">ภายนอก</a>
      </>,
    );
    await screen.findByTestId('editor');
    typeTitle('TypeScript');

    expect(clickLink('แท็กแท็บใหม่')).toBe(true);
    expect(clickLink('ภายนอก')).toBe(true);
    expect(clickLink('ยกเลิก', { ctrlKey: true })).toBe(true);
    expect(screen.queryByText('ออกจากหน้านี้โดยไม่บันทึก')).toBeNull();
  });

  it('keeps the data and the warning when saving fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Slug ถูกใช้แล้ว' }), { status: 400 }),
    );
    render(<NewCoursePage />);
    await screen.findByTestId('editor');
    typeTitle('TypeScript');

    fireEvent.click(screen.getByRole('button', { name: /สร้างคอร์ส/ }));

    expect(await screen.findByText('Slug ถูกใช้แล้ว')).toBeTruthy();
    expect((screen.getByLabelText(/ชื่อคอร์ส/) as HTMLInputElement).value).toBe('TypeScript');
    expect(router.push).not.toHaveBeenCalled();
    expect(leaveEvent().defaultPrevented).toBe(true);
  });

  it('does not warn after a successful save', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ courseId: 'c1' }), { status: 201 }),
    );
    render(<NewCoursePage />);
    await screen.findByTestId('editor');
    typeTitle('TypeScript');

    fireEvent.click(screen.getByRole('button', { name: /สร้างคอร์ส/ }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin/courses'));
    expect(screen.queryByText('ออกจากหน้านี้โดยไม่บันทึก')).toBeNull();
    // The guard is removed by an effect after the re-render that follows the save, which can land
    // just after router.push is called, so wait for it instead of asserting at once.
    await waitFor(() => expect(leaveEvent().defaultPrevented).toBe(false));
  });
});
