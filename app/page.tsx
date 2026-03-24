'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
        body: JSON.stringify({ url: targetUrl }),
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
        setError('No fonts found on this website');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-8 md:py-10">
      <div className="relative z-10">
        <HeroSection />

        <div className="mt-8">
          <SearchInput onSearch={handleSearch} loading={loading} />
        </div>

        <section className="mt-8 w-full px-5 md:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-(--text-3)">How It Works</h2>
            <ol className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
              <li className="text-sm leading-relaxed text-(--text-2)">
                <span className="numeric mr-1 text-(--brand-2)">1.</span>
                Extract active webfont assets.
              </li>
              <li className="hidden text-(--line-soft) md:block">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </li>
              <li className="text-sm leading-relaxed text-(--text-2)">
                <span className="numeric mr-1 text-(--brand-2)">2.</span>
                Preview with custom text.
              </li>
              <li className="hidden text-(--line-soft) md:block">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </li>
              <li className="text-sm leading-relaxed text-(--text-2)">
                <span className="numeric mr-1 text-(--brand-2)">3.</span>
                Match against free alternatives.
              </li>
            </ol>
          </div>
        </section>

        <section className="w-full px-5 pb-16 pt-10 md:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="mb-7 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {fonts.length > 0 && (
              <div className="mb-7 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-(--text-3)">
                  Found <span className="numeric text-foreground">{fonts.length}</span> {fonts.length === 1 ? 'font' : 'fonts'}
                </h2>
                <div className="w-full md:w-120">
                  <label htmlFor="preview-text" className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-(--text-3)">
                    Preview Text
                  </label>
                  <div className="relative">
                    <input
                      id="preview-text"
                      type="text"
                      value={previewText}
                      onChange={(event) => setPreviewText(event.target.value)}
                      placeholder="Type custom preview text"
                      className="w-full rounded-xl border border-(--line-soft) bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-(--text-3)"
                    />
                    {previewText && (
                      <button
                        type="button"
                        onClick={() => setPreviewText('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-3)"
                        aria-label="Clear preview text"
                      >
                        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {fonts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <FontGrid fonts={fonts} previewText={previewText} />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {searched && !loading && fonts.length === 0 && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="panel py-14 text-center"
                >
                  <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border border-(--line-soft) bg-(--surface-1)">
                    <svg className="size-7 text-(--text-3)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-(--text-2)">No fonts were detected for this URL.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <footer className="border-t border-(--line-soft) px-5 py-12 md:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-(--text-3)">
              Supports WOFF, WOFF2, TTF, and OTF
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-(--text-2)">
              Analyze Any Font is intended for research and testing. Identifying a font does not grant usage rights. Always confirm licensing with the original foundry before using fonts in production.
            </p>
            <p className="mt-6 text-xs text-(--text-3)">
              &copy; {new Date().getFullYear()} Analyze Any Font.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
