# Handoff: Packaging Contradiction Tool (R&D biodegradable packaging)

## Overview
A two-step tool for an R&D team: describe a packaging problem in free text, then
generate an investor-facing report that reformulates it as a TRIZ technical
contradiction (Strength vs. Object-generated harmful factors) and proposes a
biodegradable packaging concept ("ReGrow Pack"), with lab-target fields the team
fills in themselves.

## About the design files
The `design/` files in this bundle (`Packaging TRIZ Report.dc.html`,
`Design Tokens.dc.html`) are **design references built in HTML** — they show the
intended look, content and interaction, not production code to copy line-for-line.
The task is to **recreate this design in Angular** (a starter scaffold is included
under `angular/` — extend it, don't discard it) using Angular's standard patterns:
standalone components, signals for state, SCSS with the provided token file.

## Fidelity
**High-fidelity.** Colors, type scale, spacing, radius and shadow values below are
final — implement them exactly, not as placeholders.

## Screens / views

### 1. Problem (step 01)
- **Purpose**: user reviews/edits the assigned inventive problem statement.
- **Layout**: single column, max-width 640–680px for text measure, centered in a
  1080px main content column (48px side padding).
- **Components**:
  - Eyebrow label: JetBrains Mono, 12px, 600 weight, 0.08em tracking, uppercase, `#256330`.
  - H1 "Describe the problem": Public Sans 800, 34px, line-height 1.15.
  - Lede paragraph: 17px / 1.6, color `#4A4335`.
  - Textarea: 8 rows, white bg, 1px solid `#D8C6A8` border, 12px radius, 18px padding.
    Focus: 3px solid `#211C14` outline, 2px offset, border turns `#256330`.
  - Primary button "Reformulate as technical contradiction →" → renamed in the final
    build to **"Generate investor report →"**: `#2F7A3D` bg, white text, 10px radius,
    hover `#256330`, disabled when the textarea is empty.

### 2. Report (step 02)
- **Purpose**: shows the generated TRIZ contradiction + packaging concept + editable
  performance targets, exportable as PDF.
- **Layout**: toolbar row (title left, Back + Print buttons right) above a white
  report card (48px padding, 16px radius, `box-shadow: 0 12px 32px rgba(33,28,20,0.08)`).
- **States**:
  - Generating: ~900ms simulated delay, shows a spinner + "Generating report…", announced
    via `aria-live="polite"`.
  - Ready: full report renders (see DC file for exact copy per section — Problem,
    Technical contradiction, Proposed concept, Performance targets, Next steps).
- **Performance targets**: 3 number inputs (compost days, bio-based content %, cost
  delta %) that the user fills in; a green summary sentence (`background:#EAF3EC`,
  `color:#123419`) reflects whatever has been entered back into the report.

## Header / navigation (shared shell)
Single bar, `background:#256330` (green-700), white text, containing: brand mark
(40×40, 10px radius, `#3C8C4A` fill, "RD" monospace) + eyebrow/title on the left,
a 2-step stepper (badges "01 Problem" / "02 Report") on the right. Current step
badge: white pill with dark green text. Completed step: dark green pill with light
green text. Upcoming: transparent with a faint border. Background behind the whole
page is a photographed crumpled kraft-paper texture (`paper-texture.avif`) with a
`rgba(251,248,242,0.62)` white wash over it so body text keeps solid contrast.

## Interactions & behavior
- Problem → Report is one-way forward navigation; "← Back" returns to Problem.
- Report generation is simulated async (setTimeout ~900ms) — replace with a real
  request when there's a backend.
- "Print / Save as PDF" calls `window.print()` on the report view.
- Skip link ("Skip to main content") is visually hidden until focused.

## State management
- `step`: 1 | 2
- `problemText`: string, editable
- `targets`: `{ compostDays, bioContentPct, costDeltaPct }` (nullable numbers)
- `generating`, `reportReady`: booleans driving the async report reveal
- See `angular/src/app/services/contradiction.service.ts` for the signal-based
  implementation this maps to.

## Design tokens
Full scale (primitives → semantic) is in `design-tokens.json` (W3C Design Tokens
format — import directly with a Figma Tokens/Variables plugin) and mirrored as CSS
custom properties in `angular/styles/_tokens.scss`. Summary:
- **Color**: green ramp 50–900 (brand/recycling), paper/kraft ramp 50–900
  (biodegradable neutral), ink 900/700/500/300 (text), status warning/danger.
- **Typography**: Public Sans (UI text) + JetBrains Mono (technical labels/codes,
  used deliberately instead of icons). Scale: display 48 / h1 36 / h2 28 / h3 22 /
  body-lg 18 / body 16 / body-sm 14 / label & mono 13.
- **Spacing**: 4px base — 4/8/12/16/24/32/48/64/96.
- **Radius**: sm 6, md 10, lg 16, xl 24, full 999.
- **Shadow**: warm ink-tinted (never pure black) sm/md/lg.
- **Focus ring**: 3px solid ink-900, 2px offset, used consistently on every
  interactive element.

## Assets
- `paper-texture.avif` — photographed crumpled kraft paper, used as the full-page
  background (user-supplied; keep this exact asset, don't recreate it in CSS).
- Fonts: Google Fonts "Public Sans" (400/500/600/700/800) and "JetBrains Mono"
  (400/500/600).

## Files in this bundle
- `design/Packaging TRIZ Report.dc.html` — the interactive design reference (open
  directly in a browser).
- `design/Design Tokens.dc.html` — visual token reference/sheet.
- `design-tokens.json` — Figma-importable token definitions.
- `angular/` — Angular standalone-component scaffold implementing the same
  structure and tokens (see `angular/README.md` for wiring instructions).
