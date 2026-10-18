import opentype from 'opentype.js';
import { VariationInstancer, type OutlinePoint } from './font-variations';

// Shape features measured on flattened outlines, so a TrueType (quadratic) and
// a CFF (cubic) build of the same design measure the same. Every length is
// divided by the cap height, which removes units-per-em and most of the
// "how big is this font on its em" variation between designs.

export const FEATURE_KEYS = [
  'xHeight', // 'x' top / cap
  'ascender', // 'd' top / cap
  'descender', // 'p' bottom / cap
  'tHeight', // 't' top / cap: short or tall 't' is a strong family trait
  'fHeight', // 'f' top / cap
  'figureHeight', // '0' top / cap: lining (~1) vs old-style (~x-height) figures
  'widthLower', // advance of 'n' / cap
  'widthUpper', // advance of 'H' / cap
  'roundLower', // 'o' ink width / ink height
  'stem', // 'l' stem thickness at mid x-height / cap
  'contrast', // 'o' thinnest horizontal stroke / thickest vertical stroke
  'serif', // how far stem feet overhang their stems / cap (0 for sans)
  'serifHeight', // height of the serif foot / cap (0 for sans)
  'aperture', // white gap between the terminals of 'c' / x-height
  'eBar', // height of the 'e' crossbar / x-height
  'aStorey', // 1 = double-storey 'a'
  'gStorey', // 1 = double-storey 'g'
  'slant', // stem lean of 'l' in degrees
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

// NaN marks a feature the font could not supply (missing glyph); the matcher skips it.
export type ShapeFeatures = Record<FeatureKey, number>;

export interface FontShape {
  features: ShapeFeatures;
  monospace: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface GlyphGeometry {
  contours: Point[][];
  advance: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

type Span = [number, number];

const CURVE_STEPS = 8;

function bezier(points: number[], t: number): number {
  // De Casteljau over one coordinate of a quadratic (3 values) or cubic (4 values) curve.
  let level = points;
  while (level.length > 1) level = level.slice(1).map((v, i) => level[i] + (v - level[i]) * t);
  return level[0];
}

function flatten(commands: opentype.PathCommand[]): Point[][] {
  const contours: Point[][] = [];
  let current: Point[] = [];
  let pen: Point = { x: 0, y: 0 };
  const close = () => {
    if (current.length > 1) contours.push(current);
    current = [];
  };
  for (const cmd of commands) {
    if (cmd.type === 'Z') {
      close();
      continue;
    }
    if (cmd.type === 'M') close();
    if (cmd.type === 'Q' || cmd.type === 'C') {
      const xs = cmd.type === 'Q' ? [pen.x, cmd.x1, cmd.x] : [pen.x, cmd.x1, cmd.x2, cmd.x];
      const ys = cmd.type === 'Q' ? [pen.y, cmd.y1, cmd.y] : [pen.y, cmd.y1, cmd.y2, cmd.y];
      for (let i = 1; i < CURVE_STEPS; i++) {
        current.push({ x: bezier(xs, i / CURVE_STEPS), y: bezier(ys, i / CURVE_STEPS) });
      }
    }
    pen = { x: cmd.x, y: cmd.y };
    current.push(pen);
  }
  close();
  // getPath() draws in screen space (y down); flip to font space (y up).
  return contours.map(contour => contour.map(p => ({ x: p.x, y: -p.y })));
}

// TrueType contours (quadratic B-splines where two off-curve points in a row
// imply an on-curve midpoint) as polylines in font space.
function flattenPoints(points: OutlinePoint[]): Point[][] {
  const contours: Point[][] = [];
  let start = 0;
  points.forEach((point, end) => {
    if (!point.lastPointOfContour) return;
    const raw = points.slice(start, end + 1);
    start = end + 1;
    const first = raw.findIndex(p => p.onCurve);
    const mid = (a: OutlinePoint, b: OutlinePoint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, onCurve: true, lastPointOfContour: false });
    const ring = first < 0 ? [mid(raw[0], raw[1]), ...raw.slice(1), raw[0]] : [...raw.slice(first), ...raw.slice(0, first)];
    const contour: Point[] = [{ x: ring[0].x, y: ring[0].y }];
    let pen: Point = contour[0];
    for (let i = 1; i <= ring.length; i++) {
      const p = ring[i % ring.length];
      if (p.onCurve) {
        pen = { x: p.x, y: p.y };
        contour.push(pen);
        continue;
      }
      const next = ring[(i + 1) % ring.length];
      const to = next.onCurve ? next : mid(p, next);
      for (let k = 1; k <= CURVE_STEPS; k++) {
        contour.push({ x: bezier([pen.x, p.x, to.x], k / CURVE_STEPS), y: bezier([pen.y, p.y, to.y], k / CURVE_STEPS) });
      }
      pen = { x: to.x, y: to.y };
      if (next.onCurve) i++;
    }
    if (contour.length > 2) contours.push(contour);
  });
  return contours;
}

function glyphGeometry(font: opentype.Font, char: string, instancer: VariationInstancer | null): GlyphGeometry | null {
  const glyph = font.charToGlyph(char);
  if (!glyph || glyph.index === 0) return null;
  const varied = instancer?.glyph(glyph.index);
  const contours = varied ? flattenPoints(varied.points) : flatten(glyph.getPath(0, 0, font.unitsPerEm).commands);
  if (contours.length === 0) return null;
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const contour of contours) {
    for (const p of contour) {
      xMin = Math.min(xMin, p.x);
      xMax = Math.max(xMax, p.x);
      yMin = Math.min(yMin, p.y);
      yMax = Math.max(yMax, p.y);
    }
  }
  return { contours, advance: varied?.advance ?? glyph.advanceWidth ?? 0, xMin, xMax, yMin, yMax };
}

// Ink spans where the line `axis = at` crosses the glyph, using the nonzero
// winding rule so overlapping contours (common in variable-font instances)
// count as one stroke instead of two.
function spans(g: GlyphGeometry, axis: 'horizontal' | 'vertical', at: number): Span[] {
  const crossings: Array<{ pos: number; dir: number }> = [];
  for (const contour of g.contours) {
    for (let i = 0; i < contour.length; i++) {
      const p = contour[i];
      const q = contour[(i + 1) % contour.length];
      const [pa, qa, pb, qb] = axis === 'horizontal' ? [p.y, q.y, p.x, q.x] : [p.x, q.x, p.y, q.y];
      if (pa === qa || (at < pa && at < qa) || (at >= pa && at >= qa)) continue;
      crossings.push({ pos: pb + ((at - pa) * (qb - pb)) / (qa - pa), dir: qa > pa ? 1 : -1 });
    }
  }
  crossings.sort((a, b) => a.pos - b.pos);
  const result: Span[] = [];
  let winding = 0;
  let start = 0;
  for (const c of crossings) {
    const before = winding;
    winding += c.dir;
    if (before === 0 && winding !== 0) start = c.pos;
    else if (before !== 0 && winding === 0 && c.pos > start) result.push([start, c.pos]);
  }
  return result;
}

const spanWidth = (s: Span) => s[1] - s[0];

function widest(list: Span[]): Span | null {
  return list.reduce<Span | null>((best, s) => (!best || spanWidth(s) > spanWidth(best) ? s : best), null);
}

function ratio(a: number, b: number): number {
  return b > 0 && Number.isFinite(a) ? a / b : NaN;
}

// Thickness of the main vertical stem of a single-stem glyph at height y.
function stemAt(g: GlyphGeometry | null, y: number): Span | null {
  return g ? widest(spans(g, 'horizontal', y)) : null;
}

// Foot of the leftmost stem crossing `stemY`: how far it overhangs the stem
// just above the baseline, and the height where it has lost half that
// overhang (a slab keeps its width for its full thickness, a bracketed serif
// tapers almost at once).
function footOf(g: GlyphGeometry | null, stemY: number, cap: number): { overhang: number; height: number } | null {
  const stem = g ? spans(g, 'horizontal', stemY)[0] : undefined;
  if (!g || !stem) return null;
  const center = (stem[0] + stem[1]) / 2;
  const widthAt = (y: number) => {
    const span = spans(g, 'horizontal', y).find(s => s[0] <= center && s[1] >= center);
    return span ? spanWidth(span) : 0;
  };
  const stemWidth = spanWidth(stem);
  const footY = g.yMin + 0.03 * cap;
  const foot = widthAt(footY);
  if (foot < 1.15 * stemWidth) return { overhang: Math.max(0, foot - stemWidth) / cap, height: 0 };
  const half = stemWidth + (foot - stemWidth) / 2;
  let y = footY;
  while (y < g.yMin + 0.3 * cap && widthAt(y) > half) y += 0.005 * cap;
  return { overhang: (foot - stemWidth) / cap, height: (y - g.yMin) / cap };
}

function median(values: number[]): number {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : NaN;
}

// Median over 'I', 'H' and 'n': many sans put serifs on 'I' alone to tell it
// from 'l' (IBM Plex Sans, Schibsted Grotesk), a serif face has them on all three.
function serifFeatures(get: (char: string) => GlyphGeometry | null, cap: number, xh: number) {
  const I = get('I');
  const feet = [
    footOf(I, I ? (I.yMin + I.yMax) / 2 : 0, cap),
    footOf(get('H'), 0.25 * cap, cap),
    footOf(get('n'), 0.3 * xh, cap),
  ].filter(f => f !== null);
  return { serif: median(feet.map(f => f.overhang)), serifHeight: median(feet.map(f => f.height)) };
}

function apertureOf(c: GlyphGeometry | null, xHeight: number): number {
  if (!c) return NaN;
  const x = c.xMin + 0.8 * (c.xMax - c.xMin);
  const row = spans(c, 'vertical', x);
  if (row.length === 0) return 1;
  if (row.length === 1) {
    // Only one terminal reaches this far right: the opening runs to the far side of the bowl.
    const [lo, hi] = row[0];
    return Math.max(lo - c.yMin, c.yMax - hi) / xHeight;
  }
  let gap = 0;
  for (let i = 1; i < row.length; i++) gap = Math.max(gap, row[i][0] - row[i - 1][1]);
  return gap / xHeight;
}

function slantOf(g: GlyphGeometry | null, xHeight: number): number {
  const low = stemAt(g, 0.2 * xHeight);
  const high = stemAt(g, 0.8 * xHeight);
  if (!low || !high) return NaN;
  const dx = (high[0] + high[1]) / 2 - (low[0] + low[1]) / 2;
  return (Math.atan2(dx, 0.6 * xHeight) * 180) / Math.PI;
}

// `sfnt` (the uncompressed font bytes) lets a variable font be measured at its
// regular instance instead of whatever master it happens to default to.
export function extractShape(font: opentype.Font, sfnt?: Uint8Array): FontShape | null {
  const instancer = sfnt ? VariationInstancer.create(font, sfnt) : null;
  const glyphs = new Map<string, GlyphGeometry | null>();
  const get = (char: string) => {
    if (!glyphs.has(char)) glyphs.set(char, glyphGeometry(font, char, instancer));
    return glyphs.get(char) ?? null;
  };

  const H = get('H');
  const n = get('n');
  const o = get('o');
  const x = get('x');
  if (!H || !n || !o || !x || H.yMax <= 0 || x.yMax <= 0) return null;

  const cap = H.yMax;
  const xh = x.yMax;
  const stemGlyph = get('l') ?? get('I');
  const stem = stemAt(stemGlyph, 0.5 * xh);

  const thick = Math.max(0, ...spans(o, 'horizontal', (o.yMin + o.yMax) / 2).map(spanWidth));
  const thinSpans = spans(o, 'vertical', (o.xMin + o.xMax) / 2).map(spanWidth);
  const thin = thinSpans.length >= 2 ? Math.min(...thinSpans) : NaN;

  const heightOf = (char: string) => {
    const glyph = get(char);
    return glyph ? glyph.yMax / cap : NaN;
  };
  const storeys = (char: string, doubleAt: number) => {
    const glyph = get(char);
    return glyph ? (spans(glyph, 'vertical', (glyph.xMin + glyph.xMax) / 2).length >= doubleAt ? 1 : 0) : NaN;
  };
  const e = get('e');
  // Bottom stroke, crossbar, top stroke from the baseline up.
  const eRow = e ? spans(e, 'vertical', (e.xMin + e.xMax) / 2) : [];
  const p = get('p');

  const features: ShapeFeatures = {
    xHeight: xh / cap,
    ascender: heightOf('d'),
    descender: p ? -p.yMin / cap : NaN,
    tHeight: heightOf('t'),
    fHeight: heightOf('f'),
    figureHeight: heightOf('0'),
    widthLower: n.advance / cap,
    widthUpper: H.advance / cap,
    roundLower: ratio(o.xMax - o.xMin, o.yMax - o.yMin),
    stem: stem ? spanWidth(stem) / cap : NaN,
    contrast: ratio(thin, thick),
    ...serifFeatures(get, cap, xh),
    aperture: apertureOf(get('c'), xh),
    eBar: eRow.length >= 3 ? (eRow[1][0] + eRow[1][1]) / 2 / xh : NaN,
    aStorey: storeys('a', 3),
    gStorey: storeys('g', 4),
    slant: slantOf(stemGlyph, xh),
  };

  const i = get('i');
  const m = get('m');
  const monospace = !!i && !!m && m.advance > 0 && Math.abs(i.advance - m.advance) / m.advance < 0.02;
  return { features, monospace };
}

// wawoff2 returns a view into its shared emscripten heap, and the caller's
// `await` lets another decompress overwrite it before it can be copied, so
// calls run one at a time and copy before the next starts.
let woff2Queue: Promise<unknown> = Promise.resolve();

function decompressWoff2(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const run = woff2Queue.then(async () => {
    const { decompress } = await import('wawoff2');
    const view = await decompress(Buffer.from(buffer));
    return new Uint8Array(view).buffer as ArrayBuffer;
  });
  woff2Queue = run.catch(() => undefined);
  return run;
}

export interface DecodedFont {
  font: opentype.Font;
  sfnt: Uint8Array;
}

export async function decodeFont(buffer: ArrayBuffer): Promise<DecodedFont | null> {
  try {
    // WOFF2 ('wOF2'); opentype.js reads TTF, OTF and WOFF1 itself.
    const sfnt = new DataView(buffer).getUint32(0) === 0x774f4632 ? await decompressWoff2(buffer) : buffer;
    return { font: opentype.parse(sfnt), sfnt: new Uint8Array(sfnt) };
  } catch (error) {
    console.error('Font parse error:', error);
    return null;
  }
}

export async function extractShapeFromBuffer(buffer: ArrayBuffer): Promise<FontShape | null> {
  const decoded = await decodeFont(buffer);
  if (!decoded) return null;
  try {
    return extractShape(decoded.font, decoded.sfnt);
  } catch (error) {
    console.error('Font shape extraction error:', error);
    return null;
  }
}
