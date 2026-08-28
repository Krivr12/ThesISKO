# ThesISKO Design System

Single source of truth for component styling across the app. ThesISKO uses a **dual-library UI setup**:

- **PrimeNG (Aura theme)** for public/student-facing components (Login, Home, Profile, Carousel, Buttons, Inputs, Modals, Toasts).
- **Angular Material** for admin/faculty-facing components (Data Tables, Sidenav, MatDialog, MatSelect, MatPaginator).

The goal of this document is to unify the visual identity across both libraries so the experience feels seamless. Values below are derived from the existing brand styles (maroon `#800000`, yellow `#ffd966`, Inter typeface).

> **Golden rule:** Both libraries must resolve to the **same design tokens**. Never hardcode a color, radius, or shadow in a component; always reference a variable defined in section 1.

---

## 1. Global Design Tokens (Variables)

Define these once on `:root` in `styles.css`. Every component (PrimeNG or Material) should consume these, never raw hex values.

```css
:root {
  /* ---- Brand Palette ---- */
  --ds-maroon: #800000;          /* Primary brand */
  --ds-maroon-hover: #a00000;    /* Primary hover / active */
  --ds-maroon-dark: #660000;     /* Pressed / deep accents */
  --ds-yellow: #ffd966;          /* Secondary / accent (CTAs, highlights) */
  --ds-yellow-hover: #ffcc33;    /* Accent hover */

  /* ---- Neutrals (text, borders, surfaces) ---- */
  --ds-text: #1f2937;            /* Primary text */
  --ds-text-muted: #6b7280;      /* Secondary text / placeholders */
  --ds-text-inverse: #ffffff;    /* Text on maroon/dark surfaces */
  --ds-border: #e5e7eb;          /* Default border / divider */
  --ds-border-strong: #d1d5db;   /* Inputs, hovered borders */
  --ds-surface: #ffffff;         /* Cards, dialogs, tables */
  --ds-surface-alt: #f9fafb;     /* Hover rows, subtle fills */
  --ds-backdrop: rgba(17, 24, 39, 0.45); /* Overlay scrim */

  /* ---- Status ---- */
  --ds-success: #16a34a;
  --ds-warning: #d97706;
  --ds-danger: #dc2626;
  --ds-info: #2563eb;

  /* ---- Typography ---- */
  --ds-font-family: 'Inter', 'Roboto', 'Helvetica Neue', sans-serif;
  --ds-fs-xs: 0.75rem;    /* 12px */
  --ds-fs-sm: 0.875rem;   /* 14px - table cells, helper text */
  --ds-fs-base: 1rem;     /* 16px - body, inputs, buttons */
  --ds-fs-lg: 1.125rem;   /* 18px - dialog titles */
  --ds-fs-xl: 1.5rem;     /* 24px - section headings */
  --ds-fw-regular: 400;
  --ds-fw-medium: 500;
  --ds-fw-semibold: 600;
  --ds-fw-bold: 700;
  --ds-line-height: 1.5;

  /* ---- Radius ---- */
  --ds-radius-sm: 6px;    /* Inputs, chips */
  --ds-radius-md: 8px;    /* Buttons, cards (modern standard) */
  --ds-radius-lg: 12px;   /* Dialogs, modals, large panels */
  --ds-radius-pill: 999px;

  /* ---- Spacing (4px scale) ---- */
  --ds-space-1: 0.25rem;
  --ds-space-2: 0.5rem;
  --ds-space-3: 0.75rem;
  --ds-space-4: 1rem;
  --ds-space-5: 1.5rem;
  --ds-space-6: 2rem;

  /* ---- Elevation / Shadows ---- */
  --ds-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --ds-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.10);
  --ds-shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.16);
  --ds-shadow-brand: 0 4px 15px rgba(128, 0, 0, 0.35); /* Maroon glow for primary CTAs */

  /* ---- Motion ---- */
  --ds-transition: all 0.2s ease;

  /* ---- Focus ring (accessibility) ---- */
  --ds-focus-ring: 0 0 0 3px rgba(128, 0, 0, 0.25);
}
```

