# ADR 0016: A free handbook for developer fundamentals in the agentic-AI era

- Status: Accepted (the owner chose the scope and approved the sample chapter on 2026-10-09). Launched on 2026-10-10 with all 11 chapters of the first path published; see decision 7.
- Date: 2026-10-09
- Decision owners: MilerDev owner and engineering
- Scope: A new public section, `/handbook`, its content model and its review gate
- Relates to: ADR 0011 (AI-era direction). It adds no learner-facing AI feature and does not change Home.

## Context

The owner wants a page where people learn the fundamentals of being a developer and software engineer now that AI agents write much of the code, with the feel of MDN: a guided path, reference pages, and a glossary.

ADR 0011 rules out a learner-facing AI feature and a site-wide redesign for its 90 days, asks for an AI-era offer whose Thai demand is tested with consent-free signals, and makes Search Console a reporting source. A free, public, static handbook fits all three: it is content, not an AI feature; it is the top of the funnel for an AI-era offer; and search traffic to it is what Search Console reports.

The owner reviewed a design canvas with the handbook's landing page and one finished sample chapter ("เขียนโจทย์ให้ agent") on 2026-10-09 and asked to build it.

## Decision

1. **Name and place.** The section is called "คู่มือ Dev ยุค AI" and lives at `/handbook`. Not `/learn`, which on this site reads as the paid course area.
2. **Audience.** People who have never written code. This is the owner's choice for the handbook. ADR 0011 decision 4 recommended fundamentals graduates and juniors for the first AI-era *offer*; that recommendation is unchanged and does not bind the handbook.
3. **Free and open.** Every chapter is free and needs no account. Chapters end with a quiet link to a related course; there is no paywall and no sign-up prompt inside a chapter.
4. **Structure.** A first path of 11 chapters in three parts (foundations, working with an AI agent, shipping to production), then a glossary of one term per page. Each chapter follows one template: a three-line summary, what to read first and what the reader will be able to do, the body, a "ลองสั่ง agent แบบนี้" prompt box with a matching "ตรวจผลยังไง" checklist where it fits, common mistakes, a short quiz, previous and next links, and the last-updated date. Shipping chapters use real cases from building MilerDev.
5. **Authorship and the review gate.** AI drafts every chapter. A chapter is `published` only after the owner has read and approved it; until then it is `draft` (visible on the development server only) or `planned` (listed as being written). The registry in `src/lib/handbook/chapters.ts` holds that status, and the page states that AI drafted it and who reviewed it.
6. **Content model.** Chapters are MDX files in the repository (`src/content/handbook/`), rendered by `@next/mdx` and prerendered at build time. There is no database table and no migration. Content changes go through pull requests like code, so every change is reviewed and can be reverted.
7. **Launch is its own step.** Until the owner says the handbook launches, `/handbook` is not linked from the site navigation or footer, is left out of the sitemap, and asks search engines not to index it. The launch pull request flips that, and decides the stance on training-only AI crawlers that ADR 0011 left open.

   Launch record (2026-10-10): the owner chose to launch once all 11 chapters were published. The main navigation gains "คู่มือ Dev ยุค AI" after "คอร์สทั้งหมด", the footer links it, the sitemap lists `/handbook` and every published chapter, and pages are indexable (`HANDBOOK_LAUNCHED = true`). On AI crawlers the owner kept the site-wide stance unchanged: `robots.txt` allows every crawler, and paid lessons stay behind sign-in.
8. **Freshness and sources.** Chapters on fundamentals are written to last. A chapter that depends on a specific tool says so and carries its date. No text is copied from MDN or other sources (MDN is CC-BY-SA); chapters may link to them.

## Consequences

- Shipping a chapter costs a pull request and the owner's read. The owner's review time, not engineering, sets the pace.
- The handbook can be built and reviewed on `master` and in production without being public, because launch is a separate switch.
- No new data is collected. Search Console, and later the waitlist that ADR 0011 describes, are the measures of interest.
- `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `@types/mdx` and `remark-gfm` become dependencies.
- If the handbook does not draw search traffic, it still serves current learners as free background reading, and chapters can be folded into course material.
