# ADR-0001: A single canonical Pareo design system

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Pareo engineering (autonomous implementation, ratified via PRs)

## Context

Pareo ships three user-facing web surfaces from three separate repositories:

| Surface | Repo | Stack |
|---|---|---|
| Marketing site (`pareo.ai`) | `Pareo-AI/website` | Next.js 16 / React |
| Knowledge base (`knowledge.pareo.ai`) | `Pareo-AI/knowledge` | Next.js 16 / React |
| Desk tools (`desk.pareo.ai`) | `Pareo-AI/desk` | Svelte 5 / Vite |

An audit (see `pareo-website/docs/design-system-alignment.md`) found they had
drifted into what read as three different brands:

- **Brand color:** website/knowledge use violet `#7B5CF5`; desk used indigo `#4B54DB`.
- **Theme:** website was dark-only, knowledge dark+light, desk light-only.
- **Type:** website/knowledge use IBM Plex Sans; desk used Bricolage Grotesque + Hanken Grotesk + Geist Mono.
- **Logo, elevation, radii, container widths** all diverged.

A user crossing from the marketing site into a tool experienced a jarring brand
break. Website and knowledge only matched by copy-pasted `globals.css` — an
alignment guaranteed to rot.

## Decision

Adopt **one canonical design system**, expressed as tokens, that all three
surfaces consume from a shared source (`@pareo/tokens`, see ADR-0002).

Canonical choices:

1. **Brand = violet `#7B5CF5`.** Readable accent `#B89CFF` on dark, `#6C47B3` on
   light. Desk repaints from indigo.
2. **Dual theme, dark-default.** Every surface supports dark and light via a
   `data-theme` attribute swap over RGB-channel triplets, with a pre-paint
   no-flash script. Knowledge's implementation is the reference. Website gains a
   light theme; desk gains a dark theme.
3. **Type = IBM Plex.** IBM Plex Sans for text and headings; IBM Plex Mono for
   the technical "eyebrow"/label motif (retaining desk's mono character, but
   in-family instead of Geist Mono). Desk drops the two grotesques.
4. **Semantic vocabulary = shadcn.** `--color-background/foreground/card/primary/
   muted/border/...`, because two of three apps plus their CVA `Button` already
   speak it. Desk keeps its local vocabulary (`--color-canvas/ink/line/indigo`)
   as a thin alias layer mapped onto the canonical triplets — no mass rename of
   Svelte call sites, and every `text-indigo`/`bg-canvas` repaints to purple and
   becomes theme-aware for free. The aliases are an adapter over one source of
   truth, not a second source.
5. **Three-step text hierarchy** as tokens (`--color-ink` / `-soft` / `-faint`),
   replacing the ad-hoc inline `rgba(255,255,255,0.x)` alphas sprinkled through
   the React apps.
6. **Logo:** the flat `PareoAI_Logo_Fade.png` is the canonical header mark on all
   three. Desk's 3D animated mark is retained as an optional splash/loading
   accent, not the persistent chrome that made desk look different.
7. **Radii — refined from the alignment spec.** The spec proposed replacing the
   global `rounded-*` scale (sm/md/lg = 6/10/14). We instead keep the existing
   conservative base scale (4/6/8, already shared by website/knowledge) to avoid
   an unverifiable app-wide visual shift on the two already-aligned surfaces, and
   add **semantic component radii** (`--radius-button: 10px`, `--radius-card:
   14px`, `--radius-field: 8px`, `--radius-panel: 18px`, `--radius-pill: 999px`).
   Alignment is achieved by bringing desk's outlier component radii down
   (button 14→10, card 18→14) rather than by moving every corner in every app.

## Accessibility notes

Token contrast is enforced by the test suite (`test/tokens.test.mjs`, WCAG 2.1):

- `ink` on background ≥ 7:1; `ink-soft` ≥ 4.5:1 (AA normal) in both themes.
- `ink-faint` uses **0.5** alpha (not 0.45): at 0.45 it measured **2.97:1** over
  the light canvas — below the 3:1 UI threshold. 0.5 yields 3.42:1.
- `brand-ink` on card ≥ 4.5:1 in both themes (used for links / inline code).
- **White on brand-fill needs `--brand-solid-rgb`, not `--brand-rgb`.**
  `#7B5CF5` is the established, shipped brand color and it does not move. But
  white on it measures 4.47:1, just under AA-normal, so it cannot be the surface
  under a white label. Filled controls therefore paint with `--brand-solid-rgb`
  (`#7350EE`, 5.11:1 with white), one step deeper and the same violet to the eye;
  `--color-primary` resolves to it. `--brand-rgb` stays the swatch, border, icon
  and large-display-text color.

  *Correction, 2026-08-31.* This note previously claimed the pairing was
  compliant because brand-fill labels "fall under the 3:1 UI / large-text
  thresholds (WCAG 1.4.11 / 1.4.3-large)". That was wrong on both halves. WCAG
  large text is 24px, or 18.66px bold; every shipped brand-fill label is 12px to
  16px semibold, so none qualify and 1.4.3 asks for 4.5:1. And 1.4.11 governs a
  component's boundary against its surroundings, not the text inside it. Chrome's
  accessibility audit had been reporting the failure on every filled CTA.
- **Brand ink on a brand tint needs `--brand-tint-ink-rgb`, not `--brand-ink-rgb`.**
  `--brand-ink-rgb` is calibrated AA on the page canvas and on white cards, but
  not on a brand tint sitting over the console's translucent navy rail, where a
  brand tint and a mid-violet ink converge. Measured worst case in the light
  theme: brand ink on the stacked brand/brand nav-pill tint over the rail fell to
  3.79:1. `--brand-tint-ink-rgb` (`#5B3C96`) is one step deeper, calibrated to
  clear 4.5:1 on brand tints up to 0.32 alpha; `--color-primary-on-tint`
  resolves to it. `--color-primary-light` stays the brand text color on neutral
  surfaces. The dark value is unchanged from `--brand-ink-rgb`: dark already
  clears AA on every brand tint.

## Alternatives considered

- **Leave apps independent, align by hand.** Rejected: this is the status quo that
  produced the drift. Copy-paste alignment rots on the next edit.
- **Make desk the anchor** (indigo, grotesques, light). Rejected: the marketing
  site is the brand's front door and the knowledge base already matches it; two
  of three plus the shadcn component vocabulary point at the website's identity.
- **Mass-rename desk's token vocabulary.** Rejected as unnecessarily risky; the
  alias-adapter reaches the same single-source-of-truth outcome with a fraction
  of the diff.

## Consequences

- Desk is the largest change (repaint, dark theme, font swap, radii, logo).
- Every surface can now offer both themes.
- Future brand changes are a single edit + version bump (see ADR-0002), not a
  three-repo hunt.
