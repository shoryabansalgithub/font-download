import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { findGoogleFamily, indexGoogleFamilies, type GoogleFamilyIndex } from '../../lib/google-fonts';
import {
  groupFontFaces,
  inferDescriptorsFromFileName,
  normalizeFamilyName,
  type RawFontFace,
} from '../../lib/font-grouping';

const fontFaceRegex = /@font-face\s*\{([\s\S]*?)\}/gi;
const importRegex = /@import\s+(?:url\(['"]?|['"])([^'")]+\.css[^'")]*)(?:['"]?\)['"]?|['"])\s*[^;]*;/gi;

const fontFamilyRegex = /font-family\s*:\s*['"]?([^'";]+)['"]?/gi;
const srcRegex = /(?:^|[;{\s])src\s*:\s*([^;]+)/gi;
const weightRegex = /font-weight\s*:\s*([^;]+)/gi;
const styleRegex = /font-style\s*:\s*([^;]+)/gi;
const unicodeRangeRegex = /unicode-range\s*:\s*([^;]+)/gi;

// Legacy @font-face blocks declare `src` twice, an EOT-only line for old IE and
// then the real list. Browsers use the last declaration.
function lastDeclaration(block: string, regex: RegExp): string | undefined {
  let value: string | undefined;
  for (const match of block.matchAll(regex)) value = match[1];
  return value?.trim();
}

const embeddedAbsoluteUrl = /^\/+(https?:\/\/.+)$/i;

function resolveUrl(base: string, relative: string): string {
  try {
    if (relative.startsWith('data:')) return relative;
    // Some sites write `url(/https://cdn/x.woff2)`. Browsers resolve that against
    // the page origin and get a 404, so use the embedded absolute URL.
    const embedded = relative.match(embeddedAbsoluteUrl);
    if (embedded) return new URL(embedded[1]).href;
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

function getFormatFromUrl(url: string): string {
  const cleanUrl = url.split('?')[0].split('#')[0];
  const ext = cleanUrl.split('.').pop()?.toLowerCase();
  const formatMap: Record<string, string> = {
    'woff2': 'WOFF2',
    'woff': 'WOFF',
    'ttf': 'TrueType',
    'otf': 'OpenType',
    'eot': 'EOT',
    'svg': 'SVG'
  };
  return formatMap[ext || ''] || 'Unknown';
}

const fontSourceRegex = /url\s*\(\s*['"]?([^'")]+)['"]?\s*\)\s*(?:format\s*\(\s*['"]?([^'")]+)['"]?\s*\))?/gi;
const formatPreference = ['WOFF2', 'WOFF', 'OPENTYPE', 'TRUETYPE', 'OTF', 'TTF', 'EOT', 'SVG'];

function pickBestSource(src: string, baseUrl: string): { url: string; format: string } | null {
  const candidates: { url: string; format: string }[] = [];
  let match;
  const regexCopy = new RegExp(fontSourceRegex.source, 'gi');

  while ((match = regexCopy.exec(src)) !== null) {
    const rawUrl = match[1]?.trim();
    if (!rawUrl || rawUrl.startsWith('local(')) continue;
    const resolvedUrl = resolveUrl(baseUrl, rawUrl);
    const rawFormat = match[2]?.replace(/["']/g, '').trim().toUpperCase() || getFormatFromUrl(rawUrl);
    candidates.push({ url: resolvedUrl, format: rawFormat });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const aIndex = formatPreference.indexOf(a.format.toUpperCase());
    const bIndex = formatPreference.indexOf(b.format.toUpperCase());
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  return candidates[0];
}

function extractFontsFromCSS(css: string, baseUrl: string): { fonts: RawFontFace[], imports: string[] } {
  const fonts: RawFontFace[] = [];
  const imports: string[] = [];

  let importMatch;
  const importRegexCopy = new RegExp(importRegex.source, 'gi');
  while ((importMatch = importRegexCopy.exec(css)) !== null) {
    imports.push(resolveUrl(baseUrl, importMatch[1]));
  }

  let blockMatch;
  const fontFaceRegexCopy = new RegExp(fontFaceRegex.source, 'gi');
  while ((blockMatch = fontFaceRegexCopy.exec(css)) !== null) {
    const block = blockMatch[1];
    const familyValue = lastDeclaration(block, fontFamilyRegex);
    const srcValue = lastDeclaration(block, srcRegex);
    const weightValue = lastDeclaration(block, weightRegex);
    const styleValue = lastDeclaration(block, styleRegex);
    const unicodeRange = lastDeclaration(block, unicodeRangeRegex);

    if (!familyValue || !srcValue) continue;

    const family = normalizeFamilyName(familyValue);
    const bestSource = pickBestSource(srcValue, baseUrl);
    if (!bestSource) continue;

    const fileName = bestSource.url.startsWith('data:')
      ? 'embedded-font'
      : bestSource.url.split('/').pop()?.split('?')[0] || '';
    const name = fileName || `${family}-${bestSource.format}`;

    fonts.push({
      name,
      family,
      format: bestSource.format,
      url: bestSource.url,
      weight: weightValue || '400',
      style: styleValue || 'normal',
      unicodeRange
    });
  }

  return { fonts, imports };
}

let googleIndex: Promise<GoogleFamilyIndex> | null = null;

function googleFamilies(): Promise<GoogleFamilyIndex> {
  googleIndex ??= fs
    .readFile(path.join(process.cwd(), 'public', 'data', 'font-features.json'), 'utf-8')
    .then((text) => indexGoogleFamilies((JSON.parse(text) as { fonts: { family: string }[] }).fonts.map((f) => f.family)))
    .catch((error) => {
      console.error('Google Fonts list unavailable, no family is marked free:', error);
      return new Map();
    });
  return googleIndex;
}

const MAX_IMPORT_DEPTH = 3;

async function fetchAndParseCSS(url: string, depth: number = 0, fetchedUrls: Set<string> = new Set()): Promise<RawFontFace[]> {
  if (depth > MAX_IMPORT_DEPTH || fetchedUrls.has(url)) return [];
  fetchedUrls.add(url);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) return [];
    const css = await response.text();
    const { fonts, imports } = extractFontsFromCSS(css, url);

    const nestedFonts = await Promise.all(imports.map(i => fetchAndParseCSS(i, depth + 1, fetchedUrls)));
    return [...fonts, ...nestedFonts.flat()];
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const response = await fetch(targetUrl.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch website: ${response.status}` }, { status: 400 });
    }

    const html = await response.text();
    const allFonts: RawFontFace[] = [];
    const fetchedCssUrls = new Set<string>();

    const inlineStyleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let styleMatch;
    while ((styleMatch = inlineStyleRegex.exec(html)) !== null) {
      const { fonts, imports } = extractFontsFromCSS(styleMatch[1], targetUrl.href);
      allFonts.push(...fonts.map(f => ({ ...f, referer: targetUrl.href })));

      const importFonts = await Promise.all(imports.map(i => fetchAndParseCSS(i, 0, fetchedCssUrls)));
      const importFontsWithReferer = importFonts.flat().map(f => ({ ...f, referer: targetUrl.href }));
      allFonts.push(...importFontsWithReferer);
    }

    const linkTagRegex = /<link[^>]+>/gi;
    const relRegex = /rel=["']?([^"'\s]+)["']?/i;
    const hrefRegex = /href=["']?([^"'\s>]+)["']?/i;
    const asRegex = /as=["']?([^"'\s]+)["']?/i;

    let linkMatch;
    const initialCssUrls: string[] = [];

    while ((linkMatch = linkTagRegex.exec(html)) !== null) {
      const tag = linkMatch[0];
      const rel = tag.match(relRegex)?.[1].toLowerCase() || '';
      const href = tag.match(hrefRegex)?.[1] || '';
      const as = tag.match(asRegex)?.[1]?.toLowerCase() || '';

      if (!href) continue;
      const resolvedUrl = resolveUrl(targetUrl.href, href);

      if (rel === 'stylesheet' || (rel === 'preload' && as === 'style')) {
        initialCssUrls.push(resolvedUrl);
      } else if ((rel === 'preload' || rel === 'prefetch') && as === 'font') {
        const format = getFormatFromUrl(resolvedUrl);
        const name = resolvedUrl.split('/').pop()?.split('?')[0] || 'preloaded-font';
        // A preload hint carries no descriptors, so recover what we can from the
        // filename. If the same file also appears in a real @font-face, grouping
        // discards this guess in favour of the declared data.
        const inferred = inferDescriptorsFromFileName(name.split('.')[0] || 'Unknown Font');
        allFonts.push({
          name: name,
          family: inferred.family,
          format,
          url: resolvedUrl,
          weight: inferred.weight,
          style: inferred.style,
          referer: targetUrl.href,
          provenance: 'preload'
        });
      }
    }

    const linkedFonts = await Promise.all(initialCssUrls.map(u => fetchAndParseCSS(u, 0, fetchedCssUrls)));
    const fontsWithReferer = linkedFonts.flat().map(font => ({ ...font, referer: targetUrl.href }));
    allFonts.push(...fontsWithReferer);

    const google = await googleFamilies();
    const families = groupFontFaces(allFonts).map((family) => {
      const googleFonts = findGoogleFamily(google, family.family);
      return googleFonts ? { ...family, googleFonts } : family;
    });
    const totalVariants = families.reduce((sum, family) => sum + family.variants.length, 0);

    return NextResponse.json({
      families,
      totalFound: families.length,
      totalVariants,
      sourceUrl: targetUrl.href
    });

  } catch (error) {
    console.error('Font extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract fonts' }, { status: 500 });
  }
}
