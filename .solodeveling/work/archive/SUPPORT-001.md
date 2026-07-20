---
solodeveling_schema: 1
---

# SUPPORT-001 - Studio and support public journey

- Status: done
- Level: Standard
- Authority: User authorized continuing the public-journey roadmap after committing BLOG-001 on 2026-07-21.
- Goal: Make About, Contact, and FAQ feel like one trustworthy MilerDev studio/support journey while preserving truthful content, contact delivery, anti-spam behavior, and recovery states.
- Users: Prospective learners evaluating MilerDev, learners seeking answers, and visitors contacting the team.
- Recovery: Revert the three route presentations, extracted client components, scoped styles, focused tests, and this work/evidence pair. No API, provider, data, schema, or migration rollback is required.

## Direction

MilerDev Studio & Support is a calm Thai public service desk organized by editorial sequences and task rails, expressed through paper/ink/cyan geometry with teaching principles, real field imagery, FAQ categories, and contact states carrying the evidence.

- Preserve: About narrative and field images, current FAQ categories/questions/answers, Contact fields, validation limits, endpoint, JSON payload, honeypot/timestamp, loading, success, error, metadata, links, and Thai voice.
- Evolve: About and Contact from global page selectors to scoped ownership; Contact and FAQ from route-wide client components to small interactive islands; FAQ from gradients, emoji headers, rounded cards, and inline styles to a searchable-looking but honest indexed help desk without inventing search behavior.
- Grid: Quiet in narrative copy, visible for teaching sequence, contact evidence, FAQ category/index relationships, and recovery actions.

## Scope

- `/about`: preserve content, order, real showcase imagery, CTA targets, metadata, and server rendering while moving page presentation to a scoped CSS module and aligning section semantics with the established public grammar.
- `/contact`: preserve the public information, form fields/constraints, `/api/contact` request and payload, anti-spam fields, loading/error/success transitions, and metadata; keep the route server-rendered and isolate state/fetch behavior in a client form component.
- `/faq`: preserve all 13 questions and answers, category order, contact CTA, and metadata; keep the route server-rendered and isolate disclosure state in an accessible accordion client component.
- Remove only superseded About/Contact global presentation after scoped ownership is proven; add focused behavior/semantic coverage.

## Out of scope

- Contact API, rate limiting, Zod schema, email provider, production delivery, authentication, payment behavior, refund policy changes, database/schema, global tokens, Navbar/Footer, other public pages, environment files, deployment, or content claims beyond existing copy.
- Adding FAQ search, analytics, new contact channels, attachments, ticketing, or CMS behavior.

## Acceptance criteria

1. About retains its studio proposition, learning method, principles, showcase imagery/captions, CTA links, metadata, semantic heading order, and responsive narrative hierarchy.
2. Contact retains every visible field and constraint, `/api/contact` POST/JSON contract, `_honey` and `_timestamp`, loading lock, server-error message, network recovery, success confirmation, reset action, contact facts, privacy warning, and metadata.
3. FAQ retains all existing category/question/answer copy and contact target; each disclosure has explicit button semantics, `aria-expanded`, a stable controlled region, and removes closed answers from the accessibility tree.
4. All three routes use one responsive paper/ink/cyan studio/support grammar with scoped style ownership, readable measure, square task controls, visible focus, touch targets, reduced motion, forced-color resilience, and recomposition at narrow/tablet/wide widths.
5. Route-wide client boundaries are removed: About, Contact page shell, and FAQ page shell remain Server Components; only Contact form state and FAQ disclosure state are client islands with serializable props.
6. Focused component/source checks, affected lint, full Vitest, production build, UTF-8 integrity, rendered 390/768/1280/1600 observations, interaction checks, diff integrity, and worktree scope review pass.
7. No Contact API/provider, database/schema, auth, payment, environment, global token, Navbar/Footer, unrelated product, tooling, or generated artifact is included in the product change.

## Implementation plan

1. Move About presentation into `about.module.css`, preserving server markup/content and replacing only class ownership and small semantic grouping where needed; remove its superseded globals.
2. Extract `ContactForm` as the only Contact client island, keep page/layout metadata server-owned, move presentation into `contact.module.css`, preserve the exact request/payload/state machine, and make honeypot/form/status semantics explicit.
3. Keep FAQ data and page composition server-owned, extract a serializable `FAQAccordion` client island, add stable IDs/ARIA/hidden behavior, and replace all inline styling with `faq.module.css`.
4. Add behavior-oriented static/component coverage for accordion contracts and contact request/state invariants without asserting CSS/classes/layout.
5. Run focused checks after each slice, then affected browser interactions/viewports, full lint/tests/build, UTF-8 and legacy-selector scans, `git diff --check`, and scope review.

## Risks and controls

- Contact delivery regression: copy the existing fetch handler and payload unchanged into the client island; inspect the diff and cover endpoint/method/payload/constraints with focused tests.
- Anti-spam regression: retain the off-screen text field, empty initial value, load timestamp, and reset timestamp; use an inert presentation wrapper so it remains outside keyboard/accessibility navigation without changing the submitted fields.
- FAQ disclosure regression: derive stable IDs from category/item indexes, use explicit buttons and controlled `hidden` regions, and exercise open/close with a real browser.
- CSS leakage: move only page-specific About/Contact selectors to modules and scan for legacy selectors before removing them from globals.
- Dirty tooling/artifact files are unrelated: edit and later stage only enumerated SUPPORT-001 source, test, and Solodeveling files.

## Completion

- Rebuilt About, Contact, and FAQ as one scoped studio/support journey while preserving published copy, imagery, metadata, links, and contact behavior.
- Kept the route shells server-rendered and isolated browser state in `ContactForm` and `FAQAccordion` client islands.
- Preserved the Contact POST/JSON, honeypot/timestamp, validation, loading, error, success, and reset contracts; preserved all four FAQ categories and 13 answers with accessible disclosure semantics.
- Focused tests, full lint, 228-test regression suite, production build, UTF-8/legacy-selector scans, rendered interaction/overflow checks, and diff integrity passed.
- Production email delivery and assistive-technology user testing remain explicit verification gaps; no API/provider/auth/payment/data behavior changed.
