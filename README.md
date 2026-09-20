# @pareo/tokens

The single source of truth for the Pareo design system. One framework-agnostic
`theme.css` consumed by every Pareo surface:

- **pareo-website** (Next.js) — marketing site, `pareo.ai`
- **pareo-knowledge** (Next.js) — knowledge base, `knowledge.pareo.ai`
- **pareo-desk** (Svelte) — in-browser tools, `desk.pareo.ai`

## What's in here

- Brand color: violet **#7B5CF5** (`--brand-rgb`), readable accent **#B89CFF** dark / **#6C47B3** light.
- Full dark (default) + light palette as RGB-channel triplets that flip under `[data-theme="light"]`.
- Semantic color tokens (shadcn vocabulary: `--color-background/foreground/card/primary/muted/border/...`).
- Three-step text hierarchy: `--color-ink` / `--color-ink-soft` / `--color-ink-faint`.
- Type tokens (IBM Plex Sans / IBM Plex Mono) and radius scale (base + semantic component radii).
- Chart palette (`--chart-1` through `--chart-6`, plus status and chrome colours), as plain `:root` values so a page rendered outside the app can read them too.
- A minimal canonical `@layer base` (body, headings, `mark`, `::selection`).

## Usage

```bash
npm install github:Pareo-AI/tokens#v0.1.0   # or bun add
```

```css
/* app globals.css */
@import "tailwindcss";
@import "@pareo/tokens/theme.css";
/* app-specific animations / component classes go below */
```

Each app loads the IBM Plex font its own way and exposes the family through
`--font-ibm` (and `--font-ibm-mono`); the tokens reference those vars with a
`"IBM Plex Sans"` fallback, so they stay valid before the loader wires up.

Toggle themes by stamping `data-theme="dark|light|pro"` on `<html>` (see each app's
no-flash theme script). `:root` carries the dark palette as the no-JS fallback.
`pro` is white on black for Pareo Pro: the brand is the ink, the primary fill is white
under a black label (`--primary-fg-rgb`).

## Contributing

Change tokens here, run tests, tag a new version, then bump the `#vX.Y.Z` ref in
each consuming app. Never edit tokens in a consuming app — that reintroduces the
drift this package exists to prevent.

```bash
node --test          # contract completeness, light/dark parity, WCAG contrast
```

Design decisions live in [`docs/adr/`](./docs/adr).
