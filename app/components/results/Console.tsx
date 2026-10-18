'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { normalizeScanUrl } from '../../lib/scan-url';

/*
  micro-spec: Printer (the casing the report feeds out of)
  role:      the way home, the next scan, and the object the printout comes from
  form:      a slab 32px wider than the sheet, radius 10 on top (moulded) and 4 at the foot;
             the engraved wordmark and the status light left, the hero's URL slot and STEAL key
             right, the feed slot along the bottom edge; on a phone the slot takes its own row
  material:  the monitor's casing plastic from crt-hero.jpg (#ebebfb lit, #d4d8fa side), the
             photo's speckle, the wordmark engraved into it (dark fill, light lower lip)
  depth:     a moulded edge (top highlight, bottom shade), contact line, long cast into the room;
             one light from above, the same one as the paper and the keys
  behaviour: the status light glows blue while the scan runs, red on a fault, dark when the
             report is done; the slot holds the scanned address, selected on focus; the STEAL key presses its 2px skirt and springs back
  absent:    a nav bar, chrome icons: the casing carries only what the hero's machine carries
*/
export type MachineState = 'printing' | 'ready' | 'failed';

const STATUS_LABEL: Record<MachineState, string> = { printing: 'Printing', ready: 'Ready', failed: 'Fault' };

export default function Console({ state, scanned }: { state: MachineState; scanned: string }) {
  const router = useRouter();
  const [value, setValue] = useState(scanned);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const target = normalizeScanUrl(value);
    if (!target) return;
    router.push(`/scan?url=${encodeURIComponent(target)}`);
  };

  return (
    <header className="casing relative z-10 -mx-2 px-4 pt-4 pb-3 sm:-mx-4 sm:px-6 sm:pt-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="FontStealer, back to the scanner"
            className="engraved -my-2.5 rounded-[3px] py-2.5 font-[family-name:var(--font-newsreader)] text-[24px] leading-none font-light tracking-[0.08em] transition-opacity duration-120 ease-out hover:opacity-80 active:opacity-60"
          >
            FONTSTEALER
          </Link>
          <span className="engraved flex items-center gap-2 text-[12px] tracking-[0.125em] uppercase">
            <span aria-hidden className={`led ${state === 'printing' ? 'led-on' : state === 'failed' ? 'led-failed' : ''}`} />
            {STATUS_LABEL[state]}
          </span>
        </div>
        <form
          onSubmit={submit}
          className="crt-slot flex w-full items-stretch outline-offset-3 outline-[#0a1aa8] has-[input:focus-visible]:outline-2 sm:max-w-[380px]"
          role="search"
        >
          <label htmlFor="scan-another" className="sr-only">
            Scan another site
          </label>
          <input
            id="scan-another"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            placeholder="https://another-site.com"
            /* tailwindboss-ignore focus-removed: the ring is drawn on the slot around the input (has-[input:focus-visible]) */
            className="min-w-0 flex-1 bg-transparent px-3 py-2 transition-none pointer-coarse:py-3 text-[16px] text-[#dcebff] outline-none placeholder:text-[#dcebff]/70 sm:text-[12px]"
          />
          {/* micro-spec: inherits Key / primary from DownloadButton.tsx, at the hero's slot height */}
          <button
            type="submit"
            disabled={!value.trim()}
            className="key key-primary key-sm m-[3px] flex shrink-0 items-center text-[12px] tracking-[0.125em]"
          >
            STEAL
          </button>
        </form>
      </div>
      <div aria-hidden className="seam mt-4 -mx-4 sm:-mx-6" />
      <div aria-hidden className="feed-slot mt-3 sm:mx-2" />
    </header>
  );
}
