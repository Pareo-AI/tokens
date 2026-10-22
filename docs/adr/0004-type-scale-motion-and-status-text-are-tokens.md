# ADR-0004: The type scale, motion and status text are tokens, because every surface needs the same values

- **Status:** Accepted
- **Date:** 2026-10-22
- **Deciders:** Pareo engineering

## Context

A shared component package (`@pareo/ui`) is planned next to this one. Before
components can move out of the platform app, the values they use must live
here. Three sets did not:

- **Type.** The package had fonts and no sizes beyond Tailwind's own steps.
  The app filled the gaps by hand: 575 arbitrary `text-[Npx]` utilities in
  24 different sizes, half pixels included (12.5px, 13.5px, 10.5px).
- **Motion.** One ease and four durations lived in the app's `globals.css`.
  The website and desk animate too and had no shared value to read.
- **Status text.** The readable text variants of the status colours lived in
  the app layer. They were defined for dark and light only, so `pro-light`
  fell through to the dark values: green text at about 2:1 on a white canvas.

## Decision

All three move into `theme.css`.

**Type scale.** Tailwind's steps (`xs` to `4xl`) stay as they are, with their
line heights, because the website, knowledge base and desk use them. The
package adds the dense steps a data-dense UI needs between them, named by
their pixel size: `text-9`, `text-10`, `text-11`, `text-13`, `text-15`,
`text-17`, `text-22`, `text-28`. A dense step sets the size only, so it
replaces an arbitrary `text-[13px]` with no change to the line height. No dense
step may share a size with a Tailwind step, because two names for one size
with two line heights is a trap. The scale is closed: a missing size is added
here.

**Motion.** `--ease`, `--dur-fast`, `--dur-exit`, `--dur-base` and `--dur-slow`
are plain `:root` values. `@theme` makes them Tailwind's default transition, so
a bare `transition-*` takes the brand motion. Switching motion off under
`prefers-reduced-motion` is behaviour, and stays in each app.

**Status text.** `--success-text`, `--warning-text`, `--info-text` and
`--danger-text` are set per theme, all four themes, and exposed as
`--color-*-text`. Dark and light use the chart status values, pro and pro-light
the Pro mockup's. The tests assert 4.5:1 on each theme's background and card;
that test moved the mockup's pro-light warning from 36% to 34% lightness.

## Consequences

- Components can move into `@pareo/ui` without carrying app CSS with them.
- A consumer that uses `cn()` with `tailwind-merge` must register the dense
  steps as font sizes. Without that, `tailwind-merge` reads `text-13` as a
  colour and drops it next to `text-ink`.
- The platform app deletes its motion and status text blocks and checks that
  no arbitrary font size comes back.
