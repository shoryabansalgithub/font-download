/**
 * Scores the legacy matcher (scripts/eval/legacy-*) against the current one
 * (app/lib/font-features.ts + font-matcher.ts) on identical queries.
 *
 *   npx tsx scripts/eval-match.ts              # held-out 'test' split + real sites
 *   npx tsx scripts/eval-match.ts --split train --no-sites   # tuning loop
 *
 * 1. Cross-weight self-retrieval: a family's bold (700, else the weight
 *    furthest from 400) is the query; each algorithm searches its own full
 *    database (regular faces) and should return that same family. Families
 *    that ship identical Latin outlines (the `sameAs` groups in
 *    font-features.json, e.g. Noto Sans / Noto Sans Thai) are one design, and
 *    returning any member of the query's group counts, for both algorithms.
 * 2. Category agreement: share of the top 5 (query design excluded) whose
 *    Google category equals the query family's. Decorative intrusion: for
 *    sans/serif/mono queries, share of that top 5 that is display/handwriting.
 * 3. Real sites: fonts pulled through the running dev server's /api/extract
 *    and /api/font, top 5 from each algorithm.
 */

import * as fs from 'fs';
import * as path from 'path';
import { decodeFont, extractShape } from '../app/lib/font-features';
import { FontMatcher, type FontDatabaseFile } from '../app/lib/font-matcher';
import * as legacy from './eval/legacy-font-features';
import { boldWeight, fetchFamilyList, fetchSubset, mapPool, splitOf, type GoogleFamily } from './google-fonts';

const args = process.argv.slice(2);
const SPLIT = args.includes('--split') ? args[args.indexOf('--split') + 1] : 'test';
const WITH_SITES = !args.includes('--no-sites');
const SERVER = 'http://localhost:3217';
const DECORATIVE = new Set(['display', 'handwriting']);
const QUOTA: Record<string, number> = { 'sans-serif': 100, serif: 80, display: 45, handwriting: 45, monospace: 20 };

const SITES: Array<{ url: string; families: RegExp[] }> = [
  { url: 'https://stripe.com', families: [/sohne/i] },
  { url: 'https://github.com', families: [/mona ?sans/i, /hubot ?sans/i] },
  { url: 'https://www.smashingmagazine.com', families: [/elena/i, /mija/i] },
  { url: 'https://www.theverge.com', families: [/polysans/i, /fkroman|fk roman/i] },
  { url: 'https://linear.app', families: [/inter/i] },
];

interface Ranked {
  family: string;
  similarity: number;
  reason?: string;
}

interface Algorithm {
  name: string;
  families: Set<string>;
  // Full ranking, best first; null when the query font cannot be measured.
  rank(buffer: ArrayBuffer): Promise<Ranked[] | null>;
}

const newDatabase = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'font-features.json'), 'utf-8'),
) as FontDatabaseFile;
const designOf = new Map(newDatabase.fonts.map(f => [f.family, f.sameAs ?? f.family]));
const design = (family: string) => designOf.get(family) ?? family;

function loadNew(): Algorithm {
  const matcher = new FontMatcher(newDatabase);
  const records = matcher.records;
  return {
    name: 'NEW',
    families: new Set(records.map(r => r.family)),
    async rank(buffer) {
      const decoded = await decodeFont(buffer);
      const shape = decoded && extractShape(decoded.font, decoded.sfnt);
      if (!shape) return null;
      return matcher.match(shape, records.length).map(m => ({ family: m.record.family, similarity: m.similarity, reason: m.reason }));
    },
  };
}

function loadOld(): Algorithm {
  const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'eval', 'legacy-font-features.json'), 'utf-8')) as legacy.FontFeatureEntry[];
  return {
    name: 'OLD',
    families: new Set(db.map(e => e.family)),
    async rank(buffer) {
      const decoded = await decodeFont(buffer);
      if (!decoded) return null;
      return legacy.findSimilar(legacy.extractFeatures(decoded.font), db, db.length).map(m => ({ family: m.family, similarity: m.similarity }));
    },
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed;
  const random = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '-');

