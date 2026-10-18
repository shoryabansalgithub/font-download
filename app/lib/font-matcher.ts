import { FEATURE_KEYS, type FeatureKey, type FontShape, type ShapeFeatures } from './font-features';

// Serialized form of public/data/font-features.json (written by
// scripts/build-font-features.ts). Missing measurements are stored as null.
export interface FontDatabaseFile {
  version: 2;
  features: FeatureKey[];
  // Both fitted on regular vs bold faces of the same families ('train' split):
  // how much each feature moves per unit of stem thickness within a family
  // (see weightCorrected), and how much it varies between families relative
  // to within one (between/within variance ratio, see the constructor).
  weightSlopes: Partial<Record<FeatureKey, number>>;
  separation: Record<FeatureKey, number>;
  fonts: Array<{
    family: string;
    // Set when this family ships another family's Latin outlines (Noto script
    // families, Anek, Baloo...): it is found by name but never ranked, so a
    // top five is not one design five times.
    sameAs?: string;
    category: string;
    weight: number;
    monospace: boolean;
    v: Array<number | null>;
  }>;
}

export interface FontRecord {
  family: string;
  sameAs?: string;
  category: string;
  weight: number;
  shape: FontShape;
}

export interface Match {
  record: FontRecord;
  distance: number;
  // 1-99: share of the library's typical close-lookalike distances this match beats.
  similarity: number;
  reason: string;
}

export interface MatcherOptions {
  weightExponent: number;
  classPenalty: number;
}

// Feature weight = separation ^ exponent. 1 would be the retrieval-optimal
// diagonal metric (weight each z-scored feature by 1 / within-family
// variance); 0.75 keeps binary traits such as 'g' storeys from swamping
// proportions. Chosen with scripts/eval-match.ts on the 'train' split.
const DEFAULTS: MatcherOptions = { weightExponent: 0.75, classPenalty: 0.5 };

// Size of the shape neighbourhood that votes on what kind of face the query is.
const CLASS_NEIGHBOURS = 15;

export function parseDatabase(file: FontDatabaseFile): FontRecord[] {
  return file.fonts.map(font => {
    const features = {} as ShapeFeatures;
    file.features.forEach((key, i) => {
      features[key] = font.v[i] ?? NaN;
    });
    return {
      family: font.family,
      sameAs: font.sameAs,
      category: font.category,
      weight: font.weight,
      shape: { features, monospace: font.monospace },
    };
  });
}

export class FontMatcher {
  readonly records: FontRecord[];
  readonly weights = {} as Record<FeatureKey, number>;
  private readonly weightSlopes: FontDatabaseFile['weightSlopes'];
  private readonly classPenalty: number;
  private readonly weightVector: Float64Array;
  private readonly mean = {} as Record<FeatureKey, number>;
  private readonly sd = {} as Record<FeatureKey, number>;
  private readonly z: Float64Array[];
  private readonly calibration: number[];

