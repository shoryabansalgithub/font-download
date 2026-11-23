import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { extractShapeFromBuffer, type FontShape } from '../../lib/font-features';
import { FontMatcher, type FontDatabaseFile, type FontRecord } from '../../lib/font-matcher';
import { findGoogleFamily, googleSpecimenUrl, indexGoogleFamilies, normalizeFamilyName, type GoogleFamilyIndex } from '../../lib/google-fonts';

const RESULT_COUNT = 5;

let matcherPromise: Promise<FontMatcher | null> | null = null;

function getMatcher(): Promise<FontMatcher | null> {
  matcherPromise ??= (async () => {
    const dbPath = path.join(process.cwd(), 'public', 'data', 'font-features.json');
    try {
      const file = JSON.parse(await fs.readFile(dbPath, 'utf-8')) as FontDatabaseFile;
      if (file.version !== 2) throw new Error(`unsupported font-features.json version ${file.version}`);
      return new FontMatcher(file);
    } catch (error) {
      console.error('Font feature database unavailable at', dbPath, error);
      return null;
    }
  })();
  return matcherPromise;
}

// Hand-picked free stand-ins for iconic commercial families, keyed by every
// normalized name the family is served under. Applied on exact keys only: a
// prefix match would send "Futura Now" or "Avenir Next Condensed" somewhere
// it does not belong.
const OVERRIDES: Array<{ names: string[]; alternatives: Array<{ family: string; reason: string }> }> = [
  {
    names: ['helvetica', 'helvetica neue', 'neue helvetica', 'arial'],
    alternatives: [
      { family: 'Inter', reason: 'Neutral neo-grotesque drawn for screens' },
      { family: 'Roboto', reason: 'Neo-grotesque skeleton, very close forms' },
      { family: 'Arimo', reason: 'Metric-compatible Helvetica/Arial design' },
    ],
  },
  {
    names: ['sf pro', 'sf pro text', 'sf pro display', 'san francisco', 'system ui', '-apple-system'],
    alternatives: [
      { family: 'Inter', reason: 'Closest free UI grotesque to SF Pro' },
      { family: 'Roboto', reason: 'Platform UI sans with similar build' },
    ],
  },
  {
    names: ['proxima nova'],
    alternatives: [
      { family: 'Montserrat', reason: 'Popular free Proxima Nova stand-in' },
      { family: 'Nunito Sans', reason: 'Similar proportions and x-height' },
      { family: 'Figtree', reason: 'Geometric-grotesque hybrid like Proxima' },
    ],
  },
  {
    names: ['gotham', 'gotham ssm'],
    alternatives: [
      { family: 'Montserrat', reason: 'Wide geometric caps in the Gotham mould' },
      { family: 'Raleway', reason: 'Similar geometric proportions' },
    ],
  },
  {
    names: ['futura', 'futura pt', 'futura std'],
    alternatives: [
      { family: 'Jost', reason: "Drawn directly from Futura's geometry" },
      { family: 'Poppins', reason: 'Geometric sans with circular bowls' },
    ],
  },
  {
    names: ['avenir', 'avenir next'],
    alternatives: [
      { family: 'Nunito Sans', reason: 'Close match in feel and proportions' },
      { family: 'Mulish', reason: 'Geometric sans with Avenir-like warmth' },
    ],
  },
  {
    names: ['circular', 'circular std', 'circular xx'],
    alternatives: [
      { family: 'DM Sans', reason: 'Geometric sans with similar quirks' },
      { family: 'Plus Jakarta Sans', reason: 'Modern geometric, similar feel' },
    ],
  },
  {
    names: ['garamond', 'adobe garamond', 'adobe garamond pro', 'garamond premier pro'],
    alternatives: [
      { family: 'EB Garamond', reason: 'Open-source Garamond revival' },
      { family: 'Cormorant Garamond', reason: 'Display-cut Garamond' },
    ],
  },
  {
    names: ['bodoni', 'bodoni moda', 'itc bodoni'],
    alternatives: [
      { family: 'Libre Bodoni', reason: 'Open-source Bodoni revival' },
      { family: 'Bodoni Moda', reason: 'High-contrast Didone with optical sizes' },
    ],
  },
];

const indexes = new WeakMap<FontRecord[], GoogleFamilyIndex>();

function findOnGoogleFonts(family: string, records: FontRecord[]): FontRecord | null {
  let index = indexes.get(records);
  if (!index) {
    index = indexGoogleFamilies(records.map(r => r.family));
    indexes.set(records, index);
  }
  const match = findGoogleFamily(index, family);
  return match ? records.find(r => r.family === match) ?? null : null;
}

function findOverride(family: string) {
  const key = normalizeFamilyName(family);
  return OVERRIDES.find(o => o.names.includes(key))?.alternatives ?? null;
}

async function fetchQueryShape(request: NextRequest, url: string | undefined, referer: string | undefined): Promise<FontShape | null> {
  if (!url) return null;
  try {
    const fontUrl = url.startsWith('data:')
      ? url
      : `${request.nextUrl.origin}/api/font?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(referer || '')}`;
    const response = await fetch(fontUrl);
    if (!response.ok) return null;
    return await extractShapeFromBuffer(await response.arrayBuffer());
  } catch (error) {
    console.error('Could not measure the query font:', error);
    return null;
  }
}

interface Alternative {
  family: string;
  category?: string;
  similarity?: number;
  reason: string;
  downloadUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    const { family, weight, style, url, referer } = await request.json();
    if (!family) {
      return NextResponse.json({ error: 'Font family is required' }, { status: 400 });
    }
    const original = { family, weight, style };

    const matcher = await getMatcher();
    if (!matcher) {
      return NextResponse.json({
        original,
        method: 'no-database',
        error: 'Font feature database not built yet. Run: npm run build:features',
        alternatives: [],
      });
    }

    const exact = findOnGoogleFonts(family, matcher.records);
    const override = findOverride(exact?.family ?? family);
    const shape = await fetchQueryShape(request, url, referer);

    const curated = new Map((override ?? []).map(o => [o.family, o.reason]));
    const toAlternative = (record: FontRecord, similarity: number | undefined, reason: string): Alternative => ({
      family: record.family,
      category: record.category,
      similarity,
      reason: curated.get(record.family) ?? reason,
      downloadUrl: googleSpecimenUrl(record.family),
    });
    // Measured: curated picks compete on their real similarity, keeping their
    // wording. Unmeasurable: the curated list is all there is, in its own order.
    const candidates = shape
      ? matcher.match(shape, RESULT_COUNT + 1, [...curated.keys()]).map(m => toAlternative(m.record, m.similarity, m.reason))
      : [...curated.keys()].flatMap(family => {
          const record = matcher.records.find(r => r.family === family);
          return record ? [toAlternative(record, undefined, '')] : [];
        });

    const alternatives: Alternative[] = [
      ...(exact ? [toAlternative(exact, 100, 'This exact font is free on Google Fonts')] : []),
      ...candidates.filter(c => c.family !== exact?.family).slice(0, RESULT_COUNT),
    ];

    return NextResponse.json({
      original,
      method: override ? 'name-override' : exact ? 'exact-match' : shape ? 'feature-similarity' : 'unmeasurable',
      alternatives,
    });
  } catch (error) {
    console.error('Font matching error:', error);
    return NextResponse.json({ error: 'Failed to find similar fonts' }, { status: 500 });
  }
}
