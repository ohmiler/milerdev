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
    test('public navigation uses Swiss Rail composition and explicit transitions', () => {
        const navbar = readProjectFile('src/components/layout/PublicNavbar.tsx');

        expect(navbar).toContain('className={`nav-public-link${isActive(href) ?');
        expect(navbar).toContain('className="nav-public-auth-link"');
        expect(navbar).toContain('className="nav-public-primary"');
        expect(navbar).toContain('className="site-nav nav-public-shell"');
        expect(navbar).toContain('background: var(--accent);');
        expect(navbar).not.toContain('linear-gradient');
        expect(navbar).toContain('grid-template-columns: repeat(12, minmax(0, 1fr));');
        expect(navbar).toContain('grid-column: 4 / span 6;');
        expect(navbar).toContain('.nav-public-link--active::after');
        expect(navbar).toContain('bottom: -1px;');
        expect(navbar).not.toContain('transform: translateY(-1px)');
        expect(navbar).toContain('background: var(--accent-strong);');
        expect(navbar).not.toContain('#2563eb');
        expect(navbar).not.toContain('#eff6ff');
        expect(navbar).not.toContain("transition: 'all 0.15s'");
        expect(cssBlock(navbar, '.nav-public-link:hover')).toContain('color: var(--accent-strong)');
        expect(navbar).toContain('box-shadow: var(--focus-ring)');
        expect(navbar).toContain("className={`nav-brand-lockup${pathname === '/' ? ' nav-brand-lockup--active' : ''}`}");
        expect(navbar).toContain("aria-current={pathname === '/' ? 'page' : undefined}");
        expect(navbar).toContain('font-size: 1.25rem;');
    });

    test('mobile menu exposes accessible state and 44px target', () => {
        const navbar = readProjectFile('src/components/layout/PublicNavbar.tsx');
        const mobilePanel = readProjectFile('src/components/layout/MobileNavPanel.tsx');

        expect(navbar).toContain("aria-label={isMenuOpen ? 'ปิดเมนูหลัก' : 'เปิดเมนูหลัก'}");
        expect(navbar).toContain('aria-expanded={isMenuOpen}');
        expect(navbar).toContain('aria-controls="mobile-navigation"');
        expect(navbar).toContain('width: 44px;');
        expect(navbar).toContain('min-height: 44px;');
        expect(mobilePanel).toContain('id="mobile-navigation"');
    });

    test('dropdown surfaces avoid heavy bordered shadow treatment', () => {
        const navbar = readProjectFile('src/components/layout/NavbarUserMenu.tsx');
        const publicNavbar = readProjectFile('src/components/layout/PublicNavbar.tsx');

        expect(navbar).toContain('aria-expanded={showNotifications}');
        expect(navbar).toContain('aria-expanded={showUserMenu}');
        expect(navbar).toContain('id="navbar-notifications-panel"');
        expect(navbar).toContain('id="navbar-user-menu"');
        expect(publicNavbar).toContain('box-shadow: 0 4px 8px rgba(16, 32, 51, 0.08)');
        expect(navbar).not.toContain('boxShadow:');
        expect(navbar).not.toContain("borderRadius: '16px'");
    });

    test('uses a compact authenticated rail and text-first mobile navigation', () => {
        const userMenu = readProjectFile('src/components/layout/NavbarUserMenu.tsx');
        const mobilePanel = readProjectFile('src/components/layout/MobileNavPanel.tsx');

        expect(userMenu).toContain('aria-label={`เมนูผู้ใช้ ${session.user?.name');
        expect(userMenu).not.toContain('className="nav-user-name"');
        expect(userMenu).toContain('<NotificationTypeIcon type={notification.type} />');
        expect(userMenu).not.toContain("notification.type === 'success' ? '✅'");
        expect(mobilePanel).toContain('nav-mobile-link-group nav-mobile-link-group--primary');
        expect(mobilePanel).toContain('NAV_LINKS.map(({ href, label })');
        expect(mobilePanel).toContain('nav-mobile-link nav-mobile-link--primary');
    });
    test('keeps announcements outside the sticky public navigation rail', () => {
        const shell = readProjectFile('src/components/layout/Navbar.tsx');
        const publicNavbar = readProjectFile('src/components/layout/PublicNavbar.tsx');
        const banner = readProjectFile('src/components/layout/AnnouncementBanner.tsx');

        expect(shell).toContain("import AnnouncementBanner from './AnnouncementBanner';");
        expect(shell).toContain('<AnnouncementBanner />');
        expect(publicNavbar).not.toContain('AnnouncementBanner');
        expect(banner).toContain('className="site-announcement"');
        expect(banner).toContain('role="region"');
    });

    test('uses focus-managed disclosure regions for authenticated popups', () => {
        const userMenu = readProjectFile('src/components/layout/NavbarUserMenu.tsx');

        expect(userMenu).toContain('const notificationTriggerRef = useRef<HTMLButtonElement>(null);');
        expect(userMenu).toContain('const userTriggerRef = useRef<HTMLButtonElement>(null);');
        expect(userMenu).toContain('const notificationPanelRef = useRef<HTMLDivElement>(null);');
        expect(userMenu).toContain('const userMenuPanelRef = useRef<HTMLDivElement>(null);');
        expect(userMenu).toContain('requestAnimationFrame');
        expect(userMenu).toContain('trigger?.focus()');
        expect(userMenu).toContain('role="region"');
        expect(userMenu).toContain('tabIndex={-1}');
        expect(userMenu).not.toContain('role="menu"');
        expect(userMenu).not.toContain('aria-haspopup="dialog"');

        const publicNavbar = readProjectFile('src/components/layout/PublicNavbar.tsx');
        expect(publicNavbar).toContain('.nav-public-shell .nav-dropdown:focus');
        expect(publicNavbar).toContain('outline: 2px solid var(--accent);');
    });

    test('keeps mobile navigation usable for long menus and narrow tablets', () => {
        const navbar = readProjectFile('src/components/layout/PublicNavbar.tsx');

        expect(navbar).toContain('if (window.innerWidth >= 841) setIsMenuOpen(false);');
        expect(navbar).toContain('@media (max-width: 840px)');
        expect(navbar).toContain('@media (min-width: 841px)');
        expect(cssBlock(navbar, '.nav-public-mobile-panel')).toContain('max-height: calc(100dvh - 64px)');
        expect(cssBlock(navbar, '.nav-public-mobile-panel')).toContain('overflow-y: auto');
        expect(cssBlock(navbar, '.nav-public-mobile-panel')).toContain('overscroll-behavior: contain');
    });
});
