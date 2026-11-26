// Generates the README tables and data/site.json (what the website reads) from data/deals.json.
// Run: node scripts/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { CATEGORIES, YEAR, BLACK_FRIDAY, CYBER_MONDAY, md, status, shortDate, anchor, utm } from './lib.mjs';

const root = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const now = new Date().toISOString().slice(0, 10);

const deals = JSON.parse(read('data/deals.json'));
const shown = deals.filter((d) => status(d, now) !== 'ended');
shown.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

const when = (d) => {
  const s = status(d, now);
  // No stated end date: leave the cell empty rather than guess.
  const range = d.starts && d.ends ? `${shortDate(d.starts)} to ${shortDate(d.ends)}` : d.ends ? `Until ${shortDate(d.ends)}` : '';
  return s === 'upcoming' ? `Starts ${shortDate(d.starts)}` : range;
};
// A seller whose page breaks on extra parameters gets `"noutm": true` in deals.json.
const link = (d) => (d.noutm ? d.url : utm(d.url)).replace(/[()|\s]/g, (c) => encodeURIComponent(c));
const offer = (d) => `**${md(d.discount)}**${d.code ? ` with code \`${d.code.replace(/[^A-Za-z0-9_\-]/g, '')}\`` : ''}`;

const sections = [];
const toc = [];
for (const c of CATEGORIES) {
  const rows = shown.filter((d) => d.category === c.id);
  if (!rows.length) continue;
  toc.push(`- [${c.name}](#${anchor(c.name)}) (${rows.length}): ${c.blurb}`);
  sections.push(
    `## ${c.name}\n\n| Product | What it is | Deal | Dates | Link |\n|---|---|---|---|---|\n` +
      rows.map((d) => `| [${md(d.name)}](${link(d)}) | ${md(d.description)}${d.own ? ' _(made by the maintainer of this list)_' : ''} | ${offer(d)} | ${when(d).replace(/ /g, '&nbsp;')} | [Get&nbsp;the&nbsp;deal](${link(d)}) |`).join('\n'),
  );
}

const stats = `**${shown.length} ${shown.length === 1 ? 'deal' : 'deals'} and counting** · last updated ${shortDate(now)} ${YEAR}`;
const block = (name, body) => `<!-- ${name}:start -->\n${body}\n<!-- ${name}:end -->`;
const swap = (text, name, body) => {
  const re = new RegExp(`<!-- ${name}:start -->[\\s\\S]*?<!-- ${name}:end -->`);
  if (!re.test(text)) throw new Error(`README is missing the ${name} markers`);
  return text.replace(re, () => block(name, body));
};

let readme = read('README.md');
readme = swap(readme, 'stats', stats);
readme = swap(readme, 'toc', toc.join('\n') || '_No deals yet. Yours could be the first._');
readme = swap(readme, 'deals', sections.join('\n\n') || '_No deals yet. Yours could be the first._');
writeFileSync(new URL('README.md', root), readme);

const site = {
  year: YEAR,
  blackFriday: BLACK_FRIDAY,
  cyberMonday: CYBER_MONDAY,
  updated: now,
  categories: CATEGORIES.filter((c) => shown.some((d) => d.category === c.id)).map(({ id, name }) => ({ id, name })),
  deals: shown.map(({ id, name, url, category, discount, code, starts, ends, description, added, own, image, logo, noutm }) => ({ id, name, url, category, discount, code, starts, ends, description, added, ...(own ? { own: true } : {}), ...(image ? { image } : {}), ...(logo ? { logo } : {}), ...(noutm ? { noutm: true } : {}) })),
};
writeFileSync(new URL('data/site.json', root), JSON.stringify(site, null, 1) + '\n');
console.log(`Built README and data/site.json: ${shown.length} live or upcoming, ${deals.length - shown.length} ended.`);
