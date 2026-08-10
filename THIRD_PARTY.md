# Third-party material in @pareo/tokens

This package is proprietary (see [`LICENSE`](LICENSE)) and its contents were
written for Pareo. This file records what came from elsewhere.

## Dependencies

None. `theme.css` is plain CSS with no build step and no imports.

## Token vocabulary

The semantic color token names (`--color-background`, `--color-foreground`,
`--color-card`, `--color-primary`, `--color-muted`, `--color-border` and the
rest) follow the vocabulary established by
[shadcn/ui](https://github.com/shadcn-ui/ui) (MIT, Copyright (c) 2023 shadcn),
so that components written against that convention drop into a Pareo surface
without a translation layer.

What is borrowed is the naming convention, an interface rather than an
expressive work. The values behind every name are Pareo's own.

## Typography

The type tokens name **IBM Plex Sans** and **IBM Plex Mono**
([IBM/plex](https://github.com/IBM/plex), SIL Open Font License 1.1). No font
file is in this repository. Each consuming surface loads the fonts itself and
carries the OFL notice where it does, which is the only place that obligation
can be met.

## Brand color

The Pareo violet `#7B5CF5` and the palette derived from it were chosen for
Pareo. They are brand identity, not a theme, and the LICENSE reflects that.
