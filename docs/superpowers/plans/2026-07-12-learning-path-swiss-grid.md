# Learning Path Swiss Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the homepage beginner learning path into a light Swiss editorial split grid while preserving its course lookup and navigation behavior.

**Architecture:** Keep the existing server-rendered homepage data model and markup contract. Use the existing `.lp-head`, `.lp-track`, and `.lp-step` elements with scoped global CSS to create a 12-column desktop composition, a 2x2 step grid, and a single-column mobile sequence. Extend the focused homepage static test to protect the new layout contract and restrained visual treatment.

**Tech Stack:** Next.js 16 App Router, React server component, TypeScript, global CSS, Vitest.

## Global Constraints

- Keep the public homepage light and readable; do not alter the VS Code Dark+ editor theme.
- Preserve `LEARNING_PATH_STEPS`, `buildLearningPath`, the four-step order, Thai copy, `#learning-path`, and existing course link fallbacks.
- Use the existing brand accent `#02abff` through semantic/primary tokens; do not introduce a new dependency or new page component.
- Keep Thai body text at the existing generous line-height and prevent horizontal overflow on mobile.
- Do not use gradient fills, heavy shadows, nested cards, or a colored side-stripe accent.
- Preserve visible `:focus-visible` feedback and reduced-motion behavior.
- Stage only files belonging to this learning-path change; preserve existing unrelated working-tree changes.

## File Map

- Modify `src/app/globals.css` around the `/* Learning Path */` block: implement the 12-column split, 2x2 step grid, structural rules, hover/focus states, and responsive collapse.
- Leave `src/app/page.tsx` unchanged unless a semantic class or grid hook is required; the existing `lp-head`, `lp-track`, `lp-step-item`, and `lp-step` markup already contains the needed boundaries.
- Modify `tests/homepage-polish.test.ts` near the existing learning-path test: replace assumptions about the old connected-card track with assertions for the new Swiss grid contract.

### Task 1: Lock the Swiss grid contract in focused tests

**Files:**
- Modify: `tests/homepage-polish.test.ts` in the existing learning-path test block.
- Test target: `tests/homepage-polish.test.ts`

**Interfaces:**
- Consumes: existing `readProjectFile` and `cssBlock` helpers in the test file.
- Produces: assertions that describe the required layout without asserting implementation-irrelevant pixel values.

- [ ] **Step 1: Replace the old track assertions with split-grid assertions**

Add assertions equivalent to:

```ts
test('learning path uses a Swiss editorial split grid', () => {
    const globals = readProjectFile('src/app/globals.css');
    const page = readProjectFile('src/app/page.tsx');

    expect(page).toContain('className="learning-path"');
    expect(page).toContain('className="lp-head"');
    expect(page).toContain('className="lp-track"');
    expect(page).toContain('className="lp-step"');

    const section = cssBlock(globals, '.learning-path .container');
    expect(section).toContain('grid-template-columns: repeat(12, minmax(0, 1fr))');

    expect(cssBlock(globals, '.lp-head')).toContain('grid-column: span 4');
    expect(cssBlock(globals, '.lp-track')).toContain('grid-column: 5 / -1');
    expect(cssBlock(globals, '.lp-track')).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(cssBlock(globals, '.lp-step')).toContain('border-radius: 0');
    expect(cssBlock(globals, '.lp-step')).not.toContain('background: var(--primary-gradient)');
    expect(cssBlock(globals, '.lp-step')).not.toContain('box-shadow: 0 8px 14px');
});
```

- [ ] **Step 2: Run the focused test and confirm it fails against the old CSS**

Run:

```powershell
npm.cmd run test -- --run tests/homepage-polish.test.ts
```

Expected: the new Swiss-grid test fails because the current learning-path CSS still uses a four-column card track and gradient number badge.

### Task 2: Implement the desktop editorial split grid

**Files:**
- Modify: `src/app/globals.css` in the `/* Learning Path */` section.

**Interfaces:**
- Consumes: existing page markup classes `.learning-path`, `.lp-head`, `.lp-track`, `.lp-step-item`, and `.lp-step`.
- Produces: a desktop 12-column layout with a four-column heading rail and an eight-column 2x2 step grid.

- [ ] **Step 1: Replace the section and track geometry**

Update the learning-path block to use these rules as the structural baseline:

```css
.learning-path {
  background: var(--surface, #f7f9fb);
  border-top: 1px solid var(--gray-200);
  border-bottom: 1px solid var(--gray-200);
  padding: 88px 0;
}

.learning-path .container {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  column-gap: clamp(24px, 4vw, 64px);
  align-items: start;
}

.lp-head {
  grid-column: span 4;
  max-width: none;
  margin: 0;
  padding-top: 4px;
}

.lp-track {
  grid-column: 5 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
  border-top: 1px solid var(--gray-300);
  border-bottom: 1px solid var(--gray-300);
}

.lp-track::before {
  display: none;
}

.lp-step-item {
  display: flex;
  min-width: 0;
  position: relative;
  border-bottom: 1px solid var(--gray-200);
}

.lp-step-item:nth-child(odd) {
  border-right: 1px solid var(--gray-200);
}

.lp-step-item:nth-last-child(-n + 2) {
  border-bottom: 0;
}
```

- [ ] **Step 2: Replace card decoration with typographic hierarchy**

