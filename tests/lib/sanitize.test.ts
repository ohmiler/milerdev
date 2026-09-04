import { describe, expect, it } from 'vitest';
import {
    getBlogTableOfContents,
    getProcessedBlogContent,
    highlightCodeBlocks,
    sanitizeRichContent,
} from '@/lib/sanitize';

describe('rich content processing', () => {
    const quote = String.fromCharCode(34);

    it('highlights registered language aliases', () => {
        const result = highlightCodeBlocks(
            '<pre><code class=' + quote + 'language-ts' + quote +
            '>const answer: number = 42;</code></pre>'
        );

        expect(result).toContain('<pre data-language=' + quote + 'ts' + quote + '><code>');
        expect(result).toContain('hljs-keyword');
        expect(result).toContain('hljs-number');
    });

    it('preserves the unknown-language fallback without throwing', () => {
        const result = highlightCodeBlocks(
            '<pre><code class=' + quote + 'language-unknown-course-lang' + quote +
            '>const answer = 42;</code></pre>'
        );

        expect(result).toContain(
            '<pre data-language=' + quote + 'unknown-course-lang' + quote + '><code>'
        );
        expect(result).toContain('answer');
    });

    it('continues to remove unsafe rich-content markup and URLs', () => {
        const result = sanitizeRichContent(
            '<p>safe</p><script>alert(1)</script><a href=' + quote +
            'javascript:alert(1)' + quote + '>link</a>'
        );

        expect(result).toContain('<p>safe</p>');
        expect(result).toContain('<a>link</a>');
        expect(result).not.toContain('<script');
        expect(result).not.toContain('javascript:');
    });

    it('creates stable unique Thai heading anchors before hydration', () => {
        const input = '<h2 id=unsafe>เริ่มเขียนโค้ด</h2><h3>ลองทีละส่วน</h3><h2>เริ่มเขียนโค้ด</h2>';
        const first = getProcessedBlogContent(input);
        const second = getProcessedBlogContent(input);

        expect(second).toBe(first);
        expect(first).toContain(`id='section-เริ่มเขียนโค้ด' tabindex='-1'`);
        expect(first).toContain(`id='section-เริ่มเขียนโค้ด-2' tabindex='-1'`);
        expect(first).not.toContain('id=unsafe');
        expect(getBlogTableOfContents(first)).toEqual([
            { id: 'section-เริ่มเขียนโค้ด', text: 'เริ่มเขียนโค้ด', level: 2 },
            { id: 'section-ลองทีละส่วน', text: 'ลองทีละส่วน', level: 3 },
            { id: 'section-เริ่มเขียนโค้ด-2', text: 'เริ่มเขียนโค้ด', level: 2 },
        ]);
    });
});
