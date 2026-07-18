'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FontAlternative, FontFamily } from '../types';
import { parseWeightRange } from '../lib/font-grouping';

interface FontCardProps {
  fontFamily: FontFamily;
  index: number;
  previewText?: string;
  cardKey?: string;
}

type DownloadState = 'idle' | 'loading' | 'success' | 'error';
type PreviewState = 'loading' | 'loaded' | 'fail';
type AlternativesState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

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
  return (format || 'FONT').toUpperCase().slice(0, 10);
}

export default function FontCard({ fontFamily, index, previewText, cardKey }: FontCardProps) {
  // Preview and download act on the family's representative variant (upright 400
  // where available); the rest of the family is summarised by the variant count.
  const font = fontFamily.representative;
  const variantCount = fontFamily.variants.length;
  const previewWeight = renderableWeight(font.weight);
  const reducedMotion = useReducedMotion();
  const [previewState, setPreviewState] = useState<PreviewState>('loading');
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [alternatives, setAlternatives] = useState<FontAlternative[]>([]);
  const [altState, setAltState] = useState<AlternativesState>('idle');
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [inView, setInView] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  const isDataUrl = font.url.startsWith('data:');
  const canDownload = Boolean(font.url);
  const displayUrl = isDataUrl
    ? font.url
    : `/api/font?url=${encodeURIComponent(font.url)}&referer=${encodeURIComponent(font.referer || '')}`;
  const downloadFilename = buildDownloadFilename(fontFamily.family, font.weight, font.format);

  const fontFaceId = useMemo(() => {
    const seed = `${font.url}|${font.weight || '400'}|${font.style || 'normal'}`;
    return hashFontId(seed);
  }, [font.url, font.weight, font.style]);

  const previewFamily = `PreviewFont${fontFaceId}`;

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
    const loadSpec = `${previewWeight} 48px "${previewFamily}"`;

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
  }, [inView, displayUrl, font.weight, font.style, fontFaceId, previewFamily, isDataUrl, previewWeight]);

  // Clear success / error banners after a short delay
  useEffect(() => {
    if (downloadState !== 'success' && downloadState !== 'error') return;
    const timeout = setTimeout(() => {
      setDownloadState('idle');
      setDownloadError(null);
    }, downloadState === 'success' ? 1600 : 3200);
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

    if (altState === 'error') {
      void fetchAlternatives();
      return;
    }

    void fetchAlternatives();
  };

  const handleRetryAlternatives = () => {
    setAlternatives([]);
    void fetchAlternatives();
  };

  const downloadLabel = !canDownload
    ? 'Unavailable'
    : downloadState === 'loading'
      ? 'Downloading…'
      : downloadState === 'success'
        ? 'Downloaded'
        : downloadState === 'error'
          ? 'Retry download'
          : 'Download';

  const altButtonLabel =
    altState === 'loading'
      ? 'Matching free fonts…'
      : showAlternatives && (altState === 'ready' || altState === 'empty' || altState === 'error')
        ? altState === 'empty' || altState === 'error'
          ? 'Hide'
          : 'Hide matches'
        : 'Find similar free fonts';

  const formatLabel = normalizeFormatDisplay(font.format);
  const variantLabel =
    variantCount > 1
      ? `${variantCount} variants`
      : fontFamily.isVariable
        ? 'Variable'
        : font.weight || '400';
  const styleLabel =
    font.style && font.style.toLowerCase() !== 'normal' && font.style.toLowerCase() !== 'unset'
      ? font.style
      : null;

  const staggerDelay = reducedMotion ? 0 : Math.min(index, 11) * 0.04;

  return (
    <motion.article
      ref={cardRef}
      data-card-key={cardKey}
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1], delay: staggerDelay }}
      whileHover={
        reducedMotion
          ? undefined
          : { scale: 1.008, transition: { duration: 0.16 } }
      }
      className="font-card group relative flex min-h-[300px] flex-col overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.55)] p-5 shadow-[0_1px_2px_rgba(16,32,53,0.04),0_8px_24px_-16px_rgba(16,32,53,0.12)] transition-[background,box-shadow] duration-[160ms] [@media(hover:hover)]:hover:bg-[rgba(255,255,255,0.82)] [@media(hover:hover)]:hover:shadow-[0_12px_32px_-18px_rgba(16,32,53,0.22)] focus-within:bg-[rgba(255,255,255,0.82)] focus-within:shadow-[0_12px_32px_-18px_rgba(16,32,53,0.22)]"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 300px' }}
    >
      <div className="flex h-full flex-1 flex-col">
        <header className="flex min-h-[52px] items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3
              title={fontFamily.family}
              className="truncate text-[18px] font-semibold tracking-[-0.01em] text-[#102035] transition-colors duration-[160ms] group-hover:text-[#0f4fbd]"
            >
              {fontFamily.family}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-0 gap-y-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#6b7f98]">
                {formatLabel}
              </span>
              <span className="mx-1.5 inline-block size-[3px] rounded-full bg-[#cbd5e1]" aria-hidden />
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#6b7f98]">
                {variantLabel}
              </span>
              {styleLabel && (
                <>
                  <span className="mx-1.5 inline-block size-[3px] rounded-full bg-[#cbd5e1]" aria-hidden />
                  <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#6b7f98]">
                    {styleLabel}
                  </span>
                </>
              )}
            </div>
          </div>
        </header>

        <section className="relative flex min-h-[120px] flex-1 flex-col justify-center py-5">
          {previewState === 'loading' && (
            <div className="w-full space-y-3" aria-hidden>
              <div className="scan-shimmer h-[22px] w-[72%] rounded-md bg-[#e8eef7]" />
              <div className="scan-shimmer h-[22px] w-[48%] rounded-md bg-[#e8eef7]" />
            </div>
          )}

          {previewState === 'loaded' && (
            <p
              className="line-clamp-3 text-[36px] leading-[1.12] tracking-[-0.02em] text-[#1e293b] opacity-0 animate-[scan-fade-in_160ms_ease-out_forwards] [overflow-wrap:anywhere] [word-break:break-word]"
              style={{
                fontFamily: `'${previewFamily}', ui-sans-serif, system-ui, sans-serif`,
                fontStyle: font.style || 'normal',
                fontWeight: previewWeight,
              }}
            >
              {previewText || 'Aa'}
            </p>
          )}

          {previewState === 'fail' && (
            <>
              <span className="absolute right-0 top-0 inline-flex h-5 items-center rounded-md bg-[#fef2f2] px-2 text-[10px] font-bold text-[#bf3f4a]">
                Preview unavailable
              </span>
              <p
                className="line-clamp-3 text-[36px] leading-[1.12] tracking-[-0.02em] text-[#1e293b] opacity-[0.55] [overflow-wrap:anywhere] [word-break:break-word]"
                style={{
                  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                  fontStyle: font.style || 'normal',
                  fontWeight: previewWeight,
                }}
              >
                {previewText || 'Aa'}
              </p>
            </>
          )}
        </section>

        <div className="mt-auto space-y-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!canDownload || downloadState === 'loading'}
            aria-busy={downloadState === 'loading'}
            className={`
              scan-focusable flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-semibold transition-all duration-[120ms]
              active:scale-[0.98]
              disabled:cursor-not-allowed
              ${
                !canDownload
                  ? 'bg-[#102035] text-white opacity-40'
                  : downloadState === 'success'
                    ? 'border border-[#a7f3d0] bg-[#ecfdf5] text-[#15855f]'
                    : downloadState === 'error'
                      ? 'border border-[#fecaca] bg-[#fef2f2] text-[#bf3f4a]'
                      : downloadState === 'loading'
                        ? 'bg-[#334155] text-[#e2e8f0] opacity-100'
                        : 'bg-[#102035] text-white hover:bg-[#1e293b] hover:shadow-[0_4px_12px_-4px_rgba(16,32,53,0.35)] active:bg-[#0b1220]'
              }
            `}
          >
            {downloadState === 'loading' ? (
              <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : downloadState === 'success' ? (
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            )}
            <span>{downloadLabel}</span>
          </button>

          {downloadError && (
            <p className="px-1 text-center text-[12px] font-medium text-[#bf3f4a]" role="alert">
              {downloadError}
            </p>
          )}

          <button
            type="button"
            onClick={handleAlternativesClick}
            disabled={altState === 'loading'}
            className={`
              scan-focusable group/btn flex h-11 w-full items-center justify-between rounded-xl border border-[#d7e2f1]
              bg-[rgba(255,255,255,0.88)] px-3 text-[13px] font-medium text-[#3f536d]
              transition-colors duration-[120ms]
              hover:bg-white hover:text-[#102035]
              disabled:cursor-not-allowed disabled:opacity-85
            `}
          >
            <span className="flex items-center gap-2">
              {altState === 'loading' ? (
                <svg className="size-3.5 animate-spin text-[#94a3b8]" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg
                  className="size-4 text-[#94a3b8] transition-colors group-hover/btn:text-[#1d62dd]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              )}
              {altButtonLabel}
            </span>
            {alternatives.length > 0 && altState === 'ready' && !showAlternatives && (
              <span className="flex size-[18px] items-center justify-center rounded-full bg-[#dbeafe] text-[10px] font-bold text-[#1d62dd]">
                {alternatives.length}
              </span>
            )}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {showAlternatives && altState !== 'idle' && altState !== 'loading' && (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
              exit={reducedMotion ? undefined : { opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.18 }}
              className="overflow-hidden"
            >
              {altState === 'ready' && alternatives.length > 0 && (
                <div className="space-y-1.5 rounded-xl border border-[rgba(215,226,241,0.85)] bg-[rgba(255,255,255,0.65)] p-2">
                  {alternatives.map((alt, altIndex) => (
                    <a
                      key={`${alt.family}-${altIndex}`}
                      href={alt.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="scan-focusable flex flex-col rounded-[10px] border border-transparent bg-white px-3 py-2.5 transition-colors hover:border-[#bfdbfe]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-[#102035]">{alt.family}</span>
                        {alt.similarity != null && (
                          <span className="rounded bg-[#eff6ff] px-1.5 py-0.5 text-[10px] font-bold text-[#1d62dd]">
                            {alt.similarity}% match
                          </span>
                        )}
                      </div>
                      <span className="mt-0.5 text-[11px] font-medium text-[#6b7f98]">
                        {alt.reason || 'Google Fonts'}
                      </span>
                    </a>
                  ))}
                </div>
              )}

              {altState === 'empty' && (
                <div className="rounded-xl border border-[rgba(215,226,241,0.85)] bg-[rgba(255,255,255,0.65)] px-4 py-5 text-center">
                  <p className="text-[13px] text-[#6b7f98]">No free matches found</p>
                  <p className="mt-1 text-[12px] text-[#6b7f98]">
                    Try another weight or a different site font.
                  </p>
                </div>
              )}

              {altState === 'error' && (
                <div className="rounded-xl border border-[rgba(215,226,241,0.85)] bg-[rgba(255,255,255,0.65)] px-4 py-5 text-center">
                  <p className="text-[13px] text-[#bf3f4a]">Couldn&apos;t match fonts</p>
                  <button
                    type="button"
                    onClick={handleRetryAlternatives}
                    className="scan-focusable mt-2 text-[13px] font-semibold text-[#1d62dd] underline-offset-2 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
