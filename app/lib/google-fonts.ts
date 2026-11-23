// Tokens that name a face of a family rather than the family itself.
const FACE_TOKENS = new Set([
  'regular', 'normal', 'roman', 'italic', 'oblique', 'bold', 'light', 'medium', 'book', 'thin', 'hairline',
  'black', 'heavy', 'semibold', 'demibold', 'extrabold', 'ultrabold', 'extralight', 'ultralight',
  'variable', 'vf', 'var', 'web', 'webfont', 'fallback',
  // Axis tags that variable-font file names carry, e.g. "MonaSansVF-wdth-wght-opsz".
  'wght', 'wdth', 'opsz', 'slnt', 'ital', 'grad',
]);

// "__Inter_Fallback_aaf875" -> "inter", "InterVariable" -> "inter",
// "sohne-buch-a1b2c3d4" -> "sohne buch", "MonaSansVF-wdth-wght-opsz" -> "mona sans".
export function normalizeFamilyName(name: string): string {
  return name
    .replace(/['"]/g, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(token => token && !FACE_TOKENS.has(token) && !/^v?\d+(\.\d+)*$/.test(token) && !(/^[0-9a-f]{6,}$/.test(token) && /\d/.test(token)))
    .join(' ');
}

const compact = (name: string) => normalizeFamilyName(name).replace(/ /g, '');

export type GoogleFamilyIndex = Map<string, string>;

export function indexGoogleFamilies(families: string[]): GoogleFamilyIndex {
  return new Map(families.map(family => [compact(family), family]));
}

/**
 * The Google Fonts family this font is, by exact name, or null. Every family
 * there ships under an open licence (OFL, Apache 2.0 or the Ubuntu Font
 * Licence), so a match means the font is free to use.
 */
export function findGoogleFamily(index: GoogleFamilyIndex, family: string): string | null {
  const key = compact(family);
  return (key && index.get(key)) || null;
}

export const googleSpecimenUrl = (family: string) => `https://fonts.google.com/specimen/${family.replace(/ /g, '+')}`;
