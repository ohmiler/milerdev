import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();

function readProjectFile(filePath: string) {
    return readFileSync(path.join(root, filePath), 'utf8');
}

function cssBlock(source: string, selector: string) {
    const start = source.indexOf(selector);
    expect(start).toBeGreaterThanOrEqual(0);
    const open = source.indexOf('{', start);
    expect(open).toBeGreaterThanOrEqual(0);

    let depth = 0;
    for (let i = open; i < source.length; i++) {
        if (source[i] === '{') depth++;
        if (source[i] === '}') depth--;
        if (depth === 0) return source.slice(open + 1, i);
    }

    throw new Error(`CSS block not closed: ${selector}`);
}

describe('Adaptive Dual design foundation', () => {
    test('defines light and dark semantic theme maps', () => {
        const globals = readProjectFile('src/app/globals.css');

        expect(globals).toContain('[data-theme="light"]');
        expect(globals).toContain('[data-theme="dark"]');
        expect(globals).toContain('--canvas: #ffffff');
        expect(globals).toContain('--canvas: #0b1220');
        expect(globals).toContain('--accent: var(--brand-blue)');
        expect(globals).toContain('--brand-blue: #02abff');
    });

    test('root layout establishes a light public surface', () => {
        const layout = readProjectFile('src/app/layout.tsx');

        expect(layout).toContain('ThemeSurface');
        expect(layout).toContain('theme="light"');
        expect(layout).toContain('surface="public"');
    });

    test('shared shell removes decorative gradients from shared styling', () => {
        const globals = readProjectFile('src/app/globals.css');
        const navbar = readProjectFile('src/components/layout/PublicNavbar.tsx');
        const footer = readProjectFile('src/components/layout/Footer.tsx');

        expect(cssBlock(globals, '.btn-primary {')).not.toContain('linear-gradient');
        expect(navbar).not.toContain('linear-gradient');
        expect(footer).not.toContain('linear-gradient');
    });

    test('navbar uses the editorial surface contract across responsive states', () => {
        const navbar = readProjectFile('src/components/layout/PublicNavbar.tsx');

        expect(navbar).toContain('className="site-nav nav-public-shell"');
        expect(navbar).toContain('min-height: 72px;');
        expect(navbar).toContain('background: var(--surface-raised);');
        expect(navbar).toContain('box-shadow: var(--shadow-md);');
        expect(navbar).not.toContain('var(--gray-');
    });

    test('shared controls expose focus and usable touch targets', () => {
        const globals = readProjectFile('src/app/globals.css');
        const footer = readProjectFile('src/components/layout/Footer.tsx');

        expect(globals).toContain('.btn:focus-visible');
        expect(globals).toContain('--focus-ring');
        expect(footer).toContain('44px');
    });
});
