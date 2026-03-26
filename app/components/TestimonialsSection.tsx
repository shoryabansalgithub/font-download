'use client';

import { motion } from 'motion/react';

interface Testimonial {
  id: string;
  title: string;
  body: string;
  author: string;
  avatarColor: string;
  className: string;
  blur?: boolean;
  opacity?: number;
  scale?: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    title: '"Best in class tooling"',
    body: 'After trying every typography extraction tool out there, this is the one that stuck. The quality and consistency are unmatched.',
    author: 'Olivia Martinez',
    avatarColor: 'bg-emerald-500',
    className: 'top-[-8%] left-[15%] md:top-[5%] md:left-[10%]',
  },
  {
    id: '2',
    title: '"Saved me hours of work"',
    body: 'Clients love the results. Every project we deliver now gets compliments on the typography. It has genuinely increased the perceived value of our work.',
    author: 'Robert Kim',
    avatarColor: 'bg-amber-400',
    className: 'bottom-[10%] left-[5%] md:bottom-[20%] md:left-[8%]',
    blur: true,
    opacity: 0.4,
    scale: 0.85,
  },
  {
    id: '3',
    title: '"Perfect for rapid prototyping"',
    body: 'I no longer have to dig through CSS files to find what fonts a site is using. Just drop the URL and you have everything in seconds.',
    author: 'Sarah Jenkins',
    avatarColor: 'bg-indigo-500',
    className: 'top-[30%] right-[2%] md:top-[15%] md:right-[5%]',
    blur: true,
    opacity: 0.3,
    scale: 0.75,
  },
  {
    id: '4',
    title: '"Unreal performance"',
    body: 'The speed at which it extracts and matches against Google fonts is mind-blowing. Our design team uses it daily.',
    author: 'David Chen',
    avatarColor: 'bg-rose-500',
    className: 'bottom-[5%] right-[10%] md:bottom-[15%] md:right-[15%]',
  },
  {
    id: '5',
    title: '"A game changer"',
    body: 'I never realized how much time I spent looking for alternative open source fonts. This tool does it automatically.',
    author: 'Emily Carter',
    avatarColor: 'bg-cyan-500',
    className: 'top-[-15%] right-[20%] md:top-[-10%] md:right-[25%]',
    blur: true,
    opacity: 0.2,
    scale: 0.65,
  }
];

export default function TestimonialsSection() {
  return (
    <section className="relative w-full py-32 md:py-48 flex items-center justify-center min-h-[800px] mt-12 bg-transparent">
      {/* Infinite Dotted Canvas Background with Mask for fading out edges entirely */}
      <div 
        className="absolute inset-0 z-0 flex items-center justify-center"
        style={{
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 20%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 20%, transparent 100%)'
        }}
      >
        
        {/* Floating Cards Canvas Area */}
        <div className="absolute inset-0 mx-auto max-w-[1400px]">
          {TESTIMONIALS.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: t.opacity || 1, y: 0 }}
              viewport={{ once: true, margin: "100px" }}
              transition={{ duration: 0.8, delay: idx * 0.15, ease: "easeOut" }}
              style={{ scale: t.scale || 1 }}
              className={`absolute w-[280px] md:w-[320px] rounded-2xl bg-white/40 backdrop-blur-md p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] ring-1 ring-white/50 ${t.className} ${t.blur ? 'blur-[3px]' : ''}`}
            >
              <h4 className="text-[1.05rem] font-bold text-slate-800 tracking-tight leading-tight mb-2">
                {t.title}
              </h4>
              <p className="text-[0.9rem] text-slate-500 leading-relaxed mb-4">
                {t.body}
              </p>
              <div className="flex items-center gap-2.5">
                <div className={`h-6 w-6 rounded-full ${t.avatarColor} flex items-center justify-center text-[0.6rem] font-bold text-white shadow-inner`}>
                  {t.author.charAt(0)}
                </div>
                <span className="text-[0.85rem] font-semibold text-slate-700">
                  {t.author}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Center Content Content */}
      <div className="relative z-10 mx-auto max-w-2xl flex flex-col items-center text-center px-5">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-[2.25rem] md:text-[3.5rem] leading-[1.1] font-medium tracking-tight text-slate-900"
        >
          Loved by thousands<br />of happy customers
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 text-[1.1rem] text-slate-500 max-w-md"
        >
          Hear from our community of builders, designers, and creators who trust us to power their projects.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className="mt-8 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
        >
          Read all reviews
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </motion.button>
      </div>

      {/* Fade out edges */}
    </section>
  );
}