'use client';

import { useRef, useState } from 'react';
import { motion } from 'motion/react';

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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="w-full px-5 md:px-8"
    >
      <div className="mx-auto w-full max-w-6xl">
        <form onSubmit={handleSubmit} className="w-full max-w-2xl">
          <div className="relative flex items-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-shadow duration-300 focus-within:border-slate-300 focus-within:shadow-[0_4px_14px_rgba(0,0,0,0.05)]">
            
            <div className="pl-3.5 pr-2.5 text-slate-400">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>

            <input
              id="site-url"
              ref={inputRef}
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Enter website URL"
              className="h-12 min-w-0 flex-1 bg-transparent text-[1.05rem] text-slate-700 placeholder:text-slate-400 outline-none"
            />
            
            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={loading || !url.trim()}
              aria-describedby={!url.trim() ? 'search-disabled' : undefined}
              className={`ml-2 shrink-0 rounded-xl px-6 py-2.5 text-[0.95rem] font-medium transition-colors duration-200 ${
                loading || !url.trim()
                  ? 'cursor-not-allowed bg-slate-50 text-slate-400'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              }`}
            >
              {loading ? 'Extracting' : 'Extract'}
            </motion.button>
          </div>

          <p id="search-disabled" className="sr-only">
            Enter a valid URL to start extraction.
          </p>

          <div className="mt-5 text-[0.95rem] text-slate-500">
            Try{' '}
            {['stripe.com', 'linear.app', 'vercel.com'].map((domain, index, array) => (
              <span key={domain}>
                <button
                  type="button"
                  onClick={() => {
                    setUrl(domain);
                    inputRef.current?.focus();
                  }}
                  className="underline decoration-slate-300 underline-offset-[5px] hover:text-slate-800 transition-colors"
                >
                  {domain}
                </button>
                {index === array.length - 2 ? ', or ' : index < array.length - 2 ? ', ' : ''}
              </span>
            ))}
          </div>
        </form>
      </div>
    </motion.section>
  );
}
