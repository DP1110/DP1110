// Updates the "Trending" table in README.md using the official GitHub Search API
// (GitHub has no trending API; "new repos with fast star growth" is the closest official signal).
import { readFile, writeFile } from 'node:fs/promises';

const TOPICS = ['ai-agents', 'llm', 'rag', 'cybersecurity']; // edit to taste
const DAYS = 14;        // look back window
const MIN_STARS = 50;   // noise filter
const LIMIT = 6;        // rows in the table
const ENGLISH_ONLY = true; // skip repos whose description is mostly non-Latin text
const README = new URL('../README.md', import.meta.url);

const since = new Date(Date.now() - DAYS * 864e5).toISOString().slice(0, 10);
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'dp1110-profile-trending/1.0',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
};

async function searchTopic(topic) {
  const q = `topic:${topic} created:>${since} stars:>=${MIN_STARS}`;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=20`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Search "${topic}" failed: ${res.status}`);
  return (await res.json()).items ?? [];
}

const esc = (s = '') => s.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const cut = (s = '', n = 90) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));

const results = [];
for (const t of TOPICS) {
  try { results.push(...(await searchTopic(t))); }
  catch (e) { console.warn(e.message); }
}

const isEnglish = (s = '') => {
  const t = s.replace(/\s/g, '');
  if (!t) return true;
  const nonAscii = [...t].filter((c) => c.charCodeAt(0) > 127 && !/\p{Emoji}/u.test(c)).length;
  return nonAscii / t.length < 0.1;
};

const unique = [...new Map(results.map((r) => [r.full_name, r])).values()]
  .filter((r) => !ENGLISH_ONLY || isEnglish(r.description))
  .sort((a, b) => b.stargazers_count - a.stargazers_count)
  .slice(0, LIMIT);

if (!unique.length) {
  console.log('No results; leaving README untouched.');
  process.exit(0);
}

const rows = unique.map((r) =>
  `| [**${r.full_name}**](${r.html_url}) | ${esc(cut(r.description ?? ''))} | ${esc(r.language ?? '—')} | ⭐ ${fmt(r.stargazers_count)} |`
);
const stamp = new Date().toISOString().slice(0, 10);
const table = [
  '| Repo | What it does | Lang | Stars |',
  '|:--|:--|:--:|--:|',
  ...rows,
  '',
  `<sub>Auto-updated ${stamp} · new repos from the last ${DAYS} days in ${TOPICS.map((t) => `\`${t}\``).join(', ')}</sub>`,
].join('\n');

const readme = await readFile(README, 'utf8');
const re = /(<!--TRENDING:START-->)[\s\S]*?(<!--TRENDING:END-->)/;
if (!re.test(readme)) throw new Error('TRENDING markers missing in README.md');
const next = readme.replace(re, `$1\n${table}\n$2`);
if (next !== readme) await writeFile(README, next);
console.log(`Updated trending table with ${unique.length} repos.`);
