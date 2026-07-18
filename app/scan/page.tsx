'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { FontFamily } from '../types';
import FontGrid from '../components/FontGrid';

type ExtractStatus = 'loading' | 'success' | 'empty' | 'error';

const SPECIMEN_MAX = 120;
const DEFAULT_SPECIMEN = 'Sphinx of black quartz, judge my vow';

function normalizeScanUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function sortFamilies(families: FontFamily[]): FontFamily[] {
  return [...families].sort((a, b) => a.family.localeCompare(b.family));
}

function normalizeFormatToken(format: string): string {
  const key = format.toLowerCase().replace(/[^a-z0-9]/g, '');
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
  return format.toUpperCase().slice(0, 10);
}

function humanizeExtractError(message: string, host: string): string {
  if (!message) return 'Something went wrong during extraction.';
  if (message === 'Invalid URL' || message === 'URL is required') {
    return "That URL isn't valid. Check the address and try again.";
  }
  const fetchMatch = message.match(/^Failed to fetch website:\s*(.+)$/i);
  if (fetchMatch) {
    return `We couldn't reach the site (${fetchMatch[1]}).`;
  }
  if (/network|failed to fetch|load failed/i.test(message)) {
    return 'Network error. Check your connection.';
  }
  if (message === 'Failed to extract fonts') {
    return host
      ? `Something went wrong extracting fonts from ${host}.`
      : 'Something went wrong during extraction.';
  }
  return message;
}

function uniqueFormats(families: FontFamily[]): string[] {
  const seen = new Set<string>();
  for (const family of families) {
    for (const format of family.formats) {
      seen.add(normalizeFormatToken(format || ''));
    }
  }
  return Array.from(seen).filter(Boolean);
}

