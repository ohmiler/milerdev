# ADR 0014: Home hero, a two-line title and a looping editor that builds a page

- Status: Accepted (the owner asked for it on 2026-10-07)
- Date: 2026-10-07
- Decision owners: MilerDev product and engineering
- Scope: The Home hero only
- Supersedes: in ADR 0012, the hero item under "Home order" and the H1 line under "Typography". The rest of ADR 0012 stands.

## Context

The owner kept the ADR 0012 hero, the ADR 0001 headline and the VS Code–style editor, and asked for three changes:

- **The title is too tall.** It ran to four lines, 293px tall at 1440px. At 60px its first line is 644px wide, and the text column is 504px.
- **The editor should loop, and its tabs should work.** It typed once and stopped.
- **The preview should look like a website.** It showed "Hello, World" and a counter button. Before the typing finished, it showed "กำลังเขียนโค้ด…".

## Decision

### Title

- **Two lines from `sm` up:** "เรียนให้เข้าใจ สร้างได้จริง" and then "เติบโตเป็น Developer".
  - Each line is a block that does not wrap.
  - Each phrase is still an inline block, so on a phone the first line breaks only between phrases. A phone shows three lines.
- **`--type-display` becomes `clamp(2.25rem, 1.2rem + 2.6vw, 3.25rem)`:** 36px on phones and 52px from about 1280px. Only the Home title uses this step.
- **The hero grid becomes `minmax(0,1.17fr) minmax(0,1fr)` from `lg`.** The text column then grows at the same rate as the title, and the first line fits from 1024px up.

### Editor

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
- **Accessibility:** the moving code, the explorer, the status bar and the mock page are hidden from assistive technology. The figure keeps a caption that describes the demo. Only the two tabs and the play/pause button can take focus.

### Preview

- **It shows the page the code builds:** a small shop page, "MilerCoffee".
  - While `App.jsx` is typed, each element appears once its line is typed. It starts unstyled, with the browser's blue underlined link and grey button.
  - While `index.css` is typed, each declaration applies once its line is typed.
  - The hero's background and text colour apply together, so dark text never sits on the brown fill.
- **It is a picture of a site:** its link and button are not interactive.

## Consequences

- The title no longer pushes the first section down, and the hero still fits 1440 × 900. It ends at 843px.
- **The hero keeps moving while someone watches.** That is deliberate: the owner asked for a loop, and the pause button, the off-screen pause and the reduced-motion setting stop it.
- **The editor and the preview are now one component (`HomeCodeEditor`).** Changing a line of the sample code changes the preview through `lineOf` lookups. A unit test keeps every line at 36 characters or fewer, so it fits the narrowest editor.
- **Contracts updated with this ADR:**
  - `tests/components/home-code-editor.test.tsx` and `tests/lib/home/*` pin the loop, the tabs, pause, reduced motion and the preview order.
  - `e2e/homepage.spec.ts` pins the two-line title on desktop.
