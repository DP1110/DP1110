#!/usr/bin/env node
/**
 * Builds animated profile cards in the cyan palette -> assets/generated/*.svg
 *   node scripts/build-stats.mjs          live data (needs GITHUB_TOKEN)
 *   node scripts/build-stats.mjs --seed   offline sample data (for design checks)
 * No dependencies. Runs daily in .github/workflows/profile-assets.yml
 */
import { writeFile, mkdir } from 'node:fs/promises';

const USER = process.env.GH_USER || 'DP1110';
const SEED = process.argv.includes('--seed');
const OUT = new URL('../assets/src/generated/', import.meta.url);

// ---- edit your showcase here ------------------------------------------------
const PROJECTS = [
  { repo: 'A.E.T.H.E.R',          accent: '#00D9FF', tags: ['C++', 'Embedded', 'Protocol Routing'],
    blurb: 'Autonomous Embedded Translation & Host Environment Router.', lang: 'C++' },
  { repo: 'naive-rag-playground', accent: '#0099FF', tags: ['FastAPI', 'FAISS', 'BGE Embeddings'],
    blurb: 'Interactive RAG sandbox with FastAPI, FAISS and a glassmorphic UI.', lang: 'JavaScript' },
  { repo: 'Offline-LLM-Bridge',   accent: '#7C5CFF', tags: ['ESP8266', 'Ollama', 'Edge AI'],
    blurb: 'Private AI chat over an ESP8266 WiFi bridge to a local Ollama LLM.', lang: 'C++' },
  { repo: 'api-gateway-portfolio', accent: '#00F5A0', tags: ['Python', 'Microservices', 'Cloud Native'],
    blurb: 'Scalable API gateway architecture across microservices.', lang: 'Python' },
];

// ---- palette (your colour system) -------------------------------------------
const C = { card: '#0A1014', panel: '#11191F', border: '#202B33', steel: '#33414B', mute: '#61717C',
  label: '#9AA7AF', text: '#E8F1F5', white: '#FFFFFF', cyan: '#00D9FF', blue: '#0099FF', violet: '#7C5CFF',
  purple: '#A855F7', magenta: '#FF3CAC', green: '#00F5A0', laser: '#3DEBFF', amber: '#FFB020' };
const CYCLE = [C.cyan, C.blue, C.violet, C.magenta, C.green, C.cyan].join(';');
const LANG_COLORS = [C.cyan, C.blue, C.violet, C.purple, C.magenta, C.green, C.amber];
const SANS = `font-family="'Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif"`;
const MONO = `font-family="'JetBrains Mono','Fira Code',Consolas,'Courier New',monospace"`;