async function selfRetrieval(algorithms: Algorithm[], families: GoogleFamily[]) {
  const eligible = families.filter(
    f => splitOf(f.family) === SPLIT && boldWeight(f) !== null && algorithms.every(a => a.families.has(f.family)),
  );
  const sample = Object.entries(QUOTA).flatMap(([category, quota]) =>
    seededShuffle(eligible.filter(f => f.category === category), 20261018).slice(0, quota),
  );
  const categoryOf = new Map(families.map(f => [f.family, f.category]));

  type Row = {
    family: string;
    category: string;
    ranks: Record<string, number>;
    agree: Record<string, number>;
    decorative: Record<string, number>;
  };
  const rows = (
    await mapPool(sample, 6, async family => {
      const weight = boldWeight(family)!;
      const buffer = await fetchSubset(family.family, weight);
      if (!buffer) return null;
      const row: Row = { family: family.family, category: family.category, ranks: {}, agree: {}, decorative: {} };
      for (const algorithm of algorithms) {
        const ranked = await algorithm.rank(new Uint8Array(buffer).buffer as ArrayBuffer);
        if (!ranked) return null;
        const target = design(family.family);
        const position = ranked.findIndex(r => design(r.family) === target);
        row.ranks[algorithm.name] = position < 0 ? Infinity : position + 1;
        const others = ranked.filter(r => design(r.family) !== target).slice(0, 5);
        row.agree[algorithm.name] = others.filter(r => categoryOf.get(r.family) === family.category).length / others.length;
        row.decorative[algorithm.name] = others.filter(r => DECORATIVE.has(categoryOf.get(r.family) ?? '')).length / others.length;
      }
      return row;
    })
  ).filter((r): r is Row => r !== null);

  const names = algorithms.map(a => a.name);
  const line = (label: string, cells: string[]) => console.log(label.padEnd(34) + cells.map(c => c.padStart(10)).join(''));
  console.log(`\n== 1+2. Cross-weight self-retrieval, '${SPLIT}' split, ${rows.length} families (bold query vs regular DB) ==`);
  line('metric', names);
  const report = (label: string, subset: Row[]) => {
    line(`${label} top-1 (n=${subset.length})`, names.map(n => pct(subset.filter(r => r.ranks[n] === 1).length, subset.length)));
    line(`${label} top-5`, names.map(n => pct(subset.filter(r => r.ranks[n] <= 5).length, subset.length)));
    line(`${label} MRR`, names.map(n => (subset.reduce((s, r) => s + (Number.isFinite(r.ranks[n]) ? 1 / r.ranks[n] : 0), 0) / subset.length).toFixed(3)));
    line(`${label} category agreement@5`, names.map(n => pct(subset.reduce((s, r) => s + r.agree[n], 0), subset.length)));
    const text = subset.filter(r => !DECORATIVE.has(r.category));
    if (text.length) line(`${label} decorative intrusion@5`, names.map(n => pct(text.reduce((s, r) => s + r.decorative[n], 0), text.length)));
  };
  report('ALL', rows);
  for (const category of Object.keys(QUOTA)) report(`  ${category}`, rows.filter(r => r.category === category));
}

async function realSites(algorithms: Algorithm[]) {
  console.log('\n== 3. Real-site fonts (representative face via /api/extract + /api/font) ==');
  for (const site of SITES) {
    let families: Array<{ family: string; representative: { url: string; referer?: string; weight: string; style: string } }>;
    try {
      const response = await fetch(`${SERVER}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: site.url }),
      });
      families = (await response.json()).families ?? [];
    } catch (error) {
      console.log(`\n${site.url}: extract failed (${error})`);
      continue;
    }
    for (const pattern of site.families) {
      const family = families.find(f => pattern.test(f.family));
      if (!family) {
        console.log(`\n${site.url} ${pattern}: not found (got ${families.map(f => f.family).join(', ')})`);
        continue;
      }
      const v = family.representative;
      const fontResponse = await fetch(`${SERVER}/api/font?url=${encodeURIComponent(v.url)}&referer=${encodeURIComponent(v.referer || '')}`);
      const buffer = await fontResponse.arrayBuffer();
      console.log(`\n${site.url} "${family.family}" ${v.weight} ${v.style}`);
      for (const algorithm of algorithms) {
        const ranked = await algorithm.rank(buffer);
        console.log(`  ${algorithm.name} shape-only: ${ranked ? ranked.slice(0, 5).map(r => `${r.family} ${r.similarity}`).join(' | ') : 'unmeasurable'}`);
      }
      const api = await fetch(`${SERVER}/api/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family: family.family, weight: v.weight, style: v.style, url: v.url, referer: v.referer || '' }),
      }).then(r => r.json());
      console.log(`  NEW /api/match (${api.method}):`);
      for (const alt of api.alternatives ?? []) console.log(`    ${String(alt.similarity ?? '-').padStart(3)}  ${alt.family.padEnd(24)} ${alt.reason}`);
    }
  }
}

async function main() {
  const families = await fetchFamilyList();
  const algorithms = [loadOld(), loadNew()];
  await selfRetrieval(algorithms, families);
  if (WITH_SITES) await realSites(algorithms);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
