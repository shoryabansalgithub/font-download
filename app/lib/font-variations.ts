import { inflateSync } from 'zlib';
import type opentype from 'opentype.js';

// opentype.js 1.x ignores variation tables, so a variable font parses as its
// default master: GitHub's Mona Sans and Hubot Sans default to ExtraLight
// (200), Stripe's Söhne to 281. The matcher's library holds regular faces, so
// TrueType variable fonts are re-instanced here from 'gvar' (+ 'avar') at the
// regular, upright, normal-width position before anything is measured.

export interface OutlinePoint {
  x: number;
  y: number;
  onCurve: boolean;
  lastPointOfContour: boolean;
}

export interface VariedGlyph {
  points: OutlinePoint[];
  advance: number;
}

// Where each registered axis is pinned; unregistered axes stay at their default.
const TARGET: Record<string, number> = { wght: 400, wdth: 100, slnt: 0, ital: 0 };

interface Axis {
  tag: string;
  minValue: number;
  defaultValue: number;
  maxValue: number;
}

interface GlyphWithStructure extends opentype.Glyph {
  points?: OutlinePoint[];
  isComposite?: boolean;
  components?: Array<{
    glyphIndex: number;
    dx: number;
    dy: number;
    xScale: number;
    scale01: number;
    scale10: number;
    yScale: number;
    matchedPoints?: [number, number];
  }>;
}

// Table bytes by tag, for a bare sfnt or a WOFF1 file (opentype.js inflates
// WOFF1 internally but does not expose the tables it does not parse).
function readTables(bytes: Uint8Array): Map<string, DataView> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tables = new Map<string, DataView>();
  const woff = view.getUint32(0) === 0x774f4646;
  const count = view.getUint16(woff ? 12 : 4);
  for (let i = 0; i < count; i++) {
    const at = woff ? 44 + i * 20 : 12 + i * 16;
    const tag = String.fromCharCode(...bytes.subarray(at, at + 4));
    if (tag !== 'gvar' && tag !== 'avar') continue;
    const offset = view.getUint32(at + (woff ? 4 : 8));
    const length = view.getUint32(at + (woff ? 8 : 12));
    let data = bytes.subarray(offset, offset + length);
    if (woff && length < view.getUint32(at + 12)) data = new Uint8Array(inflateSync(data));
    tables.set(tag, new DataView(data.buffer, data.byteOffset, data.byteLength));
  }
  return tables;
}

const f2dot14 = (view: DataView, at: number) => view.getInt16(at) / 16384;

function normalizedCoords(axes: Axis[], avar: DataView | undefined): number[] {
  const coords = axes.map(axis => {
    const target = Math.min(axis.maxValue, Math.max(axis.minValue, TARGET[axis.tag] ?? axis.defaultValue));
    if (target < axis.defaultValue) return (target - axis.defaultValue) / (axis.defaultValue - axis.minValue);
    if (target > axis.defaultValue) return (target - axis.defaultValue) / (axis.maxValue - axis.defaultValue);
    return 0;
  });
  if (!avar) return coords;
  // avar: per axis, a piecewise-linear map of normalized coordinates.
  let at = 8;
  return coords.map(coord => {
    const count = avar.getUint16(at);
    const maps = Array.from({ length: count }, (_, i) => [f2dot14(avar, at + 2 + i * 4), f2dot14(avar, at + 4 + i * 4)]);
    at += 2 + count * 4;
    for (let i = 1; i < maps.length; i++) {
      const [fromA, toA] = maps[i - 1];
      const [fromB, toB] = maps[i];
      if (coord <= fromB) return fromB === fromA ? toB : toA + ((coord - fromA) * (toB - toA)) / (fromB - fromA);
    }
    return coord;
  });
}

function tupleScalar(coords: number[], peak: number[], start?: number[], end?: number[]): number {
  let scalar = 1;
  for (let i = 0; i < coords.length; i++) {
    const p = peak[i];
    if (p === 0) continue;
    const c = coords[i];
    const lo = start ? start[i] : Math.min(0, p);
    const hi = end ? end[i] : Math.max(0, p);
    if (c < lo || c > hi || (!start && (c === 0 || Math.sign(c) !== Math.sign(p)))) return 0;
    if (c === p) continue;
    scalar *= c < p ? (c - lo) / (p - lo) : (hi - c) / (hi - p);
  }
  return scalar;
}

