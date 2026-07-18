/**
 * Collapses the flat list of discovered `@font-face` declarations into one entry
 * per typeface family.
 *
 * A real stylesheet declares one `@font-face` per weight x style combination, so
 * a single family fans out into many raw faces. The same face also arrives more
 * than once when it is reachable through several stylesheets, `@import` chains,
 * or a `<link rel=preload as=font>` hint. Everything in here exists to turn that
 * raw stream back into "one family, N variants".
 */

import type { FontFamily, FontVariant } from '../types';

/** Where a raw face was discovered. Declared data always beats a preload guess. */
export type FontProvenance = 'declared' | 'preload';

/** A single discovered `@font-face`, before grouping. */
export interface RawFontFace {
    name: string;
    family: string;
    format: string;
    url: string;
    weight?: string;
    style?: string;
    referer?: string;
    provenance?: FontProvenance;
}

const WEIGHT_TOKENS: Record<string, number> = {
    thin: 100,
    hairline: 100,
    extralight: 200,
    ultralight: 200,
    light: 300,
    normal: 400,
    regular: 400,
    book: 400,
    roman: 400,
    medium: 500,
    semibold: 600,
    demibold: 600,
    demi: 600,
    bold: 700,
    extrabold: 800,
    ultrabold: 800,
    black: 900,
    heavy: 900,
    extrablack: 950,
    ultrablack: 950,
};

const STYLE_TOKENS: Record<string, string> = {
    italic: 'italic',
    ital: 'italic',
    oblique: 'oblique',
};

/** Longest-first so "semibold" is consumed before "bold". */
const WEIGHT_TOKEN_ENTRIES = Object.entries(WEIGHT_TOKENS).sort((a, b) => b[0].length - a[0].length);
const STYLE_TOKEN_ENTRIES = Object.entries(STYLE_TOKENS).sort((a, b) => b[0].length - a[0].length);

const FORMAT_PREFERENCE = ['WOFF2', 'WOFF', 'OPENTYPE', 'OTF', 'TRUETYPE', 'TTF', 'EOT', 'SVG'];

/** Build artefacts that cling to a preloaded font's filename. */
const BUILD_JUNK_TOKEN = /[-_. ]+(?:woff2|woff|ttf|otf|eot|svg|subset|latin|latinext|greek|cyrillic|vietnamese|p|s|v\d+)$/i;
const BUILD_HASH_TOKEN = /[-_. ]+[0-9a-z~]{8,}$/i;

