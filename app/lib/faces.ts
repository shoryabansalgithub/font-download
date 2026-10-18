import type { FontFamily, FontVariant } from '../types';
import { normalizeStyleValue, parseWeightRange, type WeightRange } from './font-grouping';

/** One face the site ships: a single @font-face (weight x style) backed by one file. */
export interface Face {
  /** Stable id that never embeds a data URI. */
  key: string;
  variant: FontVariant;
  italic: boolean;
  weight: WeightRange;
  /** "Regular 400", "Bold Italic 700", "Italic 400", "Variable 100–900", "450". */
  label: string;
  /** A single concrete weight usable in a CSS font shorthand. */
  renderWeight: number;
}

export interface FamilyFacts {
  faceCount: number;
  formats: string[];
  /** "100–900" for a variable family, else each shipped weight, the sixth onward folded into "+N". */
  weights: string[];
  hasItalic: boolean;
  isVariable: boolean;
}

export interface FormatInfo {
  ext: string;
  label: string;
  renderable: boolean;
}

const WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin',
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
};

const MAX_LISTED_WEIGHTS = 5;

// Order matters: CSS `format("embedded-opentype")` contains "opentype", and
// "woff2" contains "woff".
const FORMATS: [RegExp, FormatInfo][] = [
  [/woff2/, { ext: 'woff2', label: 'WOFF2', renderable: true }],
  [/woff/, { ext: 'woff', label: 'WOFF', renderable: true }],
  [/embedded|eot/, { ext: 'eot', label: 'EOT', renderable: false }],
  [/truetype|ttf/, { ext: 'ttf', label: 'TTF', renderable: true }],
  [/opentype|otf/, { ext: 'otf', label: 'OTF', renderable: true }],
  [/svg/, { ext: 'svg', label: 'SVG', renderable: false }],
];

export function formatInfo(format: string): FormatInfo {
  const key = (format || '').toLowerCase();
  const known = FORMATS.find(([pattern]) => pattern.test(key));
  if (known) return known[1];
  const token = key.replace(/[^a-z0-9]+/g, '') || 'bin';
  return { ext: token, label: token.toUpperCase().slice(0, 8), renderable: true };
}

export function hashFontId(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function urlFingerprint(url: string): string {
  return url.startsWith('data:') ? `data:${url.length}:${url.slice(-64)}` : url;
}

export function rangeText(weight: WeightRange): string {
  return `${weight.min}–${weight.max}`;
}

function labelOf(weight: WeightRange, italic: boolean): string {
  if (weight.isRange) return `${italic ? 'Variable Italic' : 'Variable'} ${rangeText(weight)}`;
  const name = WEIGHT_NAMES[weight.min];
  if (!name) return italic ? `Italic ${weight.min}` : String(weight.min);
  if (italic) return weight.min === 400 ? 'Italic 400' : `${name} Italic ${weight.min}`;
  return `${name} ${weight.min}`;
}

function faceOf(variant: FontVariant): Face {
  const weight = parseWeightRange(variant.weight);
  const italic = normalizeStyleValue(variant.style) !== 'normal';
  return {
    key: hashFontId(`${urlFingerprint(variant.url)}|${weight.min}-${weight.max}|${italic ? 'italic' : 'normal'}`),
    variant,
    italic,
    weight,
    label: labelOf(weight, italic),
    renderWeight: weight.isRange ? Math.min(Math.max(400, weight.min), weight.max) : weight.min,
  };
}

const facesCache = new WeakMap<FontFamily, Face[]>();

/** Every face of the family, upright before italic, then by weight. Memoised per family object. */
export function facesOf(family: FontFamily): Face[] {
  const cached = facesCache.get(family);
  if (cached) return cached;
  const byKey = new Map<string, Face>();
  for (const variant of family.variants) {
    const face = faceOf(variant);
    if (!byKey.has(face.key)) byKey.set(face.key, face);
  }
  const faces = Array.from(byKey.values()).sort(
    (a, b) => Number(a.italic) - Number(b.italic) || a.weight.min - b.weight.min,
  );
  facesCache.set(family, faces);
  return faces;
}

export function leadFace(family: FontFamily): Face {
  const faces = facesOf(family);
  return (
    faces.find((face) => face.variant.url === family.representative.url && !face.italic) ??
    faces.find((face) => !face.italic) ??
    faces[0]
  );
}

function weightTokens(faces: Face[]): string[] {
  const variable = faces.filter((face) => face.weight.isRange);
  if (variable.length > 0) {
    return [
      rangeText({
        min: Math.min(...variable.map((face) => face.weight.min)),
        max: Math.max(...variable.map((face) => face.weight.max)),
        isRange: true,
      }),
    ];
  }
  const weights = Array.from(new Set(faces.map((face) => face.weight.min))).sort((a, b) => a - b);
  const listed = weights.slice(0, MAX_LISTED_WEIGHTS).map(String);
  const rest = weights.length - MAX_LISTED_WEIGHTS;
  return rest > 0 ? [...listed, `+${rest}`] : listed;
}

export function familyFacts(family: FontFamily): FamilyFacts {
  const faces = facesOf(family);
  return {
    faceCount: faces.length,
    formats: Array.from(new Set(family.variants.map((v) => formatInfo(v.format).label))),
    weights: weightTokens(faces),
    hasItalic: faces.some((face) => face.italic),
    isVariable: faces.some((face) => face.weight.isRange),
  };
}
