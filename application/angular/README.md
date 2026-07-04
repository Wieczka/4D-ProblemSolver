# Angular scaffold — Packaging Contradiction Tool

Standalone-component Angular 17+ scaffold that mirrors `Packaging TRIZ Report.dc.html`.
This is a **starting structure**, not a finished app — wire it into your existing
Angular workspace (or `ng new` a fresh one) rather than running it as-is.

## Structure

```
angular/
├─ styles/
│  ├─ _tokens.scss      — design tokens as CSS custom properties (source of truth)
│  └─ _ui.scss          — shared mixins (buttons, cards, fields, type) built on tokens
└─ src/
   ├─ main.ts           — bootstraps the standalone root component
   ├─ assets/paper-texture.avif
   └─ app/
      ├─ models/report.model.ts
      ├─ services/contradiction.service.ts   — wizard state + report content (signals)
      └─ components/
         ├─ packaging-triz-tool/   — shell: merged green header + 2-step stepper
         ├─ problem-step/          — step 1: free-text problem input
         └─ report-step/           — step 2: generated investor report + editable targets

```

## Wiring into a real workspace

1. `ng new packaging-triz-tool --standalone --style=scss` (or drop into an existing app).
2. Copy `src/app/**` and `src/assets/paper-texture.avif` into the new project's `src/`.
3. Copy `styles/_tokens.scss` and `styles/_ui.scss` into `src/styles/` and `@use` them
   from component styles as shown (`@use '../../../styles/tokens' as *;`).
4. Add the Google Fonts (`Public Sans`, `JetBrains Mono`) links to `index.html`'s `<head>`,
   or self-host them — see `design-tokens.json` → `typography.fontFamily`.
5. `ContradictionService.buildContradiction()` hard-codes the TRIZ-14 vs TRIZ-31
   contradiction for this case study. To generalize to arbitrary problems, replace it
   with a real classification step (rules engine or LLM call) that maps free text to
   a pair of the 39 TRIZ parameters.
6. `generateReport()` simulates a 900ms generation delay — swap for a real API call
   when the report is generated server-side.

## Accessibility notes carried over from the design

- Header stepper buttons use `aria-current="step"` on the active step.
- A visually-hidden `role="status" aria-live="polite"` region announces
  "Generating investor report…" / "Report ready." for screen-reader users.
- All interactive elements get a visible `:focus-visible` outline (`--focus-ring`
  token) — never rely on the browser default alone.
- Form fields have explicit `<label for>` associations.

## Design tokens

`../design-tokens.json` at the project root is the same scale in W3C Design Tokens
format, for Figma import. Keep `_tokens.scss` and `design-tokens.json` in sync by hand
(or wire a build step / Style Dictionary if this grows).
