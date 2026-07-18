# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Add durable project-specific notes here as they are discovered through real work.

## Scan data flow

`POST /api/extract` returns `families`, one entry per typeface family, each
carrying its `variants`. It does **not** return a flat list of `@font-face`
rules: a stylesheet declares one rule per weight x style, so the raw faces are
collapsed by `app/lib/font-grouping.ts` before the response. Family matching,
variant de-duplication and representative selection all live in that one module
and are documented there; `app/types.ts` defines the shape. `app/scan/page.tsx`
-> `FontGrid` -> `FontCard` render it, previewing and downloading the family's
`representative` variant.

Sharp edges when touching font rendering:

- A variable font's weight is a **range** ("100 900"). That is valid in an
  `@font-face` descriptor but invalid in a CSS `font` shorthand, so passing it
  to `document.fonts.load`/`check` throws. Use a single concrete weight for
  rendering (see `renderableWeight` in `FontCard.tsx`).
- Preloaded fonts (`<link rel=preload as=font>`) carry no weight/style/family,
  so those values are guessed from the filename and tagged `provenance:
  'preload'`. A real `@font-face` for the same URL always wins.

## Validation

No test runner is configured. Validate with `npm run lint`, `npx tsc --noEmit`
and `npm run build`, plus an end-to-end scan in a browser - font extraction
depends on real sites' CSS, so reading code is not sufficient to prove a fix.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
