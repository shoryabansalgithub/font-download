'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FontAlternative, FontInfo } from '../types';

interface FontCardProps {
  font: FontInfo;
  index: number;
  previewText?: string;
}

export default function FontCard({ font, index, previewText }: FontCardProps) {
  const [fontLoaded, setFontLoaded] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [alternatives, setAlternatives] = useState<FontAlternative[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);

  const isDataUrl = font.url.startsWith('data:');
  const displayUrl = isDataUrl
    ? font.url
    : `/api/font?url=${encodeURIComponent(font.url)}&referer=${encodeURIComponent(font.referer || '')}`;

  useEffect(() => {
    const fontId = `font-preview-${index}`;
    const existingStyle = document.getElementById(fontId);
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = fontId;
    style.textContent = `
      @font-face {
        font-family: 'PreviewFont${index}';
        src: url('${displayUrl}');
        font-weight: ${font.weight || 'normal'};
        font-style: ${font.style || 'normal'};
      }
    `;
    document.head.appendChild(style);

    const timeout = setTimeout(() => setFontLoaded(true), isDataUrl ? 120 : 760);

    return () => {
      clearTimeout(timeout);
      const el = document.getElementById(fontId);
      if (el) el.remove();
    };
  }, [displayUrl, font.style, font.weight, index, isDataUrl]);

  const findAlternatives = async () => {
    if (alternatives.length > 0) {
      setShowAlternatives((prev) => !prev);
      return;
    }

    setLoadingAlternatives(true);
    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family: font.family,
          weight: font.weight,
          style: font.style,
          url: font.url,
          referer: font.referer || '',
        }),
      });

      const data = await response.json();
      if (data.alternatives) {
        setAlternatives(data.alternatives);
        setShowAlternatives(true);
      }
    } catch {
      setAlternatives([]);
      setShowAlternatives(false);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  const formatBadgeStyle = (format: string): string => {
    const styles: Record<string, string> = {
      WOFF2: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      WOFF: 'bg-sky-50 text-sky-700 border border-sky-100',
      TRUETYPE: 'bg-violet-50 text-violet-700 border border-violet-100',
      TTF: 'bg-violet-50 text-violet-700 border border-violet-100',
      OPENTYPE: 'bg-amber-50 text-amber-700 border border-amber-100',
      OTF: 'bg-amber-50 text-amber-700 border border-amber-100',
      EOT: 'bg-rose-50 text-rose-700 border border-rose-100',
    };

    return styles[format.toUpperCase()] || 'bg-slate-100 text-slate-700 border border-slate-200';
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut', delay: index * 0.04 }}
      className="panel overflow-hidden"
    >
      <div className="p-5">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-foreground">{font.family}</h3>
            <p className="mt-0.5 truncate text-xs text-(--text-3)">{font.name}</p>
          </div>
          <span className={`rounded-md px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.06em] ${formatBadgeStyle(font.format)}`}>
            {font.format}
          </span>
        </header>

        <section className="mb-4 rounded-xl border border-(--line-soft) bg-(--surface-1) p-4">
          {fontLoaded ? (
            <p
              className="text-center text-[1.55rem] leading-relaxed text-foreground"
              style={{
                fontFamily: `'PreviewFont${index}', sans-serif`,
                fontStyle: font.style || 'normal',
                fontWeight: font.weight || 'normal',
              }}
            >
              {previewText || 'The quick brown fox jumps over the lazy dog'}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-10/12 animate-pulse rounded bg-slate-200" />
            </div>
          )}
        </section>

        <div className="mb-4 flex items-center gap-3 text-xs font-medium text-(--text-2)">
          <span className="rounded-md border border-(--line-soft) bg-(--surface-1) px-2 py-1 numeric">Weight {font.weight || '400'}</span>
          <span className="rounded-md border border-(--line-soft) bg-(--surface-1) px-2 py-1">Style {(font.style || 'normal').toLowerCase()}</span>
        </div>

        <motion.button
          type="button"
          onClick={findAlternatives}
          whileTap={{ scale: 0.97 }}
          disabled={loadingAlternatives}
          className={`w-full rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors duration-150 ${
            loadingAlternatives
              ? 'cursor-not-allowed bg-slate-100 text-slate-400'
              : 'bg-(--brand-soft) text-(--brand-2) hover:bg-[#dce9ff]'
          }`}
        >
          {loadingAlternatives ? 'Matching alternatives...' : alternatives.length > 0 ? (showAlternatives ? 'Hide alternatives' : 'Show alternatives') : 'Find free alternatives'}
        </motion.button>

        <AnimatePresence initial={false}>
          {showAlternatives && alternatives.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="mt-4 overflow-hidden border-t border-(--line-soft) pt-4"
            >
              <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-(--text-3)">Free alternatives</p>
              <div className="space-y-2">
                {alternatives.map((alt, altIndex) => (
                  <a
                    key={`${alt.family}-${altIndex}`}
                    href={alt.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-(--line-soft) bg-(--surface-1) px-3 py-2.5 transition-colors hover:bg-(--surface-2)"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{alt.family}</p>
                      {alt.similarity != null && alt.similarity > 0 && (
                        <span className="numeric rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.68rem] font-semibold text-slate-600">
                          {alt.similarity}%
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-(--text-3)">{alt.reason || alt.category || 'Google Fonts alternative'}</p>
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
