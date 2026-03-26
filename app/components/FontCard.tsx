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

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
      className="group relative flex min-h-[320px] flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white/40 p-6 backdrop-blur-xl shadow-sm transition-all hover:bg-white/50 hover:shadow-md"
    >
      <div className="flex flex-col h-full flex-1">
        
        {/* Top Minimal Info */}
        <header className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-medium tracking-tight text-slate-900 group-hover:text-blue-900 transition-colors">
              {font.family}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">
                {font.format.replace('TRUETYPE', 'TTF').replace('OPENTYPE', 'OTF')}
              </span>
              <span className="size-1 rounded-full bg-slate-300"></span>
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">
                {font.weight || '400'}
              </span>
              {(font.style && font.style !== 'normal') && (
                <>
                  <span className="size-1 rounded-full bg-slate-300"></span>
                  <span className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">
                    {font.style}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Subtle Download Icon button conceptually added here instead of a format badge */}
          <a
            href={displayUrl}
            download={`${font.family.replace(/\s+/g, '-')}-${font.weight || '400'}.${font.format.toLowerCase()}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/60 text-slate-400 opacity-0 shadow-sm transition-all hover:bg-black hover:text-white group-hover:opacity-100"
            title="Download original file"
            onClick={() => {
              if (isDataUrl) return; // For data urls, right click save is preferred or a more complex decode
            }}
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        </header>

        {/* Specimen Showcase */}
        <section className="flex-1 flex flex-col justify-center py-6 min-h-[140px] relative">
          {fontLoaded ? (
            <p
              className="text-[2.25rem] leading-[1.1] tracking-tight text-slate-800 break-words line-clamp-3"
              style={{
                fontFamily: `'PreviewFont${index}', sans-serif`,
                fontStyle: font.style || 'normal',
                fontWeight: font.weight || 'normal',
              }}
            >
              {previewText || 'Aa'}
            </p>
          ) : (
            <div className="space-y-3 w-full">
              <div className="h-6 w-3/4 animate-pulse rounded-md bg-white/60"></div>
              <div className="h-6 w-1/2 animate-pulse rounded-md bg-white/60"></div>
            </div>
          )}
        </section>

        {/* Action Button */}
        <div className="mt-auto">
          <button
            type="button"
            onClick={findAlternatives}
            disabled={loadingAlternatives}
            className="w-full group/btn flex items-center justify-between rounded-xl bg-white/80 p-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-white hover:text-slate-900 group-hover:border-white/80 border border-white/40"
          >
            <span className="flex items-center gap-2">
              <svg className="size-4 text-slate-400 group-hover/btn:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              {loadingAlternatives ? 'Analyzing structure...' : showAlternatives ? 'Hide matches' : 'Find similar free fonts'}
            </span>
            {alternatives.length > 0 && !loadingAlternatives && !showAlternatives && (
              <span className="flex size-5 items-center justify-center rounded-full bg-blue-100 text-[0.65rem] font-bold text-blue-600">
                {alternatives.length}
              </span>
            )}
          </button>
        </div>

        {/* Alternatives Dropdown */}
        <AnimatePresence initial={false}>
          {showAlternatives && alternatives.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-1.5 rounded-xl bg-white/60 p-2 border border-white/60">
                {alternatives.map((alt, altIndex) => (
                  <a
                    key={`${alt.family}-${altIndex}`}
                    href={alt.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col rounded-lg bg-white/80 p-2.5 transition-colors hover:bg-white border border-transparent hover:border-blue-100 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">{alt.family}</span>
                      {alt.similarity && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
                          {alt.similarity}% match
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 text-[0.65rem] text-slate-500 uppercase tracking-wide">
                      {alt.reason || 'Google Fonts'}
                    </span>
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
