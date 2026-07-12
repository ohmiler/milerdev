# Homepage Hero: Swiss Technical Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the homepage hero as a Swiss Technical Studio Rail Split while preserving the existing two-column composition, right-side code editor, links, and homepage data behavior.

**Architecture:** Keep the homepage server component responsible for static hero structure and existing data, keep `HeroCodeEditor` responsible for its local animated/reduced-motion state, and move the composition into scoped classes in `globals.css`. The change is presentation-only: no new fetches, client data, APIs, or route behavior.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, styled-jsx inside `HeroCodeEditor`, global CSS tokens, Vitest, Playwright/manual browser QA.

---

## File map

- Modify `tests/homepage-polish.test.ts`: add failing assertions for the Rail Split structure and update editor style expectations from glass/gradient treatment to the Swiss technical frame.
- Modify `src/app/page.tsx:212-302`: remove hero blobs and inline presentation styles, add semantic kicker, 5/7 grid hooks, action group, and truthful utility line.
- Modify `src/app/globals.css:1058-1118, 1204-1230, 1698-1755`: define the light canvas, Swiss rules, 5/7 grid, responsive stack, motion-safe entrance classes, and utility line. Remove hero blob and metric styling from the active hero.
- Modify `src/components/home/HeroCodeEditor.tsx:327-626`: remove gradient/glass decoration, use semantic dark code tokens, retain tabs, line numbers, overflow, and reduced-motion behavior.
- Reference `docs/superpowers/specs/2026-07-12-homepage-hero-swiss-technical-studio-design.md` for acceptance criteria.

## Task 1: Add the failing homepage hero regression test

**Files:**
- Modify: `tests/homepage-polish.test.ts`

- [ ] **Step 1: Update the editor assertions and add the Rail Split test before production changes**

Add this test inside the existing `describe('homepage polish', () => { ... })` block, immediately after the current editor test. Update the current editor test assertions so they describe the approved frame: keep `border-radius: 12px`, but replace expectations for `linear-gradient`, `backdrop-filter`, and the active-tab gradient with the solid technical surfaces below.

```ts
test('homepage hero uses a Swiss technical rail split', () => {
    const page = readProjectFile('src/app/page.tsx');
    const globals = readProjectFile('src/app/globals.css');

    expect(page).toContain('className="hero-section"');
    expect(page).toContain('className="hero-container"');
    expect(page).toContain('className="hero-rail"');
    expect(page).toContain('className="hero-kicker hero-badge-anim"');
    expect(page).toContain('className="hero-actions hero-cta-anim"');
    expect(page).toContain('className="hero-utility hero-cta-anim"');
    expect(page).toContain('aria-label="ลำดับการเรียนรู้: เรียน สร้าง ส่งมอบ"');
    expect(page).not.toContain('hero-bg-decoration');
    expect(page).not.toContain('hero-stats');
    expect(page).not.toContain("borderRadius: '50px'");
    expect(page).not.toContain("gridTemplateColumns: '1fr 1fr'");

    expect(cssBlock(globals, '.hero-section {')).toContain('background: var(--canvas)');
    expect(cssBlock(globals, '.hero-rail {')).toContain('grid-template-columns: minmax(0, 5fr) minmax(0, 7fr)');
    expect(cssBlock(globals, '.hero-kicker {')).toContain('font-family: var(--font-code)');
    expect(cssBlock(globals, '.hero-utility {')).toContain('border-top: 1px solid var(--line)');
    expect(globals).not.toContain('.hero-bg-decoration {');
    expect(globals).not.toContain('.hero-stats {');
});
```

Update the existing editor assertions to the following exact expectations:

