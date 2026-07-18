'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FontAlternative, FontFamily, FontVariant } from '../types';
import { parseWeightRange } from '../lib/font-grouping';

interface FontCardProps {
  fontFamily: FontFamily;
  index: number;
  previewText?: string;
  cardKey?: string;
  onPreviewTextChange?: (next: string) => void;
}

/** Longest specimen we will hold; past this the row stops being a specimen. */
const SPECIMEN_MAX = 120;

type DownloadState = 'idle' | 'loading' | 'success' | 'error';
type PreviewState = 'loading' | 'loaded' | 'fail';
type AlternativesState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

/** Weight stops offered for a variable face, clipped to its declared range. */
const VARIABLE_STOPS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

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

function weightName(weight: number): string {
  return WEIGHT_NAMES[weight] || String(weight);
}

function formatToExtension(format: string): string {
  const normalized = format.toUpperCase().replace(/\s+/g, '');
  if (normalized.includes('WOFF2')) return 'woff2';
  if (normalized.includes('WOFF')) return 'woff';
  if (normalized.includes('TRUETYPE') || normalized === 'TTF') return 'ttf';
  if (normalized.includes('OPENTYPE') || normalized === 'OTF') return 'otf';
  if (normalized.includes('EOT')) return 'eot';
  const token = format.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'bin';
  return token;
}

function buildDownloadFilename(family: string, weight: string | undefined, format: string): string {
  const safeFamily = (family || 'font').replace(/\s+/g, '-').replace(/[^\w.-]+/g, '');
  // A variable font spans a weight range, so "Inter-100900.woff2" would be nonsense.
  const safeWeight = parseWeightRange(weight).isRange
    ? 'Variable'
    : (weight || '400').replace(/\s+/g, '');
  return `${safeFamily}-${safeWeight}.${formatToExtension(format)}`;
}

/**
 * A single concrete weight for rendering. Variable fonts declare a range
 * ("100 900"), which is legal in an @font-face descriptor but invalid inside a
 * CSS `font` shorthand - passing it to document.fonts.load/check throws, which
 * previously made every variable font report "Preview unavailable".
 */