### Bridging tokens into each library
Map the shared tokens onto each library's native variables so both render identically without per-component overrides.

```css
:root {
  /* PrimeNG Aura -> DS tokens */
  --p-primary-color: var(--ds-maroon);
  --p-primary-hover-color: var(--ds-maroon-hover);
  --p-content-border-radius: var(--ds-radius-md);
  --p-focus-ring-shadow: var(--ds-focus-ring);

  /* Angular Material (M3 sys vars) -> DS tokens */
  --mat-sys-primary: var(--ds-maroon);
  --mat-sys-on-primary: var(--ds-text-inverse);
  --mat-sys-surface: var(--ds-surface);
  --mat-sys-on-surface: var(--ds-text);
  --mat-sys-outline-variant: var(--ds-border);
  --mat-sys-corner-medium: var(--ds-radius-md);
  --mat-sys-corner-large: var(--ds-radius-lg);
}
```

---

## 2. Component Foundational Styles (The "Base" Look)

### 2.1 Buttons

Target both `.p-button` (PrimeNG) and `.mat-mdc-button` / `.mat-mdc-raised-button` (Material) with one set of rules so they are visually indistinguishable.

| Property | Value |
|---|---|
| Height | 40px (min) |
| Padding | `var(--ds-space-3) var(--ds-space-5)` (0.75rem 1.5rem) |
| Radius | `var(--ds-radius-md)` |
| Font | `var(--ds-fs-base)` / `var(--ds-fw-semibold)` |
| Transition | `var(--ds-transition)` |

```css
/* Primary (filled maroon) - both libraries */
.p-button,
.mat-mdc-raised-button.ds-primary {
  background: var(--ds-maroon);
  color: var(--ds-text-inverse);
  border: 1px solid var(--ds-maroon);
  border-radius: var(--ds-radius-md);
  padding: var(--ds-space-3) var(--ds-space-5);
  font-weight: var(--ds-fw-semibold);
  box-shadow: var(--ds-shadow-brand);
  transition: var(--ds-transition);
}

.p-button:hover,
.mat-mdc-raised-button.ds-primary:hover {
  background: var(--ds-maroon-hover);
  border-color: var(--ds-maroon-hover);
  transform: translateY(-1px);
}

.p-button:disabled,
.mat-mdc-raised-button.ds-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Secondary / accent (yellow) */
.p-button-secondary,
.ds-accent {
  background: var(--ds-yellow);
  color: var(--ds-text);
  border-color: var(--ds-yellow);
  box-shadow: none;
}
.p-button-secondary:hover,
.ds-accent:hover { background: var(--ds-yellow-hover); }

/* Text / outlined button */
.p-button-text,
.mat-mdc-button {
  background: transparent;
  color: var(--ds-maroon);
  box-shadow: none;
}
```

### 2.2 Inputs & Dropdowns

Unify `p-inputText`, `p-dropdown`/`p-select`, `mat-form-field`, and `mat-select`. Consistent height, border, and focus ring are the priority.

| Property | Value |
|---|---|
| Height | 42px |
| Padding | `var(--ds-space-2) var(--ds-space-3)` |
| Border | `1px solid var(--ds-border-strong)` |
| Radius | `var(--ds-radius-sm)` |
| Font | `var(--ds-fs-base)`, `var(--ds-text)` |
| Placeholder | `var(--ds-text-muted)` |
| Focus | border `var(--ds-maroon)` + `box-shadow: var(--ds-focus-ring)` |

```css
/* PrimeNG inputs & dropdowns */
.p-inputtext,
.p-select,
.p-dropdown {
  height: 42px;
  border: 1px solid var(--ds-border-strong);
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-fs-base);
  color: var(--ds-text);
  transition: var(--ds-transition);
}
.p-inputtext:focus,
.p-select.p-focus,
.p-dropdown.p-focus {
  border-color: var(--ds-maroon);
  box-shadow: var(--ds-focus-ring);
  outline: none;
}

/* Material form fields & selects — use outline appearance for parity */
.mat-mdc-form-field { font-size: var(--ds-fs-base); }
.mat-mdc-text-field-wrapper { border-radius: var(--ds-radius-sm); }
.mat-mdc-form-field-focus-overlay { background: transparent; }
.mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
.mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
.mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
  border-color: var(--ds-maroon);
  border-width: 1px;
}
```

