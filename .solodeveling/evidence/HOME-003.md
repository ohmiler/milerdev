---
solodeveling_schema: 1
---

# HOME-003 — Evidence

## Palette implementation

- Claim: The public homepage explicitly defaults to the MilerDev light palette.
  - Method: Scoped review of `home.module.css`, `ShowcaseGallery.tsx`, `AffiliateBannerCarousel.tsx`, and `Footer.module.css`, plus browser computed-style inspection while the emulated operating-system preference was dark.
  - Result: The homepage computed `color-scheme: light`, background `rgb(247, 249, 251)` (`#F7F9FB`), and text `rgb(17, 24, 32)` (`#111820`). Bundle computed `#F0F5F8`; proof computed `#E0F5FF`; gallery, affiliate, and footer computed light backgrounds and dark text.
- Claim: The palette is semantic rather than a layout lock.
  - Method: Review of the scoped diff.
  - Result: Existing Gridgeist composition, spacing, asymmetry, imagery, data, links, and component structure were preserved; only surface, text, border, accent, focus, and state colors changed.
- Claim: Obsolete supporting color fields were removed from the scoped public presentation.
  - Method: `rg` search for the prior yellow, coral, mint, near-black, and off-palette blue literals across the scoped files.
  - Result: No matches. The remaining dark presentation is the authentic code editor (`color-scheme: dark`) and the modal lightbox overlay.

## Rendered and interaction evidence

- Viewports observed: 1440×1000 desktop and 390×844 mobile in installed Chrome after full-page scrolling, with the browser preference emulated as dark.
- Result: Both renders remained light, retained the editorial hierarchy, loaded teaching imagery, and had no horizontal overflow or console/page errors.
- Result: Final computed inspection reported the page as light and the code editor as dark, confirming the intended default and bounded focus-context exception.
- `cmd.exe /c npx.cmd playwright test e2e/homepage.spec.ts`: passed two Chromium flows covering mobile navigation/overflow and gallery keyboard open, Escape close, and focus restoration.
- Limitation: Dynamic affiliate images remain environment-dependent; the light-theme title/link fallback remains in place. No user research or broad accessibility claim is made.

## Engineering gates

- `cmd.exe /c npm.cmd run test -- --run`: passed 11 files and 210 tests; expected mocked error-path stderr appeared with exit status 0.
- `cmd.exe /c npm.cmd run lint`: passed.
- `cmd.exe /c npm.cmd run build`: passed Next.js production compilation, TypeScript, and route generation.
- `git diff --check`: passed with line-ending conversion warnings only.
- `git status --short`: reviewed; unrelated pre-existing deletions and skill changes remain preserved.