class Reader {
  constructor(
    private readonly view: DataView,
    public at: number,
  ) {}

  u8() {
    return this.view.getUint8(this.at++);
  }

  pointNumbers(): number[] | null {
    let count = this.u8();
    if (count === 0) return null; // every point
    if (count & 0x80) count = ((count & 0x7f) << 8) | this.u8();
    const points: number[] = [];
    let last = 0;
    while (points.length < count) {
      const control = this.u8();
      const words = control & 0x80;
      for (let run = (control & 0x7f) + 1; run > 0 && points.length < count; run--) {
        last += words ? this.view.getUint16((this.at += 2) - 2) : this.u8();
        points.push(last);
      }
    }
    return points;
  }

  deltas(count: number): number[] {
    const deltas: number[] = [];
    while (deltas.length < count) {
      const control = this.u8();
      for (let run = (control & 0x3f) + 1; run > 0 && deltas.length < count; run--) {
        if (control & 0x80) deltas.push(0);
        else if (control & 0x40) deltas.push(this.view.getInt16((this.at += 2) - 2));
        else deltas.push(this.view.getInt8(this.at++));
      }
    }
    return deltas;
  }
}

// Interpolate deltas for points a tuple left untouched, contour by contour
// (the 'IUP' step of the gvar spec).
function inferUntouched(original: Array<{ x: number; y: number }>, ends: number[], dx: Float64Array, dy: Float64Array, touched: boolean[]) {
  let startIndex = 0;
  for (const end of ends) {
    const indices = [];
    for (let i = startIndex; i <= end; i++) if (touched[i]) indices.push(i);
    if (indices.length === 1) {
      for (let i = startIndex; i <= end; i++) if (!touched[i]) [dx[i], dy[i]] = [dx[indices[0]], dy[indices[0]]];
    } else if (indices.length > 1) {
      for (let k = 0; k < indices.length; k++) {
        const a = indices[k];
        const b = indices[(k + 1) % indices.length];
        for (let i = a + 1; ; i++) {
          if (i > end) i = startIndex;
          if (i === b) break;
          for (const [axis, delta] of [['x', dx], ['y', dy]] as const) {
            const pa = original[a][axis];
            const pb = original[b][axis];
            const p = original[i][axis];
            const [lo, hi, dLo, dHi] = pa <= pb ? [pa, pb, delta[a], delta[b]] : [pb, pa, delta[b], delta[a]];
            delta[i] = p <= lo ? dLo : p >= hi ? dHi : lo === hi ? dLo : dLo + ((p - lo) * (dHi - dLo)) / (hi - lo);
          }
        }
      }
    }
    startIndex = end + 1;
  }
}

export class VariationInstancer {
  private readonly axisCount: number;
  private readonly sharedTuples: number[][];
  private readonly offsets: number[];
  private readonly dataStart: number;
  private readonly cache = new Map<number, VariedGlyph | null>();

  private constructor(
    private readonly font: opentype.Font,
    private readonly gvar: DataView,
    private readonly coords: number[],
  ) {
    this.axisCount = gvar.getUint16(4);
    const sharedCount = gvar.getUint16(6);
    const sharedAt = gvar.getUint32(8);
    this.sharedTuples = Array.from({ length: sharedCount }, (_, t) =>
      Array.from({ length: this.axisCount }, (_, a) => f2dot14(gvar, sharedAt + (t * this.axisCount + a) * 2)),
    );
    const glyphCount = gvar.getUint16(12);
    const longOffsets = gvar.getUint16(14) & 1;
    this.dataStart = gvar.getUint32(16);
    this.offsets = Array.from({ length: glyphCount + 1 }, (_, i) =>
      longOffsets ? gvar.getUint32(20 + i * 4) : gvar.getUint16(20 + i * 2) * 2,
    );
  }

  static create(font: opentype.Font, sfnt: Uint8Array): VariationInstancer | null {
    const axes = (font.tables as { fvar?: { axes: Axis[] } }).fvar?.axes;
    if (!axes?.length || font.outlinesFormat !== 'truetype') return null;
    const tables = readTables(sfnt);
    const gvar = tables.get('gvar');
    if (!gvar) return null;
    const coords = normalizedCoords(axes, tables.get('avar'));
    return coords.every(c => c === 0) ? null : new VariationInstancer(font, gvar, coords);
  }

