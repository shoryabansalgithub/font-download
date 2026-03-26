'use client';

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

const FLOATING_FONTS = [
  { id: 'inter', name: 'Inter', variable: 'var(--font-inter)', className: 'top-[5%] md:top-[10%] left-[2%] md:left-[12%] rotate-[-4deg]' },
  { id: 'geist', name: 'Geist', variable: 'var(--font-geist)', className: 'top-[5%] md:top-[12%] right-[2%] md:right-[15%] rotate-[3deg]' },
  { id: 'manrope', name: 'Manrope', variable: 'var(--font-manrope)', className: 'bottom-[-15%] md:bottom-[-20%] left-[10%] md:left-[22%] rotate-[2deg]' },
  { id: 'serif', name: 'Georgia', variable: 'Georgia, serif', className: 'bottom-[-10%] md:bottom-[-15%] right-[8%] md:right-[20%] rotate-[-3deg]' },
  { id: 'system', name: 'System', variable: 'system-ui, sans-serif', className: 'top-[45%] md:top-[50%] left-[-2%] md:left-[4%] rotate-[-5deg]' },
  { id: 'mono', name: 'Mono', variable: 'var(--font-geist-mono, monospace)', className: 'top-[35%] md:top-[40%] right-[-2%] md:right-[6%] rotate-[4deg]' },
];

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleFontChange = (fontVar: string) => {
    document.documentElement.style.setProperty('--active-font', fontVar);
  };

  return (
    <section className="relative px-5 pt-20 pb-10 md:px-8 md:pt-32 md:pb-16 mt-8 md:mt-0">
      
      {/* Floating Font Triggers */}
      {mounted && FLOATING_FONTS.map((font, index) => (
        <motion.button
          key={font.id}
          onClick={() => handleFontChange(font.variable)}
          className={`absolute z-0 hidden md:block text-2xl md:text-3xl font-semibold tracking-tight text-slate-400/60 hover:text-slate-900 transition-colors duration-300 ${font.className}`}
          style={{ fontFamily: font.variable }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
          transition={{ 
            opacity: { duration: 0.8, delay: 0.2 + index * 0.1 },
            scale: { duration: 0.8, delay: 0.2 + index * 0.1, type: 'spring' },
            y: {
              duration: 3 + (index % 3),
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.2
            }
          }}
          whileHover={{ scale: 1.1, rotate: 0 }}
          whileTap={{ scale: 0.95 }}
          aria-label={`Change app font to ${font.name}`}
        >
          {font.name}
        </motion.button>
      ))}

      {/* Floating Font Triggers for Mobile (Simplified positions) */}
      {mounted && FLOATING_FONTS.slice(0, 4).map((font, index) => (
        <motion.button
          key={`mob-${font.id}`}
          onClick={() => handleFontChange(font.variable)}
          className={`absolute z-0 md:hidden text-xl font-semibold tracking-tight text-slate-400/60 hover:text-slate-900 transition-colors duration-300 ${font.className}`}
          style={{ fontFamily: font.variable }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, -4, 0] }}
          transition={{ 
            opacity: { duration: 0.6, delay: 0.2 + index * 0.1 },
            y: {
              duration: 3 + (index % 3),
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          whileHover={{ scale: 1.1, rotate: 0 }}
          whileTap={{ scale: 0.95 }}
        >
          {font.name}
        </motion.button>
      ))}

      <div className="relative z-10 mx-auto w-full max-w-6xl flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.3 }}
          className="pointer-events-none"
        >
          <h1 className="text-[2.25rem] font-medium md:text-[48px] leading-[1.15] tracking-tight">
            <span className="text-slate-900 block pointer-events-auto">Font intelligence, simplified.</span>
            <span className="text-slate-400 block mt-3 pointer-events-auto">Extract, compare, and discover open alternatives for any website instantly.</span>
          </h1>
        </motion.div>
      </div>
    </section>
  );
}
