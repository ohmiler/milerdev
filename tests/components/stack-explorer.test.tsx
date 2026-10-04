// @vitest-environment jsdom

import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const scene = vi.hoisted(() => ({ props: null as null | Record<string, unknown> }));

// The WebGL scene is replaced by a stub that records what the explorer asks it to show.
vi.mock('next/dynamic', () => ({
  default: () => function SceneStub(props: Record<string, unknown>) {
    scene.props = props;
    return <div data-testid="scene" />;
  },
}));

import StackExplorer from '@/components/stack/StackExplorer';

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduce'),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

describe('StackExplorer', () => {
  beforeEach(() => {
    scene.props = null;
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    stubReducedMotion(false);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the selected part and moves to a connected part', async () => {
    const user = userEvent.setup();
    render(<StackExplorer />);

    expect(screen.getByRole('heading', { level: 1, name: 'เว็บนี้สร้างด้วยอะไร' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Next.js' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /^Drizzle ORM/ }));

    expect(screen.getByRole('heading', { name: 'Drizzle ORM' })).toBeTruthy();
    expect(scene.props?.selectedId).toBe('drizzle');
  });

  it('plays a journey step by step and tells the scene which connection is active', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(<StackExplorer />);

    act(() => screen.getByRole('button', { name: 'ซื้อคอร์สด้วยบัตร' }).click());
    expect(scene.props?.activeEdge).toEqual({ from: 'browser', to: 'ui' });
    expect(scene.props?.selectedId).toBeNull();

    act(() => vi.advanceTimersByTime(2600));
    expect(scene.props?.activeEdge).toEqual({ from: 'ui', to: 'api' });

    act(() => screen.getByRole('button', { name: 'หยุดชั่วคราว' }).click());
    act(() => vi.advanceTimersByTime(10_000));
    expect(scene.props?.activeEdge).toEqual({ from: 'ui', to: 'api' });

    act(() => screen.getByRole('button', { name: 'ขั้นถัดไป' }).click());
    expect(scene.props?.activeEdge).toEqual({ from: 'api', to: 'stripe' });
    const steps = screen.getAllByRole('listitem').filter((item) => within(item).queryByText(/Stripe แจ้งผล/));
    expect(steps).toHaveLength(1);

    act(() => screen.getByRole('button', { name: 'ปิดเส้นทางนี้' }).click());
    expect(scene.props?.activeEdge).toBeNull();
    expect(scene.props?.journeyEdges).toBeNull();
  });

  it('does not auto-play when the viewer prefers reduced motion', async () => {
    stubReducedMotion(true);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(<StackExplorer />);

    act(() => screen.getByRole('button', { name: 'ส่งโค้ดขึ้นเว็บจริง' }).click());
    expect(screen.queryByRole('button', { name: /เล่นอัตโนมัติ|หยุดชั่วคราว/ })).toBeNull();
    act(() => vi.advanceTimersByTime(10_000));
    expect(scene.props?.activeEdge).toEqual({ from: 'github', to: 'ci' });
    expect(scene.props?.reducedMotion).toBe(true);
  });

  it('falls back to a flat diagram when WebGL is unavailable', async () => {
    const user = userEvent.setup();
    render(<StackExplorer />);

    act(() => (scene.props?.onUnavailable as () => void)());
    expect(screen.queryByTestId('scene')).toBeNull();
    expect(screen.getByText(/แสดงโมเดล 3 มิติไม่ได้/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'SlipOK' }));
    expect(screen.getByRole('heading', { name: 'SlipOK' })).toBeTruthy();
  });
});
