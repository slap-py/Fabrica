# UI handoff

Status of the UI standardization work, for continuing in the cloud. Branch: `ui-standardization`.

## Done

**Standard site header** (`src/siteChrome.ts`, `.site-header*` and `.site-nav` in `src/style.css`)
- `siteHeader(current?)` renders the Home header: brand on the left, Browser and How it works on the right.
- Used on Home, How it works, Browser, Sources & credits, and the phone-size notice.
- `navItems` in `siteChrome.ts` is the single list of nav links.
- The viewer keeps its own topbar and does not use the site header.

**Buttons and type**
- `.button`, `.button.primary` and `.button.lg` replace the old `.intro-button*` classes.
- Type scale tokens on `:root` in `style.css`: `--fs-xs` 12, `--fs-sm` 13, `--fs-base` 14, `--fs-md` 16, `--fs-lg` 20, `--fs-xl` 24, `--fs-2xl` 32.
- Radius tokens: `--radius` (8px) and `--radius-sm` (4px).
- `--on-brand` for text on brand-colored buttons.
- Hero, display and brand-wordmark sizes are not on the scale and were left alone.

**Sources and credits** (`src/sources.ts`)
- Single source for the source list, license links and attribution text.
- The Sources & credits page, the site footer and the attribution line all read from it.
- Region adaptation notes still live in each `src/regions/*/credits.ts`.

**Home body-region preview** (`src/bodyMap.ts`, `renderRegionsPreview`)
- Back is labelled "Back" in the left column.
- The unbuilt left arm keeps its hatched shape but has no label or leader in the preview.
- The hub's body map is unchanged.

**Scrolling pages** (`src/style.css`, `src/introduction.css`, `src/phoneScreen.css`)
- The root element always shows a scrollbar track on Home, Browser, How it works and the phone notice, so the centred header sits at the same x on every page.
- Body overflow is `visible` on those pages so only the root scrolls.

## Decisions to revisit
- Home now shows the site nav (Browser, How it works). Before, it had none. Remove it from `siteHeader` on Home if that's not wanted.
- The site header background is now transparent. The old Browser header had a surface fill.
- Windows users now see a scrollbar track on the Browser page even when nothing scrolls.

## Not done yet
- **Dark-mode selectors.** Dark mode is set up in three places: `style.css` (a media query and a `data-theme` block) and `introduction.css` (image swaps for the Home stills). They should be merged.
- **Hard-coded colors.** About 116 hex literals in `style.css` and some in JS (tissue colors). The tissue colors are data and may stay.
- **Home type sizes.** `introduction.css` still has many one-off sizes in its phone and 1179px overrides. Mapping them to the scale would change the tuned layout.
- **`hub-*` class names.** The Browser and Credits pages still use the `hub-*` prefix.
- **Credits copies.** `credits.md`, `public/introduction/CREDITS.md`, `public/models/CREDITS.md` and the viewer About dialog are still separate and must be synced by hand.
- **Page titles.** Already consistent, nothing to do.

## Known stale checks
- `scripts/hub-browser-check.mjs` (around line 155) expects a site nav inside the viewer. The viewer never had one, so this check was already failing before this work.
- `scripts/introduction-browser-check.mjs` and `scripts/hub-browser-check.mjs` use Playwright against a running dev server. They were updated for the new class names (`.site-header-inner`, `.site-brand`) but have not been run.

## Verifying
- `npx tsc --noEmit -p .` passes.
- Dev server: `npx vite --host 0.0.0.0 --port 5175` (or whatever port is free).
- Pages to check: `#/` (Home), `#/how-it-works`, `#/browser`, `#/credits`, `#/left-upper-leg` (viewer). Check at 1440 wide and at 390 wide (phone notice on Browser and viewer routes).
- Checked by eye and with DOM measurements: header logo x-position matches on Home, Browser and How it works at 1425px client width; the How it works step icon is in the right column; the body-region preview has no label overlap.
- Dark mode has not been checked since these changes.
