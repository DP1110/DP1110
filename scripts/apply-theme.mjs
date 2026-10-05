#!/usr/bin/env node
/**
 * Theme engine. Canonical (neon-cyan) sources live in assets/src/.
 * This script recolours them into assets/theme/<id>/ and regenerates README.md
 * from README.template.md, so one change flips the whole profile.
 *
 *   node scripts/apply-theme.mjs                     rebuild current theme
 *   node scripts/apply-theme.mjs --request "theme: next"   switch (next | <id> | <label>)
 *   node scripts/apply-theme.mjs --theme ultraviolet       switch directly
 *   node scripts/apply-theme.mjs --snake                   print snake colour params (for CI)
 * Writes key=value lines to $GITHUB_OUTPUT when set.
 */
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { appendFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] ?? '' : null; };
const out = (k, v) => { console.log(`${k}=${v}`); if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };

const BASE = { a1: '#00D9FF', a2: '#0099FF', a3: '#7C5CFF', a4: '#A855F7', a5: '#FF3CAC', ok: '#00F5A0', glow: '#3DEBFF', deep: '#0057B8' };
const REPO = process.env.GITHUB_REPOSITORY || 'DP1110/DP1110';
const cfg = JSON.parse(await readFile(new URL('themes.json', ROOT), 'utf8'));
const ids = Object.keys(cfg.themes);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---- colour helpers ----------------------------------------------------------------
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const hue = (h) => {
  const [r, g, b] = rgb(h).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  const k = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (k * 60 + 360) % 360;
};

function recolor(text, t, { svg }) {
  const map = Object.fromEntries(Object.keys(BASE).map((k) => [BASE[k].slice(1).toLowerCase(), t[k].slice(1).toUpperCase()]));
  const re = svg ? /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g : /(?<![0-9a-zA-Z])(#?)([0-9a-fA-F]{6})(?![0-9a-zA-Z])/g;
  return text.replace(re, (m, p1, p2) => {
    const code = (svg ? p1 : p2).toLowerCase();
    if (!(code in map)) return m;
    return svg ? '#' + map[code] : p1 + map[code];
  });
}

async function walk(dirUrl, rel = '') {
  const res = [];
  for (const e of await readdir(dirUrl, { withFileTypes: true })) {
    if (e.isDirectory()) res.push(...await walk(new URL(e.name + '/', dirUrl), rel + e.name + '/'));
    else if (e.name.endsWith('.svg')) res.push([rel + e.name, new URL(e.name, dirUrl)]);
  }
  return res;
}

// ---- pick theme ----------------------------------------------------------------------
let id = cfg.current, valid = true, switched = false;
const req = arg('--request') ?? arg('--theme');
if (req !== null) {
  const t = String(req).toLowerCase().replace(/^\s*theme\s*[:=-]?\s*/, '').trim();
  if (t === 'next' || t === 'n') id = ids[(ids.indexOf(cfg.current) + 1) % ids.length];
  else if (t === 'prev' || t === 'previous') id = ids[(ids.indexOf(cfg.current) - 1 + ids.length) % ids.length];
  else if (t === 'random') id = ids.filter((x) => x !== cfg.current)[Math.floor(Math.random() * (ids.length - 1))];
  else {
    const found = ids.find((x) => x === slug(t) || slug(cfg.themes[x].label) === slug(t));
    if (found) id = found; else valid = false;
  }
  if (valid && id !== cfg.current) { cfg.current = id; switched = true; await writeFile(new URL('themes.json', ROOT), JSON.stringify(cfg, null, 2) + '\n'); }
}
const T = cfg.themes[id];
const rotate = (((hue(T.a1) - hue(BASE.a1)) + 540) % 360) - 180;

// ---- snake params ---------------------------------------------------------------------
if (args.includes('--snake')) {
  const dark = `color_snake=${T.a1}&color_dots=#11191F,${mix('#11191F', T.a1, 0.25)},${mix('#11191F', T.a1, 0.5)},${mix('#11191F', T.a1, 0.75)},${T.a1}`;
  const light = `color_snake=${T.a2}&color_dots=#ebedf0,${mix('#ebedf0', T.a1, 0.35)},${mix('#ebedf0', T.a1, 0.65)},${T.a2},${T.deep}`;
  out('dark', dark); out('light', light); process.exit(0);
}

out('valid', String(valid));
if (!valid) { out('options', ids.join(', ')); process.exit(0); }
out('theme', id); out('label', T.label); out('switched', String(switched));

// ---- build assets/theme/<id>/ ------------------------------------------------------------
const themeRoot = new URL('assets/theme/', ROOT);
await mkdir(themeRoot, { recursive: true });
for (const e of await readdir(themeRoot, { withFileTypes: true })) if (e.isDirectory() && e.name !== id) await rm(new URL(e.name + '/', themeRoot), { recursive: true, force: true });
await rm(new URL(id + '/', themeRoot), { recursive: true, force: true });

let n = 0;
for (const [rel, url] of await walk(new URL('assets/src/', ROOT))) {
  let s = recolor(await readFile(url, 'utf8'), T, { svg: true }).replace(/__HUE__/g, rotate.toFixed(1));
  const dest = new URL(`${id}/${rel}`, themeRoot);
  await mkdir(new URL('./', dest), { recursive: true });
  await writeFile(dest, s); n++;
}

// ---- README from template (keeps the live trending table) ---------------------------------
const picker = () => {
  const link = (t) => `https://github.com/${REPO}/issues/new?title=${encodeURIComponent('theme: ' + t)}&body=${encodeURIComponent('Press "Submit new issue" to switch the profile theme. A bot applies it and closes this issue in about a minute.')}`;
  const badge = (label, color, active) =>
    `https://img.shields.io/badge/${active ? '%E2%96%B6_' : ''}${encodeURIComponent(label.toUpperCase().replace(/ /g, '_'))}-${color.slice(1)}?style=for-the-badge&labelColor=05080A&color=${color.slice(1)}`;
  const nextId = ids[(ids.indexOf(id) + 1) % ids.length];
  const items = ids.map((x) => `[![${cfg.themes[x].label}](${badge(cfg.themes[x].label, cfg.themes[x].a1, x === id)})](${link(x)})`).join('\n');
  return `<div align="center">

<a href="${link('next')}"><img src="https://img.shields.io/badge/%F0%9F%8E%A8_NEXT_THEME_%E2%96%B6-${cfg.themes[nextId].label.toUpperCase().replace(/ /g, '_')}-${T.a1.slice(1)}?style=for-the-badge&labelColor=05080A&color=${T.a1.slice(1)}" alt="Switch to the next theme" /></a>

${items}

<sub>Click a theme → press <b>Submit new issue</b> → a bot recolours the whole profile in about a minute.</sub>

</div>`;
};

let tpl = await readFile(new URL('README.template.md', ROOT), 'utf8');
tpl = recolor(tpl, T, { svg: false }).replaceAll('{{THEME}}', id).replace('{{THEME_PICKER}}', picker());
let old = ''; try { old = await readFile(new URL('README.md', ROOT), 'utf8'); } catch {}
const block = old.match(/<!--TRENDING:START-->[\s\S]*?<!--TRENDING:END-->/);
if (block) tpl = tpl.replace(/<!--TRENDING:START-->[\s\S]*?<!--TRENDING:END-->/, () => block[0]);
await writeFile(new URL('README.md', ROOT), tpl);
console.log(`Theme "${T.label}" applied: ${n} svg files, hue shift ${rotate.toFixed(1)}deg.`);
