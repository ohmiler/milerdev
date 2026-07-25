import { describe, expect, it } from 'vitest';
import {
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
});
