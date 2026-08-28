# Frontend Mobile Responsiveness Audit

**Scope:** `client/src/app` (Angular 20.1.0, PrimeNG 20.0.1 + Aura theme, Angular Material 20.1.5). No Tailwind CSS is present in this project — confirmed via `package.json` (no `tailwindcss` dependency) and a repo-wide search for `sm:`/`md:`/`lg:`/`xl:` utility-class prefixes across all 65 HTML templates, which returned zero matches. All responsive behavior in this codebase is implemented through hand-written `@media` queries in per-component CSS files (64 files audited) plus PrimeNG/Angular Material's own internal breakpoint handling. This changes where the risk concentrates: instead of "inconsistent Tailwind breakpoint usage," the real risk is inconsistent hand-rolled `@media` coverage across near-duplicate components.

---

## 🚨 Critical Errors

These are confirmed bugs and layout-breaking defects — not style preferences. Each one either breaks rendering outright or guarantees horizontal scroll / clipped content on a real device viewport (320–414px).

### 1. Typo causes a 500px-tall heading on tablets [✅ RESOLVED]
`client/src/app/components/home/home.css` line 355, inside `@media (max-width: 1024px)`:
```css
.hero h1 { font-size: 500px; }
```
This is almost certainly a typo for `50px`. At `500px` the hero `<h1>` becomes larger than most tablet screens, blowing out the hero section and pushing all subsequent content far below the fold. This fires on every device ≤1024px wide — i.e. every tablet and phone.

### 2. Logo pushed off-screen on mobile navbar [✅ RESOLVED]
`client/src/app/components/navbar/navbar.css` line 607, inside `@media (max-width: 768px)`:
```css
.nav-left img { margin-left: 200px; }
```
`200px` is the sidenav width used elsewhere in the app — this looks like a copy-paste artifact. On a 320–375px viewport, a 200px left margin leaves only 120–175px for the logo, very likely clipping it off the visible screen entirely.

### 3. Admin/Super-Admin sidenavs never collapse on mobile [✅ RESOLVED]
`client/src/app/superAdmin/super-admin-nav-bar/super-admin-nav-bar.css` and `client/src/app/admin/admin-side-bar/admin-side-bar.css`, plus the underlying template usage of `<mat-sidenav mode="side" opened>` in `facultySide/sidenavbar.html` and `superAdmin/super-admin-nav-bar.html`:
- `mode="side"` is hardcoded and never switched to `"over"`.
- No `BreakpointObserver`, `(window:resize)` binding, or `.toggle()` call exists anywhere in `sidenavbar.ts`, `super-admin-nav-bar.ts`, `for-panel.ts`, or `for-fic.ts`.
- The associated CSS files (`sidenavbar.css`, `super-admin-nav-bar.css`, `admin-side-bar.css`, `for-panel.css`, `for-fic.css`) contain **zero `@media` queries**.

Result: on a 320–375px phone, a fixed `position: fixed; width: 200px` sidenav permanently occupies over half the screen on every admin, super-admin, and faculty dashboard page. This is the single most severe defect in the audit — these role-based dashboards are effectively unusable on a phone as currently built. Note that the sibling component `client/src/app/adminSide/admin-side-nav/admin-side-nav.css` (line 74) *does* correctly collapse into a full-width stacked nav at `max-width: 768px` — proving the fix pattern already exists in the codebase but was never applied to the other two near-duplicate sidenav components.

### 4. Data tables force horizontal overflow with no scroll affordance [✅ RESOLVED]
Across `admin/admin-template/admin-template.css`, `adminSide/faculties/faculties.css`, `superAdmin/faculties/faculties.css`, `facultySide/for-panel/for-panel.css`, and `superAdmin/dean-approval/dean-approval.css`:
- The `mat-table` is given a forced minimum width (e.g. `.full-width-table { width: 100%; min-width: 720px; }` in `admin-template.css`), or fixed-pixel columns (`.mat-column-status { width: 260px; }` in `for-panel.css`) combined with `table-layout: fixed`.
- The wrapping container (`.documents-table`, `.table-container`) sets `overflow: hidden` — **not** `overflow-x: auto` — so the excess width is clipped rather than scrollable.

On mobile this means table columns are silently cut off with no way to reach them, rather than a usable horizontal-scroll table. The one correct exception in the codebase is `client/src/app/admin/admin-request/admin-request.css` (`.rectangle { overflow: auto; }`, explicitly commented "horizontal scroll if needed on small screens") — this is the pattern that should be applied everywhere else.

