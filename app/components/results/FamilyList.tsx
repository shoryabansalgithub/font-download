'use client';

import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import type { FontFamily } from '../../types';
import { formatInfo, leadFace } from '../../lib/faces';
import FamilyRow, { familyKey } from './FamilyRow';

export const DEFAULT_SPECIMEN = 'Sphinx of black quartz, judge my vow';
const SPECIMEN_MAX = 120;

/*
  micro-spec: Specimen field
  role:      one line of the visitor's words set in every face on the sheet (r3)
  form:      a fill line ruled onto the form, like a printed questionnaire: "SPECIMEN" in 12px
             mono caps, then the field as a 1px ink underline across the measure; 12px mono text
             (16 on touch, so phones do not zoom); "RESET" appears at the line's end once edited
  material:  no box: ink on paper, the line is the field
  behaviour: hover thickens the line to 2px; focus holds it at 2px; Escape restores the default
  absent:    size and weight controls: the specimen is fixed at 12px

  micro-spec: Column head
  role:      names the columns once, so rows carry no labels
  form:      12px mono caps ink-3 over a printed double rule; desktop only; columns match rows

  micro-spec: Refusal note (partial results)
  role:      says some specimens are set in a system face because the site refused to serve
             those files to another origin, and that downloads may still work
  form:      a printed line led by the warm "PREVIEW BLOCKED" stamp, 12px ink-2
*/
export default function FamilyList({ families, host }: { families: FontFamily[]; host: string }) {
  const [text, setText] = useState(DEFAULT_SPECIMEN);
  const deferredText = useDeferredValue(text);
  const [blocked, setBlocked] = useState<Record<string, true>>({});
  const keys = useMemo(() => families.map(familyKey), [families]);

  const reportBlocked = useCallback((key: string, isBlocked: boolean) => {
    setBlocked((prev) => {
      if (Boolean(prev[key]) === isBlocked) return prev;
      const next = { ...prev };
      if (isBlocked) next[key] = true;
      else delete next[key];
      return next;
    });
  }, []);

  const blockedCount = Object.keys(blocked).length;
  const unsupportedCount = families.filter((family) => !formatInfo(leadFace(family).variant.format).renderable).length;
  const changed = text !== DEFAULT_SPECIMEN;

  return (
    <section
      aria-label={`Typefaces on ${host}`}
      data-tb-ignore="type-ladder: these families are the scanned site's own faces, the content on show"
    >
      <div className="flex items-baseline gap-3 pb-6 text-[12px] tracking-[0.08em] uppercase">
        <label htmlFor="preview-text" className="shrink-0 text-ink-3">
          Specimen
        </label>
        <input
          id="preview-text"
          type="text"
          value={text}
          maxLength={SPECIMEN_MAX}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setText(DEFAULT_SPECIMEN);
          }}
          placeholder="Type to set every face"
          className="fill-line min-w-0 flex-1 pb-1 pointer-coarse:h-11 pointer-coarse:pb-0 text-[16px] tracking-normal text-ink normal-case placeholder:text-ink-3 sm:text-[12px]"
        />
        {changed && (
          <button
            type="button"
            onClick={() => {
              setText(DEFAULT_SPECIMEN);
              document.getElementById('preview-text')?.focus();
            }}
            className="shrink-0 rounded-[3px] px-1 text-ink-2 pointer-coarse:min-h-11 underline decoration-ink-3 underline-offset-4 transition-colors duration-120 ease-out hover:text-ink"
          >
            Reset
          </button>
        )}
      </div>

      {blockedCount > 0 && (
        <p role="status" className="mb-6 flex items-baseline gap-3 text-[12px] text-ink-2">
          <span className="stamp shrink-0">Preview blocked</span>
          <span>
            {blockedCount === families.length
              ? `${host} refused to serve its font files to other sites, so every specimen is set in a system face.`
              : `${blockedCount} of ${families.length} families are set in a system face: ${host} refused to serve those files to other sites.`}{' '}
            Downloads may still work.
          </span>
        </p>
      )}

      {unsupportedCount > 0 && (
        <p role="status" className="mb-6 flex items-baseline gap-3 text-[12px] text-ink-2">
          <span className="shrink-0 tracking-[0.08em] text-stamp uppercase">No preview</span>
          <span>
            {unsupportedCount === 1 ? '1 family ships' : `${unsupportedCount} families ship`} only EOT or SVG
            files, legacy formats no current browser can draw. The files still download.
          </span>
        </p>
      )}

      <div aria-hidden className="double-rule" />
      <div
        aria-hidden
        className="hidden h-8 grid-cols-[2rem_minmax(0,1fr)_minmax(0,14rem)_6.5rem] items-center gap-4 px-2 text-[12px] tracking-[0.08em] text-ink-3 uppercase lg:grid"
      >
        <span>No.</span>
        <span>Family / specimen</span>
        <span className="text-right">Files</span>
        <span />
      </div>
      <ul className="border-t border-ink/30">
        {families.map((family, index) => (
          <FamilyRow
            key={keys[index]}
            rowKey={keys[index]}
            family={family}
            index={index}
            text={deferredText}
            onBlocked={reportBlocked}
          />
        ))}
      </ul>
    </section>
  );
}
