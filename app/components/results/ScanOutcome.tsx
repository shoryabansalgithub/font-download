'use client';

import { useEffect, useRef } from 'react';

/*
  micro-spec: Outcome (empty and failed scans)
  role:      what the machine prints when there is nothing to list, and what to do next
  form:      a rubber stamp across the sheet ("NO WEBFONTS FOUND" / "SCAN FAILED"), 24px mono caps
             in a 2px stamp box tilted -2deg, then the reason in 12px mono at max 52ch, then two
             keys: the likely next step first
  material:  the warm stamp ink on paper: the only place the sheet is not blue
  behaviour: the stamp prints with the carriage wipe; its heading takes focus so a screen reader
             hears the outcome
  absent:    the old cut-off-specimen joke and any illustration: the stamp says it
*/
export default function ScanOutcome({
  stamp,
  body,
  primary,
  secondary,
}: {
  stamp: string;
  body: string;
  primary: { label: string; onClick: () => void };
  secondary: { label: string; onClick: () => void };
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <section className="flex flex-col items-start gap-5 border-t border-ink/30 py-12">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="stamp print-in print-in-short w-max max-w-full border-2 px-3 py-1 text-[20px] leading-tight tracking-[0.08em] uppercase sm:text-[24px]"
      >
        {stamp}
      </h2>
      <p className="max-w-[52ch] text-[12px] leading-[1.6] text-ink-2">{body}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={primary.onClick} className="key key-primary key-lg text-[12px] tracking-[0.125em]">
          {primary.label}
        </button>
        <button
          type="button"
          onClick={secondary.onClick}
          className="h-10 rounded-[3px] px-3 text-[12px] tracking-[0.125em] text-ink-2 underline decoration-ink-3/50 underline-offset-4 transition-[color,text-decoration-color,opacity] duration-120 ease-out hover:text-ink hover:decoration-current active:opacity-70 pointer-coarse:h-11"
        >
          {secondary.label}
        </button>
      </div>
    </section>
  );
}