// ---- helpers -----------------------------------------------------------------
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (n) => (n >= 1000 ? (n / 1000).toFixed(2).replace(/\.?0+$/, '') + 'k' : String(n));
const ago = (iso) => {
  if (!iso) return '';
  const d = Math.max(0, (Date.now() - new Date(iso)) / 864e5);
  if (d < 1) return 'today';
  if (d < 30) return `${Math.floor(d)}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};
const joined = (iso) => {
  const y = (Date.now() - new Date(iso)) / (365.25 * 864e5);
  return y < 1 ? `${Math.max(1, Math.round(y * 12))} months ago` : `${Math.round(y)} year${Math.round(y) > 1 ? 's' : ''} ago`;
};
const wrap = (text, max, lines = 3) => {
  const out = []; let cur = '';
  for (const w of text.split(/\s+/)) {
    if ((cur + ' ' + w).trim().length > max) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) out.push(cur);
  if (out.length > lines) { out.length = lines; out[lines - 1] = out[lines - 1].replace(/\s*\S*$/, '') + '…'; }
  return out;
};
const cyc = (attr = 'stroke', dur = 14, begin = 0) =>
  `<animate attributeName="${attr}" values="${CYCLE}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>`;

// Entrance animation that is visible even without SMIL (base state = visible).
function reveal(inner, delay = 0, dy = 10) {
  const total = (delay + 0.7).toFixed(2), k = (delay / (delay + 0.7)).toFixed(3);
  return `<g><animate attributeName="opacity" values="0;0;1" keyTimes="0;${k};1" dur="${total}s" fill="freeze"/>` +
    `<animateTransform attributeName="transform" type="translate" values="0 ${dy};0 ${dy};0 0" keyTimes="0;${k};1" dur="${total}s" fill="freeze"/>${inner}</g>`;
}
function grow(attr, to, delay = 0, dur = 1) {
  const total = delay + dur, k = (delay / total).toFixed(3);
  return `<animate attributeName="${attr}" values="0;0;${to}" keyTimes="0;${k};1" dur="${total.toFixed(2)}s" fill="freeze"/>`;
}

const ICONS = {
  star: '<path d="M8 1.6l2 4.2 4.6.6-3.4 3.2.9 4.6L8 11.8 3.9 14.2l.9-4.6L1.4 6.4 6 5.8z"/>',
  commit: '<circle cx="8" cy="8" r="3"/><path d="M1 8h4M11 8h4"/>',
  pr: '<circle cx="4" cy="3.5" r="1.8"/><circle cx="4" cy="12.5" r="1.8"/><circle cx="12" cy="12.5" r="1.8"/><path d="M4 5.3v5.4M12 10.7V6.8a2 2 0 0 0-2-2H8.5"/>',
  issue: '<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="1" fill="currentColor"/>',
  repo: '<path d="M3 2h10v12H5a2 2 0 0 1-2-2z"/><path d="M3 12a2 2 0 0 1 2-2h8"/>',
  people: '<circle cx="8" cy="5.5" r="2.5"/><path d="M3 14c.5-3 2.5-4.5 5-4.5s4.5 1.5 5 4.5"/>',
  clock: '<circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/>',
  pulse: '<path d="M1 8h3l2-5 3 10 2-5h4"/>',
  fork: '<circle cx="4" cy="3.5" r="1.7"/><circle cx="12" cy="3.5" r="1.7"/><circle cx="8" cy="12.5" r="1.7"/><path d="M4 5.2v1.3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5.2M8 8.5v2.3"/>',
};
const icon = (name, x, y, delay = 0, size = 16) =>
  `<g transform="translate(${x},${y}) scale(${size / 16})"><g fill="none" stroke="${C.cyan}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" color="${C.cyan}">${cyc('stroke', 14, delay)}${ICONS[name]}</g></g>`;

function frame(w, h, label, body, extraDefs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0A1014"/><stop offset="1" stop-color="#11191F"/></linearGradient>
    <linearGradient id="flow" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${w}" y2="0" spreadMethod="reflect">
      <stop offset="0" stop-color="${C.cyan}"/><stop offset="0.5" stop-color="${C.blue}"/><stop offset="1" stop-color="${C.violet}"/>
      <animateTransform attributeName="gradientTransform" type="translate" values="${-w} 0;${w} 0;${-w} 0" dur="10s" repeatCount="indefinite"/>
    </linearGradient>
    <filter id="blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
    ${extraDefs}
  </defs>
  <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="16" fill="url(#bg)" stroke="${C.border}"/>
  <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="16" fill="none" stroke="url(#flow)" stroke-width="1.5" opacity="0.85"/>
${body}
</svg>
`;
}

function smooth(pts, top, base) {
  const cl = (y) => Math.min(base, Math.max(top, y));
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, cl(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, cl(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

// ---- data ---------------------------------------------------------------------
function seedData() {
  const weeks = [], start = Date.now() - 52 * 7 * 864e5;
  const raw = Array.from({ length: 53 }, (_, i) => Math.exp(-((i - 43) ** 2) / (2 * 4.2 ** 2)) + (i > 34 ? 0.02 : 0));
  const k = 1670 / raw.reduce((a, b) => a + b, 0);
  raw.forEach((v, i) => weeks.push({ date: new Date(start + i * 7 * 864e5).toISOString(), count: Math.round(v * k) }));
  return {
    name: 'DP1110', createdAt: new Date(Date.now() - 400 * 864e5).toISOString(), followers: 2,
    publicRepos: 20, stars: 29, commits: 1500, prs: 15, issues: 1, contributedTo: 23,
    totalContributions: 1670, weeks,
    langs: [['Python', 6200], ['JavaScript', 900], ['Jupyter Notebook', 500], ['Kotlin', 300], ['C++', 200], ['HTML', 100]],
    projects: PROJECTS.map(() => ({})),
  };
}

async function gql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'dp1110-profile-cards' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error('GraphQL failed: ' + JSON.stringify(json.errors || json).slice(0, 400));
  return json.data;
}

async function liveData() {
  const projQ = PROJECTS.map((p, i) =>
    `p${i}: repository(owner:"${USER}", name:"${p.repo}") { description stargazerCount forkCount pushedAt primaryLanguage { name } }`).join('\n');
  const q = `query($login:String!){
    user(login:$login){
      name createdAt
      followers{totalCount}
      allRepos: repositories(privacy:PUBLIC, ownerAffiliations:OWNER){totalCount}
      repositories(privacy:PUBLIC, ownerAffiliations:OWNER, isFork:false, first:100){
        nodes{ stargazerCount languages(first:8, orderBy:{field:SIZE,direction:DESC}){ edges{ size node{ name } } } }
      }
      pullRequests{totalCount}
      issues{totalCount}
      repositoriesContributedTo(first:1, contributionTypes:[COMMIT,ISSUE,PULL_REQUEST,REPOSITORY]){totalCount}
      contributionsCollection{
        totalCommitContributions
        contributionCalendar{ totalContributions weeks{ firstDay contributionDays{ contributionCount } } }
      }
    }
    ${projQ}
  }`;
  const d = await gql(q, { login: USER });
  const u = d.user, langs = {};
  let stars = 0;
  for (const r of u.repositories.nodes) {
    stars += r.stargazerCount;
    for (const e of r.languages.edges) langs[e.node.name] = (langs[e.node.name] || 0) + e.size;
  }
  const cal = u.contributionsCollection.contributionCalendar;
  return {
    name: u.name || USER, createdAt: u.createdAt, followers: u.followers.totalCount,
    publicRepos: u.allRepos.totalCount, stars,
    commits: u.contributionsCollection.totalCommitContributions,
    prs: u.pullRequests.totalCount, issues: u.issues.totalCount,
    contributedTo: u.repositoriesContributedTo.totalCount,
    totalContributions: cal.totalContributions,
    weeks: cal.weeks.map((w) => ({ date: w.firstDay, count: w.contributionDays.reduce((a, b) => a + b.contributionCount, 0) })),
    langs: Object.entries(langs).sort((a, b) => b[1] - a[1]),
    projects: PROJECTS.map((_, i) => d[`p${i}`] || {}),
  };
}

// ---- card 1: profile + activity ----------------------------------------------------
function activityCard(D) {
  const W = 860, H = 240, cx0 = 420, cx1 = 820, top = 52, base = 190;
  const vals = D.weeks.map((w) => w.count), max = Math.max(...vals, 1);
  const raw = max / 3, mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw) || mag * 10;
  const ymax = step * 3;
  const pts = vals.map((v, i) => [cx0 + (i / (vals.length - 1)) * (cx1 - cx0), base - (v / ymax) * (base - top)]);
  const line = smooth(pts, top, base);
  const area = `${line} L${cx1},${base} L${cx0},${base} Z`;
  const ticks = [0, 1, 2, 3].map((i) => {
    const y = base - (i / 3) * (base - top);
    return `<line x1="${cx0}" x2="${cx1}" y1="${y}" y2="${y}" stroke="${C.steel}" stroke-opacity="0.35" stroke-dasharray="3 5"/>` +
      `<text x="${cx1 + 8}" y="${y + 4}" ${SANS} font-size="10" fill="${C.mute}">${num(Math.round((i / 3) * ymax))}</text>`;
  }).join('');
  const xl = [0, 13, 26, 39, 52].map((i) => {
    const w = D.weeks[Math.min(i, D.weeks.length - 1)];
    const x = cx0 + (Math.min(i, vals.length - 1) / (vals.length - 1)) * (cx1 - cx0);
    return `<text x="${x}" y="${base + 18}" text-anchor="middle" ${SANS} font-size="10" fill="${C.mute}">${new Date(w.date).toLocaleString('en', { month: 'short', year: '2-digit' })}</text>`;
  }).join('');
  const rows = [
    ['pulse', `${num(D.totalContributions)} contributions in the last year`],
    ['repo', `${D.publicRepos} public repositories`],
    ['people', `${D.followers} follower${D.followers === 1 ? '' : 's'}`],
    ['clock', `Joined GitHub ${joined(D.createdAt)}`],
  ].map(([ic, t], i) => reveal(icon(ic, 34, 92 + i * 30, i) +
    `<text x="62" y="${104 + i * 30}" ${SANS} font-size="14" fill="${C.text}">${esc(t)}</text>`, 0.3 + i * 0.15)).join('');
  const body = `
  <circle cx="${cx1 - 40}" cy="${top}" r="90" fill="${C.cyan}" opacity="0.07" filter="url(#blur)">${cyc('fill')}</circle>
  ${reveal(`<text x="34" y="56" ${SANS} font-size="26" font-weight="700" fill="${C.white}">${esc(D.name)}</text>
  <text x="34" y="76" ${MONO} font-size="11" fill="${C.label}" letter-spacing="2">GITHUB ACTIVITY</text>`, 0.1)}
  ${rows}
  ${ticks}${xl}
  <defs><linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.cyan}" stop-opacity="0.45"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></linearGradient>
  <linearGradient id="lineG" gradientUnits="userSpaceOnUse" x1="${cx0}" y1="0" x2="${cx1}" y2="0"><stop offset="0" stop-color="${C.cyan}"/><stop offset="0.6" stop-color="${C.blue}"/><stop offset="1" stop-color="${C.violet}"/></linearGradient></defs>
  <path d="${area}" fill="url(#areaG)"><animate attributeName="opacity" values="0;0;1" keyTimes="0;0.4;1" dur="2.6s" fill="freeze"/></path>
  <path d="${line}" fill="none" stroke="url(#lineG)" stroke-width="2.5" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="0">
    <animate attributeName="stroke-dashoffset" values="1;0" dur="2.4s" fill="freeze"/></path>
  <g><circle r="9" fill="${C.cyan}" opacity="0.35" filter="url(#blur)">${cyc('fill')}<animateMotion dur="9s" begin="2.4s" repeatCount="indefinite" path="${line}"/></circle>
  <circle r="3.5" fill="${C.white}"><animateMotion dur="9s" begin="2.4s" repeatCount="indefinite" path="${line}"/></circle></g>`;
  return frame(W, H, `GitHub activity for ${D.name}: ${D.totalContributions} contributions in the last year`, body);
}

// ---- card 2: stats -------------------------------------------------------------------
function statsCard(D) {
  const W = 420, H = 270;
  const rows = [['star', 'Total Stars', D.stars], ['commit', 'Commits (1y)', D.commits], ['pr', 'Pull Requests', D.prs],
    ['issue', 'Issues', D.issues], ['repo', 'Contributed to', D.contributedTo], ['people', 'Followers', D.followers]];
  const list = rows.map(([ic, label, v], i) => reveal(
    icon(ic, 30, 66 + i * 31, i * 0.4) +
    `<text x="58" y="${79 + i * 31}" ${SANS} font-size="13.5" fill="${C.label}">${label}</text>` +
    `<text x="238" y="${79 + i * 31}" text-anchor="end" ${SANS} font-size="15" font-weight="700" fill="${C.text}">${num(v)}</text>` +
    `<line x1="30" x2="242" y1="${88 + i * 31}" y2="${88 + i * 31}" stroke="${C.steel}" stroke-opacity="0.3"/>`, 0.25 + i * 0.12)).join('');
  const cx = 336, cy = 148, r = 50;
  const body = `
  ${reveal(`<text x="30" y="40" ${SANS} font-size="20" font-weight="700" fill="${C.white}">GitHub Stats</text>`, 0.05)}
  ${list}
  <circle cx="${cx}" cy="${cy}" r="${r + 18}" fill="${C.cyan}" opacity="0.08" filter="url(#blur)">${cyc('fill')}</circle>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.steel}" stroke-opacity="0.45" stroke-width="6"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.cyan}" stroke-width="6" stroke-linecap="round" pathLength="1" stroke-dasharray="0.72 0.28" transform="rotate(-90 ${cx} ${cy})">${cyc('stroke')}
    <animate attributeName="stroke-dasharray" values="0 1;0.72 0.28" dur="1.6s" fill="freeze"/></circle>
  <circle cx="${cx}" cy="${cy}" r="${r + 11}" fill="none" stroke="${C.violet}" stroke-width="1.5" stroke-dasharray="3 9" stroke-linecap="round">
    <animateTransform attributeName="transform" type="rotate" values="0 ${cx} ${cy};360 ${cx} ${cy}" dur="16s" repeatCount="indefinite"/></circle>
  ${reveal(`<text x="${cx}" y="${cy + 6}" text-anchor="middle" ${SANS} font-size="22" font-weight="800" fill="${C.white}">${num(D.totalContributions)}</text>
  <text x="${cx}" y="${cy + 24}" text-anchor="middle" ${SANS} font-size="10" fill="${C.label}" letter-spacing="1.5">CONTRIB</text>`, 0.8, 0)}`;
  return frame(W, H, `GitHub stats: ${D.stars} stars, ${D.commits} commits, ${D.prs} pull requests`, body);
}

// ---- card 3: languages ----------------------------------------------------------------
function langCard(D) {
  const W = 420, H = 270, bx = 30, bw = 360;
  const top = D.langs.slice(0, 6), total = top.reduce((a, b) => a + b[1], 0) || 1;
  let x = bx; const segs = top.map(([n, v], i) => {
    const w = (v / total) * bw, s = `<rect x="${x.toFixed(1)}" y="62" width="${Math.max(w, 2).toFixed(1)}" height="14" fill="${LANG_COLORS[i % 7]}"/>`;
    x += w; return s;
  }).join('');
  const rows = top.map(([n, v], i) => {
    const pct = (v / total) * 100, y = 108 + i * 25, col = LANG_COLORS[i % 7];
    return reveal(`<circle cx="36" cy="${y - 4}" r="5" fill="${col}"/>
    <text x="50" y="${y}" ${SANS} font-size="13.5" fill="${C.text}">${esc(n)}</text>
    <rect x="200" y="${y - 9}" width="140" height="6" rx="3" fill="${C.steel}" fill-opacity="0.35"/>
    <rect x="200" y="${y - 9}" width="${Math.max(pct * 1.4, 3).toFixed(1)}" height="6" rx="3" fill="${col}">${grow('width', Math.max(pct * 1.4, 3).toFixed(1), 0.5 + i * 0.12, 0.9)}</rect>
    <text x="390" y="${y}" text-anchor="end" ${SANS} font-size="12.5" font-weight="600" fill="${C.label}">${pct.toFixed(1)}%</text>`, 0.3 + i * 0.1);
  }).join('');
  const body = `
  ${reveal(`<text x="30" y="40" ${SANS} font-size="20" font-weight="700" fill="${C.white}">Top Languages</text>`, 0.05)}
  <clipPath id="barclip"><rect x="${bx}" y="62" width="${bw}" height="14" rx="7"><animate attributeName="width" values="0;${bw}" dur="1.4s" fill="freeze"/></rect></clipPath>
  <rect x="${bx}" y="62" width="${bw}" height="14" rx="7" fill="${C.steel}" fill-opacity="0.3"/>
  <g clip-path="url(#barclip)">${segs}</g>
  ${rows}`;
  return frame(W, H, `Top languages: ${top.map((l) => l[0]).join(', ')}`, body);
}

// ---- project cards ------------------------------------------------------------------------
function projectCard(p, meta, idx) {
  const W = 420, H = 232, a = p.accent;
  const desc = wrap(meta.description || p.blurb, 46, 3);
  const lang = meta.primaryLanguage?.name || p.lang;
  let tx = 24;
  const chips = p.tags.map((t, i) => {
    const w = Math.round(t.length * 6.9 + 18), s = reveal(`<rect x="${tx}" y="146" width="${w}" height="22" rx="11" fill="${a}" fill-opacity="0.12" stroke="${a}" stroke-opacity="0.55"/>
      <text x="${tx + w / 2}" y="161" text-anchor="middle" ${MONO} font-size="11" fill="${a}">${esc(t)}</text>`, 0.5 + i * 0.15, 6);
    tx += w + 8; return s;
  }).join('');
  const foot = [];
  if (meta.stargazerCount != null) foot.push(`<g transform="translate(24,196)"><g fill="none" stroke="${C.amber}" stroke-width="1.4" stroke-linejoin="round">${ICONS.star}</g></g><text x="46" y="209" ${SANS} font-size="12.5" fill="${C.text}">${meta.stargazerCount}</text>`);
  if (meta.forkCount != null) foot.push(`<g transform="translate(82,196)"><g fill="none" stroke="${C.label}" stroke-width="1.4" stroke-linecap="round">${ICONS.fork}</g></g><text x="104" y="209" ${SANS} font-size="12.5" fill="${C.text}">${meta.forkCount}</text>`);
  const lx = meta.stargazerCount != null ? 140 : 24;
  foot.push(`<circle cx="${lx + 5}" cy="204" r="5" fill="${a}"/><text x="${lx + 16}" y="209" ${SANS} font-size="12.5" fill="${C.text}">${esc(lang)}</text>`);
  if (meta.pushedAt) foot.push(`<text x="${W - 24}" y="209" text-anchor="end" ${SANS} font-size="11.5" fill="${C.mute}">updated ${ago(meta.pushedAt)}</text>`);
  const body = `
  <circle cx="${W - 50}" cy="40" r="70" fill="${a}" opacity="0.10" filter="url(#blur)"><animate attributeName="opacity" values="0.06;0.16;0.06" dur="4s" begin="${idx * 0.7}s" repeatCount="indefinite"/></circle>
  <g fill="none" stroke="${a}" stroke-opacity="0.4" stroke-width="1.2">
    <path d="M${W - 110},22 H${W - 70} l12,12 h34 v14"/><path d="M${W - 90},44 H${W - 64}"/>
    <circle cx="${W - 24}" cy="48" r="2.5" fill="${a}"><animate attributeName="opacity" values="1;0.2;1" dur="2.4s" repeatCount="indefinite"/></circle>
  </g>
  <rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="14" fill="none" stroke="${a}" stroke-width="2.5" pathLength="1" stroke-dasharray="0.16 0.84" filter="url(#blur)" opacity="0.8">
    <animate attributeName="stroke-dashoffset" values="${idx % 2 ? '1;0' : '0;1'}" dur="7s" repeatCount="indefinite"/></rect>
  <rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="14" fill="none" stroke="${C.white}" stroke-width="1.2" pathLength="1" stroke-dasharray="0.05 0.95">
    <animate attributeName="stroke-dashoffset" values="${idx % 2 ? '1;0' : '0;1'}" dur="7s" repeatCount="indefinite"/></rect>
  ${reveal(`<g transform="translate(24,26)"><g fill="none" stroke="${a}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS.repo}</g></g>
  <text x="48" y="40" ${MONO} font-size="16" font-weight="700" fill="${a}">${esc(p.repo)}</text>`, 0.1)}
  <rect x="24" y="54" width="60" height="2" rx="1" fill="${a}"><animate attributeName="width" values="0;0;150;60" keyTimes="0;0.15;0.5;1" dur="3.5s" repeatCount="indefinite"/></rect>
  ${desc.map((l, i) => reveal(`<text x="24" y="${82 + i * 20}" ${SANS} font-size="13.5" fill="${C.text}">${esc(l)}</text>`, 0.25 + i * 0.12)).join('')}
  ${chips}
  <line x1="24" x2="${W - 24}" y1="182" y2="182" stroke="${C.steel}" stroke-opacity="0.4"/>
  ${reveal(foot.join(''), 0.9, 4)}`;
  return frame(W, H, `${p.repo}: ${meta.description || p.blurb}`, body);
}

// ---- main ----------------------------------------------------------------------------------------
let D;
try { D = SEED || !process.env.GITHUB_TOKEN ? seedData() : await liveData(); }
catch (e) { console.error(e.message); console.error('Tip: add a classic PAT (read:user) as repo secret PROFILE_TOKEN.'); process.exit(1); }
if (!SEED && !process.env.GITHUB_TOKEN) console.warn('No GITHUB_TOKEN: used sample data.');

await mkdir(OUT, { recursive: true });
const files = { 'activity.svg': activityCard(D), 'stats.svg': statsCard(D), 'languages.svg': langCard(D) };
PROJECTS.forEach((p, i) => { files[`project-${i + 1}.svg`] = projectCard(p, D.projects[i] || {}, i); });
for (const [name, svg] of Object.entries(files)) await writeFile(new URL(name, OUT), svg);
console.log(`Wrote ${Object.keys(files).length} cards (${SEED || !process.env.GITHUB_TOKEN ? 'sample' : 'live'} data).`);
