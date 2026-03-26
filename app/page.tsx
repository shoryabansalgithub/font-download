'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import HeroSection from './components/HeroSection';
import SearchInput from './components/SearchInput';
import HowItWorksCards from './components/HowItWorksCards';
import TestimonialsSection from './components/TestimonialsSection';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSearch = (targetUrl: string) => {
    setLoading(true);
    // Add small delay to show the nice loading state of the button before navigation
    setTimeout(() => {
      router.push(`/scan?url=${encodeURIComponent(targetUrl)}`);
    }, 400); 
  };

  return (
    <main className="min-h-screen">
      <div className="relative z-10 w-full">
        <HeroSection />

        <div className="mt-8 mb-16">
          <SearchInput onSearch={handleSearch} loading={loading} />
        </div>

        <section className="mt-24 w-full px-5 md:px-8 mb-32">
          <div className="mx-auto w-full max-w-3xl flex flex-col items-center text-center">
            <span className="mb-4 inline-flex items-center rounded-full bg-slate-100/80 px-3 py-1 text-xs font-medium uppercase tracking-wider text-slate-600 ring-1 ring-inset ring-slate-200/50">
              The Process
            </span>
            <h2 className="text-[1.75rem] font-medium tracking-tight text-slate-900 md:text-[2.25rem]">
              How it works
            </h2>
            <p className="mt-4 text-[1.125rem] text-slate-500 max-w-2xl leading-relaxed">
              Extract active webfonts from any URL, inspect their weights and styles, and match against an extensive database of free alternatives in seconds.
            </p>
          </div>
          <HowItWorksCards />
        </section>

        <TestimonialsSection />

        <footer className="border-t border-slate-200/60 px-5 py-16 md:px-8 mix-blend-multiply">
          <div className="mx-auto w-full max-w-6xl flex flex-col items-center text-center">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-400">
              Supports WOFF, WOFF2, TTF, and OTF
            </p>
            <p className="mt-5 max-w-2xl text-[0.9rem] leading-relaxed text-slate-500">
              Analyze Any Font is intended for research and testing. Identifying a font does not grant usage rights. Always confirm licensing with the original foundry before using fonts in production.
            </p>
            <div className="mt-8 flex items-center justify-center gap-2 text-[0.8rem] text-slate-400">
              <span>&copy; {new Date().getFullYear()} Analyze Any Font.</span>
              <span className="h-1 w-1 rounded-full bg-slate-300"></span>
              <a href="#" className="hover:text-slate-600 transition-colors">Privacy</a>
              <span className="h-1 w-1 rounded-full bg-slate-300"></span>
              <a href="#" className="hover:text-slate-600 transition-colors">Terms</a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
