# ADR-0003: The chart palette is a token, because a page drawn outside the app must read the same colours

- **Status:** Accepted
- **Date:** 2026-09-20
- **Deciders:** Pareo engineering (autonomous implementation, ratified via PRs)

## Context

Pareo renders report pages outside the Next app too: a box runs Python loop
renderers that draw pages with no access to `frontend/src/app/globals.css` and
no tailwind build. Each of the three loop renderers had grown its own hard
coded violet, so a chart drawn on the box and a chart drawn in the app did not
match, and a fourth renderer would have guessed a fourth colour.

The chart palette (`--chart-1` through `--chart-6`, plus status and chrome
colours) lived in the app layer of `globals.css` as plain `:root` rules. That
placement worked for the app, but it put the single colour source somewhere a
Python process cannot read: `@pareo/tokens` is the one file already built to
be parsed outside a bundler.

## Decision

Move the chart palette into `@pareo/tokens`, as plain `:root` rules next to
the palette primitives. A page built outside the app, in any language, reads
`theme.css` the same way the app does: as text, not as a tailwind build
artefact.

The app layer keeps only what stays app specific: the `--app-*-text` status
text aliases and the `@theme` wiring that exposes them as tailwind utilities.
It no longer redeclares a chart colour.

`--chart-1` stays the brand violet in every theme, including `pro`, where it
resolves to white because `--brand-rgb` is white there. The `pro` theme needs
no chart block of its own: it only overrides the palette primitives, so it
inherits the dark chart block by falling through.

## Consequences

- A chart on the box and a chart in the app share one source. A future
  renderer reads `theme.css` instead of guessing a colour.
- The chart palette is now covered by the token package's own tests
  (completeness and light/dark parity), not by an app level convention.
- The app's `docs/architecture.md` "no chart carries a hex literal" rule now
  routes through this package instead of through `globals.css`.
