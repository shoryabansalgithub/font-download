'use client';

import { useState, useRef } from 'react';
import { motion } from 'motion/react';

interface SearchInputProps {
    onSearch: (url: string) => void;
    loading: boolean;
}

export default function SearchInput({ onSearch, loading }: SearchInputProps) {
    const [url, setUrl] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim() || loading) return;

        let targetUrl = url.trim();
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl;
        }
        onSearch(targetUrl);
    };

    const examples = [
        { label: 'stripe.com', url: 'stripe.com' },
        { label: 'linear.app', url: 'linear.app' },
        { label: 'vercel.com', url: 'vercel.com' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: 0.3 }}
            className="w-full max-w-2xl mx-auto px-6"
        >
            <form onSubmit={handleSubmit}>
                {/* Search bar */}
                <div
                    className={`
                        relative flex items-center bg-white rounded-2xl
                        transition-all duration-200
                        ${isFocused
                            ? 'shadow-[0_0_0_1.5px_rgba(9,9,11,0.12),0_8px_32px_-8px_rgba(0,0,0,0.14)]'
                            : 'shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_2px_12px_-4px_rgba(0,0,0,0.08)]'
                        }
                    `}
                >
                    {/* Globe icon */}
                    <div className="pl-4 pr-2 shrink-0">
                        <svg
                            className={`w-4.5 h-4.5 transition-colors duration-150 ${isFocused ? 'text-zinc-600' : 'text-zinc-400'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                            />
                        </svg>
                    </div>

                    {/* Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="Enter any website URL…"
                        className="flex-1 py-3.5 px-2 text-[15px] text-zinc-900 placeholder:text-zinc-400 bg-transparent outline-none min-w-0"
                        style={{ fontSize: '16px' }}
                    />

                    {/* Divider + Submit */}
                    <div className="pr-1.5 shrink-0 flex items-center">
                        {url.trim() && (
                            <button
                                type="button"
                                onClick={() => setUrl('')}
                                className="mr-1 p-1.5 text-zinc-400 hover:text-zinc-600 transition-colors rounded-lg hover:bg-zinc-100"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                        <motion.button
                            type="submit"
                            disabled={loading || !url.trim()}
                            whileTap={{ scale: 0.96 }}
                            className={`
                                flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-xl
                                transition-all duration-150
                                ${loading || !url.trim()
                                    ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                    : 'bg-zinc-950 text-white hover:bg-zinc-800 shadow-sm'
                                }
                            `}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Scanning
                                </>
                            ) : (
                                <>
                                    Extract
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </>
                            )}
                        </motion.button>
                    </div>
                </div>

                {/* Examples */}
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-400">
                    <span>Try</span>
                    {examples.map((ex, i) => (
                        <span key={ex.url} className="inline-flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => { setUrl(ex.url); inputRef.current?.focus(); }}
                                className="text-zinc-500 hover:text-zinc-800 transition-colors duration-100 font-medium"
                            >
                                {ex.label}
                            </button>
                            {i < examples.length - 1 && <span className="text-zinc-300">·</span>}
                        </span>
                    ))}
                </div>
            </form>
        </motion.div>
    );
}
