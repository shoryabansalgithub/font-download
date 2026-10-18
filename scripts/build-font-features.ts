/**
 * Builds public/data/font-features.json: one shape-feature vector per Google
 * Fonts family, measured on its regular (or closest-to-400) upright face.
 *
 *   npm run build:features            # resumes from the download cache
 *   npm run build:features -- --retry # also retries families that failed before
 *
 * No API key: the family list comes from fonts.google.com/metadata/fonts and
 * each face is a few-KB css2 `&text=` subset. Downloads are cached under
 * node_modules/.cache/fontstealer, so a crashed or repeated run only fetches
 * what is missing and always rewrites the same output from the cache.
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { decodeFont, extractShape, FEATURE_KEYS, type FeatureKey, type FontShape } from '../app/lib/font-features';
import type { FontDatabaseFile } from '../app/lib/font-matcher';
import { boldWeight, CACHE_DIR, closestWeight, fetchFamilyList, fetchSubset, mapPool, splitOf, SUBSET_TEXT, type GoogleFamily } from './google-fonts';

const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'font-features.json');
const CONCURRENCY = 6;

// 'stem' is the weight itself, and the storey and slant features have no
// linear dependence on it.
const UNCORRECTED = new Set<FeatureKey>(['stem', 'aStorey', 'gStorey', 'slant']);

interface Measured {
  shape: FontShape;
  // Hash of the Latin outlines at 1000 units/em: script variants such as
  // "Noto Sans Thai" ship Noto Sans's Latin unchanged and hash the same.
  design: string;
}

async function measure(family: string, weight: number): Promise<Measured | null> {
  const buffer = await fetchSubset(family, weight);
  const decoded = buffer && (await decodeFont(new Uint8Array(buffer).buffer as ArrayBuffer));
  const shape = decoded && extractShape(decoded.font, decoded.sfnt);
  if (!decoded || !shape) return null;
  const { font } = decoded;
  const outlines = [...SUBSET_TEXT].map(char => font.charToGlyph(char).getPath(0, 0, 1000).toPathData(0));
  return { shape, design: createHash('sha1').update(outlines.join('|')).digest('hex') };
}

function round(value: number): number | null {
  return Number.isFinite(value) ? Math.round(value * 10000) / 10000 : null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
}

// Median of per-family (feature change / stem change) between the regular and
// bold face of 'train' families. The median keeps a few wild display families
// from steering the fit.
function fitWeightSlopes(pairs: Array<[FontShape, FontShape]>): FontDatabaseFile['weightSlopes'] {
  const slopes: FontDatabaseFile['weightSlopes'] = {};
  for (const key of FEATURE_KEYS) {
    if (UNCORRECTED.has(key)) continue;
    const ratios = pairs
      .map(([regular, bold]) => {
        const dStem = bold.features.stem - regular.features.stem;
        // A sans pair has no serif at either weight and says nothing about how serifs scale.
        if (dStem <= 0.02 || (regular.features[key] === 0 && bold.features[key] === 0)) return NaN;
        return (bold.features[key] - regular.features[key]) / dStem;
      })
      .filter(Number.isFinite);
    slopes[key] = round(median(ratios)) ?? 0;
  }
  return slopes;
}

// Between-family variance of each weight-corrected feature over its
// within-family (regular vs bold) variance. High means the feature tells
// designs apart and survives a change of weight.
function fitSeparation(pairs: Array<[FontShape, FontShape]>, slopes: FontDatabaseFile['weightSlopes']): FontDatabaseFile['separation'] {
  const separation = {} as FontDatabaseFile['separation'];
  for (const key of FEATURE_KEYS) {
    const corrected = (shape: FontShape) => shape.features[key] - (slopes[key] ?? 0) * shape.features.stem;
    const complete = pairs.filter(([regular, bold]) => Number.isFinite(corrected(regular)) && Number.isFinite(corrected(bold)));
    const values = complete.map(([regular]) => corrected(regular));
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const between = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const within = complete.reduce((s, [regular, bold]) => s + (corrected(bold) - corrected(regular)) ** 2, 0) / complete.length / 2;
    separation[key] = round(between / within) ?? 0;
  }
  return separation;
}

// Union of identical outline hashes and near-identical measurements (every
// feature within 0.02 library standard deviations). The second catches script
// families that carry an older build of the same Latin, e.g. "Noto Serif
// Bengali" next to "Noto Serif", which differ by a few font units.
const SAME_DESIGN_TOLERANCE = 0.02;

function designGroups(fonts: Measured[]): number[] {
  const parent = fonts.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (i: number, j: number) => {
    parent[find(i)] = find(j);
  };

  const byHash = new Map<string, number>();
  fonts.forEach((f, i) => {
    const seen = byHash.get(f.design);
    if (seen === undefined) byHash.set(f.design, i);
    else union(i, seen);
  });

  const scale = FEATURE_KEYS.map(key => {
    const values = fonts.map(f => f.shape.features[key]).filter(Number.isFinite);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length) || 1;
  });
  const nearlyEqual = (a: FontShape, b: FontShape) =>
    a.monospace === b.monospace &&
    FEATURE_KEYS.every((key, k) => {
      const x = a.features[key];
      const y = b.features[key];
      return Number.isFinite(x) && Number.isFinite(y) ? Math.abs(x - y) <= SAME_DESIGN_TOLERANCE * scale[k] : Number.isFinite(x) === Number.isFinite(y);
    });
  for (let i = 0; i < fonts.length; i++) {
    for (let j = i + 1; j < fonts.length; j++) {
      if (nearlyEqual(fonts[i].shape, fonts[j].shape)) union(i, j);
    }
  }
  return fonts.map((_, i) => find(i));
}

async function main() {
  const started = Date.now();
  if (process.argv.includes('--retry')) {
    const dir = path.join(CACHE_DIR, 'subsets');
    for (const file of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
      if (file.endsWith('.fail')) fs.unlinkSync(path.join(dir, file));
    }
  }

  const families = await fetchFamilyList();
  console.log(`${families.length} families`);

  let done = 0;
  const rows = await mapPool(families, CONCURRENCY, async family => {
    const weight = closestWeight(family.weights, 400);
    const regular = await measure(family.family, weight);
    const bold = boldWeight(family);
    const pairWithBold = regular && bold && splitOf(family.family) === 'train' ? await measure(family.family, bold) : null;
    if (++done % 100 === 0) console.log(`  ${done}/${families.length}`);
    return { family, weight, regular, pairWithBold };
  });

  const measured = rows.filter(r => r.regular);
  const pairs = measured.filter(r => r.pairWithBold).map(r => [r.regular!.shape, r.pairWithBold!.shape] as [FontShape, FontShape]);

  const groupOf = designGroups(measured.map(r => r.regular!));
  // One family per Latin design ranks; the rest point at it.
  const canonical = new Map<number, GoogleFamily>();
  measured.forEach((r, i) => {
    const current = canonical.get(groupOf[i]);
    if (!current || r.family.popularity < current.popularity) canonical.set(groupOf[i], r.family);
  });

  const weightSlopes = fitWeightSlopes(pairs);
  const output: FontDatabaseFile = {
    version: 2,
    features: [...FEATURE_KEYS],
    weightSlopes,
    separation: fitSeparation(pairs, weightSlopes),
    fonts: measured.map((r, i) => {
      const sameAs = canonical.get(groupOf[i])!.family;
      return {
        family: r.family.family,
        ...(sameAs !== r.family.family && { sameAs }),
        category: r.family.category,
        weight: r.weight,
        monospace: r.regular!.shape.monospace,
        v: FEATURE_KEYS.map(key => round(r.regular!.shape.features[key])),
      };
    }),
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output));

  const skipped = rows.filter(r => !r.regular).map(r => r.family.family);
  console.log(`\n${output.fonts.length} families measured (${canonical.size} distinct Latin designs), ${skipped.length} skipped (no Latin H/n/o/x or download failed)`);
  console.log(`fitted on ${pairs.length} regular/bold 'train' pairs:`);
  for (const key of FEATURE_KEYS) {
    console.log(`  ${key.padEnd(13)} slope ${String(output.weightSlopes[key] ?? 0).padStart(8)}  separation ${String(output.separation[key]).padStart(8)}`);
  }
  console.log(`${OUTPUT_FILE} (${Math.round(fs.statSync(OUTPUT_FILE).size / 1024)} KB) in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
