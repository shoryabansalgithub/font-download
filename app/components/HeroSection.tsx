'use client';

import { motion } from 'motion/react';

export default function HeroSection() {
  return (
    <section className="px-5 pt-12 md:px-8 md:pt-14">
      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <p className="kicker">
            <span className="size-1.5 rounded-full bg-(--brand-1)" />
            Font Intelligence Workspace
          </p>

          <h1 className="mt-5 text-[2.2rem] font-semibold leading-[0.96] tracking-[-0.038em] text-foreground md:text-6xl">
            Professional font extraction,
            <br />
            comparison, and alternatives.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-(--text-2)">
            Enter any website URL to inspect loaded font files, validate weights/styles, and discover open alternatives with high visual similarity.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
