'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const fonts = [
    { name: 'Heading', family: 'CustomHeading, sans-serif' },
    { name: 'Inter', family: 'var(--font-inter), sans-serif' },
    { name: 'Geist', family: 'var(--font-geist), sans-serif' },
    { name: 'Manrope', family: 'var(--font-manrope), sans-serif' },
    { name: 'Custom', family: 'CustomFont, sans-serif' },
];

export default function HeroSection() {
    const [currentFontIndex, setCurrentFontIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleFontSwitch = () => {
        if (isAnimating) return;
        setIsAnimating(true);
        setCurrentFontIndex((prev) => (prev + 1) % fonts.length);
    };

    useEffect(() => {
        const timer = setTimeout(() => setIsAnimating(false), 400);
        return () => clearTimeout(timer);
    }, [currentFontIndex]);

    const currentFont = fonts[currentFontIndex];

    return (
        <section className="relative pt-28 pb-12 px-6">
            <div className="relative max-w-4xl mx-auto text-center">

                {/* Eyebrow chip */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    className="inline-flex items-center gap-2 mb-8"
                >
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200 rounded-full shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-xs font-medium text-zinc-500 tracking-wide uppercase">
                            Font Discovery Tool
                        </span>
                    </div>
                </motion.div>

                {/* Main Heading - clickable to switch fonts */}
                <motion.h1
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
                    className="relative"
                >
                    <button
                        onClick={handleFontSwitch}
                        className="group relative cursor-pointer focus:outline-none rounded-lg"
                        aria-label={`Currently using ${currentFont.name} font. Click to switch fonts.`}
                    >
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={currentFontIndex}
                                initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
                                transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                                className="block text-5xl md:text-7xl lg:text-8xl font-semibold text-zinc-950 tracking-tight leading-[1.05]"
                                style={{ fontFamily: currentFont.family }}
                            >
                                Analyze Any Font
                            </motion.span>
                        </AnimatePresence>

                        {/* Font indicator */}
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="absolute -bottom-7 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 text-xs text-zinc-400 group-hover:text-zinc-600 transition-colors duration-150 whitespace-nowrap"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                            </svg>
                            <span className="font-medium">{currentFont.name}</span>
                            <span className="text-zinc-300">·</span>
                            <span>click to switch</span>
                        </motion.span>
                    </button>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
                    className="mt-14 text-base md:text-lg text-zinc-500 max-w-xl mx-auto leading-relaxed"
                >
                    Enter any website URL to instantly discover every font it uses.
                    Preview them live and find free alternatives.
                </motion.p>
            </div>
        </section>
    );
}
