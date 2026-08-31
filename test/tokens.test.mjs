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
const light = block('[data-theme="light"]');
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

test('every triplet is three 0–255 integers', () => {
  for (const obj of [dark, light]) {
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

/* ---- 4. WCAG contrast on the text hierarchy, per theme --------------------- */

for (const [name, p] of [
  ['dark', dark],
  ['light', light],
]) {
  const bg = triplet(p, '--bg-rgb');
  const card = triplet(p, '--card-rgb');
  const ink = triplet(p, '--ink-rgb');
  const brandInk = triplet(p, '--brand-ink-rgb');
  const brand = triplet(p, '--brand-rgb');

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

  // Brand-fill buttons carry white, semibold, interactive labels → governed by the
  // 3:1 UI/large-text threshold (WCAG 1.4.11 / 1.4.3-large), not AA-normal 4.5.
  // Measured white-on-#7B5CF5 ≈ 4.46:1 — documented in docs/adr/0001.
  test(`[${name}] white on brand-fill ≥ 3:1 (button labels)`, () => {
    const c = contrast([255, 255, 255], brand);
    assert.ok(c >= 3, `white/brand = ${c.toFixed(2)}`);
  });
}
