# ADR 0014: Home hero, a two-line title and a looping editor that builds a page

- Status: Accepted (the owner asked for it on 2026-10-07)
- Date: 2026-10-07
- Decision owners: MilerDev product and engineering
- Scope: The Home hero only
- Supersedes: in ADR 0012, the hero item under "Home order" and the H1 line under "Typography". The rest of ADR 0012 stands.

## Context

The owner kept the ADR 0012 hero, the ADR 0001 headline and the VS Code–style editor, and asked for these changes:

- **A shorter title.** It ran to four lines, 293px tall at 1440px. At 60px its first line is 644px wide, and the text column is 504px.
- **An editor that loops, with tabs that work.** It typed once and stopped.
- **A preview that looks like a website, inside the editor window.** The preview was a separate floating window over the editor's corner. It showed "Hello, World" and a counter button, and "กำลังเขียนโค้ด…" until the typing finished.

## Decision

### Title

- **Two lines from `sm` up:** "เรียนให้เข้าใจ สร้างได้จริง" and then "เติบโตเป็น Developer".
  - Each line is a block that does not wrap.
  - Each phrase is still an inline block, so on a phone the first line breaks only between phrases. A phone shows three lines.
- **`--type-display` becomes `clamp(2.25rem, 1.2rem + 2.6vw, 3.25rem)`:** 36px on phones and 52px from about 1280px. Only the Home title uses this step.
- **The hero grid becomes `minmax(0,1.17fr) minmax(0,1fr)` from `lg` and `35.5rem 1fr` from `xl`.** The text column grows at the same rate as the title, so the first line fits from 1024px up. From 1280px the editor gets the rest of the row.

### Editor window

- **One window holds the code and the browser.**
  - The explorer is gone, to make room.
  - The tabs, the code and a browser pane (`localhost:5173`) sit side by side in one window, from `xl` and between `md` and `lg`.
  - Where the window is narrower, the browser pane sits under the code, still inside the same window.
- **A loop:**
  1. Type `App.jsx`.
  2. Wait about a second.
  3. Switch to the `index.css` tab and type it.
  4. Hold the finished page for about five seconds.
  5. Start again.

  The timeline is a pure function of a tick count in `src/lib/home/hero-editor.ts`.
- **Tabs that work:** the `App.jsx` and `index.css` tabs are real buttons. Picking one shows that whole file and the finished page, and stops the loop.
- **A pause button:** a button in the title bar stops the loop, or starts it again from the beginning. This is the pause control WCAG 2.2.2 asks for, since the motion lasts longer than five seconds.
- **No needless motion:** the loop also pauses while the editor is off screen. With reduced motion it does not start. The finished files and page show instead, and the visitor can still press play.
- **Accessibility:** the moving code, the browser pane and the status bar are hidden from assistive technology. The figure keeps a caption that describes the demo. Only the two tabs and the play/pause button can take focus.

### The page the code builds

- **A developer's portfolio card: "Mint, Frontend Developer".** It has an avatar, the skills React, CSS and AI, and a "ดูผลงาน" button. It suits a site whose learners build their own portfolio.
- **It builds up as the code is typed:**
  - While `App.jsx` is typed, each element appears once its line is typed. It starts unstyled, with a bulleted list and a grey button.
  - While `index.css` is typed, each declaration applies once its line is typed: the dark card, centring, a round avatar, the skills in a cyan row, and a violet pill button.
  - The card's background and text colour apply together, so text never sits dark on dark or light on white.
- **It is a picture of a site:** its button is not interactive.

## Consequences

- The title no longer pushes the first section down. At 1440 × 900 the hero ends at 665px, so the "how you learn" heading now shows on the first screen. At 1024px the editor window is taller, because the browser pane sits under the code.
- **The hero keeps moving while someone watches.** That is deliberate: the owner asked for a loop, and the pause button, the off-screen pause and the reduced-motion setting stop it.
- **The sample code drives the preview through `lineOf` lookups**, so moving a line keeps the preview in step. A unit test keeps every line at 34 characters or fewer, so it fits the code pane at its narrowest side-by-side width.
- **Contracts updated with this ADR:**
  - `tests/components/home-code-editor.test.tsx` and `tests/lib/home/*` pin the loop, the tabs, pause, reduced motion and the order of the preview.
  - `e2e/homepage.spec.ts` pins the two-line title on desktop.