```ts
expect(editor).not.toContain('linear-gradient');
expect(editor).not.toContain('backdrop-filter: blur');
expect(cssBlock(editor, '.hero-code-editor {')).toContain('background: #0b1220');
expect(cssBlock(editor, '.hero-code-editor {')).toContain('border: 1px solid #40576c');
expect(cssBlock(editor, '.hero-code-editor__titlebar,')).toContain('background: #172235');
expect(cssBlock(editor, '.hero-code-editor__titlebar,')).toContain('border-color: #2a3d52');
expect(cssBlock(editor, '.hero-code-editor__tab[data-active="true"]')).toContain('background: #173b51');
expect(cssBlock(editor, '.hero-code-editor__tab[data-active="true"]')).toContain('border-bottom: 2px solid #63d7ff');
expect(cssBlock(editor, '.hero-code-editor__body {')).toContain('background: #101a29');
expect(editor).toContain('@media (prefers-reduced-motion: reduce)');
```

- [ ] **Step 2: Run the targeted test and verify it fails for the missing design**

Run:

```text
npm run test -- tests/homepage-polish.test.ts
```

Expected: FAIL. The new test should report that `hero-container` or `hero-rail` is missing, and the updated editor assertions should report the current gradient/glass declarations. Do not change production files until this failure is observed.

## Task 2: Replace the hero markup with the Rail Split structure

**Files:**
- Modify: `src/app/page.tsx:212-302`
- Test: `tests/homepage-polish.test.ts`

- [ ] **Step 1: Replace the current hero section markup with the approved structure**

Keep the existing `Navbar`, `HomeAnimations`, `HeroCodeEditor`, links, and copy meaning. Replace the hero section body with this structure:

```tsx
<section className="hero-section">
    <div className="container hero-container">
        <div className="hero-rail">
            <div className="hero-text">
                <p className="hero-kicker hero-badge-anim">
                    <span className="hero-kicker__rule" aria-hidden="true" />
                    CODING LEARNING STUDIO
                </p>

                <h1 className="hero-title hero-title-anim">
                    <span className="hero-title__line">เรียน Coding ตั้งแต่พื้นฐาน</span>
                    <span className="hero-title__line highlight">จนสร้างโปรเจกต์จริงได้</span>
                </h1>

                <p className="hero-desc-anim home-lede">
                    คอร์สเขียนโปรแกรมสำหรับผู้เริ่มต้น นักศึกษา และคนที่อยากต่อยอดรับงานหรือสร้างผลงานของตัวเอง
                    เรียนเป็นขั้นตอน ลงมือทำจริงทุกบทเรียน
                </p>

                <div className="hero-actions hero-cta-anim">
                    <Link href="#learning-path" className="btn btn-primary">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                        เริ่มตามเส้นทางการเรียน
                    </Link>
                    <Link href="/courses" className="btn btn-secondary">
                        ดูคอร์สทั้งหมด
                    </Link>
                </div>

                <div className="hero-utility hero-cta-anim" aria-label="ลำดับการเรียนรู้: เรียน สร้าง ส่งมอบ">
                    <span>LEARN</span>
                    <span aria-hidden="true">→</span>
                    <span>BUILD</span>
                    <span aria-hidden="true">→</span>
                    <span>SHIP</span>
                </div>
            </div>

            <div className="hero-ide hero-ide-anim">
                <HeroCodeEditor />
            </div>
        </div>
    </div>
</section>
```

The new SVG remains decorative because the link text is already present. Remove the three empty `hero-bg-decoration` nodes, the pill badge markup, inline layout styles, inline button padding, and trust metric markup.

- [ ] **Step 2: Run the targeted test to confirm the markup portion is green or identify only CSS/editor failures**

Run:

```text
npm run test -- tests/homepage-polish.test.ts
```

Expected: the page structure assertions pass. The suite may still fail on the CSS and editor expectations until Tasks 3 and 4 are complete.

## Task 3: Implement the Swiss hero layout, typography, and responsive rules

**Files:**
- Modify: `src/app/globals.css:1058-1118, 1204-1230, 1698-1755`
- Test: `tests/homepage-polish.test.ts`

- [ ] **Step 1: Replace the hero canvas and layout rules**

Use these scoped declarations in place of the current gradient/blob/grid/metric rules:

