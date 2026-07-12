import type { ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';
export type SurfaceName = 'public' | 'public-footer' | 'learning' | 'dashboard' | 'admin';

export default function ThemeSurface({
    theme,
    surface,
    children,
}: {
    theme: ThemeMode;
    surface: SurfaceName;
    children: ReactNode;
}) {
    return (
        <div className="theme-surface" data-theme={theme} data-surface={surface}>
            {children}
        </div>
    );
}
