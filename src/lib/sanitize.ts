import sanitizeHtml from 'sanitize-html';

/**
 * Strip all HTML tags and return plain text.
 * Safe alternative to .replace(/<[^>]*>/g, '')
 */
export function stripHtml(html: string): string {
    return sanitizeHtml(html, {
        allowedTags: [],
        allowedAttributes: {},
    }).trim();
}

/**
 * Get a plain-text excerpt from HTML content.
 */
export function getExcerpt(html: string, maxLength: number = 200): string {
    const text = stripHtml(html);
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trimEnd() + '...';
}

/**
 * Sanitize HTML allowing safe tags for rich content display.
 */
export function sanitizeRichContent(html: string): string {
    return sanitizeHtml(html, {
        allowedTags: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'br', 'hr',
            'ul', 'ol', 'li',
            'strong', 'b', 'em', 'i', 'u', 's',
            'a', 'img',
            'blockquote', 'pre', 'code',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'div', 'span',
        ],
        allowedAttributes: {
            'a': ['href', 'target', 'rel'],
            'img': ['src', 'alt', 'width', 'height'],
            '*': ['class', 'style'],
        },
        allowedSchemes: ['http', 'https', 'mailto'],
    });
}
