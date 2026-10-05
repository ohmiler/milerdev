// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import AccountTabs from '@/components/account/AccountTabs';

// jsdom has no layout: the row reports the widths below, each tab the offsets in its data attributes.
const layout = { rowScrollWidth: 0, rowClientWidth: 360 };
const scrolled = new WeakMap<Element, number>();
const stubs: Record<string, PropertyDescriptor> = {
  scrollWidth: { get(this: HTMLElement) { return this.tagName === 'NAV' ? layout.rowScrollWidth : 0; } },
  clientWidth: { get(this: HTMLElement) { return this.tagName === 'NAV' ? layout.rowClientWidth : 0; } },
  offsetLeft: { get(this: HTMLElement) { return Number(this.dataset.offsetleft ?? 0); } },
  offsetWidth: { get(this: HTMLElement) { return Number(this.dataset.offsetwidth ?? 0); } },
  scrollLeft: {
    get(this: HTMLElement) { return scrolled.get(this) ?? 0; },
    set(this: HTMLElement, value: number) { scrolled.set(this, value); },
  },
};
const originals = new Map<string, PropertyDescriptor | undefined>();

beforeEach(() => {
  for (const [name, descriptor] of Object.entries(stubs)) {
    const owner = name === 'scrollLeft' || name === 'scrollWidth' || name === 'clientWidth' ? Element.prototype : HTMLElement.prototype;
    originals.set(name, Object.getOwnPropertyDescriptor(owner, name));
    Object.defineProperty(owner, name, { configurable: true, ...descriptor });
  }
});

afterEach(() => {
  cleanup();
  for (const name of Object.keys(stubs)) {
    const owner = name === 'scrollLeft' || name === 'scrollWidth' || name === 'clientWidth' ? Element.prototype : HTMLElement.prototype;
    const original = originals.get(name);
    if (original) Object.defineProperty(owner, name, original);
    else delete (owner as unknown as Record<string, unknown>)[name];
  }
});

function renderTabs() {
  return render(
    <AccountTabs>
      <a href="/dashboard" data-offsetleft="16" data-offsetwidth="140">การเรียนของฉัน</a>
      <a href="/settings" aria-current="page" data-offsetleft="600" data-offsetwidth="120">ตั้งค่าบัญชี</a>
    </AccountTabs>,
  );
}

describe('AccountTabs', () => {
  it('centres the current tab when the row is wider than the screen', () => {
    layout.rowScrollWidth = 720;
    const nav = renderTabs().container.querySelector('nav')!;
    expect(nav.scrollLeft).toBe(600 - (360 - 120) / 2);
  });

  it('leaves a row that already fits alone', () => {
    layout.rowScrollWidth = 360;
    const nav = renderTabs().container.querySelector('nav')!;
    expect(nav.scrollLeft).toBe(0);
  });
});
