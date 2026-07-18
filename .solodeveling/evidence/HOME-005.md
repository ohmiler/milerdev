---
solodeveling_schema: 1
---

# HOME-005 — Evidence

## Scope and implementation

- Reordered Home into hero/method, labelled learning-workspace preview, published courses, teaching proof, compact showcase, and closing action.
- Removed bundle and affiliate rendering and their Home-only queries without deleting their routes, components, or stored data.
- Added a static product preview using capabilities already represented by the application: lesson context, curriculum, video focus, progress, saved state, and a next action. It is visibly labelled as a MilerDev online-learning preview and does not impersonate a signed-in learner session.
- Preserved the current course-card redesign, omitted instructor placeholder metadata on Home, and made the desktop grid respond to one through four rendered courses.
- Reduced the default showcase to three editorial images while retaining all six images in the existing keyboard-operated lightbox.
- No authentication, authorization, commerce, database, schema, migration, or production-data boundary changed.

## Observed browser evidence

- Desktop, 1440x1000: the code-led hero remains first; the workspace becomes the main product proof; two available courses fill a balanced two-column row; proof, logos, three-image gallery, closing action, and footer form one continuous narrative.
- Tablet, 768x900: the page has no horizontal overflow; the workspace recomposes into a horizontal three-item lesson rail above the learning stage.
- Mobile, 390x844: the page has no horizontal overflow; the workspace stacks, course cards become one column, and the showcase becomes a horizontal snap rail. Final document height was 8316px, reduced from 8944px before the compact mobile gallery.
- Page width measurements matched viewport width at 1440, 768, and 390 pixels.
- Dynamic desktop course-grid measurements after temporarily varying the rendered count were: one course 620px; two courses 430px each; three courses about 413px each; four courses 305px each. The DOM was restored to the real two-course state.
- The hero code editor changed the selected tab from `index.html` to `styles.css` by keyboard.
- The showcase opened image 1 of 6, closed with Escape, and restored focus to the first image trigger.
- With `prefers-reduced-motion: reduce`, the media query matched, the editor cursor was not rendered, and no code line remained hidden for an entrance animation.
- Browser console inspection found no errors. Development mode repeatedly warned that the generated Footer CSS preload was not used promptly; this is retained as a dev-only observation and was not attributed to this homepage change.

## Automated and static evidence

- `cmd.exe /c npx.cmd playwright test e2e/homepage.spec.ts`: passed 2/2 Chromium tests, covering desktop composition, absence of bundle/affiliate Home links, compact gallery, mobile menu, mobile overflow, and lightbox keyboard recovery.
- `npm.cmd run lint`: passed.
- `npm.cmd run test -- --run`: passed 11 files and 210 tests after rerunning the exact command with workspace read permission. The first sandboxed attempt failed before loading the test config with an access-denied filesystem error; it was an execution-environment limitation, not a test failure.
- `npm.cmd run build`: passed Next.js 16.1.4 production compilation, TypeScript validation, page-data collection, and static generation.
- `git diff --check`: passed on the final working diff.
- Final scoped search found no stale Home references to bundle/affiliate sections or the removed instructor placeholder copy.

## Limitations and recovery

- Published courses without real thumbnail imagery still use the existing restrained visual fallback; this work did not invent production assets or records.
- Bundle and affiliate experiences remain available through their existing routes; only homepage promotion was removed.
- Changes remain uncommitted. Recovery is limited to the scoped Home composition, workspace preview, gallery presentation, E2E expectations, and Solodeveling records.
