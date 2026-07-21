---
solodeveling_schema: 1
---

# ACCOUNT-001: Unified learner account workspace

- Status: done
- Level: Standard
- Direction: User-authorized completion of the learner-facing experience before Admin work.
- Goal: Make certificates, payments, profile, and settings feel like one coherent account system connected to the learner Dashboard.
- Primary user: An authenticated learner reviewing learning records or maintaining their account.

## Scope

- Add one shared light account shell and persistent navigation for Dashboard, certificates, payments, profile, and settings.
- Align all four surfaces with the learner Dashboard's editorial grid, typography, borders, spacing, and MilerDev blue orientation cues.
- Keep Payments and Certificates client-side data loading while moving route metadata and framing to Server Components.
- Make loading, error, empty, populated, share-feedback, form-success, and disabled states explicit.
- Preserve the existing profile update and password-change requests, validation, authentication, and database behavior.

## Out of scope

- API, authorization, session, payment, certificate issuance, enrollment, database schema, or migration changes.
- Admin surfaces, transactional success pages, public certificate presentation, announcements, privacy, or terms.
- Avatar upload or editable email behavior.

## Decisions

- Thesis: A learner account workbench for Thai coding learners, organized as a persistent account index plus evidence-led content rows, using the existing light Swiss Dashboard grid and MilerDev blue for orientation.
- Use flat adjacent regions and ledger rows instead of floating rounded cards.
- Keep client behavior isolated to fetch, clipboard, and form interactions; the surrounding route and metadata stay server-rendered.
- Do not add a new server auth boundary to Payments or Certificates in this visual scope; their existing authenticated APIs remain authoritative.

## Acceptance criteria

- AC1: All four routes share one account header, navigation model, current-page state, and responsive composition connected to Dashboard.
- AC2: Payments presents truthful loading, error, empty, summary, and ledger states, including the existing payment statuses and `verifying`.
- AC3: Certificates presents truthful loading, error, empty, list, public-view, and accessible clipboard-feedback states.
- AC4: Profile keeps its server auth/data boundary and existing `PUT /api/profile` behavior while presenting accessible success, error, disabled, and immutable-email states.
- AC5: Settings keeps its server auth/data boundary and existing password mutation, OAuth-only, collapsed, validation, strength, error, success, and disabled states.
- AC6: The system remains usable without horizontal overflow at mobile, tablet, and desktop widths, with visible focus and practical targets.
- AC7: Server/client boundaries remain narrow and route metadata exists for Payments and Certificates.
- AC8: Focused regressions, relevant auth tests, lint, build, diff integrity, and UTF-8 checks pass when capabilities allow.

## Risks

- Refactoring client routes can accidentally move browser-only behavior into Server Components.
- Styling password fields can obscure validation or weaken accessible names and toggle state.
- Existing local browser sessions are unauthenticated, limiting visual proof for Profile, Settings, and populated account data.
- LEARNER-001 changes are still uncommitted and must remain separable from this work.

## Plan

1. Introduce the shared account shell and style contract, then wire all four routes to it.
2. Split Payments and Certificates into server route shells plus focused client views with complete visible states.
3. Restyle Profile and Settings forms without changing their data or mutation behavior.
4. Add focused structure regressions and verify routes, relevant auth behavior, responsive rendering, lint, build, diff, and UTF-8.

## Verification mapping

| Criterion | Planned evidence |
|---|---|
| AC1, AC6, AC7 | Shared-shell render regression, source inspection, viewport screenshots, and build |
| AC2, AC3 | Client-view source/state inspection plus browser loading/error rendering |
| AC4, AC5 | Existing API auth regressions, scoped diffs, and focused form structure checks |
| AC8 | Vitest focus/relevant regressions, ESLint, build, diff check, status, and UTF-8 scan |

## Rollback

Restore the four legacy page components and form presentation, then remove the shared account components and focused tests. No data rollback is required.

## Outcome

- Certificates, payments, profile, and settings now share one responsive learner account shell and navigation system connected to Dashboard.
- Record pages expose explicit loading, error, empty, populated, status, and clipboard-feedback states; authenticated routes keep their existing server redirects and mutations.
- Route loading states were also aligned so Profile and Settings no longer flash the legacy card presentation.
- Verification and the authenticated populated-session limitation are recorded in `.solodeveling/evidence/ACCOUNT-001.md`.