  // Summed deltas for every point of a glyph (outline points, then the four
  // phantom points whose second carries the advance width).
  private deltasFor(glyphIndex: number, original: Array<{ x: number; y: number }>, ends: number[]) {
    const count = original.length;
    const dx = new Float64Array(count);
    const dy = new Float64Array(count);
    const start = this.offsets[glyphIndex];
    if (glyphIndex + 1 >= this.offsets.length || this.offsets[glyphIndex + 1] === start) return { dx, dy };
    const base = this.dataStart + start;
    const v = this.gvar;
    const header = v.getUint16(base);
    const reader = new Reader(v, base + v.getUint16(base + 2));
    const shared = header & 0x8000 ? reader.pointNumbers() : null;
    let at = base + 4;
    for (let t = 0; t < (header & 0x0fff); t++) {
      const size = v.getUint16(at);
      const index = v.getUint16(at + 2);
      at += 4;
      const readTuple = () => {
        const tuple = Array.from({ length: this.axisCount }, (_, a) => f2dot14(v, at + a * 2));
        at += this.axisCount * 2;
        return tuple;
      };
      const peak = index & 0x8000 ? readTuple() : this.sharedTuples[index & 0x0fff];
      const [lo, hi] = index & 0x4000 ? [readTuple(), readTuple()] : [undefined, undefined];
      const dataAt = reader.at;
      const scalar = tupleScalar(this.coords, peak, lo, hi);
      if (scalar !== 0) {
        const points = index & 0x2000 ? reader.pointNumbers() : shared;
        const targets = points ?? Array.from({ length: count }, (_, i) => i);
        const xs = reader.deltas(targets.length);
        const ys = reader.deltas(targets.length);
        const tx = new Float64Array(count);
        const ty = new Float64Array(count);
        const touched = new Array<boolean>(count).fill(points === null);
        targets.forEach((p, i) => {
          if (p >= count) return;
          tx[p] = xs[i];
          ty[p] = ys[i];
          touched[p] = true;
        });
        if (points) inferUntouched(original, ends, tx, ty, touched);
        for (let i = 0; i < count; i++) {
          dx[i] += scalar * tx[i];
          dy[i] += scalar * ty[i];
        }
      }
      reader.at = dataAt + size;
    }
    return { dx, dy };
  }

  glyph(glyphIndex: number): VariedGlyph | null {
    if (!this.cache.has(glyphIndex)) this.cache.set(glyphIndex, this.build(glyphIndex));
    return this.cache.get(glyphIndex) ?? null;
  }

  private build(glyphIndex: number): VariedGlyph | null {
    const glyph = this.font.glyphs.get(glyphIndex) as GlyphWithStructure;
    glyph.getPath(); // forces opentype.js to load points/components lazily
    const advance = glyph.advanceWidth ?? 0;
    const phantoms = [
      { x: 0, y: 0 },
      { x: advance, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];

    if (glyph.isComposite && glyph.components) {
      if (glyph.components.some(c => c.matchedPoints)) return null;
      const anchors = [...glyph.components.map(c => ({ x: c.dx, y: c.dy })), ...phantoms];
      const ends = glyph.components.map((_, i) => i);
      const { dx, dy } = this.deltasFor(glyphIndex, anchors, ends);
      const points: OutlinePoint[] = [];
      for (const [i, c] of glyph.components.entries()) {
        const part = this.glyph(c.glyphIndex);
        if (!part) return null;
        for (const p of part.points) {
          points.push({
            x: c.xScale * p.x + c.scale01 * p.y + c.dx + dx[i],
            y: c.scale10 * p.x + c.yScale * p.y + c.dy + dy[i],
            onCurve: p.onCurve,
            lastPointOfContour: p.lastPointOfContour,
          });
        }
      }
      const n = glyph.components.length;
      return { points, advance: advance + dx[n + 1] - dx[n] };
    }

    const outline = glyph.points ?? [];
    const ends = outline.flatMap((p, i) => (p.lastPointOfContour ? [i] : []));
    const { dx, dy } = this.deltasFor(glyphIndex, [...outline, ...phantoms], ends);
    const n = outline.length;
    return {
      points: outline.map((p, i) => ({ ...p, x: p.x + dx[i], y: p.y + dy[i] })),
      advance: advance + dx[n + 1] - dx[n],
    };
  }
}