function ScanShellChrome({
  statusLabel,
  statusKind,
  targetHost,
  fullUrl,
  onBack,
  reducedMotion,
}: {
  statusLabel: string;
  statusKind: ExtractStatus;
  targetHost: string;
  fullUrl: string;
  onBack: () => void;
  reducedMotion: boolean | null;
}) {
  const pillStyles: Record<ExtractStatus, string> = {
    loading: 'bg-[#fff7ed] border-[#fed7aa] text-[#c2410c]',
    success: 'bg-[#ecfdf5] border-[#a7f3d0] text-[#15855f]',
    empty: 'bg-[#fff7ed] border-[#fed7aa] text-[#c2410c]',
    error: 'bg-[#fef2f2] border-[#fecaca] text-[#bf3f4a]',
  };
  const dotStyles: Record<ExtractStatus, string> = {
    loading: 'bg-[#f59e0b]',
    success: 'bg-[#10b981]',
    empty: 'bg-[#f59e0b]',
    error: 'bg-[#f43f5e]',
  };

  return (
    <motion.nav
      initial={reducedMotion ? false : { y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[rgba(215,226,241,0.7)] bg-[rgba(255,255,255,0.78)] px-6 backdrop-blur-[20px] md:px-10"
    >
      <button
        type="button"
        onClick={onBack}
        className="scan-focusable group flex min-h-9 min-w-9 items-center gap-2 rounded-lg text-[13px] font-semibold text-[#3f536d] transition-colors duration-[120ms] hover:text-[#102035]"
      >
        <svg
          className="size-4 shrink-0 transition-transform duration-[120ms] group-hover:-translate-x-[3px]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        <span className="sm:hidden">Back</span>
        <span className="hidden sm:inline">Back to scanner</span>
      </button>

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <span
          role="status"
          aria-live="polite"
          className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 pl-2 text-[11px] font-bold uppercase tracking-[0.08em] ${pillStyles[statusKind]}`}
        >
          <span className="relative flex size-2">
            {statusKind === 'loading' && (
              <span
                className={`absolute inline-flex size-full rounded-full ${dotStyles.loading} opacity-75 motion-safe:animate-[scan-pulse_1.2s_ease-in-out_infinite]`}
              />
            )}
            <span className={`relative inline-flex size-2 rounded-full ${dotStyles[statusKind]}`} />
          </span>
          {statusLabel}
        </span>

        {(targetHost || fullUrl) && (
          <span
            title={fullUrl || targetHost}
            className="hidden max-w-[min(48vw,280px)] truncate rounded-lg border border-[#d7e2f1] bg-white px-2.5 py-1.5 font-mono text-[12px] font-medium text-[#102035] sm:inline-block"
          >
            {targetHost || fullUrl}
          </span>
        )}
      </div>
    </motion.nav>
  );
}

function SpecimenControl({
  value,
  onChange,
  toast,
}: {
  value: string;
  onChange: (next: string, truncated: boolean) => void;
  toast: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex w-full flex-col gap-1.5 md:w-auto md:min-w-[320px] md:max-w-[400px]">
      <label
        htmlFor="preview-text"
        className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#6b7f98]"
      >
        Specimen
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id="preview-text"
          type="text"
          value={value}
          maxLength={SPECIMEN_MAX}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw.length > SPECIMEN_MAX) {
              onChange(raw.slice(0, SPECIMEN_MAX), true);
            } else {
              onChange(raw, false);
            }
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData('text');
            if (pasted.length > SPECIMEN_MAX) {
              event.preventDefault();
              onChange(pasted.slice(0, SPECIMEN_MAX), true);
            }
          }}
          placeholder="Type to preview all fonts…"
          className="scan-focusable h-11 w-full rounded-xl border border-[#d7e2f1] bg-white pl-3.5 pr-10 text-[15px] font-medium text-[#102035] outline-none transition-shadow placeholder:font-normal placeholder:text-[#94a3b8] focus:border-[#1d62dd] focus:shadow-[0_0_0_4px_rgba(29,98,221,0.12)]"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('', false);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            className="scan-focusable absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#f1f5f9] text-[#94a3b8] transition-colors hover:bg-[#e2e8f0] hover:text-[#475569]"
            aria-label="Clear specimen"
          >
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {toast && (
        <p className="text-[12px] font-medium text-[#d97706]" role="status">
          {toast}
        </p>
      )}
    </div>
  );
}

function SkeletonGrid({ reducedMotion }: { reducedMotion: boolean | null }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.18,
            delay: reducedMotion ? 0 : Math.min(i, 3) * 0.08,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="flex h-[300px] flex-col overflow-hidden rounded-[20px] border border-[rgba(215,226,241,0.85)] bg-[rgba(255,255,255,0.45)] p-5"
        >
          <div className="flex justify-between gap-3">
            <div className="scan-shimmer h-[22px] w-1/2 rounded-md" />
            <div className="scan-shimmer h-5 w-14 rounded-full" />
          </div>
          <div className="mt-2 scan-shimmer h-3.5 w-1/3 rounded-md" />
          <div className="mt-8 flex flex-1 flex-col justify-center gap-3">
            <div className="scan-shimmer h-[22px] w-[72%] rounded-md" />
            <div className="scan-shimmer h-[22px] w-[48%] rounded-md" />
          </div>
          <div className="mt-auto space-y-2">
            <div className="scan-shimmer h-11 w-full rounded-xl" />
            <div className="scan-shimmer h-11 w-full rounded-xl" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ScanResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const rawUrlParam = searchParams.get('url');

  const [families, setFamilies] = useState<FontFamily[]>([]);
  const [status, setStatus] = useState<ExtractStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewText, setPreviewText] = useState(DEFAULT_SPECIMEN);
  const [specimenToast, setSpecimenToast] = useState<string | null>(null);
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

      if (sortedFamilies.length === 0) {
        setStatus('empty');
      } else {
        setStatus('success');
      }
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
      const urlObj = new URL(url);
      setTargetHost(urlObj.hostname);
    } catch {
      setTargetHost(rawUrlParam);
    }

    void fetchFonts(url);
  }, [rawUrlParam, router, fetchFonts]);

  // Loading elapsed helper timers (12s / 60s copy)
  useEffect(() => {
    if (status !== 'loading') {
      setLoadElapsedMs(0);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => {
      setLoadElapsedMs(Date.now() - started);
    }, 1000);
    return () => window.clearInterval(id);
  }, [status]);

  // Focus error/empty panel heading when it appears
  useEffect(() => {
    if (status === 'error') {
      errorHeadingRef.current?.focus();
    } else if (status === 'empty') {
      emptyHeadingRef.current?.focus();
    }
  }, [status]);

  // Specimen toast auto-dismiss
  useEffect(() => {
    if (!specimenToast) return;
    const t = window.setTimeout(() => setSpecimenToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [specimenToast]);

  const handleSpecimenChange = (next: string, truncated: boolean) => {
    setPreviewText(next);
    if (truncated) {
      setSpecimenToast('Specimen limited to 120 characters');
    }
  };

  const statusLabel =
    status === 'loading'
      ? 'Analyzing source'
      : status === 'success'
        ? 'Analysis complete'
        : status === 'empty'
          ? 'No fonts found'
          : 'Analysis failed';

  const formatSummary = useMemo(() => {
    if (status !== 'success' || families.length === 0) return '';
    const formats = uniqueFormats(families);
    if (formats.length === 0 || formats.length > 3) return '';
    return formats.join(' · ');
  }, [families, status]);

  const countLabel =
    families.length === 1 ? 'typography' : 'typographies';

  const friendlyError = humanizeExtractError(errorMessage, targetHost);

  return (
    <div className="scan-page min-h-screen bg-[#f7faff] pb-24 text-[#102035]">
      <ScanShellChrome
        statusLabel={statusLabel}
        statusKind={status}
        targetHost={targetHost}
        fullUrl={normalizedUrl || rawUrlParam || ''}
        onBack={goHome}
        reducedMotion={reducedMotion}
      />

      <main className="mx-auto mt-10 w-full max-w-[1400px] px-6 md:px-10">
        <header className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-[36px] font-bold tracking-[-0.02em] text-[#102035] md:text-[48px]">
              Extracted assets
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[1.05rem] text-[#3f536d]">
              from{' '}
              <span
                title={normalizedUrl || rawUrlParam || undefined}
                className="max-w-[min(100%,420px)] truncate rounded-md border border-[#d7e2f1] bg-white px-2 py-0.5 font-mono text-sm text-[#102035] shadow-sm"
              >
                {targetHost || rawUrlParam}
              </span>
            </p>
          </div>

          <SpecimenControl
            value={previewText}
            onChange={handleSpecimenChange}
            toast={specimenToast}
          />
        </header>

        {status === 'loading' && (
          <>
            <SkeletonGrid reducedMotion={reducedMotion} />
            {loadElapsedMs >= 12000 && loadElapsedMs < 60000 && (
              <p className="mt-6 text-center text-[13px] text-[#6b7f98]">
                Large sites can take up to a minute…
              </p>
            )}
            {loadElapsedMs >= 60000 && (
              <div className="mt-6 flex flex-col items-center gap-2 text-center">
                <p className="text-[13px] text-[#6b7f98]">
                  Still working — you can go back and retry
                </p>
                <button
                  type="button"
                  onClick={goHome}
                  className="scan-focusable text-[13px] font-semibold text-[#1d62dd] underline-offset-2 hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}

        <AnimatePresence mode="wait">
          {status === 'empty' && (
            <motion.div
              key="empty"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex min-h-[36vh] flex-col items-center justify-center rounded-[20px] border border-[rgba(215,226,241,0.85)] bg-[rgba(255,255,255,0.7)] p-10 text-center backdrop-blur-xl"
            >
              <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-[#f1f5f9] text-[#6b7f98]">
                <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
                  />
                </svg>
              </div>
              <h2
                ref={emptyHeadingRef}
                tabIndex={-1}
                className="text-[20px] font-bold text-[#102035] outline-none"
              >
                No typography assets found
              </h2>
              <p className="mt-2 max-w-[420px] text-[14px] font-normal text-[#3f536d]">
                We couldn&apos;t detect webfonts on {targetHost || 'this site'}. The site may use
                system fonts, block automation, or load type late.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={goHome}
                  className="scan-focusable rounded-full bg-[#102035] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b]"
                >
                  Scan another URL
                </button>
                <button
                  type="button"
                  onClick={() => normalizedUrl && void fetchFonts(normalizedUrl)}
                  className="scan-focusable rounded-full border border-[#d7e2f1] bg-white px-6 py-2.5 text-sm font-semibold text-[#3f536d] transition-colors hover:border-[#bccde4] hover:text-[#102035]"
                >
                  Retry
                </button>
              </div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              key="error"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex min-h-[36vh] flex-col items-center justify-center rounded-[20px] border border-[#fecaca] bg-[#fff5f5] p-10 text-center backdrop-blur-xl"
            >
              <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-[#fee2e2] text-[#bf3f4a]">
                <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2
                ref={errorHeadingRef}
                tabIndex={-1}
                className="text-[20px] font-bold text-[#102035] outline-none"
              >
                Analysis failed
              </h2>
              <p className="mt-2 max-w-[420px] text-[14px] text-[#3f536d]">{friendlyError}</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => normalizedUrl && void fetchFonts(normalizedUrl)}
                  className="scan-focusable rounded-full bg-[#102035] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b]"
                >
                  Retry analysis
                </button>
                <button
                  type="button"
                  onClick={goHome}
                  className="scan-focusable rounded-full border border-[#d7e2f1] bg-white px-6 py-2.5 text-sm font-semibold text-[#3f536d] transition-colors hover:border-[#bccde4] hover:text-[#102035]"
                >
                  Scan another URL
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {status === 'success' && families.length > 0 && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <span
                className="text-[13px] font-semibold text-[#3f536d]"
                title="Sorted A–Z by family"
              >
                Found{' '}
                <span className="tabular-nums text-[#102035]">{families.length}</span>{' '}
                {countLabel}
              </span>
              {formatSummary && (
                <span className="hidden text-[12px] text-[#6b7f98] md:inline">{formatSummary}</span>
              )}
            </div>
            <div className="relative -mx-5 px-5 md:mx-0 md:px-0">
              <FontGrid families={families} previewText={previewText} />
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function ScanSuspenseFallback() {
  return (
    <div className="scan-page min-h-screen bg-[#f7faff] pb-24 text-[#102035]">
      <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[rgba(215,226,241,0.7)] bg-[rgba(255,255,255,0.78)] px-6 backdrop-blur-[20px] md:px-10">
        <div className="scan-shimmer h-5 w-28 rounded-md" />
        <div className="scan-shimmer h-6 w-36 rounded-full" />
      </div>
      <main className="mx-auto mt-10 w-full max-w-[1400px] px-6 md:px-10">
        <header className="mb-10">
          <div className="scan-shimmer h-10 w-64 rounded-lg md:h-12 md:w-80" />
          <div className="mt-3 scan-shimmer h-5 w-40 rounded-md" />
        </header>
        <SkeletonGrid reducedMotion={true} />
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
