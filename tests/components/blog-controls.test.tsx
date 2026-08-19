import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ReadingProgress from '@/components/blog/ReadingProgress';
import ShareButtons from '@/components/blog/ShareButtons';

const quote = String.fromCharCode(34);

describe('Blog reading controls', () => {
  it('keeps the three existing share providers and an explicit copy action', () => {
    const html = renderToStaticMarkup(
      <ShareButtons
        url={'https://milerdev.com/blog/example'}
        title={'ตัวอย่างบทความ'}
      />,
    );

    expect(html.match(/<a\b/g)).toHaveLength(3);
    expect(html).toContain('facebook.com/sharer/sharer.php');
    expect(html).toContain('twitter.com/intent/tweet');
    expect(html).toContain('social-plugins.line.me/lineit/share');
    expect(html).toMatch(new RegExp(`<button[^>]*type=${quote}button${quote}`));
    expect(html).toContain('คัดลอกลิงก์');
  });

  it('exposes reading progress as a named bounded value', () => {
    const html = renderToStaticMarkup(<ReadingProgress />);

    expect(html).toContain(`role=${quote}progressbar${quote}`);
    expect(html).toContain(`aria-label=${quote}ความคืบหน้าการอ่าน${quote}`);
    expect(html).toContain(`aria-valuemin=${quote}0${quote}`);
    expect(html).toContain(`aria-valuemax=${quote}100${quote}`);
    expect(html).toContain(`aria-valuenow=${quote}0${quote}`);
  });
});