```css
.hero-section {
  background: var(--canvas);
  border-bottom: 1px solid var(--line);
  padding: clamp(56px, 8vw, 104px) 0 clamp(64px, 9vw, 120px);
  position: relative;
}

.hero-container {
  max-width: 1320px;
}

.hero-rail {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: clamp(32px, 5vw, 72px);
  align-items: center;
  max-width: 1240px;
  margin: 0 auto;
}

.hero-text {
  min-width: 0;
  text-align: left;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 24px;
  color: var(--accent-strong, var(--primary-700));
  font-family: var(--font-code);
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.4;
}

.hero-kicker__rule {
  width: 28px;
  height: 2px;
  background: var(--accent, var(--primary-500));
}

.hero-title {
  max-width: 12ch;
  margin: 0 0 24px;
  color: var(--ink);
  font-size: clamp(2.75rem, 5.2vw, 4.25rem);
  font-weight: 750;
  letter-spacing: -0.035em;
  line-height: 1.1;
  text-wrap: balance;
}

.hero-title .hero-title__line {
  display: block;
  white-space: normal;
}

.hero-title .highlight {
  color: var(--accent-strong, var(--primary-700));
}

.hero-text .home-lede {
  max-width: 42ch;
  margin: 0 0 32px;
  color: var(--ink-soft, var(--gray-700));
  line-height: var(--leading-thai);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0 0 28px;
}

.hero-actions .btn {
  min-height: 48px;
  padding-inline: 20px;
}

.hero-utility {
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  color: var(--ink-muted, var(--gray-500));
  font-family: var(--font-code);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.hero-utility span:nth-child(odd) {
  color: var(--ink-soft, var(--gray-700));
}

.hero-utility span:nth-child(even) {
  color: var(--accent, var(--primary-500));
}

.hero-ide {
  display: flex;
  min-width: 0;
  justify-content: flex-end;
  align-items: center;
}
```

- [ ] **Step 2: Replace responsive hero rules without using inline overrides**

Use the existing compact breakpoint and preserve the public breakpoint model:

```css
@media (max-width: 1023px) {
  .hero-rail {
    gap: 32px;
  }

  .hero-title {
    font-size: clamp(2.35rem, 5vw, 3.35rem);
  }
}

@media (max-width: 860px) {
  .hero-rail {
    grid-template-columns: 1fr;
    gap: 48px;
  }

  .hero-text {
    text-align: center;
  }

  .hero-kicker,
  .hero-actions,
  .hero-utility {
    margin-left: auto;
    margin-right: auto;
  }

  .hero-title,
  .hero-text .home-lede {
    margin-left: auto;
    margin-right: auto;
  }

  .hero-ide {
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .hero-section {
    padding: 48px 0 64px;
  }

  .hero-rail {
    gap: 36px;
  }

  .hero-title {
    max-width: 13ch;
    font-size: clamp(2rem, 10vw, 2.75rem);
  }

  .hero-actions {
    width: min(100%, 360px);
    flex-direction: column;
  }

  .hero-actions .btn {
    width: 100%;
  }

  .hero-utility {
    gap: 8px;
    font-size: 0.625rem;
  }
}
```

Remove the old `.hero-bg-decoration`, `.hero-bg-1`, `.hero-bg-2`, `.hero-bg-3`, `.hero-stats`, `.hero-stat`, and `.hero-stat__divider` blocks. Update the entrance animation selectors so `hero-badge-anim` remains a valid class for the new kicker, but no blob animation is emitted:

```css
.hero-badge-anim,
.hero-title-anim,
.hero-desc-anim,
.hero-cta-anim {
  animation: hero-fade-up 0.5s ease both;
}

.hero-title-anim { animation-delay: 0.1s; }
.hero-desc-anim { animation-delay: 0.2s; }
.hero-cta-anim { animation-delay: 0.3s; }
.hero-ide-anim { animation: hero-fade-in 0.7s 0.25s ease both; }
```

- [ ] **Step 3: Run the targeted test and verify the hero CSS assertions pass**

Run:

```text
npm run test -- tests/homepage-polish.test.ts
```

Expected: the new hero test passes. If an existing homepage test fails, keep its behavior assertion intact and adjust only selectors that were intentionally removed from the hero.

## Task 4: Restyle the editor as a solid technical specimen

