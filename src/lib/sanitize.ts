import sanitizeHtml from 'sanitize-html';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function hastToHtml(node: HastNode): string {
  if (node.type === 'text') return (node.value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (node.type === 'element') {
    const tag = node.tagName ?? 'span';
    const cls = Array.isArray(node.properties?.className) ? (node.properties!.className as string[]).join(' ') : '';
    const attrs = cls ? ` class="${cls}"` : '';
    const inner = (node.children ?? []).map(hastToHtml).join('');
    return `<${tag}${attrs}>${inner}</${tag}>`;
  }
  if (node.type === 'root') return (node.children ?? []).map(hastToHtml).join('');
  return '';
}

/**
 * Re-highlight <pre><code> blocks in an HTML string using lowlight (server-side).
 * Tiptap's getHTML() does not include hljs spans, so we process them here.
 */
export function highlightCodeBlocks(html: string): string {
  return html.replace(
    /<pre(?:[^>]*)><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/gi,
    (_match, lang: string | undefined, rawCode: string) => {
      const code = rawCode
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      try {
        const tree = lang && lowlight.registered(lang)
          ? lowlight.highlight(lang, code)
          : lowlight.highlightAuto(code);
        const highlighted = hastToHtml(tree as HastNode);
        const langAttr = lang ? ` data-language="${lang}"` : '';
        return `<pre${langAttr}><code>${highlighted}</code></pre>`;
      } catch {
        return _match;
      }
    }
  );
}

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
 * Enhance blog content by converting common plain-text patterns to semantic HTML.
 * - Lines like "1. Title" or "2. Title (subtitle)" → <h2>
 * - Lines ending with ":" that are short → <h3>
 * - Lines starting with bold text followed by ":" → keeps as styled paragraph
 */
export function enhanceBlogContent(html: string): string {
    // Process content line by line (split on closing </p> tags)
    let enhanced = html;

    // Convert numbered section headings: <p>1. Title...</p> → <h2>
    enhanced = enhanced.replace(
        /<p>\s*(\d+)\.\s+(.+?)\s*<\/p>/gi,
        '<h2><span style="color:#2563eb">$1.</span> $2</h2>'
    );

    // Convert lines that are short and end with : or ? into <h3>
    enhanced = enhanced.replace(
        /<p>([^<]{5,80}[?:])(\s*)<\/p>/gi,
        (match, content) => {
            const plain = content.replace(/<[^>]*>/g, '').trim();
            // Only convert if it looks like a heading (short, ends with : or ?)
            if (plain.length < 80 && (plain.endsWith(':') || plain.endsWith('?'))) {
                return `<h3>${content.trim()}</h3>`;
            }
            return match;
        }
    );

    return enhanced;
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
            'pre': ['class', 'data-language'],
            '*': ['class'],
        },
        allowedSchemes: ['http', 'https', 'mailto'],
    });
}
