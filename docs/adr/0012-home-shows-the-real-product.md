# ADR 0012: Home shows the real product, a learning path, and verified reviews

- Status: Accepted (the owner chose design A on 2026-10-07). The hero item and the H1 typography line are superseded by ADR 0014.
- Date: 2026-10-07
- Decision owners: MilerDev product and engineering
- Scope: Public Home page only
- Supersedes: the "Implemented Home order" in ADR 0002, and the statements in ADR 0003 (Home information architecture and copy are frozen), ADR 0004 (decision 4) and ADR 0011 (decision 1) that Home stays frozen. Home is now frozen to this ADR instead.
- Keeps: ADR 0002's spacing foundation, rhythm, section admission rule and verification; ADR 0001's palette, fonts and hero copy; ADR 0011's limit on a whole-site redo (this changes Home only).

## Context

A UX audit on 2026-10-06 found Home correct but generic:

- The hero image looked like stock art, and two floating cards ("75%" progress, "next lesson") showed a product state that was not real.
- Seven sections used the same icon, title and description block, and made abstract claims ("เข้าใจเหตุผล", "สร้างด้วยตัวเอง") with no evidence.
- Home never showed the learning screen, which order to take courses in, or what learners said, although all three now exist: the learning workspace, sections and practice quizzes shipped on 2026-10-06, and verified reviews are already shown on course pages.
- Section headings alternated between 36px and 48px, Thai text was set at 11–12px in places, and the H1 broke mid-phrase on mobile.

The owner compared two designs on 2026-10-07 and chose design A ("ห้องเรียนจริง"). ADR 0002 omitted learning paths because they "had no distinct product destinations" and omitted testimonials "until attributable assets exist". Both conditions have changed: a path now links to real course pages, and verified reviews exist.

## Decision

### Home order

Each section still answers one learner question (ADR 0002's admission rule):

1. **Hero — ที่นี่ช่วยฉันไปถึงไหน?** The ADR 0001 headline and both CTAs, three true facts (free preview without an account, one payment with lifetime access, a certificate on completion), and a VS Code–style editor that types a short React program, then shows its result. The editor is decorative and hidden from assistive technology; the result's button works. With reduced motion the finished program shows at once, and nothing keeps moving after about ten seconds.
2. **How you learn — หน้าเรียนเป็นอย่างไร?** Screenshots of the real learning workspace: the lesson list and the notes and code under the video. The practice-quiz card appears only when a published course has a quiz. A certificate note closes the section.
3. **Courses — เริ่มคอร์สไหนก่อน?** The learning path in `src/lib/home/course-plan.ts` (an ordered list of course slugs), with every other published course listed as an extra. A path needs at least two published steps; otherwise Home falls back to the four latest courses, as before.
4. **Studio proof — ใครอยู่เบื้องหลัง?** The shared heading scale, and (added 2026-10-07 with the owner's approval) an instructor card: name, role as founder, and the YouTube channel's subscriber and video counts rounded down from the public channel page, with links to the channel and Facebook page.
5. **Reviews — คนที่เรียนแล้วว่าอย่างไร?** Up to three reviews rated 4 or 5 with a written comment, verified, not hidden, on a published course, and named the way the course page names them. The section is left out when there are none.
6. **FAQ** and 7. **Final CTA** are unchanged.

The confidence strip and the learning-outcomes cards are removed. Their true claims moved into the hero facts and the how-you-learn section.

### Typography

- Section headings use one scale: 28px on mobile, 36px from `sm`, and 40px from `lg`, at a line height of 1.3.
- The H1 runs from 40px to 60px at a line height of 1.22. Each phrase is an inline block, so Thai never breaks mid-phrase.
- Body copy on Home is at least 14px.

### Data

- The path is code, not admin-managed. Changing it is a one-line pull request. A missing or unpublished slug is skipped, not shown broken.
- Reviews and quiz presence come from the database on every request (Home is already dynamic). A failure there is logged and hides that evidence; it does not break Home.

## Consequences

- Home can now show proof that changes with the product, and it hides proof that does not exist yet.
- The learning path needs maintenance when courses are added, renamed or retired.
- The screenshots in `public/images/home/` were taken from the local demo catalog. They show the real interface, but not a production course. Replace them with screenshots of a production course when one has quizzes.
- `public/images/milerdev-learner-hero-v1.png` is no longer used by Home.
- `tests/design/*` and `e2e/homepage.spec.ts` now pin this ADR's order, heading scale, hero fold and editor behaviour.

## Verification

- Inspect 390px and 1440px renders of both course modes, the learning path and the latest courses.
- The hero must fit in a 1440 × 900 viewport, and both hero CTAs must be on the first 390 × 844 screen.
- Run axe on `/` (Required E2E), the Home unit and component tests, and `tests/integration/home-proof.mysql.ts` on the loopback E2E database.
