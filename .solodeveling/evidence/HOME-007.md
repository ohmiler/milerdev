---
solodeveling_schema: 1
---

# HOME-007 Evidence

## Implementation

- `src/app/layout.tsx` loads Prompt through `next/font/google` for Thai and Latin at weights 300 through 900.
- `src/app/globals.css` routes display, body, and UI typography tokens through Prompt while leaving the code-font stack unchanged.

## Checks

- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed with Next.js 16.1.4 after network access was allowed for Google Fonts. The sandboxed attempt failed only because Inter and Prompt could not be fetched.
- Browser computed style at 1440px: the homepage hero heading resolved to `Prompt, "Prompt Fallback", Inter, "Inter Fallback", sans-serif`.
- Browser computed style at 1440px: the animated editor tab panel remained on `"Fira Code", "JetBrains Mono", "Cascadia Code", monospace`.
- Browser layout check: document width equaled viewport width at 1440px and 390px; no horizontal overflow was observed.
- Browser visual inspection: production homepage render retained readable Thai wrapping and hierarchy at 1440x1000 and 390x844. The mobile layout recomposed into its existing single-column hero and retained full-width actions and contained editor content.
- Browser console during production inspection showed no reported errors.

## Limitations and observations

- Follow-up runtime diagnosis reproduced the reported unchanged font on `localhost:3000`: the HTML carried the new Prompt class while its compiled global CSS still declared `--font-body: var(--font-ibm-plex-sans-thai)`. Restarting the old server alone reproduced the stale declaration.
- The scoped repair stopped the old port-3000 process, removed only the generated `.next/dev` cache, and restarted the development server. The rebuilt CSS now declares Prompt for display, body, and UI tokens.
- Post-repair browser evidence on `localhost:3000` resolved the hero heading to `Prompt, "Prompt Fallback", Inter, "Inter Fallback", sans-serif`; the 1280px document had no horizontal overflow and the browser console reported no errors.
- Running the repository `npm start` script was not used for verification because its automatic migration step stopped on the pre-existing `course_tags` table. Verification used `next start` directly and made no database or schema changes for HOME-007.