Use a borderless, full-cell link and keep the sequence number as a solid accent anchor:

```css
.lp-step {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 280px;
  background: transparent;
  border: 0;
  border-radius: 0;
  padding: 28px 24px 24px;
  text-decoration: none;
  color: inherit;
  transition: background-color 0.16s ease, color 0.16s ease;
}

.lp-step:hover {
  transform: none;
  border-color: transparent;
  background: var(--accent-soft);
  box-shadow: none;
}

.lp-step:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 3px rgba(2, 171, 255, 0.35);
}

.lp-step__num {
  width: 44px;
  height: 44px;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: #ffffff;
  background: var(--accent, var(--primary-500));
  font-family: var(--font-code);
  font-size: 1rem;
  font-weight: 700;
  box-shadow: none;
}

.lp-step__stage {
  margin-bottom: 8px;
  color: var(--primary-700);
  font-family: var(--font-code);
  font-size: var(--text-caption);
  font-weight: 700;
}

.lp-step__title {
  margin-bottom: 10px;
  color: var(--gray-900);
  font-size: var(--text-body-lg);
  font-weight: 750;
  line-height: var(--leading-heading);
  text-wrap: balance;
}

.lp-step__outcome {
  flex: 1;
  margin-bottom: 20px;
  color: var(--gray-600);
  font-size: var(--text-body-sm);
  line-height: var(--leading-body);
  text-wrap: pretty;
}

.lp-step__cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  color: var(--primary-700);
  font-size: 0.875rem;
  font-weight: 700;
}
```

- [ ] **Step 3: Run the focused test and confirm the desktop contract passes**

Run:

```powershell
npm.cmd run test -- --run tests/homepage-polish.test.ts
```

Expected: the Swiss-grid test and the existing homepage tests pass.

### Task 3: Add responsive and motion-safe behavior

**Files:**
- Modify: `src/app/globals.css` in the learning-path responsive rules.

**Interfaces:**
- Consumes: the desktop grid from Task 2.
- Produces: readable tablet/mobile layouts, vertical step guidance, and reduced-motion behavior.

- [ ] **Step 1: Add the tablet collapse rule**

At the existing homepage responsive breakpoint, add:

```css
@media (max-width: 900px) {
  .learning-path .container {
    grid-template-columns: 1fr;
    row-gap: 36px;
  }

  .lp-head,
  .lp-track {
    grid-column: 1 / -1;
  }
}
```

- [ ] **Step 2: Add the mobile vertical sequence**

Within the mobile breakpoint used by homepage sections, add:

```css
@media (max-width: 640px) {
  .learning-path {
    padding: 64px 0;
  }

  .lp-track {
    display: block;
  }

  .lp-step-item,
  .lp-step-item:nth-child(odd),
  .lp-step-item:nth-last-child(-n + 2) {
    border-right: 0;
    border-bottom: 1px solid var(--gray-200);
  }

  .lp-step-item:last-child {
    border-bottom: 0;
  }

  .lp-step-item:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 45px;
    top: 72px;
    bottom: -1px;
    width: 1px;
    background: var(--primary-200);
  }

  .lp-step {
    min-height: 0;
    padding: 24px 16px;
  }

  .lp-step__num {
    margin-bottom: 18px;
  }
}
```

- [ ] **Step 3: Add reduced-motion coverage for the step interaction**

Extend the existing reduced-motion block with:

```css
@media (prefers-reduced-motion: reduce) {
  .lp-step,
  .lp-step__cta svg {
    transition: none;
  }

  .lp-step:hover .lp-step__cta svg {
    transform: none;
  }
}
```

- [ ] **Step 4: Run the focused test again**

Run:

```powershell
npm.cmd run test -- --run tests/homepage-polish.test.ts
```

Expected: all homepage tests pass with the responsive rules present.

### Task 4: Verify the finished homepage surface

**Files:**
- Verify: `src/app/page.tsx`
- Verify: `src/app/globals.css`
- Verify: `tests/homepage-polish.test.ts`

**Interfaces:**
- Consumes: the completed Swiss grid implementation.
- Produces: evidence that the public homepage remains build-safe, accessible, and responsive.

- [ ] **Step 1: Run lint**

Run:

```powershell
npm.cmd run lint
```

Expected: exit code 0 with no new lint errors.

- [ ] **Step 2: Run the production build**

Run:

```powershell
npm.cmd run build
```

Expected: the Next.js build compiles TypeScript and completes static generation successfully.

- [ ] **Step 3: Manually inspect desktop and mobile viewports**

Open the homepage at approximately 1440px and 390px wide and verify:

- Desktop shows the heading rail beside a 2x2 step grid.
- Mobile stacks the heading and steps with no horizontal overflow.
- Thai headings/outcomes wrap without clipping.
- Hover and keyboard focus are visible.
- Existing course links and the hero anchor still work.
- Browser console has no new errors.

- [ ] **Step 4: Review the final diff and commit only scoped files**

Run:

```powershell
git diff --check -- src/app/globals.css tests/homepage-polish.test.ts
git status --short
git add -- src/app/globals.css tests/homepage-polish.test.ts
git commit -m "style(homepage): reshape learning path as swiss grid"
```

Expected: only the learning-path CSS and focused test are staged; unrelated existing changes remain unstaged.

