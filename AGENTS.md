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
-> `app/components/results/` render it: every face of every family (face model
in `app/lib/faces.ts`), with per-face, per-family and zip downloads
(`app/lib/font-files.ts`).

Sharp edges when touching font rendering:

- A variable font's weight is a **range** ("100 900"). That is valid in an
  `@font-face` descriptor but invalid in a CSS `font` shorthand, so passing it
  to `document.fonts.load`/`check` throws. Use a single concrete weight for
  rendering (see `renderWeight` in `app/lib/faces.ts`).
- Preloaded fonts (`<link rel=preload as=font>`) carry no weight/style/family,
  so those values are guessed from the filename and tagged `provenance:
  'preload'`. A real `@font-face` for the same URL always wins.
- Real stylesheets reuse one font URL across several `@font-face` declarations
  (a variable file declared per weight, Font Awesome's v4-compat second family,
  legacy alias names like `Inter var` next to `InterVariable` on rsms.me and
  linear.app). Never de-duplicate faces on URL alone; the rules for what merges
  vs stays separate are documented and tested in `app/lib/font-grouping.ts`.

## Design language

Both screens live in one "CRT" world: the landing hero is a photographed blue
terminal (`public/crt-hero.jpg`, overlay positioned by percentages traced from
the photo in `HeroSection.tsx`), and the scan screen is what that machine prints:
a printer casing and tractor-feed paper in the photo's sampled duotone. The
shared vocabulary is in `globals.css` under the `.crt-*` classes (engraved
letters, slot inputs, keycaps) and the `.results` block (paper, casing, keys,
print motion). Stacking gotcha
for the wordmark engraving: a `background-clip: text` fill paints in the
background layer, *underneath* negative-z pseudo-elements, which is why each
hero letter nests a `.crt-letter-fill` span for the gradient.

## Validation

`npm test` covers the family grouping rules. There is no test framework: it is a
plain `tsx` script (`scripts/test-font-grouping.ts`) that exits non-zero on
failure, following the same convention as `build:features`.

Validate with `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run build`,
plus an end-to-end scan in a browser - font extraction depends on real sites' CSS,
so reading code is not sufficient to prove a fix.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
