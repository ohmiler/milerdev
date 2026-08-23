// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import CertificateColorPicker from '@/components/admin/CertificateColorPicker';
import ImageUpload from '@/components/admin/ImageUpload';
import TagSelector from '@/components/admin/TagSelector';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean }) => {
    const { fill, unoptimized, alt = '', ...imageProps } = props;
    void fill;
    void unoptimized;
    return <img {...imageProps} alt={alt} />;
  },
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const fetchMock = vi.fn();

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  cleanup();
});

function tagResponse(tags: Array<{ id: string; name: string; slug: string }>, ok = true) {
  return {
    ok,
    json: async () => ({ tags }),
  } as Response;
}

describe('TagSelector', () => {
  it('renders a dedicated empty state', async () => {
    fetchMock.mockResolvedValue(tagResponse([]));

    render(<TagSelector selectedTagIds={[]} onChange={vi.fn()} />);

    expect(await screen.findByText('ยังไม่มีแท็กในระบบ')).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'เลือกแท็ก' })).toBeNull();
  });

  it('shows an API error separately and retries', async () => {
    fetchMock
      .mockResolvedValueOnce(tagResponse([], false))
      .mockResolvedValueOnce(tagResponse([{ id: 'tag-1', name: 'React', slug: 'react' }]));
    const user = userEvent.setup();

    render(<TagSelector selectedTagIds={[]} onChange={vi.fn()} />);

    expect(await screen.findByText('โหลดแท็กไม่สำเร็จ')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'ลองใหม่' }));

    expect(await screen.findByRole('combobox', { name: 'เลือกแท็ก' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('searches and selects a tag with the keyboard', async () => {
    fetchMock.mockResolvedValue(tagResponse([
      { id: 'tag-react', name: 'React', slug: 'react' },
      { id: 'tag-next', name: 'Next.js', slug: 'nextjs' },
    ]));
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<TagSelector selectedTagIds={[]} onChange={onChange} />);

    await user.click(await screen.findByRole('combobox', { name: 'เลือกแท็ก' }));
    const search = await screen.findByRole('combobox', { name: 'ค้นหาแท็ก' });
    await user.type(search, 'React');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenCalledWith(['tag-react']);
  });
});

describe('remaining P1 admin media controls', () => {
  it.each([
    ['https://cdn.example.com/course.jpg', 'https://cdn.example.com/course.jpg'],
    ['/uploads/course.jpg', '/uploads/course.jpg'],
    ['cdn.example.com/course.jpg', 'https://cdn.example.com/course.jpg'],
  ])('previews image URL %s safely', (value, expected) => {
    render(<ImageUpload value={value} onChange={vi.fn()} />);

    expect(screen.getByRole('img', { name: 'ตัวอย่างรูปภาพ' }).getAttribute('src')).toBe(expected);
  });

  it('contains a broken preview and keeps recovery actions available', () => {
    render(<ImageUpload value="https://cdn.example.com/broken.jpg" onChange={vi.fn()} />);

    fireEvent.error(screen.getByRole('img', { name: 'ตัวอย่างรูปภาพ' }));

    expect(screen.getByRole('alert').textContent).toContain('โหลดตัวอย่างรูปภาพไม่สำเร็จ');
    expect(screen.getByRole('button', { name: 'เปลี่ยนรูป' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ลบรูป' })).toBeTruthy();
  });

  it('does not pass an invalid URL to the image renderer', () => {
    render(<ImageUpload value="not a url" onChange={vi.fn()} />);

    expect(screen.queryByRole('img', { name: 'ตัวอย่างรูปภาพ' })).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('URL รูปภาพไม่ถูกต้อง');
  });

  it('normalizes legacy colors before rendering native color controls', async () => {
    const user = userEvent.setup();
    render(<CertificateColorPicker value="var(--primary)" onChange={vi.fn()} />);

    expect((screen.getByRole('textbox', { name: 'รหัสสี Hex' }) as HTMLInputElement).value).toBe('#2563eb');
    await user.click(screen.getByRole('button', { name: 'เปิดตัวเลือกสี' }));
    expect((screen.getByLabelText('เลือกสีใบรับรอง') as HTMLInputElement).value).toBe('#2563eb');
  });

  it('keeps invalid color drafts separate from the committed color', () => {
    const onChange = vi.fn();
    render(<CertificateColorPicker value="#2563eb" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'รหัสสี Hex' });

    fireEvent.change(input, { target: { value: '#2' } });

    expect((input as HTMLInputElement).value).toBe('#2');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '#A1B2C3' } });
    expect(onChange).toHaveBeenCalledWith('#a1b2c3');
  });

  it('commits preset and native picker colors', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CertificateColorPicker value="#2563eb" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'ม่วง' }));
    expect(onChange).toHaveBeenCalledWith('#7c3aed');

    await user.click(screen.getByRole('button', { name: 'เปิดตัวเลือกสี' }));
    fireEvent.change(screen.getByLabelText('เลือกสีใบรับรอง'), { target: { value: '#059669' } });
    expect(onChange).toHaveBeenCalledWith('#059669');
  });
});