### 5. Dead/invalid nested CSS block silently disables intended global styles [✅ RESOLVED]
`client/src/app/client/src/styles.css` lines 49–116: a `body { ... }` selector is nested *inside* an `html, body { ... }` block. This is invalid in a plain `.css` file (no preprocessor is applied to `styles.css`), so the entire nested ruleset — including global `.hero`, `.search-container`, and `.admin-page` rules — is dead code that never applies. Anyone editing these rules expecting them to take effect globally is editing code with zero runtime effect.

### 6. Fixed dialog widths overflow small viewports with no rescue [✅ RESOLVED]
Every `MatDialog.open()` call site *except* `search-result.ts` and `panelist-approval-page.ts` (line 371) passes a bare pixel `width` (e.g. `560px`, `600px`, `700px`, `720px`) with no `maxWidth` fallback and no corresponding CSS override:
- `superAdmin/faculties/faculties.ts` (lines 98, 117) and `admin/admin-faculties/admin-faculties.ts` (same pattern) — `560px`
- `admin/admin-block/admin-block.ts` (lines 265, 332) — `700px`
- `superAdmin/super-admin-nav-bar.ts`, `facultySide/sidenavbar.ts`, `admin/admin-side-bar.ts` (logout confirm dialogs) — `360px`
- `facultySide/for-fic.ts` (lines 294–297) — `720px`

None of the corresponding CSS files (`faculties.css`, `admin-block.css`, `super-admin-nav-bar.css`, `sidenavbar.css`, `admin-side-bar.css`) contain a `.cdk-overlay-pane` or `.mat-mdc-dialog-container` mobile override. These dialogs will render at 560–720px width against a 320–375px viewport, relying entirely on Angular Material CDK's unconfigured default clamping rather than a deliberate design decision. By contrast, `search-result.ts`'s dialogs are correctly rescued via an aggressive `:host ::ng-deep .cdk-overlay-pane { max-width: 280px !important; }` rule in `search-result.css` (lines ~686–738) — proving the team knows the fix, it's just not applied consistently.

---

## 🏗️ Architectural Issues

These don't necessarily break a specific page today, but they represent systemic decisions that make the app fragile and expensive to maintain responsively going forward.

### No global `box-sizing: border-box` reset
`client/src/styles.css` contains no `*, *::before, *::after { box-sizing: border-box; }` rule. Instead, `box-sizing: border-box` is applied ad hoc inside dozens of individual component CSS files. Any component's author who forgets it risks padding/border pushing an element past 100% of its container width, which is one of the most common causes of unwanted horizontal scroll on mobile. This should be a single global rule, not a per-component habit.

### `overflow-x: hidden` / `max-width: 100vw` applied reactively, not proactively
Only a handful of page components declare an overflow guard (`home.css`, `homepage.css`, `about-us.css`, and inside dialog-specific media queries in `search-result.css`), and even there it's applied twice — once at the top level and again redundantly inside a mobile `@media` block (e.g. `home.css` and `homepage.css` both do this). This pattern reads as a patch applied after horizontal-scroll bugs were discovered, rather than a rule established up front. Most other page containers (`search-page-container` at `max-width: 1400px` in `search-result.css`, `search-thesis.css`) have no overflow guard at all, relying entirely on every descendant behaving correctly.

### Conflicting/duplicate global resets in `styles.css`
Lines 49, 119, 122–123 each redeclare `html, body` height/margin and `font-family` (once as `'Inter'`, once as `Roboto, "Helvetica Neue", sans-serif`, and once via a universal `* { font-family: 'Inter' }`). The cascade outcome depends on source order and specificity rather than clear intent, and the `Roboto` declaration directly contradicts the rest of the app's stated `Inter` typography (see `.kiro/steering/tech.md`).

### Breakpoint-stacking instead of fluid sizing
Only 4 of 64 CSS files use `clamp()` (`about-us.css` extensively, `homepage.css`, `sidenavbar.css`, `admin-side-bar.css` minimally). Everywhere else — including major user flows like `thank-you.css`, `search-thesis.css`, `search-result.css`, `submission.css`, `login.css`, `signup.css`, `reset-password.css`, `forgot-password.css` — responsiveness is implemented as 3–6 stacked fixed-value `@media (max-width: ...)` blocks per property. For example, `thank-you.css` redeclares `.thank-you-title { font-size }` at six separate breakpoints (1200/992/768/576/480/360px) instead of one `clamp()` expression. This means:
- Every new breakpoint requires manually touching every property that should scale, across every file that needs it.
- Viewports that fall between two breakpoints (e.g. 769px, just above the 768px tier) get a visible jump-cut to the next tier up rather than a smooth transition.
- The same 1024/768/480px three-step pattern for `.login-card`/`.background` is independently duplicated across `login.css`, `signup.css`, `reset-password.css`, and `forgot-password.css` with no shared source of truth.

