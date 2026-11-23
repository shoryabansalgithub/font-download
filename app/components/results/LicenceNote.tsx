export const LICENCE_TERMS =
  "Web fonts are licensed software. Downloading one doesn't give you the right to use it. Check its licence with the foundry, or open a family for a free lookalike.";

/*
  micro-spec: Licence line
  role:      the term every download on the sheet is taken under; printed once, under the
             Steal all key and above every family's key, so it is read before any of them
  form:      a printed note like the sheet's others: "LICENCE" in 12px mono caps ink-3, then the
             sentence in 12px ink-2 across the header's measure, ending under the Steal all key's
             edge (two lines on desktop); on a phone the label sits above so the sentence gets the
             full width
  material:  ink on the paper, flat
  absent:    the stamp ink (that red marks refusals and faults, and this is neither), a checkbox
             or modal in front of the key (a gate people click through unread), an icon
*/
export default function LicenceNote() {
  return (
    <p className="flex items-baseline gap-3 text-[12px] text-ink-2 max-sm:flex-col max-sm:gap-1">
      <span className="shrink-0 tracking-[0.08em] text-ink-3 uppercase">Licence</span>
      <span className="text-pretty">{LICENCE_TERMS}</span>
    </p>
  );
}