function renderableWeight(weight: string | undefined): string {
  const range = parseWeightRange(weight);
  if (!range.isRange) return String(range.min);
  return String(Math.min(Math.max(400, range.min), range.max));
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  if (!header || data === undefined) {
    throw new Error('Invalid data URL');
  }
  const isBase64 = /;base64/i.test(header);
  const mimeMatch = header.match(/^data:([^;,]*)/i);
  const mime = mimeMatch?.[1] || 'application/octet-stream';
  if (isBase64) {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(data)], { type: mime });
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/** Stable short hash for font face id / React keys (never embed full data URIs). */
export function hashFontId(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function normalizeFormatDisplay(format: string): string {
  const key = (format || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const map: Record<string, string> = {
    woff2: 'WOFF2',
    woff: 'WOFF',
    ttf: 'TTF',
    truetype: 'TTF',
    otf: 'OTF',
    opentype: 'OTF',
    eot: 'EOT',
    svg: 'SVG',
  };
  if (map[key]) return map[key];
  // "WOFF2-VARIATIONS" and friends: keep the leading token only.
  const head = (format || 'FONT').toUpperCase().split(/[^A-Z0-9]/)[0];
  return (map[head.toLowerCase()] || head || 'FONT').slice(0, 8);
}

/**
 * The matcher returns reasons that already lead with the score ("49% visual
 * match"), which would print the number twice next to the score chip. The chip
 * is the scannable one, so the reason gives up its copy of the figure.
 */
function trimReason(reason: string | undefined, similarity: number | null | undefined): string {
  const text = (reason || '').trim();
  if (!text) return 'Google Fonts';
  if (similarity == null) return text;
  const stripped = text.replace(/^\s*\d{1,3}\s*%\s*/, '');
  if (!stripped) return text;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function isUpright(style: string | undefined): boolean {
  const raw = (style || 'normal').toLowerCase();
  return raw === 'normal' || raw === 'unset' || raw === '';
}

/** One selectable step on the card's weight ramp. */
interface WeightStep {
  weight: number;
  /** The file that backs this step. Variable faces back every step with one file. */
  variant: FontVariant;
  /** True when the step is interpolated out of a variable face rather than its own file. */
  interpolated: boolean;
}

/**
 * Turns a family's variants into the ramp the card renders.
 *
 * A variable face spans a range with a single file, so it yields every stop
 * inside that range. Static faces yield exactly the weights the site declared -
 * inventing stops a site never shipped would promise files that do not exist.
 */
function buildWeightSteps(family: FontFamily, italic: boolean): WeightStep[] {
  const pool = family.variants.filter((v) => (italic ? !isUpright(v.style) : isUpright(v.style)));
  const source = pool.length > 0 ? pool : family.variants;

  const steps = new Map<number, WeightStep>();

  for (const variant of source) {
    const range = parseWeightRange(variant.weight);
    if (range.isRange) {
      for (const stop of VARIABLE_STOPS) {
        if (stop < range.min || stop > range.max) continue;
        if (!steps.has(stop)) steps.set(stop, { weight: stop, variant, interpolated: true });
      }
      continue;
    }
    // A real file always outranks an interpolated stop at the same weight.
    const existing = steps.get(range.min);
    if (!existing || existing.interpolated) {
      steps.set(range.min, { weight: range.min, variant, interpolated: false });
    }
  }

  return Array.from(steps.values()).sort((a, b) => a.weight - b.weight);
}

export default function FontCard({
  fontFamily,
  index,
  previewText,
  cardKey,
  onPreviewTextChange,
}: FontCardProps) {
  const reducedMotion = useReducedMotion();
  const [italic, setItalic] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState<number | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>('loading');
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [alternatives, setAlternatives] = useState<FontAlternative[]>([]);
  const [altState, setAltState] = useState<AlternativesState>('idle');
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [inView, setInView] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const specimenRef = useRef<HTMLParagraphElement>(null);

  const hasItalic = useMemo(
    () => fontFamily.variants.some((v) => !isUpright(v.style)),
    [fontFamily.variants]
  );
  const hasUpright = useMemo(
    () => fontFamily.variants.some((v) => isUpright(v.style)),
    [fontFamily.variants]
  );

  const steps = useMemo(() => buildWeightSteps(fontFamily, italic), [fontFamily, italic]);

  // The representative is the resting selection: an upright 400 where the site has one.
  const representativeWeight = parseWeightRange(fontFamily.representative.weight);
  const defaultWeight = useMemo(() => {
    if (steps.length === 0) return 400;
    const target = representativeWeight.isRange
      ? Math.min(Math.max(400, representativeWeight.min), representativeWeight.max)
      : representativeWeight.min;
    return steps.reduce((best, step) =>
      Math.abs(step.weight - target) < Math.abs(best.weight - target) ? step : best
    ).weight;
  }, [steps, representativeWeight.isRange, representativeWeight.min, representativeWeight.max]);

  const activeWeight =
    selectedWeight !== null && steps.some((s) => s.weight === selectedWeight)
      ? selectedWeight
      : defaultWeight;

  const activeStep = steps.find((s) => s.weight === activeWeight) || steps[0];
  const font = activeStep?.variant || fontFamily.representative;

  const isDataUrl = font.url.startsWith('data:');
  const canDownload = Boolean(font.url);
  const displayUrl = isDataUrl
    ? font.url
    : `/api/font?url=${encodeURIComponent(font.url)}&referer=${encodeURIComponent(font.referer || '')}`;
  const downloadFilename = buildDownloadFilename(
    fontFamily.family,
    activeStep?.interpolated ? font.weight : String(activeWeight),
    font.format
  );

  const fontFaceId = useMemo(() => {
    const seed = `${font.url}|${font.weight || '400'}|${font.style || 'normal'}`;
    return hashFontId(seed);
  }, [font.url, font.weight, font.style]);

  const previewFamily = `PreviewFont${fontFaceId}`;
  // Variable faces interpolate to the picked stop; static files render at their own weight.
  const renderWeight = activeStep?.interpolated
    ? String(activeWeight)
    : renderableWeight(font.weight);
  const renderStyle = isUpright(font.style) ? 'normal' : 'italic';

  /**
   * The specimen is edited in place, and every row shows the same string so the
   * faces stay comparable. React must not own the text node - re-rendering a
   * focused contentEditable collapses the caret to the start on every keystroke -
   * so the DOM is written directly, and never while this row is the one focused.
   */
  useEffect(() => {
    const el = specimenRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const next = previewText ?? '';
    if (el.textContent !== next) el.textContent = next;
  }, [previewText]);

  // Lazy-load when near viewport
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Real FontFace load + fail (not timer-as-success)
  useEffect(() => {
    if (!inView) return;

    let cancelled = false;
    const styleId = `font-preview-${fontFaceId}`;
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @font-face {
        font-family: '${previewFamily}';
        src: url('${displayUrl}');
        font-weight: ${font.weight || 'normal'};
        font-style: ${font.style || 'normal'};
        font-display: swap;
      }
    `;
    document.head.appendChild(style);

    setPreviewState('loading');

    const timeoutMs = isDataUrl ? 1500 : 4000;
    const loadSpec = `${renderStyle} ${renderWeight} 48px "${previewFamily}"`;

    const loadPromise =
      typeof document !== 'undefined' && document.fonts?.load
        ? document.fonts.load(loadSpec)
        : Promise.resolve([]);

    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      window.setTimeout(() => resolve('timeout'), timeoutMs);
    });

    Promise.race([loadPromise.then(() => 'loaded' as const), timeoutPromise])
      .then((result) => {
        if (cancelled) return;
        if (result === 'timeout') {
          setPreviewState('fail');
          return;
        }
        // Verify the face is actually available
        const check =
          typeof document !== 'undefined' && document.fonts?.check
            ? document.fonts.check(loadSpec)
            : true;
        setPreviewState(check ? 'loaded' : 'fail');
      })
      .catch(() => {
        if (!cancelled) setPreviewState('fail');
      });

    return () => {
      cancelled = true;
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [
    inView,
    displayUrl,
    font.weight,
    font.style,
    fontFaceId,
    previewFamily,
    isDataUrl,
    renderWeight,
    renderStyle,
  ]);

  // Clear success / error banners after a short delay
  useEffect(() => {
    if (downloadState !== 'success' && downloadState !== 'error') return;
    const timeout = setTimeout(
      () => {
        setDownloadState('idle');
        setDownloadError(null);
      },
      downloadState === 'success' ? 1600 : 3200
    );
    return () => clearTimeout(timeout);
  }, [downloadState]);

  const handleDownload = async () => {
    if (!canDownload || downloadState === 'loading') return;

    setDownloadState('loading');
    setDownloadError(null);

    try {
      let blob: Blob;

      if (isDataUrl) {
        blob = dataUrlToBlob(font.url);
      } else {
        const response = await fetch(displayUrl);
        if (!response.ok) {
          throw new Error(`Download failed (${response.status})`);
        }
        blob = await response.blob();
        if (!blob || blob.size === 0) {
          throw new Error('Empty font file');
        }
      }

      triggerBlobDownload(blob, downloadFilename);
      setDownloadState('success');
    } catch {
      try {
        if (!isDataUrl) {
          const a = document.createElement('a');
          a.href = displayUrl;
          a.download = downloadFilename;
          a.rel = 'noopener';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setDownloadState('success');
          return;
        }
      } catch {
        // fall through to error
      }
      setDownloadError('Download failed. Try again.');
      setDownloadState('error');
    }
  };

  const fetchAlternatives = useCallback(async () => {
    setAltState('loading');
    setShowAlternatives(true);
    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family: fontFamily.family,
          weight: font.weight,
          style: font.style,
          url: font.url,
          referer: font.referer || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAlternatives([]);
        setAltState('error');
        return;
      }

      const alts: FontAlternative[] = Array.isArray(data.alternatives) ? data.alternatives : [];
      setAlternatives(alts);
      setAltState(alts.length > 0 ? 'ready' : 'empty');
    } catch {
      setAlternatives([]);
      setAltState('error');
    }
  }, [fontFamily.family, font.weight, font.style, font.url, font.referer]);

  const handleAlternativesClick = () => {
    if (altState === 'loading') return;

    if (altState === 'ready' || altState === 'empty') {
      setShowAlternatives((prev) => !prev);
      return;
    }

    void fetchAlternatives();
  };

  const handleRetryAlternatives = () => {
    setAlternatives([]);
    void fetchAlternatives();
  };

  const formatLabel = normalizeFormatDisplay(font.format);
  const variantCount = fontFamily.variants.length;

  // The meta line states what the family *is*, in the order a designer reads it.
  const metaParts = [formatLabel];
  if (fontFamily.isVariable) {
    const range = fontFamily.variants
      .map((v) => parseWeightRange(v.weight))
      .find((r) => r.isRange);
    metaParts.push(range ? `Variable ${range.min}–${range.max}` : 'Variable');
  }
  metaParts.push(variantCount === 1 ? '1 file' : `${variantCount} files`);

  const downloadLabel = !canDownload
    ? 'Unavailable'
    : downloadState === 'loading'
      ? 'Saving'
      : downloadState === 'success'
        ? 'Saved'
        : downloadState === 'error'
          ? 'Retry'
          : 'Download';

  const altButtonLabel =
    altState === 'loading'
      ? 'Matching free fonts…'
      : showAlternatives && altState !== 'idle'
        ? 'Hide matches'
        : 'Find similar free fonts';

  const staggerDelay = reducedMotion ? 0 : Math.min(index, 7) * 0.04;
  const specimenFamily = `'${previewFamily}', ui-sans-serif, system-ui, sans-serif`;

  return (
    <motion.article
      ref={cardRef}
      data-card-key={cardKey}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1], delay: staggerDelay }}
      className="specimen-card group relative flex flex-col rounded-[20px] border border-[var(--scan-line-2)] bg-white transition-[border-color,box-shadow] duration-[160ms]"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 280px' }}
    >
      {/* Masthead: the family names itself, in itself. */}
      <header className="flex items-start justify-between gap-5 px-6 pt-5 md:px-9 md:pt-7">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3.5 gap-y-1">
          <h3
            title={fontFamily.family}
            className="min-w-0 max-w-full truncate text-[20px] leading-[1.2] text-[var(--scan-ink-1)] md:text-[23px]"
            style={
              previewState === 'loaded'
                ? { fontFamily: specimenFamily, fontWeight: renderWeight, fontStyle: renderStyle }
                : { fontWeight: 600, letterSpacing: '-0.015em' }
            }
          >
            {fontFamily.family}
          </h3>
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.09em] text-[var(--scan-ink-4)]">
            {metaParts.map((part, i) => (
              <span key={part} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden className="text-[var(--scan-line-1)]">/</span>}
                {part}
              </span>
            ))}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={!canDownload || downloadState === 'loading'}
          aria-busy={downloadState === 'loading'}
          aria-label={
            canDownload
              ? `Download ${fontFamily.family} ${weightName(activeWeight)}${italic ? ' Italic' : ''}`
              : 'Download unavailable'
          }
          className={`scan-focusable flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-semibold transition-[background-color,border-color,color,box-shadow] duration-[140ms] active:scale-[0.97] disabled:cursor-not-allowed ${
            !canDownload
              ? 'border-[var(--scan-line-1)] bg-white text-[var(--scan-ink-4)] opacity-70'
              : downloadState === 'success'
                ? 'border-[#a7e3c9] bg-[#eafaf3] text-[var(--success)]'
                : downloadState === 'error'
                  ? 'border-[#f4c3c7] bg-[#fdf1f2] text-[var(--danger)]'
                  : downloadState === 'loading'
                    ? 'border-[var(--scan-accent)] bg-[var(--scan-accent)] text-white'
                    : // Two-stage affordance: the row lighting up offers the action,
                      // hovering the button itself commits to it.
                      'border-[var(--scan-line-1)] bg-white text-[var(--scan-ink-2)] group-hover:border-[var(--scan-accent)] group-hover:bg-[var(--scan-accent)] group-hover:text-white hover:!border-[var(--scan-accent-deep)] hover:!bg-[var(--scan-accent-deep)] hover:!text-white'
          }`}
        >
          {downloadState === 'loading' ? (
            <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : downloadState === 'success' ? (
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />
            </svg>
          )}
          <span>{downloadLabel}</span>
        </button>
      </header>

      {/* The specimen. Full measure, set large: this is the whole reason to be here. */}
      <div className="relative px-6 py-7 md:px-9 md:py-9">
        {/* One element for all three preview states. A skeleton here reserved two
            lines while most specimens render one, so every card shrank the moment
            its font arrived and pushed the whole stack up. Setting the real text in
            a fallback face and crossfading to the real one keeps the box the same
            height throughout - and shows the words immediately instead of bars. */}
        <p
          ref={specimenRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="false"
          aria-label={`Specimen text for ${fontFamily.family}. Editable; changes every preview on the page.`}
          spellCheck={false}
          data-placeholder="Type something to preview"
          onInput={(event) => {
            const el = event.currentTarget;
            let text = el.textContent ?? '';
            if (text.length > SPECIMEN_MAX) {
              text = text.slice(0, SPECIMEN_MAX);
              el.textContent = text;
              // Typing past the cap would otherwise drop the caret to the start.
              const range = document.createRange();
              range.selectNodeContents(el);
              range.collapse(false);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
            onPreviewTextChange?.(text);
          }}
          onKeyDown={(event) => {
            // A specimen is one line: Enter commits rather than inserting a break.
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          onPaste={(event) => {
            // Paste as plain text: styled HTML would fight the face being judged.
            event.preventDefault();
            const pasted = event.clipboardData.getData('text').replace(/\s+/g, ' ');
            const el = event.currentTarget;
            const room = SPECIMEN_MAX - (el.textContent ?? '').length;
            if (room > 0) document.execCommand('insertText', false, pasted.slice(0, room));
            onPreviewTextChange?.(el.textContent ?? '');
          }}
          className="specimen-line line-clamp-3 rounded-sm text-[32px] leading-[1.1] tracking-[-0.02em] text-[var(--scan-specimen)] transition-opacity duration-[160ms] outline-none sm:text-[44px] lg:text-[58px] [overflow-wrap:anywhere]"
          style={{
            fontFamily:
              previewState === 'loaded' ? specimenFamily : 'ui-sans-serif, system-ui, sans-serif',
            fontWeight: renderWeight,
            fontStyle: renderStyle,
            opacity: previewState === 'loaded' ? 1 : previewState === 'fail' ? 0.4 : 0.22,
          }}
        />

        {previewState === 'fail' && (
          <span className="absolute right-6 top-2 rounded-full bg-[#fdf1f2] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--danger)] md:right-9">
            Preview blocked
          </span>
        )}
      </div>

      {/* Footer rail: the family's real range on the left, the escape hatch on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-[var(--scan-line-3)] px-6 py-3 md:px-9">
        {steps.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
            <span className="sr-only" id={`ramp-label-${fontFaceId}`}>
              Weights available in {fontFamily.family}
            </span>
            {/* Pulled back by the chips' own padding so the first weight sits on the
                same left edge as the family name and specimen above it. */}
            <div
              role="group"
              aria-labelledby={`ramp-label-${fontFaceId}`}
              className="-ml-2 flex flex-wrap items-center gap-x-0.5 gap-y-1.5"
            >
              {steps.map((step) => {
                const active = step.weight === activeWeight;
                return (
                  <button
                    key={step.weight}
                    type="button"
                    onClick={() => setSelectedWeight(step.weight)}
                    aria-pressed={active}
                    title={`${weightName(step.weight)} ${step.weight}${step.interpolated ? ' (variable)' : ''}`}
                    className={`scan-focusable numeric rounded-md px-2 py-1 text-[12.5px] leading-none tabular-nums transition-[background-color,color] duration-[120ms] ${
                      active
                        ? 'bg-[var(--scan-accent)] text-white'
                        : 'hover:bg-[var(--scan-wash)] hover:text-[var(--scan-ink-1)]'
                    }`}
                    style={{
                      fontWeight: step.weight,
                      // Optical, not mathematical: a 100 stroke lays down far less ink
                      // than a 700 one, so at uniform colour the light end read as
                      // disabled rather than thin. The thin end gets darker ink to
                      // even out perceived density across the ramp.
                      color: active
                        ? undefined
                        : step.weight <= 200
                          ? 'var(--scan-ink-2)'
                          : 'var(--scan-ink-3)',
                    }}
                  >
                    {step.weight}
                  </button>
                );
              })}

              {hasItalic && (
                <button
                  type="button"
                  onClick={() => setItalic((prev) => !prev)}
                  aria-pressed={italic}
                  disabled={!hasUpright && !italic}
                  title={italic ? 'Show upright' : 'Show italic'}
                  className={`scan-focusable ml-1.5 rounded-md px-2 py-1 text-[12.5px] italic leading-none transition-[background-color,color] duration-[120ms] ${
                    italic
                      ? 'bg-[var(--scan-accent)] text-white'
                      : 'text-[var(--scan-ink-3)] hover:bg-[var(--scan-wash)] hover:text-[var(--scan-ink-1)]'
                  }`}
                >
                  Italic
                </button>
              )}
            </div>
          </div>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={handleAlternativesClick}
          disabled={altState === 'loading'}
          aria-expanded={showAlternatives && altState !== 'idle' && altState !== 'loading'}
          className="scan-focusable group/alt flex shrink-0 items-center gap-2 rounded-lg py-1 text-[12.5px] font-medium text-[var(--scan-ink-3)] transition-colors duration-[120ms] hover:text-[var(--scan-accent-deep)] disabled:cursor-wait"
        >
          {altState === 'loading' ? (
            <svg className="size-3.5 shrink-0 animate-spin text-[var(--scan-ink-4)]" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg
              className="size-3.5 shrink-0 text-[var(--scan-ink-4)] transition-colors group-hover/alt:text-[var(--scan-accent)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              {/* Swap: this face out, a free one in. */}
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 20V5m0 0L3.5 8.5M7 5l3.5 3.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 4v15m0 0l3.5-3.5M17 19l-3.5-3.5" />
            </svg>
          )}
          {altButtonLabel}
          {alternatives.length > 0 && altState === 'ready' && !showAlternatives && (
            <span className="numeric rounded-full bg-[var(--brand-soft)] px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums text-[var(--scan-accent)]">
              {alternatives.length}
            </span>
          )}
        </button>
      </div>

      {downloadError && (
        <p className="px-6 pb-3 text-[12px] font-medium text-[var(--danger)] md:px-9" role="alert">
          {downloadError}
        </p>
      )}

      <AnimatePresence initial={false}>
        {showAlternatives && altState !== 'idle' && altState !== 'loading' && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--scan-line-3)] bg-[#fafcff] px-6 py-4 md:px-9">
              {altState === 'ready' && alternatives.length > 0 && (
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {alternatives.map((alt, altIndex) => (
                    <li key={`${alt.family}-${altIndex}`}>
                      <a
                        href={alt.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="scan-focusable flex h-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors duration-[120ms] hover:border-[#dbe7f8] hover:bg-white"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-[var(--scan-ink-1)]">
                            {alt.family}
                          </span>
                          <span className="mt-0.5 block truncate text-[11.5px] text-[var(--scan-ink-4)]">
                            {trimReason(alt.reason, alt.similarity)}
                          </span>
                        </span>
                        {alt.similarity != null && (
                          <span className="numeric shrink-0 font-mono text-[11px] font-bold tabular-nums text-[var(--scan-accent)]">
                            {alt.similarity}%
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              {altState === 'empty' && (
                <p className="text-[12.5px] text-[var(--scan-ink-4)]">
                  No close free match in the Google Fonts library.
                </p>
              )}

              {altState === 'error' && (
                <p className="flex items-center gap-2 text-[12.5px] text-[var(--danger)]">
                  Couldn&apos;t reach the matcher.
                  <button
                    type="button"
                    onClick={handleRetryAlternatives}
                    className="scan-focusable font-semibold text-[var(--scan-accent)] underline-offset-2 hover:underline"
                  >
                    Retry
                  </button>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
