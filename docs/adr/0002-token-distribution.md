# ADR-0002: Distribute design tokens as a public git-dependency

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Pareo engineering (autonomous implementation, ratified via PRs)

## Context

ADR-0001 makes tokens a single source of truth. That source must be consumed by
three **separate** repositories (`website`, `knowledge`, `desk`), each deployed
independently on Vercel. There is no monorepo and no private npm registry
configured (`.npmrc` absent in all three; no scoped-registry auth).

The distribution mechanism must:

1. Install on Vercel's build for all three projects **without** a secret we cannot
   provision or verify autonomously.
2. Work with both **npm** (website/knowledge) and **bun** (desk).
3. Be **versioned**, so a token change is an explicit, reviewable bump per app.
4. Not reintroduce drift (rules out vendored copies).

## Decision

Publish the tokens as a **dedicated public repository, `Pareo-AI/tokens`,
consumed as an npm git-dependency pinned to a tag**:

```json
"@pareo/tokens": "github:Pareo-AI/tokens#v0.1.0"
```

- The package is a single framework-agnostic `theme.css` plus its tests. No build
  step, so a git-dependency install is trivially correct.
- A **public** repo means `npm install` / `bun install` clone it over anonymous
  HTTPS on Vercel — **zero registry auth, zero deploy secret**. Design tokens are
  not secret: they ship verbatim in every visitor's CSS already.
- Pinning to a git **tag** gives semver-style control: apps upgrade deliberately
  by bumping the ref; nothing changes under them.

## Alternatives considered

- **Private `Pareo-AI/tokens` + git-dependency.** Rejected: installing a *private*
  git-dep on Vercel needs a `GITHUB_TOKEN` and URL rewriting in each project — a
  build secret we cannot provision or verify autonomously, and a new failure mode
  for every deploy. The confidentiality it buys is worthless for public CSS.
- **GitHub Packages / private npm registry.** Rejected: requires `.npmrc` auth
  tokens in each repo and a Vercel env var — same secret-provisioning wall.
- **Publish to public npm (`@pareo/tokens`).** Viable, but claims a public npm
  name and needs npm-org publish credentials; heavier and harder to reverse than
  a git tag. Can revisit if we later want registry semantics.
- **Vendored copy + CI drift-check.** Rejected: a copy in each repo kept honest by
  a sync script is exactly the "hybrid/workaround" we were asked to avoid, and
  every consumer is one skipped check away from silent drift.
- **Monorepo consolidation.** Rejected as out of scope: it would destroy three
  independent deploy pipelines and histories to solve a shared-CSS problem.

## Consequences

- A new public repo exists under the org, exposing brand tokens (already public in
  shipped CSS). It can be made private later only if we also add Vercel auth.
- Token changes follow: edit `Pareo-AI/tokens` → `node --test` → tag `vX.Y.Z` →
  bump the ref in each app's `package.json` (three small PRs). This is deliberate
  friction that keeps the three surfaces from silently diverging.
- Components are **not** shared (React vs Svelte); only tokens are. Cross-framework
  components are aligned by a shared *contract* (documented in the alignment spec),
  not shared code.