> **Consistency rule:** Always use Material's **`appearance="outline"`** on `mat-form-field` so it matches PrimeNG's bordered inputs. Do not mix `fill` and `outline` in the same view.

---

## 3. Overlays & Popups (Dialogs, Modals, Toasts)

One structural language for all overlays regardless of library: rounded `lg` corners, blurred backdrop, generous header padding, and actions right-aligned in the footer.

| Region | Rule |
|---|---|
| Radius | `var(--ds-radius-lg)` (12px) |
| Backdrop | `var(--ds-backdrop)` + `backdrop-filter: blur(3px)` |
| Elevation | `var(--ds-shadow-lg)` |
| Header padding | `var(--ds-space-5)` with `var(--ds-fs-lg)` / `var(--ds-fw-semibold)` title |
| Body padding | `var(--ds-space-5)` |
| Footer | actions right-aligned, `var(--ds-space-3)` gap, primary button last |
| Max width | 520px for confirmations, 720px for content dialogs |

```css
/* Shared surface for PrimeNG Dialog/ConfirmDialog + Material Dialog */
.p-dialog,
.p-confirm-dialog,
.mat-mdc-dialog-container .mdc-dialog__surface {
  border-radius: var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-lg);
  background: var(--ds-surface);
  overflow: hidden;
}

/* Blurred scrim */
.p-dialog-mask,
.p-component-overlay,
.cdk-overlay-backdrop {
  background: var(--ds-backdrop);
  backdrop-filter: blur(3px);
}

/* Header */
.p-dialog-header,
.mat-mdc-dialog-title {
  padding: var(--ds-space-5);
  font-size: var(--ds-fs-lg);
  font-weight: var(--ds-fw-semibold);
  color: var(--ds-text);
  border-bottom: 1px solid var(--ds-border);
  margin: 0;
}

/* Body */
.p-dialog-content,
.mat-mdc-dialog-content { padding: var(--ds-space-5); color: var(--ds-text); }

/* Footer / actions — right aligned, primary last */
.p-dialog-footer,
.mat-mdc-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--ds-space-3);
  padding: var(--ds-space-4) var(--ds-space-5);
  border-top: 1px solid var(--ds-border);
}
```

### Toasts / Messages
PrimeNG `ToastModule` (via `MessageService`) is the standard for transient notifications app-wide, including admin views, to avoid two competing notification styles.

```css
.p-toast .p-toast-message {
  border-radius: var(--ds-radius-md);
  box-shadow: var(--ds-shadow-md);
  border-left: 4px solid var(--ds-maroon); /* recolor per severity via .p-toast-message-success etc. */
}
```
- Severity colors map to `--ds-success | --ds-warning | --ds-danger | --ds-info`.
- Position: top-right. Duration: 4000ms default.

---

## 4. Data Display (Tables & Lists)

`MatTable` powers the admin/faculty areas. Style it flat and lightweight so it matches the airy feel of the public PrimeNG pages — no heavy grid lines, subtle row separators only.

| Property | Value |
|---|---|
| Header bg | `var(--ds-surface-alt)` |
| Header text | `var(--ds-fs-sm)`, `var(--ds-fw-semibold)`, `var(--ds-text-muted)`, uppercase optional |
| Cell font | `var(--ds-fs-sm)`, `var(--ds-text)` |
| Row height | 52px |
| Row divider | `1px solid var(--ds-border)` (bottom only) |
| Row hover | `var(--ds-surface-alt)` |
| Outer border | none — rely on card container + `var(--ds-shadow-sm)` |

