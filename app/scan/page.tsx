'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { FontInfo } from '../types';
import FontGrid from '../components/FontGrid';

function ScanResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlParam = searchParams.get('url');

  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewText, setPreviewText] = useState('Sphinx of black quartz, judge my vow');
  const [targetHost, setTargetHost] = useState('');

  useEffect(() => {
    if (!urlParam) {
      router.push('/');
      return;
    }

    try {
      const urlObj = new URL(urlParam.startsWith('http') ? urlParam : `https://${urlParam}`);
      setTargetHost(urlObj.hostname);
    } catch {
      setTargetHost(urlParam);
    }

    const fetchFonts = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlParam }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to extract fonts');
        }

        const sortedFonts = [...data.fonts].sort((a: FontInfo, b: FontInfo) => {
          const aIsItalic = a.style?.toLowerCase().includes('italic') ? 1 : 0;
          const bIsItalic = b.style?.toLowerCase().includes('italic') ? 1 : 0;
          if (aIsItalic !== bIsItalic) return aIsItalic - bIsItalic;

          const aWeight = parseInt(a.weight || '400', 10);
          const bWeight = parseInt(b.weight || '400', 10);
          return Math.abs(aWeight - 400) - Math.abs(bWeight - 400);
        });

        sortedFonts.sort((a: FontInfo, b: FontInfo) => a.family.localeCompare(b.family));
        setFonts(sortedFonts);

        if (sortedFonts.length === 0) {
          setError('No typography assets found on this website.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong during extraction.');
      } finally {
        setLoading(false);
      }
    };

    fetchFonts();
  }, [urlParam, router]);

  return (
    <div className="min-h-screen bg-[#f7faff] text-slate-900 pb-24">
      {/* Sleek Top Navigation Bar */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/60 bg-white/70 px-6 backdrop-blur-xl md:px-10"
      >
        <button
          onClick={() => router.push('/')}
          className="group flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900"
        >
          <svg className="size-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to scanner
        </button>
        <div className="flex items-center gap-2">
          <span className="flex size-2 relative">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${loading ? 'bg-amber-400' : fonts.length > 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
            <span className={`relative inline-flex size-2 rounded-full ${loading ? 'bg-amber-500' : fonts.length > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {loading ? 'Analyzing Source' : 'Analysis Complete'}
          </span>
        </div>
      </motion.nav>

      <main className="mx-auto mt-10 w-full max-w-[1400px] px-6 md:px-10">
        
        {/* Header Section */}
        <header className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-[2.25rem] font-bold tracking-tight text-slate-900 md:text-[3rem]">
              Extracted Assets
            </h1>
            <p className="mt-2 flex items-center gap-2 text-[1.1rem] text-slate-500">
              from <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 font-mono text-sm text-slate-700 shadow-sm">{targetHost || urlParam}</span>
            </p>
          </div>
          
          <div className="flex w-full flex-col gap-2 md:w-auto md:min-w-[320px]">
            <label htmlFor="preview-text" className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">
              Custom Specimen
            </label>
            <div className="relative">
              <input
                id="preview-text"
                type="text"
                value={previewText}
                onChange={(event) => setPreviewText(event.target.value)}
                placeholder="Type to preview all fonts..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-[0.95rem] font-medium text-slate-800 shadow-sm outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
              {previewText && (
                <button
                  type="button"
                  onClick={() => setPreviewText('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                  aria-label="Clear preview text"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex h-[320px] flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white/40 p-6 backdrop-blur-xl"
              >
                <div className="flex justify-between">
                  <div className="h-6 w-1/2 animate-pulse rounded-md bg-slate-200/60"></div>
                  <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200/60"></div>
                </div>
                <div className="mt-2 h-4 w-1/3 animate-pulse rounded-md bg-slate-200/40"></div>
                <div className="mt-8 flex flex-1 flex-col justify-center gap-3">
                  <div className="h-4 w-full animate-pulse rounded-md bg-slate-200/60"></div>
                  <div className="h-4 w-4/5 animate-pulse rounded-md bg-slate-200/60"></div>
                </div>
                <div className="mt-auto flex gap-2">
                  <div className="h-8 w-20 animate-pulse rounded-xl bg-slate-200/60"></div>
                  <div className="h-8 w-20 animate-pulse rounded-xl bg-slate-200/60"></div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Error State */}
        <AnimatePresence mode="wait">
          {!loading && error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex min-h-[40vh] flex-col items-center justify-center rounded-[2rem] border border-rose-100 bg-rose-50/50 p-10 text-center backdrop-blur-xl"
            >
              <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Analysis Failed</h3>
              <p className="mt-2 text-slate-600 max-w-md">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="mt-6 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105"
              >
                Scan another URL
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Grid */}
        {!loading && !error && fonts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm font-semibold tracking-wide text-slate-500">
                Found <span className="text-slate-900">{fonts.length}</span> active typographies
              </span>
            </div>
            {/* Reusing FontGrid but passing the preview text down */}
            <div className="relative -mx-5 px-5 md:mx-0 md:px-0">
              <FontGrid fonts={fonts} previewText={previewText} />
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f7faff] flex items-center justify-center">
        <div className="animate-spin size-8 border-4 border-slate-200 border-t-blue-600 rounded-full"></div>
      </div>
    }>
      <ScanResults />
    </Suspense>
  );
}