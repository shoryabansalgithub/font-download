import * as fs from 'fs';
import * as path from 'path';

// Shared by build-font-features.ts and eval-match.ts: both read Google Fonts
// without an API key and share one on-disk cache of tiny subset files.

export const CACHE_DIR = path.join(__dirname, '..', 'node_modules', '.cache', 'fontstealer');

// Glyphs the current extractor needs plus the ones the legacy extractor reads
// (I l T H o e a A B C D n p q r 0-3 and a-z), so one cached subset serves both.
export const SUBSET_TEXT = 'ABCDHIOTabcdefghijklmnopqrstuvwxyz0123';

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

const CATEGORY: Record<string, string> = {
  'Sans Serif': 'sans-serif',
  Serif: 'serif',
  Display: 'display',
  Handwriting: 'handwriting',
  Monospace: 'monospace',
};

export interface GoogleFamily {
  family: string;
  category: string;
  // Upright weights only; italics are never used as references.
  weights: number[];
  // Google's popularity rank, 1 = most used.
  popularity: number;
}

export async function fetchFamilyList(): Promise<GoogleFamily[]> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, 'metadata.json');
  let text: string;
  if (fs.existsSync(file)) {
    text = fs.readFileSync(file, 'utf-8');
  } else {
    const response = await fetch('https://fonts.google.com/metadata/fonts', { headers: { 'User-Agent': CHROME_UA } });
    if (!response.ok) throw new Error(`metadata: HTTP ${response.status}`);
    text = await response.text();
    fs.writeFileSync(file, text);
  }
  const data = JSON.parse(text.slice(text.indexOf('{'))) as {
    familyMetadataList: Array<{ family: string; category: string; popularity: number; fonts: Record<string, unknown> }>;
  };
  return data.familyMetadataList
    .map(f => ({
      family: f.family,
      category: CATEGORY[f.category] ?? f.category.toLowerCase(),
      weights: Object.keys(f.fonts)
        .filter(k => /^\d+$/.test(k))
        .map(Number)
        .sort((a, b) => a - b),
      popularity: f.popularity,
    }))
    .filter(f => f.weights.length > 0);
}

export function closestWeight(weights: number[], target: number): number {
  return weights.reduce((best, w) => (Math.abs(w - target) < Math.abs(best - target) ? w : best));
}

// The eval's query weight and the builder's weight-slope pair: 700, else the
// upright weight furthest from 400; null for single-weight families.
export function boldWeight(family: GoogleFamily): number | null {
  if (family.weights.includes(700)) return 700;
  const far = family.weights.reduce((best, w) => (Math.abs(w - 400) > Math.abs(best - 400) ? w : best));
  return far === closestWeight(family.weights, 400) ? null : far;
}

function cacheFile(family: string, weight: number): string {
  return path.join(CACHE_DIR, 'subsets', `${family.replace(/[^A-Za-z0-9]+/g, '_')}@${weight}`);
}

// Resolves to the cached subset, downloading it on first use. A failed family
// leaves a `.fail` marker so reruns skip it instead of hammering Google.
export async function fetchSubset(family: string, weight: number): Promise<Buffer | null> {
  const base = cacheFile(family, weight);
  if (fs.existsSync(`${base}.woff2`)) return fs.readFileSync(`${base}.woff2`);
  if (fs.existsSync(`${base}.fail`)) return null;
  fs.mkdirSync(path.dirname(base), { recursive: true });
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@${weight}&text=${encodeURIComponent(SUBSET_TEXT)}`;
    const css = await fetchWithRetry(cssUrl);
    const fontUrl = (await css.text()).match(/url\((https:[^)]+)\)/)?.[1];
    if (!fontUrl) throw new Error('no font url in css');
    const buffer = Buffer.from(await (await fetchWithRetry(fontUrl)).arrayBuffer());
    // Write-then-rename so an interrupted run never leaves a truncated cache entry.
    fs.writeFileSync(`${base}.tmp`, buffer);
    fs.renameSync(`${base}.tmp`, `${base}.woff2`);
    return buffer;
  } catch (error) {
    fs.writeFileSync(`${base}.fail`, String(error));
    return null;
  }
}

async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': CHROME_UA } });
    if (response.ok) return response;
    if (attempt >= 2 || (response.status < 500 && response.status !== 429)) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
  }
}

export async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    }),
  );
  return results;
}

// Deterministic split: weight-slope calibration and weight tuning only ever see
// the 'train' half, the eval only samples the 'test' half.
export function splitOf(family: string): 'train' | 'test' {
  let h = 2166136261;
  for (let i = 0; i < family.length; i++) h = Math.imul(h ^ family.charCodeAt(i), 16777619);
  return (h >>> 0) % 2 === 0 ? 'train' : 'test';
}
