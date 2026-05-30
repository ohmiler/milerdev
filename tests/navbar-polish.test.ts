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

describe('navbar polish', () => {
    test('desktop navigation uses brand states and explicit transitions', () => {
        const navbar = readProjectFile('src/components/layout/Navbar.tsx');

        expect(navbar).toContain("className={`nav-link${isActive(href) ? ' nav-link--active' : ''}`}");
        expect(navbar).toContain('className="nav-auth-link"');
        expect(navbar).toContain('className="btn btn-primary nav-auth-register"');
        expect(navbar).not.toContain('#2563eb');
        expect(navbar).not.toContain('#eff6ff');
        expect(navbar).not.toContain("transition: 'all 0.15s'");
        expect(cssBlock(navbar, '.nav-link:hover')).toContain('background: var(--primary-50)');
        expect(cssBlock(navbar, '.nav-link:focus-visible')).toContain('box-shadow: var(--focus-ring)');
    });

    test('mobile menu exposes accessible state and 44px target', () => {
        const navbar = readProjectFile('src/components/layout/Navbar.tsx');

        expect(navbar).toContain("aria-label={isMenuOpen ? 'ปิดเมนูหลัก' : 'เปิดเมนูหลัก'}");
        expect(navbar).toContain('aria-expanded={isMenuOpen}');
        expect(navbar).toContain('aria-controls="mobile-navigation"');
        expect(navbar).toContain('id="mobile-navigation"');
        expect(navbar).toContain('width: 44px;');
        expect(navbar).toContain('min-height: 44px;');
    });

    test('dropdown surfaces avoid heavy bordered shadow treatment', () => {
        const navbar = readProjectFile('src/components/layout/Navbar.tsx');

        expect(navbar).toContain('aria-expanded={showNotiDropdown}');
        expect(navbar).toContain('aria-expanded={showUserDropdown}');
        expect(navbar).toContain('id="navbar-notifications-panel"');
        expect(navbar).toContain('id="navbar-user-menu"');
        expect(navbar).toContain("boxShadow: '0 8px 8px rgba(16, 32, 51, 0.08)'");
        expect(navbar).not.toContain("boxShadow: '0 10px 40px rgba(0,0,0,0.12)'");
        expect(navbar).not.toContain("boxShadow: '0 8px 24px rgba(0,0,0,0.1)'");
        expect(navbar).not.toContain("borderRadius: '16px'");
    });
});
