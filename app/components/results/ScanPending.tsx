'use client';

import { useEffect, useState } from 'react';

/** Milliseconds since `startedAt`, ticking once a second; 0 when there is no clock. */
export function useElapsed(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  return startedAt ? Math.max(0, now - startedAt) : 0;
}

/*
  micro-spec: Printing (the scan in flight)
  role:      holds each entry's slot while the scan runs, and shows the machine is working
             without inventing progress it does not have
  form:      the column head and five entries at the real entry height (min 75px), each a row of
             dots where the name, specimen and files will print; the CRT's block cursor rides
             the first line as the print head
  material:  ink-3 dots on the bluebar bands
  behaviour: the dots breathe in a slow wave down the sheet (1.6s, 120ms apart); the print head
             sweeps its line every 2.4s; after 12s a printed note explains, after 60s a key
             offers to stop
  absent:    a percentage or step list: the scan sends no progress events
*/
const ENTRIES = [
  [34, 52, 18],
  [26, 60, 22],
  [40, 46, 16],
  [30, 56, 20],
  [22, 50, 18],
];

function Dots({ width, i }: { width: number; i: number }) {
  return (
    <span
      className="leader dots block h-3"
      style={{ width: `${width}%`, flex: 'none', '--i': i } as React.CSSProperties}
    />
  );
}

export default function ScanPending({ startedAt, onStop }: { startedAt: number; onStop: () => void }) {
  const elapsed = useElapsed(startedAt);

  return (
    <div aria-busy="true" aria-label="Scanning for fonts">
      {elapsed >= 12000 && (
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 text-[12px] text-ink-2">
          <p className="flex items-baseline gap-3">
            <span className="shrink-0 tracking-[0.08em] text-ink-3 uppercase">Note</span>
            {elapsed >= 60000
              ? 'This site is taking unusually long. It may be blocking automated visits.'
              : 'Large sites can take up to a minute: their stylesheets often import others.'}
          </p>
          {elapsed >= 60000 && (
            <button type="button" onClick={onStop} className="key key-sm text-[12px] tracking-[0.125em] uppercase">
              Stop
            </button>
          )}
        </div>
      )}
      <div aria-hidden className="double-rule" />
      <div aria-hidden className="h-8" />
      <ul aria-hidden className="border-t border-ink/30">
        {ENTRIES.map(([name, specimen, files], i) => (
          <li key={i} className="band flex min-h-[75px] items-center gap-3 border-b border-ink/30 px-2 lg:gap-4">
            <span className="w-8 shrink-0 self-center text-[12px] text-ink-3 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-3 py-3">
              <div className="relative">
                <Dots width={name} i={i} />
                {i === 0 && (
                  <span className="print-track">
                    <span className="print-head" />
                  </span>
                )}
              </div>
              <Dots width={specimen} i={i} />
            </div>
            <div className="hidden w-56 shrink-0 flex-col items-end gap-3 lg:flex">
              <Dots width={files * 3} i={i} />
              <Dots width={files * 2} i={i} />
            </div>
            <span className="key key-sm w-[5.25rem] shrink-0 opacity-50 max-sm:hidden" />
          </li>
        ))}
      </ul>
    </div>
  );
}
