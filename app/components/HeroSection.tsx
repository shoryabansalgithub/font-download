'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { useState } from 'react';

/*
 * The hero recreates the "CRT" scene: a blue-tinted retro terminal photo with
 * the wordmark set on the monitor glass. Each letter is rotated and lifted
 * individually so the word follows the curvature of the tube; the rotation and
 * vertical-offset values are traced from the original mockup (dy is em at the
 * letter's own font size). The engraved look itself lives in globals.css
 * (.crt-letter / .crt-slot / .crt-key).
 */
const ARC_LETTERS: { ch: string; rot: number; dy: number }[] = [
  { ch: 'F', rot: -4.98, dy: 0.152 },
  { ch: 'O', rot: -4.0, dy: 0.098 },
  { ch: 'N', rot: -2.88, dy: 0.051 },
  { ch: 'T', rot: -1.84, dy: 0.021 },
  { ch: 'S', rot: -0.6, dy: 0.002 },
  { ch: 'T', rot: 0.27, dy: 0.0 },
  { ch: 'E', rot: 1.2, dy: 0.009 },
  { ch: 'A', rot: 2.18, dy: 0.029 },
  { ch: 'L', rot: 3.14, dy: 0.06 },
  { ch: 'E', rot: 4.04, dy: 0.1 },
  { ch: 'R', rot: 4.95, dy: 0.15 },
];

interface HeroSectionProps {
  onSearch: (url: string) => void;
  loading: boolean;
}

export default function HeroSection({ onSearch, loading }: HeroSectionProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || !url.trim()) return;

    let target = url.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `https://${target}`;
    }
    onSearch(target);
  };

  const searchForm = (onScreen: boolean) => (
    <form
      onSubmit={handleSubmit}
      className={
        onScreen
          ? 'crt-slot flex w-[61%] max-w-[400px] shrink-0 items-stretch'
          : 'crt-slot flex w-full max-w-[420px] items-stretch'
      }
    >
      <label className="sr-only" htmlFor={onScreen ? 'site-url' : 'site-url-mobile'}>
        Website URL
      </label>
      <input
        id={onScreen ? 'site-url' : 'site-url-mobile'}
        type="text"
        inputMode="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://any-website.com"
        autoComplete="off"
        spellCheck={false}
        className={`min-w-0 flex-1 bg-transparent font-[family-name:var(--font-jetbrains-mono)] text-[#DCEBFF] placeholder:text-[#DCEBFF]/60 outline-none ${
          onScreen
            ? 'px-[1.2cqw] py-[0.84cqw] text-[clamp(11px,0.78cqw,13px)]'
            : 'px-4 py-3.5 text-[16px]'
        }`}
      />
      <button
        type="submit"
        disabled={loading || !url.trim()}
        className={`crt-key m-[3px] flex shrink-0 items-center justify-center font-[family-name:var(--font-jetbrains-mono)] font-medium tracking-[0.125em] text-[#16309E] transition-[filter] duration-200 hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-80 ${
          onScreen ? 'px-[1.44cqw] text-[clamp(10px,0.72cqw,12px)]' : 'px-6 text-[12px]'
        }`}
      >
        {loading ? (
          <svg
            className={`animate-spin ${onScreen ? 'size-[clamp(12px,0.9cqw,15px)]' : 'size-[15px]'}`}
            fill="none"
            viewBox="0 0 24 24"
            aria-label="Scanning"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          'STEAL'
        )}
      </button>
    </form>
  );

  return (
    <section aria-label="Fontstealer - extract the fonts from any website">
      <div className="relative h-[min(107vw,72vh)] w-full overflow-hidden md:h-auto">
        {/* Below md the scene is oversized (240% wide) and cropped so the
            monitor stays legible. The crop height is in vw so the framing is
            identical at every phone width: 107vw shows exactly the top 80% of
            a 240%-wide scene (2.4 x 941/1672 x 0.8), photo top to keyboard. */}
        <div className="@container relative left-1/2 aspect-[1672/941] w-[240%] -translate-x-1/2 md:left-0 md:w-full md:translate-x-0">
          <Image
            src="/crt-hero.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 100vw, 240vw"
            className="object-cover"
          />

          {/* Everything on the monitor glass. Position traced from the mockup:
              the screen opening of the CRT in the photograph. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute left-[30.26%] top-[10.31%] flex h-[41.45%] w-[38.28%] flex-col items-center justify-center gap-[1.55cqw]"
          >
            <h1
              aria-label="Fontstealer"
              className="flex translate-x-[0.55cqw] items-baseline gap-[0.06em] font-[family-name:var(--font-newsreader)] text-[4.665cqw] font-light leading-none"
            >
              {ARC_LETTERS.map(({ ch, rot, dy }, index) => (
                <span
                  key={`${ch}-${index}`}
                  aria-hidden="true"
                  data-ch={ch}
                  className="crt-letter inline-block"
                  style={{ transform: `translateY(${dy}em) rotate(${rot}deg)` }}
                >
                  <span className="crt-letter-fill">{ch}</span>
                </span>
              ))}
            </h1>

            <div className="hidden w-full justify-center md:flex">{searchForm(true)}</div>
          </motion.div>
        </div>
      </div>

      {/* On phones the on-screen bar would be too small to type in, so it sits
          under the scene instead. */}
      <div className="flex justify-center px-5 py-8 md:hidden">{searchForm(false)}</div>

      <p className="sr-only">
        Extract active webfonts from any URL, inspect their weights and styles, and discover free
        alternatives instantly.
      </p>
    </section>
  );
}