export function normalizeFamilyName(family: string): string {
    return family.replace(/["']/g, '').replace(/\s+/g, ' ').trim();
}

/** Case- and separator-insensitive identity for a family name. */
function canonicalize(family: string): string {
    return family.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

interface WeightRange {
    min: number;
    max: number;
    isRange: boolean;
}

/** Parses a `font-weight` descriptor, including variable ranges like "100 900". */
export function parseWeightRange(weight: string | undefined): WeightRange {
    const raw = (weight || '').trim().toLowerCase();
    if (!raw) return { min: 400, max: 400, isRange: false };

    const numbers = raw.match(/\d{1,4}/g);
    if (numbers && numbers.length >= 2) {
        const values = numbers.map(Number).sort((a, b) => a - b);
        return { min: values[0], max: values[values.length - 1], isRange: true };
    }
    if (numbers && numbers.length === 1) {
        const value = Number(numbers[0]);
        return { min: value, max: value, isRange: false };
    }
    if (raw === 'bold') return { min: 700, max: 700, isRange: false };
    if (raw === 'bolder') return { min: 700, max: 700, isRange: false };
    if (raw === 'lighter') return { min: 300, max: 300, isRange: false };
    return { min: 400, max: 400, isRange: false };
}

function normalizeStyleValue(style: string | undefined): string {
    const raw = (style || '').trim().toLowerCase();
    if (!raw) return 'normal';
    if (raw.startsWith('italic')) return 'italic';
    if (raw.startsWith('oblique')) return 'oblique';
    return 'normal';
}

/**
 * Strips a trailing style/weight suffix from a family name, but only when the
 * suffix merely restates the face's own `font-style`/`font-weight` descriptors.
 *
 * "Inter Italic" declared `font-style: italic` is the Inter family; a family
 * genuinely *named* "Inter Italic" while sitting at `font-style: normal` is not,
 * and is left alone. Never strips a name down to nothing.
 */
export function stripRedundantDescriptorSuffix(
    family: string,
    weight: string | undefined,
    style: string | undefined
): string {
    const declaredStyle = normalizeStyleValue(style);
    const declaredWeight = parseWeightRange(weight);

    const weightCorroborates = (value: number) =>
        declaredWeight.isRange
            ? value >= declaredWeight.min && value <= declaredWeight.max
            : value === declaredWeight.min;

    let current = family.trim();

    for (let guard = 0; guard < 6; guard++) {
        const lower = current.toLowerCase();
        let next: string | null = null;

        for (const [token, value] of STYLE_TOKEN_ENTRIES) {
            if (lower.endsWith(token) && declaredStyle === value) {
                next = current.slice(0, current.length - token.length);
                break;
            }
        }

        if (next === null) {
            for (const [token, value] of WEIGHT_TOKEN_ENTRIES) {
                if (lower.endsWith(token) && weightCorroborates(value)) {
                    next = current.slice(0, current.length - token.length);
                    break;
                }
            }
        }

        if (next === null) {
            const numericSuffix = lower.match(/(\d{3})$/);
            if (numericSuffix && weightCorroborates(Number(numericSuffix[1]))) {
                next = current.slice(0, current.length - numericSuffix[1].length);
            }
        }

        if (next === null) break;

        const trimmed = next.replace(/[\s._-]+$/, '');
        if (!trimmed) break;
        current = trimmed;
    }

    return current;
}

/**
 * A preloaded font arrives with no descriptors at all - just a URL. Recovering
 * weight/style from the filename is far better than defaulting everything to
 * 400/normal, which would strand every preloaded face in its own bogus family.
 */
export function inferDescriptorsFromFileName(fileBase: string): {
    family: string;
    weight: string;
    style: string;
} {
    let current = fileBase.trim();

    for (let guard = 0; guard < 6; guard++) {
        const stripped = current.replace(BUILD_JUNK_TOKEN, '').replace(BUILD_HASH_TOKEN, '');
        if (stripped === current || !stripped) break;
        current = stripped;
    }

    let weight: number | null = null;
    let style: string | null = null;

    for (let guard = 0; guard < 6; guard++) {
        const lower = current.toLowerCase();
        let next: string | null = null;

        if (style === null) {
            for (const [token, value] of STYLE_TOKEN_ENTRIES) {
                if (lower.endsWith(token)) {
                    style = value;
                    next = current.slice(0, current.length - token.length);
                    break;
                }
            }
        }

        if (next === null && weight === null) {
            for (const [token, value] of WEIGHT_TOKEN_ENTRIES) {
                if (lower.endsWith(token)) {
                    weight = value;
                    next = current.slice(0, current.length - token.length);
                    break;
                }
            }
        }

        if (next === null) break;
        const trimmed = next.replace(/[\s._-]+$/, '');
        if (!trimmed) break;
        current = trimmed;
    }

    const family = current.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();

    return {
        family: family || fileBase,
        weight: weight === null ? '400' : String(weight),
        style: style === null ? 'normal' : style,
    };
}

function formatRank(format: string): number {
    const index = FORMAT_PREFERENCE.indexOf((format || '').toUpperCase());
    return index === -1 ? FORMAT_PREFERENCE.length : index;
}

/**
 * Ranks a variant for use as the family's preview + default download.
 * Prefers an upright regular (400), then the nearest available weight, then the
 * most broadly useful file format.
 */
function representativeScore(variant: FontVariant): number {
    const style = normalizeStyleValue(variant.style);
    const weight = parseWeightRange(variant.weight);

    // A variable face spanning 400 is exactly as good as a static 400.
    const distance = weight.isRange && weight.min <= 400 && weight.max >= 400
        ? 0
        : Math.abs((weight.isRange ? weight.min : weight.min) - 400);

    const uprightPenalty = style === 'normal' ? 0 : 10_000;
    // Break ties between equidistant weights (300 vs 500) toward the heavier one.
    const lighterPenalty = weight.min < 400 ? 1 : 0;

    return uprightPenalty + distance * 10 + lighterPenalty * 2 + formatRank(variant.format) * 0.01;
}

function variantSortKey(a: FontVariant, b: FontVariant): number {
    const aWeight = parseWeightRange(a.weight).min;
    const bWeight = parseWeightRange(b.weight).min;
    if (aWeight !== bWeight) return aWeight - bWeight;

    const aItalic = normalizeStyleValue(a.style) === 'normal' ? 0 : 1;
    const bItalic = normalizeStyleValue(b.style) === 'normal' ? 0 : 1;
    if (aItalic !== bItalic) return aItalic - bItalic;

    return formatRank(a.format) - formatRank(b.format);
}

/**
 * Groups raw faces into families.
 *
 * Order of operations matters: identical URLs collapse first (so a preload hint
 * yields to the real `@font-face` that describes the same file), then faces are
 * keyed by family, then duplicate weight/style/url triples inside a family are
 * dropped.
 */
export function groupFontFaces(faces: RawFontFace[]): FontFamily[] {
    // 1. One record per resolved URL, preferring declared data over preload guesses.
    const byUrl = new Map<string, RawFontFace>();
    for (const face of faces) {
        if (!face.url) continue;
        const existing = byUrl.get(face.url);
        if (!existing) {
            byUrl.set(face.url, face);
            continue;
        }
        const existingIsGuess = (existing.provenance || 'declared') === 'preload';
        const incomingIsGuess = (face.provenance || 'declared') === 'preload';
        if (existingIsGuess && !incomingIsGuess) {
            byUrl.set(face.url, face);
        }
    }

    interface Bucket {
        key: string;
        displayCounts: Map<string, number>;
        variants: FontVariant[];
        seenVariants: Set<string>;
    }

    const buckets = new Map<string, Bucket>();

    for (const face of byUrl.values()) {
        const rawFamily = normalizeFamilyName(face.family || '') || 'Unknown Font';
        const weight = (face.weight || '400').trim() || '400';
        const style = normalizeStyleValue(face.style);

        const displayFamily = stripRedundantDescriptorSuffix(rawFamily, weight, style);
        const key = canonicalize(displayFamily);
        if (!key) continue;

        let bucket = buckets.get(key);
        if (!bucket) {
            bucket = { key, displayCounts: new Map(), variants: [], seenVariants: new Set() };
            buckets.set(key, bucket);
        }

        bucket.displayCounts.set(displayFamily, (bucket.displayCounts.get(displayFamily) || 0) + 1);

        // 2. Drop repeats of the same weight/style/file inside the family.
        const variantKey = `${weight}|${style}|${face.url}`;
        if (bucket.seenVariants.has(variantKey)) continue;
        bucket.seenVariants.add(variantKey);

        bucket.variants.push({
            name: face.name,
            format: face.format,
            url: face.url,
            weight,
            style,
            referer: face.referer,
        });
    }

    const families: FontFamily[] = [];

    for (const bucket of buckets.values()) {
        if (bucket.variants.length === 0) continue;

        // Prefer the spelling the site used most; break ties toward the shortest.
        const family = Array.from(bucket.displayCounts.entries()).sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            if (a[0].length !== b[0].length) return a[0].length - b[0].length;
            return a[0].localeCompare(b[0]);
        })[0][0];

        const variants = [...bucket.variants].sort(variantSortKey);
        const representative = [...variants].sort(
            (a, b) => representativeScore(a) - representativeScore(b)
        )[0];

        const formats = Array.from(new Set(variants.map((v) => v.format).filter(Boolean)));
        const isVariable = variants.some((v) => parseWeightRange(v.weight).isRange);

        families.push({ family, variants, representative, formats, isVariable });
    }

    return families.sort((a, b) => a.family.localeCompare(b.family));
}
