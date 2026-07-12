# Homepage Hero: Swiss Technical Studio

## Status

Proposed design for review.

## Decision

Use **Rail Split**, a restrained Swiss technical composition that keeps the existing two-column hero and code editor while changing the hierarchy, spacing, and visual language:

```text
[ concise learning message + CTA ]     [ code editor specimen ]
          5 columns                         7 columns
```

The hero should feel like a coding studio interface presented through a precise Swiss grid. The left side explains the learning outcome. The right side demonstrates the product's technical character through the existing editor. The design should be memorable through alignment and editorial restraint, not through blobs, gradients, or decorative cards.

## Product job

The first viewport must answer three questions quickly:

1. What is MilerDev?
2. What can a learner create or do after learning?
3. What should the visitor do next?

The primary next action is to start the learning path. The secondary action is to browse all courses. The editor is supporting product evidence, not a separate interactive task.

## Visual direction

### Canvas and grid

- Use the existing public light surface and semantic tokens.
- Remove hero-specific decorative blobs and background gradients.
- Keep a clean canvas with a full-width bottom rule or section rule to anchor the composition.
- Use the public container with a maximum width near the existing 1200 to 1320px range.
- On desktop, use a `5fr 7fr` split with a controlled gap. The editor receives slightly more space because it is the visual proof of the coding studio.
- Align the left edge of the kicker, headline, supporting copy, CTA, and utility line to one vertical rail.
- Use thin rules and whitespace to create rhythm. Do not add a nested card around the entire hero.

### Type hierarchy

- Keep IBM Plex Sans Thai and the existing Latin/monospace roles.
- Replace the pill-shaped promotional badge with a compact text kicker or rule-linked label.
- Use an ink-colored headline with a fluid size that remains within the design system's display ceiling and does not overflow Thai text on tablet or mobile.
- Use `text-wrap: balance` for the heading and `text-wrap: pretty` for supporting copy.
- Keep Thai body copy at generous line-height, approximately 1.7 to 1.8.
- Do not use gradient text, all-caps sentences, or repeated micro-eyebrows.

### Color and actions

- Use `#02abff` through the existing semantic primary tokens for the primary CTA, active marker, focus state, and selected code accents.
- Keep the headline, body, and rules in ink/neutral tokens with WCAG AA contrast.
- Use one solid primary CTA and one quiet secondary action. Both labels must describe the next action, such as `เริ่มตามเส้นทางการเรียน` and `ดูคอร์สทั้งหมด`.
- Replace or reduce the current inline marketing stats if they compete with the learning message. The preferred replacement is a compact utility line such as `LEARN → BUILD → SHIP`, or another truthful product signal that does not invent metrics.

## Editor specimen

Keep `HeroCodeEditor` as the right-side visual component and preserve its existing content behavior. Restyle the surrounding frame to match the Swiss technical direction:

- Use a compact rectangular frame with a small radius in the existing component vocabulary.
- Keep a clear title bar and filename/context label.
- Preserve readable line numbers, code contrast, and overflow behavior.
- Use dark code canvas against the light public hero so the editor reads as a focused tool surface.
- Keep blue/cyan/lime accents limited to syntax and meaningful state cues.
- Remove decorative treatment that makes it look like a generic floating glass card.
- Keep motion subtle and purposeful, for example code reveal or active-line emphasis. The static state must be complete before animation runs.
- Under `prefers-reduced-motion: reduce`, remove transitions and show the finished editor state immediately.

## Responsive behavior

### Desktop, 1024px and above

- Keep the two-column `5fr 7fr` split.
- Let the editor occupy the stronger visual weight without pushing the copy below the fold.
- Keep CTA and utility line aligned to the left rail.

### Tablet, 640px to 1023px

- Preserve two columns while space allows, reducing gap and type scale together.
- If the available width makes the copy or editor unreadable, switch to a stacked layout at the existing structural breakpoint rather than compressing either column.
- Ensure the headline cannot overflow its grid track or collide with the editor.

### Mobile, below 640px

- Stack the copy before the editor.
- Make the primary and secondary actions full width or equal-width controls with a minimum 44px touch target.
- Keep the editor within the viewport width, with code scrolling internally when required.
- Remove or simplify the utility line if it creates a third competing block.
- Keep the section spacing generous enough for Thai copy while avoiding an unnecessarily tall first viewport.

## Component and data boundaries

The change is presentation-focused and must not introduce new data fetching or API behavior:

- `src/app/page.tsx` owns hero structure, links, and outcome-oriented copy.
- `src/components/home/HeroCodeEditor.tsx` owns the editor specimen markup and its local visual state.
- `src/app/globals.css` owns hero layout tokens, responsive rules, typography, frame styling, and reduced-motion behavior.
- Existing `Navbar`, `HomeAnimations`, links, learning path, and downstream homepage sections remain behaviorally unchanged.
- Do not change authentication, enrollment, payment, database queries, course lookup, or bundle data in this slice.
- Reuse existing tokens and components before adding a new primitive.

## Accessibility and states

Cover the following states for hero controls and editor affordances:

- default, hover, focus-visible, and disabled/loading where applicable;
- visible focus ring that uses the existing semantic focus token;
- link labels that remain meaningful when announced out of context;
- heading hierarchy beginning with the page `h1`;
- no information communicated by color alone;
- no horizontal overflow at 390px mobile;
- static complete content when motion is disabled or unavailable.

## Out of scope

- Redesigning the navbar, learning path, course cards, footer, or other homepage sections.
- Changing course, bundle, or trust data sources.
- Adding new dependencies or a new icon library.
- Introducing a global dark mode for the public homepage.
- Rewriting the entire homepage copy. Copy changes are limited to clarity and hierarchy within the hero.

## Acceptance criteria

### Visual

- Hero remains a two-column composition on desktop with the editor on the right.
- The result reads as Swiss technical studio design through alignment, rules, typography, and restrained accent color.
- Decorative blobs, gradient text, pill-style hero badge, and generic floating-card treatment are removed from the hero.
- The editor is the strongest visual object after the headline and remains readable.
- The first viewport has one clear primary next action.

### Responsive and accessibility

- Desktop, tablet, and 390px mobile layouts have no overflow or clipped controls.
- Thai heading and body copy remain readable with the project's line-height rules.
- Contrast and focus states meet the project's WCAG AA baseline.
- Reduced motion presents a complete static hero.

### Engineering

- Existing homepage data behavior and downstream sections are unchanged.
- Targeted homepage tests pass, followed by lint and build when practical.
- Manual visual QA covers desktop and mobile, including a narrow viewport and reduced-motion preference.

## Verification plan

1. Run the relevant homepage test file, including any updated selector or layout assertions.
2. Run `npm run lint`.
3. Run `npm run build` when the local environment supports the existing build requirements.
4. Inspect the homepage at desktop, tablet, and 390px mobile widths.
5. Check keyboard focus, reduced motion, and editor overflow manually.

## Follow-up documentation

After implementation, fold any stable hero rules into `DESIGN.md` under the Homepage surface pattern. Keep the product strategy in `PRODUCT.md` unchanged unless implementation reveals a new product job or CTA decision.