```css
.mat-mdc-table {
  background: var(--ds-surface);
  border-radius: var(--ds-radius-md);
  box-shadow: var(--ds-shadow-sm);
  overflow: hidden;
}
.mat-mdc-header-row {
  background: var(--ds-surface-alt);
  min-height: 48px;
}
.mat-mdc-header-cell {
  font-size: var(--ds-fs-sm);
  font-weight: var(--ds-fw-semibold);
  color: var(--ds-text-muted);
  border-bottom: 1px solid var(--ds-border);
}
.mat-mdc-row { min-height: 52px; transition: var(--ds-transition); }
.mat-mdc-row:hover { background: var(--ds-surface-alt); }
.mat-mdc-cell {
  font-size: var(--ds-fs-sm);
  color: var(--ds-text);
  border-bottom: 1px solid var(--ds-border);
}

/* Paginator parity */
.mat-mdc-paginator {
  background: transparent;
  color: var(--ds-text-muted);
  font-size: var(--ds-fs-sm);
}
```

For **PrimeNG lists/tables** on public pages (`p-table`, `p-dataview`), apply the same header fill, `--ds-fs-sm` cells, and bottom-only dividers so both libraries read as one system.

---

## 5. Implementation Rules

### 5.1 When to use `styles.css` (global)
Put in `styles.css` only:
- The `:root` token block (section 1) and library token bridges.
- Foundational base styles that must apply to **every** instance of a component (buttons, inputs, dialogs, tables above).
- Third-party overlay styling (`.cdk-overlay-*`, `.p-dialog-mask`), because overlays render **outside** component view boundaries and cannot be reached by scoped component CSS.

Do **not** put layout, one-off spacing, or page-specific rules here.

### 5.2 When to use CSS variables
- **Always** reference tokens (`var(--ds-*)`) for color, radius, shadow, spacing, and typography. Never hardcode hex, px radii, or shadow values in a component file.
- To theme a single component differently, **override the token locally** on the host rather than rewriting properties:
  ```css
  :host { --ds-maroon: #5c0000; } /* localized brand variant, still token-driven */
  ```
- Changing a brand value should require editing **one line** in `:root`, not a search-and-replace across files.

### 5.3 How to use `::ng-deep` safely
`::ng-deep` is required to pierce into PrimeNG/Material's internal DOM, but unscoped it leaks globally. Follow these rules:

- **Always anchor `::ng-deep` to `:host`** so the override stays inside the component:
  ```css
  /* GOOD — scoped to this component only */
  :host ::ng-deep .p-dialog-header { padding: var(--ds-space-6); }

  /* BAD — leaks to every dialog in the app */
  ::ng-deep .p-dialog-header { padding: var(--ds-space-6); }
  ```
- For overlays that escape the host (MatDialog, PrimeNG modals, toasts), pass a **custom panel class** and target that instead of using global `::ng-deep`:
  ```ts
  this.dialog.open(Cmp, { panelClass: 'ds-dialog' });
  // p-dialog: styleClass="ds-dialog"
  ```
  ```css
  /* placed in styles.css since the overlay is global, but namespaced by class */
  .ds-dialog .p-dialog-header { /* ... */ }
  ```
- **Avoid `!important`.** It signals the token/base layer is being fought. Prefer raising specificity with `:host` or a namespaced class. (Legacy `!important` overrides in `styles.css` should be migrated to token-driven base styles over time.)
- Never use bare element selectors inside `::ng-deep` (e.g. `::ng-deep div`) — always target a library class.

### 5.4 Do / Don't summary

| Do | Don't |
|---|---|
| Define all values as `:root` tokens | Hardcode `#800000`, `12px`, shadows in components |
| Use `appearance="outline"` for all `mat-form-field` | Mix `fill` and `outline` appearances |
| Scope `::ng-deep` with `:host` | Use global unscoped `::ng-deep` |
| Use `panelClass`/`styleClass` for overlays | Chase overlay DOM with global element selectors |
| Standardize toasts on PrimeNG `MessageService` | Introduce a second notification style for admin |
| Raise specificity to win | Reach for `!important` |
