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

/* ── Waiting ────────────────────────────────────────────────────────────
   The scan is one request with no progress events, so any percentage or
   step list here would be invented. What is true is that we are looking at
   type - so the wait is spent showing type on the glass, one real face at
   a time, with a block cursor holding the machine's place. */

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
      className="panel flex flex-col items-center justify-center gap-8 px-5 py-14 md:py-20"
    >
      <div className="flex w-full max-w-[640px] items-baseline justify-center gap-3 px-3 text-[34px] md:text-[44px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={face.name}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="crt-phosphor block min-w-0 truncate leading-[1.15] tracking-[-0.01em]"
            style={{ fontFamily: face.stack }}
          >
            Sphinx of black quartz
          </motion.span>
        </AnimatePresence>
        <span aria-hidden className="crt-cursor shrink-0 self-center" />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--scan-ink-2)]">
          Reading stylesheets on{' '}
          <span className="text-[var(--scan-ink-1)]">{host || 'the page'}</span>
        </p>
        <p className="numeric font-[family-name:var(--font-jetbrains-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--scan-ink-4)]">
          {seconds < 1 ? 'starting' : `${seconds}s elapsed`}
        </p>
      </div>

      {elapsedMs >= 12000 && (
        <div className="flex flex-col items-center gap-2.5 text-center">
          <p className="max-w-[380px] text-[13px] text-[var(--scan-ink-4)]">
            {elapsedMs >= 60000
              ? 'This site is taking unusually long. It may be blocking automated requests.'
              : 'Large sites can take up to a minute - their stylesheets often import others.'}
          </p>
          {elapsedMs >= 60000 && (
            <button
              type="button"
              onClick={onCancel}
              className="scan-focusable rounded-full border border-[var(--scan-line-1)] bg-transparent px-5 py-2 text-[13px] font-semibold text-[var(--scan-ink-2)] transition-colors duration-[140ms] hover:border-[rgba(214,229,255,0.5)] hover:text-[var(--scan-ink-1)]"
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
      className="panel flex flex-col items-center justify-center gap-7 px-5 py-14 text-center md:py-20"
    >
      {/* The readout the machine was left holding: a specimen cut off
          mid-word for a failed scan, a bare cursor for an empty one. */}
      <div className="flex items-baseline justify-center gap-3 text-[34px] md:text-[44px]">
        {tone === 'error' ? (
          <span
            aria-hidden
            className="block leading-[1.15] tracking-[-0.01em] text-[var(--danger)] opacity-70"
            style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
          >
            Sphinx of bla
          </span>
        ) : (
          <span className="sr-only">No glyphs were found.</span>
        )}
        <span aria-hidden className="crt-cursor shrink-0 self-center opacity-60" />
      </div>

      <div className="flex max-w-[440px] flex-col items-center gap-2">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="crt-phosphor text-[20px] font-semibold tracking-[-0.015em] outline-none md:text-[22px]"
        >
          {title}
        </h2>
        <p className="text-[14.5px] leading-relaxed text-[var(--scan-ink-2)]">{body}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={primary.onClick}
          className="scan-focusable crt-key px-6 py-2.5 text-[13.5px] font-semibold text-[#16309E] transition-[filter] duration-[140ms] hover:brightness-105 active:scale-[0.98]"
        >
          {primary.label}
        </button>
        <button
          type="button"
          onClick={secondary.onClick}
          className="scan-focusable rounded-full border border-[var(--scan-line-1)] bg-transparent px-6 py-2.5 text-[13.5px] font-semibold text-[var(--scan-ink-2)] transition-colors duration-[140ms] hover:border-[rgba(214,229,255,0.5)] hover:text-[var(--scan-ink-1)] active:scale-[0.98]"
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

  // Instrument voice: the bar is the machine's status line, so it speaks in
  // the same small caps mono as every other piece of chrome. The host is
  // deliberately absent - the headline below already names it.
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
      className="sticky top-0 z-50 border-b border-[rgba(160,185,255,0.22)] bg-[rgba(14,19,130,0.55)] backdrop-blur-[14px]"
    >
      <div className="mx-auto flex h-15 w-full max-w-[1180px] items-center justify-between gap-4 px-5 py-3 md:px-8">
        <button
          type="button"
          onClick={onBack}
          className="scan-focusable group crt-key flex h-9 items-center gap-2 pl-3 pr-4 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-medium uppercase tracking-[0.1em] text-[#16309E] transition-[filter] duration-[140ms] hover:brightness-105 active:translate-y-px"
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
          className="flex shrink-0 items-center gap-2 font-[family-name:var(--font-jetbrains-mono)] text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--scan-ink-3)]"
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

  // The overline above the trophy: what the machine did, in its own voice.
  // The host below it is the headline - the site is the thing that was taken.
  const headline = useMemo(() => {
    if (status === 'success') {
      const n = families.length;
      return `${n} ${n === 1 ? 'typeface' : 'typefaces'} stolen from`;
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
        <header className="mb-8 md:mb-10">
          <h1 className="min-w-0">
            <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--scan-ink-3)]">
              {headline}
            </span>
            {/* The site's name gets the wordmark treatment: engraved into the
                case, set in the same light serif as the hero. */}
            <span className="crt-etched mt-1.5 block min-w-0 truncate font-[family-name:var(--font-newsreader)] text-[44px] font-light leading-[1.1] md:text-[60px]">
              {host}
            </span>
          </h1>
          {/* Height is reserved in every state so the answer arriving never
              shifts the grid underneath it. CLS on this screen must stay 0. */}
          <p
            className="mt-3 min-h-[16px] font-[family-name:var(--font-jetbrains-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--scan-ink-4)]"
            aria-hidden={!subline}
          >
            {subline || ''}
          </p>
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
      <div className="sticky top-0 z-50 border-b border-[rgba(160,185,255,0.22)] bg-[rgba(14,19,130,0.55)] backdrop-blur-[16px]">
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