### Rigid CSS Grid column counts with no mobile fallback
Roughly 9 of 28 files using CSS Grid define fixed `grid-template-columns` (e.g. `grid-template-columns: 3fr 2fr 2fr 1fr;` in `superAdmin/documents/documents.css`, `superAdmin/request/request.css`, `superAdmin/programs/programs.css`, and a 4-column `220px 1fr 220px 1fr` layout in `admin/admin-request/admin-request.css`) with **zero `@media` queries in the entire file**. These are concentrated in exactly the admin/faculty tabular-data views that are already the highest-risk category for mobile — dense multi-column data with no stacking fallback.

### Design-system token layer is entirely unadopted
`.kiro/steering/design-system.md` documents a `--ds-*` CSS variable system meant to be the single source of truth for color/radius/shadow/spacing, with an explicit "golden rule" against hardcoding values. In practice:
- `var(--ds-` returns **zero matches** anywhere in `client/src/app`.
- `client/src/styles.css` has no `:root` block defining any of these tokens.
- The codebase contains roughly **2,174 literal hex color values** and **232 `rgba()` calls**, with `#800000` hardcoded directly and repeatedly (`navbar.css`, `search-bar.css`, `documents.css`, etc.) rather than referencing a shared variable.
- `styles.css` itself uses the exact anti-pattern the design doc warns against: `.save-btn-custom { background: #800000 !important; ...box-shadow: 0 4px 15px rgba(128,0,0,0.4) !important; }`.

This is not a mobile-specific bug, but it directly undermines mobile work: any future decision to adjust spacing/type scale for small screens (which is exactly what a token system like `--ds-fs-*`/`--ds-space-*` is for) has to be done as a 50+ file search-and-replace instead of editing shared tokens.

### No `box-sizing`, no `-webkit-tap-highlight-color`, no safe-area handling — all missing at the global layer
Three distinct "should be one line in `styles.css`, currently absent" gaps:
- No `-webkit-tap-highlight-color` reset globally — only set locally in 2 places (`navbar.css`, `search-result.css`), so every other button/link across the app shows the default grey tap flash on iOS/Android, clashing with the maroon/yellow brand.
- No `env(safe-area-inset-*)` / `viewport-fit=cover` usage anywhere in the codebase, despite fixed 80px navbars and fixed 200px sidenavs that risk overlapping the notch/home-indicator area on modern iPhones.
- No `<meta name="theme-color">`, no `apple-touch-icon`, no manifest — browser chrome won't match brand color on mobile and there's no "Add to Home Screen" support.

### Inline styles bypass the entire responsive system
About a dozen HTML files contain hardcoded inline `style="..."` attributes with fixed px values that have no `@media` equivalent and therefore render identically on a 320px phone and a desktop monitor — e.g. `panelist-approval-page.html` (fixed 48px icon), `super-admin-nav-bar.html` (entire logout dialog styled inline instead of via classes), `admin-block.html` (duplicated inline mini-component for "Selected Panelists," repeated twice in the same file). Low volume, but it's an architectural leak — CSS media queries can never reach these values no matter how the component's stylesheet evolves.

---

## 📱 Component-Level Improvements

