'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FontAlternative, FontInfo } from '../types';

interface FontCardProps {
  font: FontInfo;
  index: number;
  previewText?: string;
}

type DownloadState = 'idle' | 'loading' | 'success' | 'error';

function formatToExtension(format: string): string {
  const normalized = format.toUpperCase().replace(/\s+/g, '');
  if (normalized.includes('WOFF2')) return 'woff2';
  if (normalized.includes('WOFF')) return 'woff';
  if (normalized.includes('TRUETYPE') || normalized === 'TTF') return 'ttf';
  if (normalized.includes('OPENTYPE') || normalized === 'OTF') return 'otf';
  if (normalized.includes('EOT')) return 'eot';
  // Fall back to lowercase format token, stripped of non-alphanumerics
  const token = format.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'bin';
  return token;
}

function buildDownloadFilename(family: string, weight: string | undefined, format: string): string {
  const safeFamily = (family || 'font').replace(/\s+/g, '-').replace(/[^\w.-]+/g, '');
  const safeWeight = (weight || '400').replace(/\s+/g, '');
  return `${safeFamily}-${safeWeight}.${formatToExtension(format)}`;
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
  // Revoke after the browser has a chance to start the download
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export default function FontCard({ font, index, previewText }: FontCardProps) {
  const [fontLoaded, setFontLoaded] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [alternatives, setAlternatives] = useState<FontAlternative[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const isDataUrl = font.url.startsWith('data:');
  const canDownload = Boolean(font.url);
  const displayUrl = isDataUrl
    ? font.url
    : `/api/font?url=${encodeURIComponent(font.url)}&referer=${encodeURIComponent(font.referer || '')}`;
  const downloadFilename = buildDownloadFilename(font.family, font.weight, font.format);

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
      // Graceful fallback: try a direct anchor download (works for same-origin proxy)
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

  const downloadLabel =
    downloadState === 'loading'
      ? 'Downloading…'
      : downloadState === 'success'
        ? 'Downloaded'
        : downloadState === 'error'
          ? 'Retry download'
          : 'Download';

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
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-medium tracking-tight text-slate-900 group-hover:text-blue-900 transition-colors truncate">
              {font.family}
            </h3>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">
                {font.format.replace('TRUETYPE', 'TTF').replace('OPENTYPE', 'OTF')}
              </span>
              <span className="size-1 rounded-full bg-slate-300"></span>
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">
                {font.weight || '400'}
              </span>
              {font.style && font.style !== 'normal' && (
                <>
                  <span className="size-1 rounded-full bg-slate-300"></span>
                  <span className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">
                    {font.style}
                  </span>
                </>
              )}
            </div>
          </div>
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

        {/* Actions */}
        <div className="mt-auto space-y-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!canDownload || downloadState === 'loading'}
            aria-busy={downloadState === 'loading'}
            className={`
              w-full flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium
              shadow-sm transition-all
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1
              active:scale-[0.98]
              disabled:cursor-not-allowed disabled:opacity-60
              ${
                downloadState === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : downloadState === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                    : downloadState === 'loading'
                      ? 'border-white/40 bg-white/70 text-slate-500'
                      : 'border-white/40 bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900 hover:border-white/80'
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
            <p className="px-1 text-center text-[0.7rem] font-medium text-red-600" role="alert">
              {downloadError}
            </p>
          )}

          <button
            type="button"
            onClick={findAlternatives}
            disabled={loadingAlternatives}
            className="w-full group/btn flex items-center justify-between rounded-xl bg-white/80 p-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-white hover:text-slate-900 group-hover:border-white/80 border border-white/40"
          >
            <span className="flex items-center gap-2">
              <svg
                className="size-4 text-slate-400 group-hover/btn:text-blue-500 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
              {loadingAlternatives
                ? 'Analyzing structure...'
                : showAlternatives
                  ? 'Hide matches'
                  : 'Find similar free fonts'}
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
