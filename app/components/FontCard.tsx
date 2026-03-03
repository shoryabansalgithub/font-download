'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FontInfo, FontAlternative } from '../types';

interface FontCardProps {
    font: FontInfo;
    index: number;
    previewText?: string;
}

const FORMAT_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    WOFF2:    { label: 'WOFF2',    color: 'text-emerald-700', bg: 'bg-emerald-50',  dot: 'bg-emerald-400' },
    WOFF:     { label: 'WOFF',     color: 'text-blue-700',    bg: 'bg-blue-50',     dot: 'bg-blue-400' },
    TRUETYPE: { label: 'TTF',      color: 'text-violet-700',  bg: 'bg-violet-50',   dot: 'bg-violet-400' },
    TTF:      { label: 'TTF',      color: 'text-violet-700',  bg: 'bg-violet-50',   dot: 'bg-violet-400' },
    OPENTYPE: { label: 'OTF',      color: 'text-amber-700',   bg: 'bg-amber-50',    dot: 'bg-amber-400' },
    OTF:      { label: 'OTF',      color: 'text-amber-700',   bg: 'bg-amber-50',    dot: 'bg-amber-400' },
    EOT:      { label: 'EOT',      color: 'text-red-700',     bg: 'bg-red-50',      dot: 'bg-red-400' },
};

function getFormatConfig(format: string) {
    return FORMAT_CONFIG[format.toUpperCase()] || { label: format, color: 'text-zinc-600', bg: 'bg-zinc-100', dot: 'bg-zinc-400' };
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

        setTimeout(() => setFontLoaded(true), isDataUrl ? 100 : 800);

        return () => {
            const el = document.getElementById(fontId);
            if (el) el.remove();
        };
    }, [font, index, displayUrl, isDataUrl]);

    const findAlternatives = async () => {
        if (alternatives.length > 0) {
            setShowAlternatives(!showAlternatives);
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
                    referer: font.referer || ''
                })
            });

            const data = await response.json();
            if (data.alternatives) {
                setAlternatives(data.alternatives);
                setShowAlternatives(true);
            }
        } catch (error) {
            console.error('Failed to find alternatives:', error);
        } finally {
            setLoadingAlternatives(false);
        }
    };

    const fmt = getFormatConfig(font.format);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.4,
                ease: [0.23, 1, 0.32, 1],
                delay: Math.min(index * 0.04, 0.3)
            }}
            className="group relative bg-white rounded-2xl border border-zinc-200/70 hover:border-zinc-300 hover:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.1)] transition-all duration-200 overflow-hidden"
        >
            {/* Top accent line */}
            <div className={`h-px w-full ${fmt.dot} opacity-60`} />

            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-semibold text-zinc-900 truncate leading-snug" title={font.family}>
                            {font.family}
                        </h3>
                        <p className="text-xs text-zinc-400 truncate mt-0.5 font-mono" title={font.name}>
                            {font.name}
                        </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md ${fmt.bg} ${fmt.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${fmt.dot}`} />
                        {fmt.label}
                    </span>
                </div>

                {/* Font Preview */}
                <div className="mb-4 px-4 py-5 bg-zinc-50 rounded-xl min-h-[96px] flex items-center justify-center border border-zinc-100">
                    {fontLoaded ? (
                        <p
                            className="text-[22px] text-zinc-800 text-center leading-snug"
                            style={{
                                fontFamily: `'PreviewFont${index}', sans-serif`,
                                fontStyle: font.style || 'normal',
                                fontWeight: font.weight || 'normal'
                            }}
                        >
                            {previewText || 'The quick brown fox'}
                        </p>
                    ) : (
                        <div className="flex items-center gap-2 text-zinc-400">
                            <svg className="animate-spin w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-xs">Loading preview…</span>
                        </div>
                    )}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-100 text-xs text-zinc-500 font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h7" />
                        </svg>
                        {font.weight || '400'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-100 text-xs text-zinc-500 font-medium capitalize">
                        {font.style && font.style.toLowerCase() !== 'normal' ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                            </svg>
                        )}
                        {font.style || 'Normal'}
                    </span>
                </div>

                {/* Find Alternatives Button */}
                <motion.button
                    onClick={findAlternatives}
                    disabled={loadingAlternatives}
                    whileTap={{ scale: 0.98 }}
                    className={`
                        w-full py-2.5 px-4 text-xs font-medium rounded-xl
                        border transition-all duration-150 flex items-center justify-center gap-2
                        ${loadingAlternatives
                            ? 'border-zinc-100 bg-zinc-50 text-zinc-400 cursor-not-allowed'
                            : alternatives.length > 0 && showAlternatives
                                ? 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300'
                        }
                    `}
                >
                    {loadingAlternatives ? (
                        <>
                            <svg className="animate-spin w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Finding alternatives…
                        </>
                    ) : (
                        <>
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {alternatives.length > 0
                                ? (showAlternatives ? 'Hide Alternatives' : 'Show Free Alternatives')
                                : 'Find Free Alternatives'}
                            {alternatives.length > 0 && (
                                <span className="ml-auto text-zinc-400 tabular-nums">{alternatives.length}</span>
                            )}
                        </>
                    )}
                </motion.button>

                {/* Alternatives */}
                <AnimatePresence>
                    {showAlternatives && alternatives.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                            className="overflow-hidden"
                        >
                            <div className="mt-3 pt-3 border-t border-zinc-100">
                                <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2.5">
                                    Free Alternatives
                                </p>
                                <div className="space-y-1.5">
                                    {alternatives.map((alt, i) => (
                                        <motion.a
                                            key={i}
                                            href={alt.downloadUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="flex items-center justify-between p-2.5 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors duration-100 group/alt"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center shrink-0 text-[10px] font-bold text-zinc-500 group-hover/alt:border-zinc-300">
                                                    {alt.family.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium text-zinc-800 truncate group-hover/alt:text-zinc-900">
                                                        {alt.family}
                                                    </p>
                                                    {(alt.reason || alt.category) && (
                                                        <p className="text-[11px] text-zinc-400 truncate">
                                                            {alt.reason || alt.category}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                {alt.similarity != null && alt.similarity > 0 && (
                                                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
                                                        alt.similarity >= 80 ? 'bg-emerald-50 text-emerald-600' :
                                                        alt.similarity >= 60 ? 'bg-amber-50 text-amber-600' :
                                                        'bg-zinc-100 text-zinc-500'
                                                    }`}>
                                                        {alt.similarity}%
                                                    </span>
                                                )}
                                                <svg className="w-3.5 h-3.5 text-zinc-400 group-hover/alt:text-zinc-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </div>
                                        </motion.a>
                                    ))}
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-2.5">
                                    Free to use commercially via Google Fonts
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
