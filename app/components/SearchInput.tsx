'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SearchInputProps {
  onSearch: (url: string) => void;
  loading: boolean;
}

export default function SearchInput({ onSearch, loading }: SearchInputProps) {
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || !url.trim()) return;

    let target = url.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `https://${target}`;
    }
    onSearch(target);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1, type: 'spring', bounce: 0.2 }}
      className="w-full px-5 md:px-8 mt-10 md:mt-14"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center">
        <form onSubmit={handleSubmit} className="relative w-full max-w-[480px]">
          {/* Main Input Wrapper - Dark Pill */}
          <div className="group relative flex h-[60px] w-full items-center overflow-hidden rounded-[2rem] bg-[#535B69] p-1.5 shadow-sm transition-all duration-300 focus-within:bg-[#48505E] focus-within:shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
            
            {/* Minimal Icon */}
            <div className="pl-4 pr-1 text-white/50 transition-colors duration-300 group-focus-within:text-white/80">
              <svg className="size-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>

            {/* Input Field */}
            <input
              id="site-url"
              ref={inputRef}
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Get Started with an URL..."
              className="h-full flex-1 bg-transparent px-2 text-[1.05rem] font-medium text-white placeholder:font-normal placeholder:text-white/60 outline-none w-full"
              autoComplete="off"
            />
            
            {/* White Arrow Button */}
            <motion.button
              type="submit"
              whileTap={{ scale: 0.92 }}
              disabled={loading || !url.trim()}
              className={`relative flex h-[48px] w-[56px] items-center justify-center overflow-hidden rounded-[26px] transition-all duration-300 ${
                loading || !url.trim()
                  ? 'bg-white/20 text-white/40 cursor-not-allowed'
                  : 'bg-white text-[#535B69] hover:bg-slate-50 hover:scale-[1.03] shadow-sm'
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <svg className="size-[18px] animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </motion.div>
                ) : (
                  <motion.div
                    key="default"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <svg className="size-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          <p id="search-disabled" className="sr-only">
            Enter a valid URL to start extraction.
          </p>

          <div className="mt-5 flex items-center justify-center gap-2.5 text-[0.85rem] font-medium text-slate-400">
            <span>Try:</span>
            <div className="flex gap-2">
              {['stripe.com', 'linear.app', 'vercel.com'].map((domain) => (
                <button
                  key={domain}
                  type="button"
                  onClick={() => {
                    setUrl(domain);
                    inputRef.current?.focus();
                  }}
                  className="rounded-md px-1.5 py-0.5 transition-colors hover:text-slate-800"
                >
                  {domain}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </motion.section>
  );
}
