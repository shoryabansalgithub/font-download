'use client';

import { motion } from 'motion/react';

const ExtractIllustration = () => (
  <div className="relative flex h-full w-full items-center justify-center">
    {/* Browser Mockup */}
    <motion.div 
      initial={{ y: 15, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative h-28 w-48 overflow-hidden rounded-xl border border-white/60 bg-white/40 backdrop-blur-md shadow-lg"
    >
      {/* Top Bar */}
      <div className="flex h-7 w-full items-center gap-1.5 border-b border-white/40 bg-white/30 px-2.5">
        <div className="h-1.5 w-1.5 rounded-full bg-slate-400"></div>
        <div className="h-1.5 w-1.5 rounded-full bg-slate-400"></div>
        <div className="h-1.5 w-1.5 rounded-full bg-slate-400"></div>
        <div className="ml-2 h-2.5 w-24 rounded font-mono text-[0.4rem] font-semibold text-slate-500 bg-white/50 border border-white/40 flex items-center px-1 backdrop-blur-sm">https://example.com</div>
      </div>
      {/* Content */}
      <div className="flex flex-col gap-2.5 p-3">
        <div className="h-3 w-3/4 rounded bg-white/70"></div>
        <div className="h-2 w-1/2 rounded bg-white/70"></div>
        <div className="mt-1 h-8 w-full rounded-md border border-white/40 bg-white/30"></div>
      </div>

      {/* Scanner Line */}
      <motion.div 
        animate={{ top: ['0%', '100%', '0%'] }} 
        transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-[2px] w-full bg-[#1d62dd] shadow-[0_0_12px_2px_rgba(29,98,221,0.3)]"
      />
    </motion.div>
  </div>
);

const AnalyzeIllustration = () => (
  <div className="relative flex h-full w-full items-center justify-center">
    <div className="relative flex items-center justify-center">
      {/* Central Letter */}
      <span className="font-serif text-[4.5rem] leading-none text-slate-800 -tracking-tight">Aa</span>
      
      {/* Bounding box wrapper */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="absolute inset-0 m-[-10px] border-[1.5px] border-dashed border-[#1d62dd]/40"
      >
        {/* Corners */}
        <div className="absolute -left-1.5 -top-1.5 h-2.5 w-2.5 border-2 border-[#1d62dd] bg-white/80 backdrop-blur-sm"></div>
        <div className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 border-2 border-[#1d62dd] bg-white/80 backdrop-blur-sm"></div>
        <div className="absolute -bottom-1.5 -left-1.5 h-2.5 w-2.5 border-2 border-[#1d62dd] bg-white/80 backdrop-blur-sm"></div>
        <div className="absolute -bottom-1.5 -right-1.5 h-2.5 w-2.5 border-2 border-[#1d62dd] bg-white/80 backdrop-blur-sm"></div>
        
        {/* Tooltip Badges */}
        <motion.div 
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-16 -top-8 flex items-center gap-1.5 rounded-md border border-white/50 bg-white/40 backdrop-blur-md px-2 py-1 shadow-lg"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-[#1d62dd]"></div>
          <span className="font-mono text-[0.65rem] font-medium text-slate-700">600W</span>
        </motion.div>

        <motion.div 
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-8 -left-14 flex items-center gap-1.5 rounded-md border border-white/50 bg-white/40 backdrop-blur-md px-2 py-1 shadow-lg"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-teal-500"></div>
          <span className="font-mono text-[0.65rem] font-medium text-slate-700">Italic</span>
        </motion.div>
      </motion.div>
    </div>
  </div>
);

const MatchIllustration = () => (
  <div className="relative flex h-full w-full items-center justify-center">
    <div className="relative flex w-full max-w-[200px] flex-col gap-4">
      {/* Card 1 - Origin */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="z-10 ml-auto flex w-44 items-center justify-between rounded-xl border border-white/50 bg-white/40 backdrop-blur-md px-3 py-2.5 shadow-lg"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500">Commercial</span>
          <span className="text-xs font-semibold text-slate-700 line-through decoration-slate-400">Circular Pro</span>
        </div>
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </div>
      </motion.div>

      {/* Connection SVG */}
      <div className="absolute left-1/4 top-1/2 z-0 -translate-y-1/2 text-slate-300">
        <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
          <path d="M25 6v38M5 25h40" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" className="opacity-50" />
        </svg>
      </div>

      {/* Card 2 - Match */}
      <motion.div 
        initial={{ x: 20, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="z-20 mr-auto flex w-44 items-center justify-between rounded-xl border border-blue-400/20 bg-blue-50/40 backdrop-blur-md px-3 py-2.5 shadow-lg ring-1 ring-inset ring-[#1d62dd]/10"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.6rem] font-bold uppercase tracking-wider text-[#1d62dd]">Free Variant</span>
          <span className="font-sans text-xs font-bold text-[#102035]">Plus Jakarta</span>
        </div>
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1d62dd] text-white shadow-sm shadow-[#1d62dd]/30">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
      </motion.div>
    </div>
  </div>
);

export default function HowItWorksCards() {
  const cards = [
    {
      title: "Extract Configuration",
      description: "Provide any URL to let our engine parse its stylesheets, instantly extracting all typography files and DOM declarations.",
      illustration: <ExtractIllustration />
    },
    {
      title: "Analyze Typographics",
      description: "We deep-dive into the CSS properties, isolating perfect weights, optical sizing, and specific variable axes in play.",
      illustration: <AnalyzeIllustration />
    },
    {
      title: "Discover Alternatives",
      description: "Our database cross-references commercial typefaces against thousands of free Google Fonts to find the exact geometric match.",
      illustration: <MatchIllustration />
    }
  ];

  return (
    <div className="mx-auto mt-16 grid w-full max-w-[70rem] grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
      {cards.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' }}
          className="relative flex flex-col items-center text-center"
        >
          {/* Top Illustration Area */}
          <div className="relative flex h-48 w-full items-center justify-center mb-6">
            {card.illustration}
          </div>
          
          {/* Bottom Content Area */}
          <div className="flex flex-col items-center px-2">
            <div className="mb-4 flex items-center justify-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200/50 text-[0.65rem] font-bold text-slate-600">
                0{i + 1}
              </span>
              <h3 className="text-[1.2rem] font-semibold tracking-tight text-slate-900">
                {card.title}
              </h3>
            </div>
            <p className="text-[1rem] leading-relaxed text-slate-500 max-w-sm">
              {card.description}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}