# ADR 0015: Signed-in learners see where to continue

- Status: Accepted (the owner chose design A on 2026-10-07)
- Date: 2026-10-07
- Decision owners: MilerDev product and engineering
- Scope: Home and the site navigation, for a signed-in member
- Amends: ADR 0012 and ADR 0014 for signed-in members only. A visitor's Home is unchanged.

## Context

The UX audit of 2026-10-07 found that a learner who had bought courses still saw the site as a stranger does:

- Home invited them to "ทดลองบทเรียนฟรี" and said lessons open "โดยไม่ต้องสมัคร". It had no way back to their course.
- On desktop, "การเรียนของฉัน" was only inside the avatar menu.
- On a phone, the solid red "ออกจากระบบ" button was the loudest item in the menu, though it is the least used.

## Decision

- **A continue bar above the Home hero** for a member with a course in progress. It shows:
  - the course and the lesson to pick up next, as "บทที่ N · title"
  - lessons done out of the total, and a progress bar
  - one primary action, "เรียนต่อ", or "เริ่มเรียน" when no lesson has been watched yet

  It links to the course's learning route, which opens that lesson.
- **The bar uses the dashboard's data.** `getContinueLearning` reads the dashboard store and takes the course with the most recent learning activity. It skips finished courses and courses without lessons.
- **The bar is not a Home section.** It has no `data-home-section`, so the ADR 0012 section order is unchanged.
- **Visitor prompts are hidden while the bar shows:** the "ลองเรียนก่อนซื้อได้" tag, the free-lesson button and the three buying facts. "ดูคอร์สทั้งหมด" becomes outlined, so the bar holds the only primary action.
- **A member with nothing in progress, or a failed read, gets the visitor Home.** A failed read is logged as `home.continue_learning.load_failed`.
- **Navigation:**
  - Desktop shows "การเรียนของฉัน" beside the avatar menu.
  - The mobile menu lists the member's own pages before the public ones.
  - "ออกจากระบบ" is a quiet row at the bottom. The confirmation dialog still guards it.

## Deferred

- **The continue card inside the mobile menu, shown in the design.** It needs the member's progress on every page, so a new member API would have to serve it.
- **Progress on the course page for an enrolled learner.** It extends `/api/enrollments/check`, so it goes in its own pull request.

## Consequences

- Home reads the member's session and learning data on each request. It was already rendered per request (`force-dynamic`).
- Contracts:
  - `tests/lib/learning/continue-learning.test.ts` covers which lesson and course are picked.
  - `tests/lib/home/continue-learning.test.ts` covers visitor, member and failure.
  - `tests/components/home-hero-actions.test.tsx` covers what a learner does not see.
  - `tests/components/signed-in-navigation.test.tsx` covers the desktop link, the mobile order and the quiet sign-out.
