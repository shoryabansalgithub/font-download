'use client';

import { useId, useState } from 'react';
import { ChevronIcon } from './Icons';

export const TERMS: string[] = [
  "FontStealer reads the font files a website already sends to every visitor and lets you save copies. It doesn't grant, sell or transfer any licence to them.",
  'Fonts belong to their designers and foundries. Before you use a downloaded font for anything, checking its licence and getting the right to use it is on you. A FREE stamp only means the name matches a family on Google Fonts: confirm the licence there before you rely on it.',
  'Everything FontStealer shows, from font names and files to lookalikes and FREE stamps, is provided as is, with no warranty of any kind. Results can be wrong or incomplete.',
  "To the fullest extent the law allows, FontStealer and the people who make it aren't liable for any loss, damage, claim or cost that comes from using it or any file you download with it, including licence and copyright claims.",
  "Use it only on sites and for purposes you're allowed to. Don't use it to break a font licence, a site's terms or the law.",
  'By using FontStealer you agree to these terms. They may change, and the version printed here is the one that applies.',
];

/*
  micro-spec: Report foot and terms
  role:      closes the receipt; the terms of use sit where a receipt keeps its fine print, one
             click from every report and never in front of the work
  form:      the double rule, "END OF REPORT · host" in 12px mono caps ink-3, then a "TERMS OF
             USE" toggle in the same caps with a chevron that turns when open; open, the terms
             print below in 12px ink-2, left-aligned in a 64ch column centred on the sheet,
             numbered the way printed terms are
  behaviour: the toggle underlines under the pointer; opening prints the clauses in one after
             another with the sheet's own carriage motion (none under reduced motion)
  absent:    a modal (fine print belongs on the paper), the red stamp ink (nothing failed)
*/
export default function ReportFooter({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const termsId = useId();

  return (
    <footer className="mt-8 pb-6">
      <div aria-hidden className="double-rule" />
      <p className="mt-3 text-center text-[12px] tracking-[0.08em] text-ink-3 uppercase">{label}</p>
      <div className="mt-2 flex justify-center">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={termsId}
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex h-8 items-center gap-1 rounded-[3px] px-1 text-[12px] tracking-[0.08em] text-ink-3 uppercase underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color,opacity] duration-120 ease-out hover:text-ink hover:decoration-current active:opacity-70 pointer-coarse:h-11"
        >
          Terms of use
          <ChevronIcon
            className={`size-3 transition-transform duration-160 ease-out motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}
          />
        </button>
      </div>
      {open && (
        <ol id={termsId} aria-label="Terms of use" className="mx-auto mt-3 flex max-w-[64ch] flex-col gap-2 text-[12px] text-ink-2">
          {TERMS.map((clause, i) => (
            <li key={i} className="print-in print-in-short flex gap-3" style={{ '--i': i } as React.CSSProperties}>
              <span className="shrink-0 text-ink-3 tabular-nums">{i + 1}.</span>
              <span className="text-pretty">{clause}</span>
            </li>
          ))}
        </ol>
      )}
    </footer>
  );
}
