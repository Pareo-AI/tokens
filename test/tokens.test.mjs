import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../theme.css', import.meta.url)), 'utf8');

/* ---- tiny CSS helpers ------------------------------------------------------ */

// Parse `--name: value;` declarations inside the {...} that follows `selector`.
function block(selector) {
  const start = css.indexOf(selector);
  assert.ok(start !== -1, `selector not found: ${selector}`);
  const open = css.indexOf('{', start);
  // walk to the matching close brace (handles nested-free @theme/:root blocks)
  let depth = 0,
    i = open;
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const body = css.slice(open + 1, i);
  const out = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const dark = block(':root[data-theme="dark"]');
const light = block(':root[data-theme="light"]');
const pro = block(':root[data-theme="pro"]');
const theme = block('@theme');

/* ---- color math (sRGB → relative luminance → WCAG contrast) ---------------- */

const triplet = (obj, name) => obj[name].split(/\s+/).map(Number); // "10 10 18" -> [10,10,18]

function lin(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// composite an alpha foreground over an opaque background
const over = (fg, bg, a) => fg.map((c, i) => Math.round(a * c + (1 - a) * bg[i]));

/* ---- 1. contract completeness ---------------------------------------------- */

test('all required semantic tokens are defined in @theme', () => {
  const required = [
    '--color-background',
    '--color-foreground',
    '--color-card',
    '--color-popover',
    '--color-primary',
    '--color-primary-foreground',
    '--color-primary-light',
    '--color-primary-on-tint',
    '--color-primary-hover',
    '--color-secondary',
    '--color-muted',
    '--color-muted-foreground',
    '--color-accent',
    '--color-destructive',
    '--color-border',
    '--color-input',
    '--color-ring',
    '--color-ink',
    '--color-ink-soft',
    '--color-ink-faint',
    '--color-success',
    '--color-warning',
    '--color-info',
    '--color-purple',
    '--color-purple-dim',
    '--color-navy',
    '--color-surface',
    '--font-sans',
    '--font-display',
    '--font-mono',
    '--radius-sm',
    '--radius-md',
    '--radius-lg',
    '--radius-field',
    '--radius-button',
    '--radius-card',
    '--radius-panel',
    '--radius-pill',
  ];
  for (const key of required) assert.ok(key in theme, `missing @theme token: ${key}`);
});

/* ---- 2. light/dark parity — both themes define the same triplet set -------- */

test('light and dark define an identical set of palette triplets', () => {
  const dk = Object.keys(dark)
    .filter(k => k.endsWith('-rgb'))
    .sort();
  const lt = Object.keys(light)
    .filter(k => k.endsWith('-rgb'))
    .sort();
  assert.deepEqual(lt, dk, 'light theme is missing/adding triplets vs dark');
});

test('pro defines the same palette triplets as dark', () => {
  const dk = Object.keys(dark)
    .filter(k => k.endsWith('-rgb'))
    .sort();
  const pr = Object.keys(pro)
    .filter(k => k.endsWith('-rgb'))
    .sort();
  assert.deepEqual(pr, dk, 'pro theme is missing/adding triplets vs dark');
});

test('every triplet is three 0–255 integers', () => {
  for (const obj of [dark, light, pro]) {
    for (const [k, v] of Object.entries(obj)) {
      if (!k.endsWith('-rgb')) continue;
      const ch = v.split(/\s+/).map(Number);
      assert.equal(ch.length, 3, `${k} is not 3 channels: "${v}"`);
      for (const c of ch)
        assert.ok(Number.isInteger(c) && c >= 0 && c <= 255, `${k} bad channel ${c}`);
    }
  }
});

/* ---- 3. brand is the canonical purple in both themes ----------------------- */

test('brand stays #7B5CF5 (123 92 245) in both themes', () => {
  assert.deepEqual(triplet(dark, '--brand-rgb'), [123, 92, 245]);
  assert.deepEqual(triplet(light, '--brand-rgb'), [123, 92, 245]);
});

// Pro is monochrome on purpose: the brand is the ink. A colour that crept in here
// would be a second brand.
test('pro brand is white and its ground is black', () => {
  assert.deepEqual(triplet(pro, '--brand-rgb'), [255, 255, 255]);
  assert.deepEqual(triplet(pro, '--bg-rgb'), [0, 0, 0]);
  assert.deepEqual(triplet(pro, '--primary-fg-rgb'), [0, 0, 0]);
});

/* ---- 4. WCAG contrast on the text hierarchy, per theme --------------------- */

for (const [name, p] of [
  ['dark', dark],
  ['light', light],
  ['pro', pro],
]) {
  const bg = triplet(p, '--bg-rgb');
  const card = triplet(p, '--card-rgb');
  const ink = triplet(p, '--ink-rgb');
  const brandInk = triplet(p, '--brand-ink-rgb');
  const brand = triplet(p, '--brand-rgb');
  const brandSolid = triplet(p, '--brand-solid-rgb');
  const brandTintInk = triplet(p, '--brand-tint-ink-rgb');
  const primaryFg = triplet(p, '--primary-fg-rgb');

  test(`[${name}] foreground ink on background ≥ 7:1`, () => {
    assert.ok(contrast(ink, bg) >= 7, `ink/bg = ${contrast(ink, bg).toFixed(2)}`);
  });

  test(`[${name}] ink-soft (0.65) on background ≥ 4.5:1 (AA normal)`, () => {
    const c = contrast(over(ink, bg, 0.65), bg);
    assert.ok(c >= 4.5, `ink-soft/bg = ${c.toFixed(2)}`);
  });

  test(`[${name}] ink-faint (0.5) on background ≥ 3:1 (AA large / UI)`, () => {
    const c = contrast(over(ink, bg, 0.5), bg);
    assert.ok(c >= 3, `ink-faint/bg = ${c.toFixed(2)}`);
  });

  test(`[${name}] brand-ink on card ≥ 4.5:1 (links, inline code)`, () => {
    const c = contrast(brandInk, card);
    assert.ok(c >= 4.5, `brand-ink/card = ${c.toFixed(2)}`);
  });

  // --brand-rgb as a swatch, border or icon colour, and behind large display text
  // only: as a UI surface it has to clear 3:1 (WCAG 1.4.11).
  test(`[${name}] brand-fill against the canvas >= 3:1 (component boundary)`, () => {
    const c = contrast(brand, bg);
    assert.ok(c >= 3, `brand/bg = ${c.toFixed(2)}`);
  });

  // The fill that actually carries white button labels. Those labels ship at
  // 12-16px semibold, which is not WCAG "large text" (24px, or 18.66px bold), so
  // 1.4.3 asks for 4.5:1 and the 1.4.11 3:1 threshold does not apply to them.
  // --brand-rgb measures 4.47:1 and cannot pass; --brand-solid-rgb is the fill.
  test(`[${name}] primary label on brand-solid >= 4.5:1 (AA normal, button labels)`, () => {
    const c = contrast(primaryFg, brandSolid);
    assert.ok(c >= 4.5, `primary-fg/brand-solid = ${c.toFixed(2)}`);
  });

  // The two must stay the same violet to the eye; a big drift means someone
  // repainted the brand through the back door.
  test(`[${name}] brand-solid stays within a hair of brand`, () => {
    const drift = Math.max(...brand.map((c, i) => Math.abs(c - brandSolid[i])));
    assert.ok(drift <= 16, `brand-solid drifted ${drift}/255 from brand`);
  });

  // The console rail is not a card: it is a translucent navy over a canvas that
  // carries brand-tinted "atmosphere" gradients, so a brand tint sitting inside
  // it composites over a darker, already-brand-tinted surface. Measuring
  // brand-tint-ink against a plain card passes and hides the real failure.
  const gridAlpha = name === 'light' ? 0.05 : 0.045;
  const bloom = 0.16; // brightest atmosphere ellipse alpha, worst case
  const rail = over(
    triplet(p, '--navy-rgb'),
    over(brand, over(brand, triplet(p, '--bg-rgb'), gridAlpha), bloom),
    0.72
  );

  test(`[${name}] brand-tint-ink on the 0.18 avatar tint over the rail >= 4.5:1`, () => {
    const bg = over(brand, over(ink, rail, 0.04), 0.18);
    const c = contrast(brandTintInk, bg);
    assert.ok(c >= 4.5, `brand-tint-ink/avatar-tint = ${c.toFixed(2)}`);
  });

  test(`[${name}] brand-tint-ink on the stacked 0.20/0.14 nav pill tint over the rail >= 4.5:1`, () => {
    const bg = over(brand, over(brand, rail, 0.14), 0.2);
    const c = contrast(brandTintInk, bg);
    assert.ok(c >= 4.5, `brand-tint-ink/nav-pill-tint = ${c.toFixed(2)}`);
  });

  test(`[${name}] brand-tint-ink stays in the brand violet family`, () => {
    // 40, not a round large number: the real drift is 29/255 (light) and 0 (dark), and a
    // bound loose enough to admit anything would admit an off-hue colour. A magenta at
    // 90/255 drift passed the first version of this guard.
    const drift = Math.max(...brandTintInk.map((c, i) => Math.abs(c - brandInk[i])));
    assert.ok(drift <= 40, `brand-tint-ink drifted ${drift}/255 from brand-ink`);
  });
}
