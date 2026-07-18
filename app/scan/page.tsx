'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ExtractStatus, FontFamily } from '../types';
import FontGrid from '../components/FontGrid';
import { parseWeightRange } from '../lib/font-grouping';

export const DEFAULT_SPECIMEN = 'You can change the text';

/**
 * The six faces the landing page floats behind its headline. Reusing exactly
 * that set makes the wait feel like the same product, and every one of them is
 * already loaded by the root layout or resolvable from the OS - nothing here
 * fetches a file to animate.
 */
const WAITING_FACES = [
  { name: 'Inter', stack: 'var(--font-inter), system-ui, sans-serif' },
  { name: 'Manrope', stack: 'var(--font-manrope), system-ui, sans-serif' },
  { name: 'Geist', stack: 'var(--font-geist), system-ui, sans-serif' },
  { name: 'Georgia', stack: 'Georgia, "Times New Roman", serif' },
  { name: 'System UI', stack: 'system-ui, -apple-system, sans-serif' },
  { name: 'Monospace', stack: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
];

function normalizeScanUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function sortFamilies(families: FontFamily[]): FontFamily[] {
  return [...families].sort((a, b) => a.family.localeCompare(b.family));
}

function humanizeExtractError(message: string, host: string): string {
  if (!message) return 'Something went wrong during extraction.';
  if (message === 'Invalid URL' || message === 'URL is required') {
    return "That address isn't a valid URL. Check it and try again.";
  }
  const fetchMatch = message.match(/^Failed to fetch website:\s*(.+)$/i);
  if (fetchMatch) {
    return `The site didn't respond (${fetchMatch[1]}).`;
  }
  if (/network|failed to fetch|load failed/i.test(message)) {
    return 'Network error. Check your connection and try again.';
  }
  if (message === 'Failed to extract fonts') {
    return host
      ? `Something went wrong reading the stylesheets on ${host}.`
      : 'Something went wrong during extraction.';
  }
  return message;
}

/** Total weight/style combinations across every family, for the header subtitle. */
function countVariants(families: FontFamily[]): number {
  return families.reduce((total, family) => total + family.variants.length, 0);
}

function hasVariable(families: FontFamily[]): boolean {
  return families.some(
    (family) => family.isVariable || family.variants.some((v) => parseWeightRange(v.weight).isRange)
  );
}

/* ── The measurement apparatus ──────────────────────────────────────────
   The landing page draws a dashed frame with corner registration marks
   around its "Aa". That frame is this product's one visual atom, so the
   results screen reuses it: holding a specimen while scanning, standing
   empty when a site has no webfonts, and broken when the scan failed. */

function RegistrationFrame({
  tone,
  children,
}: {
  tone: 'scanning' | 'empty' | 'error';
  children?: React.ReactNode;
}) {
  const markColor =
    tone === 'error'
      ? 'var(--danger)'
      : tone === 'empty'
        ? 'var(--scan-ink-5)'
        : 'var(--scan-accent)';
  const frameColor =
    tone === 'error'
      ? 'color-mix(in srgb, var(--danger) 32%, transparent)'
      : tone === 'empty'
        ? 'color-mix(in srgb, var(--scan-ink-5) 42%, transparent)'
        : 'color-mix(in srgb, var(--scan-accent) 32%, transparent)';

  // The scanning frame holds a full specimen line; the outcome frames hold a
  // fragment or nothing, and at the same width the empty one read as a
  // placeholder box rather than a diagram.
  const width = tone === 'scanning' ? 'max-w-[560px]' : 'max-w-[420px]';

  return (
    <div className={`relative mx-auto w-full ${width} px-3`}>
      <div
        className="relative flex min-h-[112px] items-center justify-center px-6 py-6 md:min-h-[136px]"
        style={{
          border: `1.5px dashed ${frameColor}`,
          // The error frame is severed on its right edge: the measurement stopped
          // partway, and the gap says so before any copy is read.
          borderRightColor: tone === 'error' ? 'transparent' : frameColor,
        }}
      >
        {/* Corner registration marks */}
        {(
          [
            ['-top-[5px] -left-[5px]', 'tl'],
            ['-top-[5px] -right-[5px]', 'tr'],
            ['-bottom-[5px] -left-[5px]', 'bl'],
            ['-bottom-[5px] -right-[5px]', 'br'],
          ] as const
        ).map(([position, id]) => (
          <span
            key={id}
            aria-hidden
            className={`absolute ${position} size-[9px] bg-white`}
            style={{ border: `1.75px solid ${markColor}` }}
          />
        ))}

        {/* Baseline: solid where type sits, absent where it doesn't. */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-[26px] h-px"
          style={{
            background:
              tone === 'empty'
                ? `repeating-linear-gradient(90deg, ${frameColor} 0 4px, transparent 4px 8px)`
                : frameColor,
          }}
        />

        <div className="relative w-full text-center">{children}</div>
      </div>

      {/* Names only the rule actually drawn. The earlier caption promised
          x-height and cap lines that were never rendered. */}
      <p className="mt-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--scan-ink-4)]">
        {tone === 'error' ? 'measurement interrupted' : 'baseline'}
      </p>
    </div>
  );
}

/* ── Waiting ────────────────────────────────────────────────────────────
   The scan is one request with no progress events, so any percentage or
   step list here would be invented. What is true is that we are looking at
   type - so the wait is spent showing type, one real face at a time. */

function ScanningPanel({
  host,
  elapsedMs,
  onCancel,
  reducedMotion,
}: {
  host: string;
  elapsedMs: number;
  onCancel: () => void;
  reducedMotion: boolean | null;
}) {
  const [faceIndex, setFaceIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setFaceIndex((prev) => (prev + 1) % WAITING_FACES.length);
    }, 1100);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const face = WAITING_FACES[faceIndex];
  const seconds = Math.floor(elapsedMs / 1000);

  return (
    <section
      aria-live="polite"
      aria-busy="true"
      className="panel flex flex-col items-center justify-center gap-6 px-5 py-10 md:py-14"
    >
      <RegistrationFrame tone="scanning">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={face.name}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="block truncate text-[34px] leading-[1.1] tracking-[-0.02em] text-[var(--scan-specimen)] md:text-[44px]"
            style={{ fontFamily: face.stack }}
          >
            Sphinx of black quartz
          </motion.span>
        </AnimatePresence>
      </RegistrationFrame>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-[15px] font-medium text-[var(--scan-ink-2)]">
          Reading stylesheets on{' '}
          <span className="font-mono text-[14px] text-[var(--scan-ink-1)]">{host || 'the page'}</span>
        </p>
        <p className="numeric font-mono text-[11.5px] uppercase tracking-[0.1em] text-[var(--scan-ink-4)]">
          {seconds < 1 ? 'starting' : `${seconds}s elapsed`}
        </p>
      </div>

      {elapsedMs >= 12000 && (
        <div className="flex flex-col items-center gap-2.5 text-center">
          <p className="max-w-[380px] text-[13px] text-[#6b7f98]">
            {elapsedMs >= 60000
              ? 'This site is taking unusually long. It may be blocking automated requests.'
              : 'Large sites can take up to a minute - their stylesheets often import others.'}
          </p>
          {elapsedMs >= 60000 && (
            <button
              type="button"
              onClick={onCancel}
              className="scan-focusable rounded-full border border-[var(--scan-line-1)] bg-white px-5 py-2 text-[13px] font-semibold text-[var(--scan-ink-2)] transition-colors duration-[140ms] hover:border-[#bccde4] hover:text-[var(--scan-ink-1)]"
            >
              Stop and scan another site
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* ── Nothing found / failed ─────────────────────────────────────────── */

function OutcomePanel({
  tone,
  title,
  body,
  headingRef,
  primary,
  secondary,
  reducedMotion,
}: {
  tone: 'empty' | 'error';
  title: string;
  body: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  primary: { label: string; onClick: () => void };
  secondary: { label: string; onClick: () => void };
  reducedMotion: boolean | null;
}) {
  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="panel flex flex-col items-center justify-center gap-6 px-5 py-10 text-center md:py-14"
    >
      <RegistrationFrame tone={tone}>
        {tone === 'error' ? (
          <span
            aria-hidden
            className="block text-[34px] leading-[1.1] tracking-[-0.02em] text-[var(--danger)] opacity-45 md:text-[44px]"
            style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
          >
            Sphinx of bla
          </span>
        ) : (
          <span className="sr-only">No glyphs were found on the baseline.</span>
        )}
      </RegistrationFrame>

      <div className="flex max-w-[440px] flex-col items-center gap-2">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-[20px] font-semibold tracking-[-0.015em] text-[var(--scan-ink-1)] outline-none md:text-[22px]"
        >
          {title}
        </h2>
        <p className="text-[14.5px] leading-relaxed text-[var(--scan-ink-2)]">{body}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={primary.onClick}
          className="scan-focusable rounded-full bg-[var(--scan-accent)] px-6 py-2.5 text-[13.5px] font-semibold text-white transition-[background-color,box-shadow] duration-[140ms] hover:bg-[var(--scan-accent-deep)] hover:shadow-[0_6px_18px_-8px_rgba(29,98,221,0.55)] active:scale-[0.98]"
        >
          {primary.label}
        </button>
        <button
          type="button"
          onClick={secondary.onClick}
          className="scan-focusable rounded-full border border-[var(--scan-line-1)] bg-white px-6 py-2.5 text-[13.5px] font-semibold text-[var(--scan-ink-2)] transition-colors duration-[140ms] hover:border-[#bccde4] hover:text-[var(--scan-ink-1)] active:scale-[0.98]"
        >
          {secondary.label}
        </button>
      </div>
    </motion.section>
  );
}

/* ── Chrome ─────────────────────────────────────────────────────────── */

function ScanBar({
  status,
  onBack,
  reducedMotion,
}: {
  status: ExtractStatus;
  onBack: () => void;
  reducedMotion: boolean | null;
}) {
  const dot: Record<ExtractStatus, string> = {
    loading: 'bg-[var(--scan-accent)]',
    success: 'bg-[var(--success)]',
    empty: 'bg-[var(--scan-ink-5)]',
    error: 'bg-[var(--danger)]',
  };

  // Sentence case, not shouted caps: this is a quiet status readout, not a badge.
  // The host is deliberately absent - the headline below already names it, and
  // printing it twice made the two compete.
  const label: Record<ExtractStatus, string> = {
    loading: 'Scanning',
    success: 'Analysis complete',
    empty: 'No fonts found',
    error: 'Scan failed',
  };

  return (
    <motion.nav
      initial={reducedMotion ? false : { y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      // Sits on the page's own background rather than a slab of its own: translucent
      // so the body gradient reads straight through it, with a hairline to separate
      // it from the rows once they scroll underneath.
      className="sticky top-0 z-50 border-b border-[rgba(215,226,241,0.65)] bg-[rgba(243,247,253,0.72)] backdrop-blur-[14px]"
    >
      <div className="mx-auto flex h-15 w-full max-w-[1180px] items-center justify-between gap-4 px-5 py-3 md:px-8">
        <button
          type="button"
          onClick={onBack}
          className="scan-focusable group flex h-9 items-center gap-2 rounded-full border border-[var(--scan-line-1)] bg-white/80 pl-2.5 pr-4 text-[12.5px] font-medium text-[var(--scan-ink-2)] transition-[background-color,border-color,color] duration-[140ms] hover:border-[#bccde4] hover:bg-white hover:text-[var(--scan-ink-1)] active:scale-[0.98]"
        >
          <svg
            className="size-3.5 shrink-0 transition-transform duration-[140ms] group-hover:-translate-x-[2px]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.25}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to scanner
        </button>

        <span
          role="status"
          aria-live="polite"
          className="flex shrink-0 items-center gap-2 text-[12.5px] font-medium text-[var(--scan-ink-3)]"
        >
          <span
            aria-hidden
            className={`size-[6px] shrink-0 rounded-full ${dot[status]} ${
              status === 'loading' ? 'motion-safe:animate-[scan-pulse_1.4s_ease-in-out_infinite]' : ''
            }`}
          />
          {label[status]}
        </span>
      </div>
    </motion.nav>
  );
}

/* ── Screen ─────────────────────────────────────────────────────────── */

function ScanResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const rawUrlParam = searchParams.get('url');

  const [families, setFamilies] = useState<FontFamily[]>([]);
  const [status, setStatus] = useState<ExtractStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewText, setPreviewText] = useState(DEFAULT_SPECIMEN);
  const [targetHost, setTargetHost] = useState('');
  const [normalizedUrl, setNormalizedUrl] = useState('');
  const [loadElapsedMs, setLoadElapsedMs] = useState(0);
  const errorHeadingRef = useRef<HTMLHeadingElement>(null);
  const emptyHeadingRef = useRef<HTMLHeadingElement>(null);
  const fetchIdRef = useRef(0);

  const goHome = useCallback(() => router.push('/'), [router]);

  const fetchFonts = useCallback(async (url: string) => {
    const requestId = ++fetchIdRef.current;
    setStatus('loading');
    setErrorMessage('');
    setFamilies([]);
    setLoadElapsedMs(0);

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (requestId !== fetchIdRef.current) return;

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract fonts');
      }

      const sortedFamilies = sortFamilies(data.families || []);
      setFamilies(sortedFamilies);
      setStatus(sortedFamilies.length === 0 ? 'empty' : 'success');
    } catch (err) {
      if (requestId !== fetchIdRef.current) return;
      const message =
        err instanceof TypeError
          ? 'Network error. Check your connection.'
          : err instanceof Error
            ? err.message
            : 'Something went wrong during extraction.';
      setErrorMessage(message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!rawUrlParam) {
      router.push('/');
      return;
    }

    const url = normalizeScanUrl(rawUrlParam);
    setNormalizedUrl(url);

    try {
      setTargetHost(new URL(url).hostname.replace(/^www\./, ''));
    } catch {
      setTargetHost(rawUrlParam);
    }

    void fetchFonts(url);
  }, [rawUrlParam, router, fetchFonts]);

  // Elapsed timer drives the honest "Ns elapsed" readout while scanning.
  useEffect(() => {
    if (status !== 'loading') {
      setLoadElapsedMs(0);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => setLoadElapsedMs(Date.now() - started), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status === 'error') {
      errorHeadingRef.current?.focus();
    } else if (status === 'empty') {
      emptyHeadingRef.current?.focus();
    }
  }, [status]);



  const retry = useCallback(() => {
    if (normalizedUrl) void fetchFonts(normalizedUrl);
  }, [normalizedUrl, fetchFonts]);

  const host = targetHost || rawUrlParam || 'this site';

  // Reads as one sentence ending in the host, so the headline stays a single
  // line and the eye lands on the site that was scanned.
  const headline = useMemo(() => {
    if (status === 'success') {
      const n = families.length;
      return `${n} ${n === 1 ? 'typeface' : 'typefaces'} extracted from`;
    }
    if (status === 'empty') return 'No webfonts found on';
    if (status === 'error') return "Couldn't read";
    return 'Scanning';
  }, [status, families.length]);

  const subline = useMemo(() => {
    if (status !== 'success') return null;
    const variants = countVariants(families);
    const parts = [variants === 1 ? '1 font file' : `${variants} font files`];
    if (hasVariable(families)) parts.push('variable axes');
    return parts.join(' · ');
  }, [status, families]);

  const friendlyError = humanizeExtractError(errorMessage, targetHost);

  return (
    <div className="scan-page min-h-screen pb-24 text-[var(--scan-ink-1)]">
      <ScanBar status={status} onBack={goHome} reducedMotion={reducedMotion} />

      <main className="mx-auto w-full max-w-[1180px] px-5 pt-10 md:px-8 md:pt-14">
        {/* The finding is the headline. Its position never moves between states,
            so loading -> success reads as an answer arriving, not a relayout. */}
        <header className="mb-7 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-baseline gap-x-2 text-[19px] font-normal leading-[1.3] tracking-[-0.015em] md:text-[23px]">
              <span className="text-[var(--scan-ink-2)]">{headline}</span>
              <span className="min-w-0 truncate text-[var(--scan-ink-1)]">{host}</span>
            </h1>
            {/* Height is reserved in every state so the answer arriving never
                shifts the grid underneath it. CLS on this screen must stay 0. */}
            <p
              className="mt-2 min-h-[16px] font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--scan-ink-4)]"
              aria-hidden={!subline}
            >
              {subline || ''}
            </p>
          </div>

        </header>

        <AnimatePresence mode="wait" initial={false}>
          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <ScanningPanel
                host={targetHost}
                elapsedMs={loadElapsedMs}
                onCancel={goHome}
                reducedMotion={reducedMotion}
              />
            </motion.div>
          )}

          {status === 'empty' && (
            <motion.div key="empty" exit={reducedMotion ? undefined : { opacity: 0 }}>
              <OutcomePanel
                tone="empty"
                title="Nothing sitting on the baseline"
                body={`${host} doesn't load any webfont files. It may set type in system fonts, block automated requests, or inject its fonts after the page settles.`}
                headingRef={emptyHeadingRef}
                primary={{ label: 'Scan another site', onClick: goHome }}
                secondary={{ label: 'Try again', onClick: retry }}
                reducedMotion={reducedMotion}
              />
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div key="error" exit={reducedMotion ? undefined : { opacity: 0 }}>
              <OutcomePanel
                tone="error"
                title="The scan stopped partway"
                body={friendlyError}
                headingRef={errorHeadingRef}
                primary={{ label: 'Retry scan', onClick: retry }}
                secondary={{ label: 'Scan another site', onClick: goHome }}
                reducedMotion={reducedMotion}
              />
            </motion.div>
          )}

          {status === 'success' && families.length > 0 && (
            <motion.div
              key="success"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <FontGrid
                families={families}
                previewText={previewText}
                onPreviewTextChange={setPreviewText}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function ScanSuspenseFallback() {
  return (
    <div className="scan-page min-h-screen pb-24 text-[var(--scan-ink-1)]">
      <div className="sticky top-0 z-50 border-b border-[rgba(215,226,241,0.6)] bg-[rgba(247,250,255,0.82)] backdrop-blur-[16px]">
        <div className="mx-auto flex h-15 w-full max-w-[1180px] items-center justify-between px-5 py-3.5 md:px-8">
          <div className="scan-shimmer h-4 w-24 rounded" />
          <div className="scan-shimmer h-4 w-32 rounded" />
        </div>
      </div>
      <main className="mx-auto w-full max-w-[1180px] px-5 pt-10 md:px-8 md:pt-14">
        <header className="mb-8 md:mb-10">
          <div className="scan-shimmer h-9 w-48 rounded-lg md:h-11 md:w-56" />
          <div className="mt-2 scan-shimmer h-9 w-64 rounded-lg md:h-11 md:w-80" />
        </header>
        <div className="panel min-h-[340px]" />
      </main>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<ScanSuspenseFallback />}>
      <ScanResults />
    </Suspense>
  );
}