**Files:**
- Modify: `src/components/home/HeroCodeEditor.tsx:327-626`
- Test: `tests/homepage-polish.test.ts`

- [ ] **Step 1: Replace the styled-jsx frame declarations**

Keep the component logic, tab semantics, line numbers, code body scroll, and `matchMedia` listener unchanged. Replace the visual declarations with these values:

```tsx
<style jsx>{`
  .hero-code-editor {
    background: #0b1220;
    border: 1px solid #40576c;
    border-radius: 12px;
    color: #dcecf7;
    font-family: var(--font-code);
    font-size: 13px;
    line-height: 1.65;
    max-width: 560px;
    min-width: 0;
    overflow: hidden;
    position: relative;
    width: 100%;
  }

  .hero-code-editor__titlebar,
  .hero-code-editor__status {
    align-items: center;
    background: #172235;
    border-color: #2a3d52;
    color: #c8d9e5;
    display: flex;
    position: relative;
    z-index: 2;
  }

  .hero-code-editor__tab[data-active="true"] {
    background: #173b51;
    border-bottom: 2px solid #63d7ff;
    border-radius: 0;
    color: #ffffff;
  }

  .hero-code-editor__body {
    background: #101a29;
    height: 320px;
    overflow-x: auto;
    overflow-y: auto;
    padding: 18px 0;
    scrollbar-color: rgba(115, 215, 255, 0.42) rgba(216, 230, 247, 0.08);
    scrollbar-gutter: stable;
    scrollbar-width: thin;
    position: relative;
    z-index: 2;
  }

  .hero-code-editor__line[data-current="true"] {
    background: rgba(2, 171, 255, 0.08);
  }

  .hero-code-editor__tab:focus-visible {
    box-shadow: 0 0 0 3px rgba(2, 171, 255, 0.28);
    outline: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-code-editor__tab,
    .hero-code-editor__line {
      transition: none;
    }

    .hero-code-editor__cursor {
      animation: none;
    }
  }
`}</style>
```

Retain the existing title bar height, traffic-light controls, line-number width, status bar, mobile body height, and syntax token colors unless they conflict with the solid surfaces above. Remove the `::before`/`::after` decorative gradient and inset border rules, the titlebar/status `backdrop-filter`, and the active-tab gradient.

- [ ] **Step 2: Run the editor and homepage tests**

Run:

```text
npm run test -- tests/homepage-polish.test.ts
```

Expected: PASS with no editor gradient/glass assertions remaining.

## Task 5: Run quality checks and visual QA

**Files:**
- No new files. Review only the files modified in Tasks 1 to 4.

- [ ] **Step 1: Run the focused test file**

```text
npm run test -- tests/homepage-polish.test.ts
```

Expected: all homepage polish tests pass.

- [ ] **Step 2: Run lint**

```text
npm run lint
```

Expected: no new lint errors or warnings from the hero files.

- [ ] **Step 3: Run the production build**

```text
npm run build
```

Expected: the Next.js production build completes without route, TypeScript, or CSS parsing errors.

- [ ] **Step 4: Perform visual QA at three widths**

Open the homepage at desktop width around 1440px, tablet width around 900px, and mobile width 390px. Confirm:

- the editor remains on the right at desktop and stacks below the copy at narrow widths;
- the headline, Thai body copy, and CTA do not overflow;
- the hero has no blobs or gradient background;
- only the primary CTA is visually dominant;
- the editor tabs remain keyboard reachable and the code body scrolls horizontally when needed;
- the `prefers-reduced-motion` setting shows a complete static code state.

- [ ] **Step 5: Review the final diff and commit the implementation**

Run:

```text
git diff --check
git status --short
git diff -- src/app/page.tsx src/app/globals.css src/components/home/HeroCodeEditor.tsx tests/homepage-polish.test.ts
```

Stage only the four implementation/test files and commit with:

```text
git add -- src/app/page.tsx src/app/globals.css src/components/home/HeroCodeEditor.tsx tests/homepage-polish.test.ts
git commit -m "style(homepage): redesign hero as swiss rail split"
```