  constructor(file: FontDatabaseFile, options: Partial<MatcherOptions> = {}) {
    const { weightExponent, classPenalty } = { ...DEFAULTS, ...options };
    this.records = parseDatabase(file);
    this.weightSlopes = file.weightSlopes;
    this.classPenalty = classPenalty;
    for (const key of FEATURE_KEYS) this.weights[key] = (file.separation[key] ?? 0) ** weightExponent;
    this.weightVector = Float64Array.from(FEATURE_KEYS, key => this.weights[key]);

    const corrected = this.records.map(r => this.weightCorrected(r.shape.features));
    for (const key of FEATURE_KEYS) {
      const values = corrected.map(c => c[key]).filter(Number.isFinite);
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      this.mean[key] = mean;
      this.sd[key] = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length) || 1;
    }
    this.z = corrected.map(c => this.zScores(c));
    this.calibration = this.neighbourDistances();
  }

  // A bold query should land on the family that looks like it at regular
  // weight. Removing each feature's within-family dependence on stem
  // thickness makes the corrected value roughly constant across a family.
  private weightCorrected(features: ShapeFeatures): ShapeFeatures {
    const out = { ...features };
    for (const key of FEATURE_KEYS) {
      const slope = this.weightSlopes[key];
      if (slope && Number.isFinite(features.stem)) out[key] = features[key] - slope * features.stem;
    }
    return out;
  }

  private zScores(features: ShapeFeatures): Float64Array {
    return Float64Array.from(FEATURE_KEYS, key => (features[key] - this.mean[key]) / this.sd[key]);
  }

  // Weighted Euclidean over the features both fonts have, rescaled as if the
  // missing ones had matched as well as the present ones did on average.
  private distance(a: Float64Array, b: Float64Array): number {
    let sum = 0;
    let used = 0;
    let total = 0;
    for (let i = 0; i < a.length; i++) {
      const w = this.weightVector[i];
      total += w;
      const diff = a[i] - b[i];
      if (Number.isNaN(diff)) continue;
      sum += w * diff * diff;
      used += w;
    }
    return used > 0 ? Math.sqrt((sum * total) / used) : Infinity;
  }

  // Monospace only ever matches monospace. Then every candidate's distance is
  // stretched by how little the query's shape neighbourhood supports its Google
  // category, which keeps script and display faces out of a text face's
  // results (and serifs out of a sans's) unless the query itself looks like one.
  private rank(queryZ: Float64Array, monospace: boolean, skip = -1): Array<{ index: number; distance: number }> {
    const ranked: Array<{ index: number; distance: number }> = [];
    for (let i = 0; i < this.records.length; i++) {
      const record = this.records[i];
      if (i === skip || record.sameAs || record.shape.monospace !== monospace) continue;
      ranked.push({ index: i, distance: this.distance(queryZ, this.z[i]) });
    }
    ranked.sort((a, b) => a.distance - b.distance);
    const votes = new Map<string, number>();
    const voters = ranked.slice(0, CLASS_NEIGHBOURS);
    for (const { index } of voters) {
      const category = this.records[index].category;
      votes.set(category, (votes.get(category) ?? 0) + 1 / voters.length);
    }
    for (const r of ranked) {
      r.distance *= 1 + this.classPenalty * (1 - (votes.get(this.records[r.index].category) ?? 0));
    }
    return ranked.sort((a, b) => a.distance - b.distance);
  }

  // Raw distances have no natural scale, so similarity is read off the
  // distribution of distances that count as good matches here: each sampled
  // library font's ten best matches. 50 is a typical close lookalike, 90 an
  // unusually close one. (Against random pairs every top-5 result would read
  // 99, which tells the reader nothing.)
  private neighbourDistances(): number[] {
    const pool: number[] = [];
    const step = Math.max(1, Math.floor(this.records.length / 300));
    for (let i = 0; i < this.records.length; i += step) {
      if (this.records[i].sameAs) continue;
      const ranked = this.rank(this.z[i], this.records[i].shape.monospace, i);
      pool.push(...ranked.slice(0, 10).map(r => r.distance));
    }
    return pool.sort((a, b) => a - b);
  }

  private similarity(distance: number): number {
    let lo = 0;
    let hi = this.calibration.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.calibration[mid] < distance) lo = mid + 1;
      else hi = mid;
    }
    return Math.min(99, Math.max(1, Math.round(100 * (1 - lo / this.calibration.length))));
  }

  // The `limit` closest families, plus any `include` families wherever they rank.
  match(query: FontShape, limit: number, include: string[] = []): Match[] {
    const queryZ = this.zScores(this.weightCorrected(query.features));
    return this.rank(queryZ, query.monospace)
      .filter((r, position) => position < limit || include.includes(this.records[r.index].family))
      .map(({ index, distance }) => ({
        record: this.records[index],
        distance,
        similarity: this.similarity(distance),
        reason: describeMatch(this.records[index], queryZ, this.z[index]),
      }));
  }
}

function styleOf(record: FontRecord): string {
  const f = record.shape.features;
  if (record.shape.monospace) return 'Monospace';
  if (record.category === 'handwriting') return 'Script face';
  if (record.category === 'display') return 'Display face';
  if (f.serif >= 0.06) {
    if (f.serifHeight >= 0.09 && f.contrast > 0.6) return 'Slab serif';
    if (f.contrast < 0.3) return 'High-contrast serif';
    return 'Text serif';
  }
  if (f.roundLower > 0.95 && f.aStorey === 0) return 'Geometric sans';
  if (f.aperture > 0.6 || f.gStorey === 1) return 'Humanist sans';
  return 'Grotesque sans';
}

// [same, candidate higher, candidate lower]
const TRAIT_WORDS: Partial<Record<FeatureKey, [string, string, string]>> = {
  xHeight: ['matching x-height', 'taller x-height', 'shorter x-height'],
  widthLower: ['same width', 'wider', 'narrower'],
  contrast: ['same stroke contrast', 'more even strokes', 'more contrast'],
  aperture: ['same apertures', 'more open', 'tighter apertures'],
  roundLower: ['same round bowls', 'rounder', 'more oval bowls'],
  ascender: ['same ascenders', 'taller ascenders', 'shorter ascenders'],
};

// "<what the candidate is>, <the trait it shares most>, <how it differs most>".
function describeMatch(candidate: FontRecord, queryZ: Float64Array, candidateZ: Float64Array): string {
  const traits = FEATURE_KEYS.flatMap((key, i) => {
    const words = TRAIT_WORDS[key];
    const diff = candidateZ[i] - queryZ[i];
    return words && Number.isFinite(diff) ? [{ words, diff }] : [];
  }).sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
  const parts = [styleOf(candidate)];
  const closest = traits[0];
  const furthest = traits[traits.length - 1];
  if (closest && Math.abs(closest.diff) < 0.35) parts.push(closest.words[0]);
  if (furthest && Math.abs(furthest.diff) > 0.6) {
    const word = furthest.diff > 0 ? furthest.words[1] : furthest.words[2];
    parts.push(Math.abs(furthest.diff) < 1.2 ? `slightly ${word}` : word);
  }
  return parts.join(', ');
}
