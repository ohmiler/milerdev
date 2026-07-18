---
solodeveling_schema: 1
---

# HOME-009 Evidence - Real course decision evidence on Home

Date: 2026-07-19

## Direction and scope

- Gridgeist 1.1.1 was the sole design authority.
- Thesis: For Thai learners who are unsure where to begin, turn the Home course area into a calm decision surface using real curriculum metadata and a low-risk preview cue while preserving MilerDev's technical-friendly grid, pricing truth, and existing course navigation.
- No schema, stored data, route, enrollment, authentication, payment, promotion, or course-detail behavior changed.

## Implementation evidence

- `src/app/page.tsx` aggregates published-course lesson count, total video duration, and free-preview count; joins the real instructor; and fetches existing tags for the four featured courses.
- `src/components/course/CourseCard.tsx` accepts optional duration and preview evidence. Missing duration, preview, instructor, or tags produce no empty label or invented fallback.
- A course with a free-preview lesson uses `ทดลองบทเรียนฟรี` as its card CTA while preserving the existing course-detail destination.
- Each CourseCard remains one outer link. No nested links or buttons were introduced.
- Home-only CSS presents tags as quiet metadata labels and groups lesson count, duration, preview availability, and instructor with structural rules rather than decorative pills.

## Rendered data observation

- The local Home rendered two published courses.
- Both rendered their real tags, `Instructor Demo`, and a free-preview cue. Both CTAs changed to `ทดลองบทเรียนฟรี` because each course has at least one free-preview lesson.
- Total duration was omitted for both courses because the current aggregate video duration is zero. This confirms the missing-data path does not fabricate a duration.
- Course pricing remained `฿1,990` discounted to `฿990` for React & Next.js and `ฟรี` for Web Development.
- Desktop and mobile screenshots were visually inspected. Tags, facts, instructor, and CTA remained readable; the preview cue was separated from lesson count with a quiet rule.

## Playwright observation

- Rendered widths 390, 768, 1280, and 1600 px all reported document scroll width equal to client width; no horizontal overflow was observed.
- The featured course hover computed to `transform: none`, `box-shadow: none`, and the established deep-blue border feedback.
- Keyboard navigation from `ดูคอร์สทั้งหมด` moved focus to the first featured course; `:focus-visible` was true with a 3 px accent outline.
- The first course contained zero nested links.
- Under `prefers-reduced-motion: reduce`, the featured course transition duration computed to `0s` and transform remained `none`.
- Browser console inspection reported zero errors. Twelve repeated development-only Footer stylesheet preload warnings accumulated during reload/resize checks.

## Automated and static checks

- `npx vitest run tests/components/course-card.test.tsx`: passed, 2 tests.
  - truthful optional metadata and one-link structure.
  - clean omission of unavailable evidence.
- `npm run lint`: passed.
- `PLAYWRIGHT_BROWSERS_PATH=0 npx playwright test e2e/homepage.spec.ts --reporter=line`: passed, 2 tests.
  - mobile recomposition/navigation and no horizontal overflow.
  - gallery keyboard close and focus recovery.
- `npm run build`: passed with Next.js 16.1.4; TypeScript passed and all 90 static pages generated.
- `git diff --check`: passed at handoff.

## Acceptance reconciliation

- Existing tags, instructor, free-preview cue, and positive duration displayed conditionally: met. Duration omission was observed with current zero-duration data.
- Missing metadata degrades without fabricated claims: met by unit test and rendered duration omission.
- Price and promotion truth unchanged: met by code inspection and render observation.
- One valid course link with no nested control: met by unit test and Playwright DOM inspection.
- Responsive readability and no horizontal overflow: met at 390, 768, 1280, and 1600 px.
- Focus, hover, preview CTA, and reduced motion: met by Playwright observation.
- Focused tests, lint, build, Playwright, and diff checks: met.

## Remaining limits

- The local course videos do not currently provide a positive-duration render case. The formatter's positive-duration path is covered by the focused unit test.
- Verification covered the public guest Home with current local data, not authenticated, admin, enrollment, or payment surfaces.
- Development preload warnings remain a known observation and were not caused by this scoped change.
