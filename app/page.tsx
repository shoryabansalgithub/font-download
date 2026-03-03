'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import HeroSection from './components/HeroSection';
import SearchInput from './components/SearchInput';
import FontGrid from './components/FontGrid';
import { FontInfo } from './types';

export default function Home() {
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [previewText, setPreviewText] = useState('');

  const handleSearch = async (targetUrl: string) => {
    setLoading(true);
    setError('');
    setFonts([]);
    setSearched(true);

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract fonts');
      }

      const sortedFonts = [...data.fonts].sort((a: FontInfo, b: FontInfo) => {
        const aIsItalic = a.style?.toLowerCase().includes('italic') ? 1 : 0;
        const bIsItalic = b.style?.toLowerCase().includes('italic') ? 1 : 0;
        if (aIsItalic !== bIsItalic) return aIsItalic - bIsItalic;

        const aWeight = parseInt(a.weight || '400');
        const bWeight = parseInt(b.weight || '400');
        const aDiff = Math.abs(aWeight - 400);
        const bDiff = Math.abs(bWeight - 400);
        return aDiff - bDiff;
      });

      sortedFonts.sort((a: FontInfo, b: FontInfo) => a.family.localeCompare(b.family));
      setFonts(sortedFonts);

      if (sortedFonts.length === 0) {
        setError('No fonts found on this website');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-grid relative">
      {/* Top fade mask over grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(250,250,250,0.0) 0%, transparent 100%)'
      }} />

      {/* Top navigation bar */}
      <header className="relative z-20 border-b border-zinc-200/60 bg-white/70 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-zinc-950 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h7" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-zinc-800 tracking-tight">Font Analyzer</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-400 px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg font-medium">
              WOFF · WOFF2 · TTF · OTF
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10">
        {/* Hero */}
        <HeroSection />

        {/* Search */}
        <div className="mt-8">
          <SearchInput onSearch={handleSearch} loading={loading} />
        </div>

        {/* Results */}
        <section className="max-w-6xl mx-auto px-6 py-14">
          {/* Error */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results header + preview input */}
          <AnimatePresence mode="wait">
            {fonts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      {fonts.length} {fonts.length === 1 ? 'font' : 'fonts'} found
                    </span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300" />
                    <span className="text-xs text-zinc-400">sorted alphabetically</span>
                  </div>
                </div>

                {/* Custom preview text */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                    <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    placeholder="Custom preview text…"
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-all duration-150 shadow-sm"
                  />
                  {previewText && (
                    <button
                      onClick={() => setPreviewText('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-0.5 rounded"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Font Grid */}
          <AnimatePresence mode="wait">
            {fonts.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FontGrid fonts={fonts} previewText={previewText} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          <AnimatePresence mode="wait">
            {searched && !loading && fonts.length === 0 && !error && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center py-20"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-zinc-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-zinc-500">No fonts found on this website</p>
                <p className="text-xs text-zinc-400 mt-1">Try a different URL</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-200/80 mt-8 bg-white/50">
          <div className="max-w-5xl mx-auto px-6 py-12">
            <div className="flex flex-col sm:flex-row sm:items-start gap-8">
              {/* Brand */}
              <div className="shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded bg-zinc-950 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h7" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-zinc-800">Font Analyzer</span>
                </div>
                <p className="text-xs text-zinc-400">&copy; {new Date().getFullYear()} · Built for designers</p>
              </div>

              {/* Disclaimer */}
              <div className="flex-1 space-y-3 text-xs text-zinc-500 leading-relaxed border-l border-zinc-200 pl-8">
                <p className="font-medium text-zinc-600 uppercase tracking-wider text-[11px]">Disclaimer</p>
                <p>
                  A developer utility to inspect and identify typography used on the web for testing and research.
                </p>
                <p>
                  <span className="font-medium text-zinc-700">Respect licenses:</span> Identifying a font does not grant you a license to use it. Ensure you have the appropriate rights for any font you reuse.
                </p>
                <p>
                  <span className="font-medium text-zinc-700">No circumvention:</span> This tool only detects styles already sent to your browser. It does not bypass DRM or access private files.
                </p>
                <p>
                  <span className="font-medium text-zinc-700">User responsibility:</span> Please support type foundries by purchasing proper licenses for your projects.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