### Navbar
`client/src/app/components/navbar/navbar.css`
- Fix the `margin-left: 200px` bug on `.nav-left img` inside the `max-width: 768px` block (see Critical Errors #2).
- `.menu-toggle` (the hamburger button, the primary mobile nav trigger) resolves to roughly 32×40px — below the 44×44px touch-target minimum.
- `.user-avatar .p-avatar` shrinks to `36×36px` in both the ≤1200px and ≤768px breakpoints — this is the sole tap target for opening the profile menu on mobile and is under the 44×44px minimum.
- The mobile login button override (`width: 80px !important; height: 36px !important;`) drops below the 44px height minimum, and below the component's own desktop 44px baseline.
- Good pattern to keep: the profile dropdown correctly uses PrimeNG `p-menu [popup]="true"` triggered by click/touchend rather than hover, so it already works correctly on touchscreens.

### Hero (Home / Homepage)
`client/src/app/components/home/home.css`, `client/src/app/components/homepage/homepage.css`
- Fix the `font-size: 500px` typo (Critical Errors #1).
- `home.css` and `homepage.css` are near-duplicate implementations with slightly diverging behavior — `home.css` hides the carousel prev/next buttons at `max-width: 767px` while `homepage.css` does not. Since PrimeNG's Carousel (v20, confirmed via package source inspection) implements no native touch/swipe gesture support, hiding the arrow buttons on `home.html` removes the only manual navigation affordance on mobile, leaving users dependent purely on the 3-second autoplay or tapping indicator dots. Either restore the buttons (matching `homepage.css`'s behavior) or add explicit swipe/drag support before hiding them.
- The redundant duplicate `overflow-x: hidden; max-width: 100vw;` declared both at the top level and again inside the mobile media query in both files should be consolidated into a single top-level rule.
- These two components should really be a single shared component — maintaining two nearly-identical 800+ line CSS files with silently diverging mobile behavior (as above) is the direct cause of that inconsistency.

### Carousels
`client/src/app/components/home/home.ts`, `client/src/app/components/homepage/homepage.ts`
- `responsiveOptions` (3 items → 2 → 1 across 1024px/768px/0px breakpoints) is a sound pattern and the carousel card itself uses relative widths (`90%`/`100%` at mobile breakpoints), so no fixed-width overflow risk was found there.
- The `[numVisible]="itemsPerPage"` binding duplicates what `responsiveOptions` already handles internally, and `itemsPerPage` initializes to `3` regardless of actual screen width — this can cause a brief flash of the wrong layout on initial paint before the resize listener runs. Recommend removing the manual `itemsPerPage`/resize-listener logic and relying solely on `responsiveOptions`.
- Carousel indicator dots are `12×12px` with no padding to enlarge the hit area — under the 44×44px touch target minimum, though low-severity since they're a secondary navigation method.

### Tables (MatTable across admin/adminSide/superAdmin/facultySide)
- Apply the `admin-request.css` pattern (`overflow: auto` on the table's wrapping container, explicitly to enable horizontal scroll) to every other `mat-table` wrapper currently using `overflow: hidden` or no overflow rule at all: `admin-template.css`, `adminSide/faculties.css`, `superAdmin/faculties.css`, `for-panel.css`, `dean-approval.css`, and by extension the other `templates.css`/`document-types.css`/`requirements.css` variants that follow the same `.documents-table` shell pattern.
- `for-panel.css`'s reference to `.full-width-table` is dead CSS — the class is applied in the HTML template but no matching rule exists in the stylesheet, so the table silently falls back to `table-layout: fixed` with fixed-pixel columns (e.g. `.mat-column-status { width: 260px }`), which is worse for mobile than the intended scroll behavior.
- None of the sampled table components offer a "responsive stacking" fallback (rows becoming cards on narrow viewports) — horizontal scroll is the only strategy in use, and it's inconsistently wired.

### Modals / Dialogs
- Standardize on the `search-result.ts`/`.css` pattern that already works: pair `width: '80vw', maxWidth: '<sensible px cap>'` in the `MatDialogConfig` (as already done correctly in `panelist-approval-page.ts` line 371) with a `panelClass`-scoped CSS rule targeting `.cdk-overlay-pane`/`.mat-mdc-dialog-container` for the mobile breakpoint, rather than a bare pixel `width`.
- Apply this fix to the currently-unprotected dialogs: `superAdmin/faculties.ts` and `admin/admin-faculties.ts` (`560px`), `admin/admin-block.ts` (`700px`), and the three logout-confirmation dialogs in `super-admin-nav-bar.ts`, `sidenavbar.ts`, `admin-side-bar.ts` (`360px` — borderline but still worth capping with `maxWidth: '90vw'` for the smallest supported 320px viewport).
- In `search-result.css`, the mobile override collapses every dialog to a single fixed `280px`, regardless of whether it was opened at 500px, 600px, or 720px. Recommend using a percentage-based `max-width` (e.g. `90vw`) instead of a hardcoded `280px` so it scales between 320px and 480px+ viewports rather than landing on one arbitrary value for all of them.

---

## 💡 Best Practices & Standardizations

Concrete rules to adopt going forward, directly addressing the patterns found above:

1. **Add a global reset block to `styles.css`.** One `:root`/`*` rule for `box-sizing: border-box`, one clean `html, body` height/margin/font-family declaration (remove the duplicate/conflicting ones at lines 49/119/122–123 and the dead nested `body{}` block at lines 49–116), and a global `-webkit-tap-highlight-color: transparent` paired with a deliberate `:focus-visible` ring. This closes three separate gaps with a single, one-time edit.

2. **Every fixed-position or fixed-width layout shell (sidenav, navbar, dialog) must ship with a mobile breakpoint in the same PR that introduces it.** The `admin-side-nav.css` sidenav and `admin-request.css` table are proof the correct pattern already exists in this codebase — the rule going forward is: no new `position: fixed` element with a hardcoded pixel width without an accompanying `@media (max-width: 768px)` override that either collapses it to `100%`/`auto`, hides it behind a toggle, or wraps it in `overflow-x: auto`.

3. **Standardize table wrappers on `overflow-x: auto`, never `overflow: hidden`.** If a `mat-table` needs a `min-width` to keep columns legible, the immediate wrapping element must always use `overflow-x: auto` (or `overflow: auto`) — never `hidden`, which silently clips instead of scrolling. Consider formalizing this into a single shared CSS class (e.g. `.table-scroll-wrapper`) used by every admin/faculty/superAdmin table page instead of six independently-styled near-duplicates.

4. **Standardize `MatDialog.open()` configs.** Every dialog config should pass `width: '<value>vw'` with a `maxWidth` pixel cap (matching the one correct existing example in `panelist-approval-page.ts`), rather than a bare pixel `width`. This removes the need for the current ad hoc `::ng-deep .cdk-overlay-pane` overrides entirely.

5. **Prefer `clamp()` over stacked `@media` breakpoints for scalar properties** (font-size, padding, gap). `about-us.css` is the working reference implementation already in this codebase — use it as the template rather than the 5–6-breakpoint pattern seen in `thank-you.css`, `search-thesis.css`, `search-result.css`, and `submission.css`. This eliminates the "jump-cut" between adjacent breakpoints and collapses several redundant rule blocks into one line.

6. **Never gate functionality behind `:hover` alone.** `search-result.css`'s citation-format dropdown and `search-thesis.css`'s sort dropdown are currently only openable via `:hover`, with no click/tap handler — meaning this functionality is effectively broken or unreliable on touchscreens. Any dropdown/menu that reveals interactive content must be toggled via a click/tap handler (a boolean flag + `.open` class, as the navbar's `p-menu` already correctly does), with `:hover` reserved for purely cosmetic feedback (color/shadow changes on already-clickable elements — which is how the rest of the app correctly uses it).

7. **Enforce a 44×44px minimum touch target on every icon-only button.** Audit surfaced multiple violations: `.menu-toggle`, mobile `.user-avatar`, mobile login button, carousel indicator dots, and — most frequently — the small icon-only action buttons in admin/faculty tables (`.delete-btn-icon`/`.delete-btn` at 36×36px in `superAdmin/programs.css`, `adminSide/programs.css`, `adminSide/faculties.css`; `mat-icon-button` shrunk via inline `transform: scale(0.8)` in `admin-block.html`). Where the visual glyph must stay small for density reasons, pad the invisible hit area to 44×44px rather than shrinking the actual button element.

8. **Adopt the design-system token layer for real, not just in documentation.** Wire the `--ds-*` variables from `.kiro/steering/design-system.md` into an actual `:root` block in `styles.css`, and require new/touched component CSS to reference `var(--ds-*)` rather than literal hex values. This is the highest-leverage single change available — it turns any future mobile-driven spacing/typography adjustment into a one-line token edit instead of a 50+ file sweep.

9. **Consolidate near-duplicate components.** `home`/`homepage` and the three sidenav variants (`super-admin-nav-bar`, `admin-side-bar`, `admin-side-nav`) are functionally the same component copy-pasted three times, each with slightly different (and in two of three cases, missing) mobile handling. Every future responsive fix has to be manually ported across all copies or it silently diverges, as already happened with the carousel-arrow-hiding rule. Prioritize de-duplication over patching each copy individually.

10. **Add safe-area and PWA-adjacent meta tags.** A one-time addition of `env(safe-area-inset-*)` padding on fixed navbars/sidenavs, plus `<meta name="theme-color" content="#800000">` and an `apple-touch-icon`, closes the remaining "missing best practice" gaps at negligible cost.

## ✅ Resolved Fixes Log
- [2026-08-29] Phase 1: Fixed home.css 500px typo, navbar.css 200px logo margin, and styles.css global reset/nesting issues.
- [2026-08-29] Phase 2: Added mobile collapse to admin sidebars, applied overflow-x: auto to all mat-table wrappers, and updated MatDialog configs to use responsive 90vw widths.
