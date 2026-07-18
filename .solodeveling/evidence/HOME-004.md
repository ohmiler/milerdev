---
solodeveling_schema: 1
---

# HOME-004 — Evidence

## Direction and implementation

- Claim: The existing homepage promise remains the dominant left track while an animated code workspace is now the right visual lead.
  - Method: Scoped review of `page.tsx` and `home.module.css`, followed by installed-Chrome rendering.
  - Result: The former hero teaching photo was removed from the section. The hero now uses a 12-track desktop composition with copy on tracks 1–6, editor on tracks 7–12, and the learning rhythm as a shared row below. Copy and CTA destinations are unchanged.
- Claim: The editor is product evidence rather than unrelated VS Code decoration.
  - Method: Review of `HeroCodeEditor.tsx` and timed browser observation.
  - Result: Real sample HTML, CSS, and JavaScript type line-by-line and rotate automatically. The CSS sample explicitly demonstrates `#00ABFF`, `#111820`, `#F7F9FB`, and `#D8E1E8` from `milerdev-color-palette.md`.
- Claim: Editor chrome is bounded to the documented dark focus context.
  - Method: Scoped literal/token review and rendered observation.
  - Result: Background, surface, hover, border, text, accent, pressed, muted, success, current-line, cursor, scrollbar, active-tab, and focus roles use the documented dark, accent, and semantic palette values. The surrounding public page remains light.

## Rendered and interaction evidence

- Viewports observed in installed Chrome: 1440×1000 desktop, 768×900 tablet, and 390×844 mobile.
- Desktop result: The large Thai headline remains first in hierarchy; the editor fills the right track without overpowering it. The blue field and short rule frame the workspace without repeating decorative technical chrome.
- Tablet/mobile result: Copy, editor, then learning rhythm recompose into one column. At 390px, `documentElement.scrollWidth` and `clientWidth` both measured 390; long code remains inside the editor's own horizontal scroll area.
- Animation result: Timed observation showed partial lines becoming complete and automatic movement between CSS and JavaScript snippets.
- Pointer/keyboard result: Clicking `index.html`, then pressing ArrowRight selected and focused `styles.css`; the semantic tablist, selected state, and panel label remained correct.
- Reduced-motion result: After emulating `prefers-reduced-motion: reduce` and reloading, every editor line computed opacity 1, the typing cursor was absent, and the media query reported active.
- Browser console result: No page/runtime errors were observed. Development-only CSS preload and Fast Refresh warnings were not caused by the hero implementation.
- Limitation: This is rendered engineering evidence, not user research or a broad accessibility-compliance claim.

## Engineering gates

- `cmd.exe /c npm.cmd run lint`: passed.
- `cmd.exe /c npm.cmd run test -- --run`: passed 11 files and 210 tests; expected mocked negative-path stderr appeared with exit status 0.
- `cmd.exe /c npx.cmd playwright test e2e/homepage.spec.ts`: passed two Chromium flows covering mobile navigation/overflow and gallery keyboard recovery.
- `cmd.exe /c npm.cmd run build`: passed Next.js production compilation, TypeScript, page-data collection, and route generation.
- `git diff --check`: passed with line-ending conversion warnings only.
- `git status --short`: reviewed; unrelated pre-existing deletions and earlier homepage changes remain preserved.
- Temporary Playwright screenshots, snapshots, and console logs used for visual QA were removed after inspection.
