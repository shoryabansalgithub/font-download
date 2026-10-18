'use client';

import { useState } from 'react';
import type { FontAlternative, FontFamily } from '../../types';
import { formatInfo, rangeText, type Face } from '../../lib/faces';
import { fileOf } from '../../lib/font-files';
import DownloadButton from './DownloadButton';
import DownloadNote from './DownloadNote';
import { ExternalIcon, Spinner, SimilarIcon } from './Icons';
import { faceStyle, usePreview } from './Specimen';
import { useDownload } from './useDownload';

const GLYPH_LINES = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz 0123456789 &@?!%$#()'];

/*
  micro-spec: Face line (the ladder)
  role:      one file the site ships, named in itself (r2): "Bold 700" set in that face at 700
  form:      24px label in the face, a dot leader, the file facts in 12px mono caps, then a square
             keycap; indented under the family name; a variable face adds a weight scrubber whose
             value retunes its own label live, so the range is felt, not just listed
  material:  printed on the same band as its family
  behaviour: lines print in one after another, 60ms apart, when the family opens
  absent:    a specimen sentence per face: the name in itself is the specimen here
*/
function FaceLine({ familyName, face, i }: { familyName: string; face: Face; i: number }) {
  const status = usePreview(face, true);
  const [weight, setWeight] = useState(face.renderWeight);
  const { state, run } = useDownload();
  const file = fileOf(familyName, face);
  const format = formatInfo(face.variant.format).label;

  return (
    <li className="print-in" style={{ '--i': i } as React.CSSProperties}>
      <div className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 py-1 sm:flex-nowrap">
        <span className="min-w-0 text-[24px] leading-[1.25] text-ink [overflow-wrap:anywhere] sm:truncate" style={faceStyle(face, status, weight)} title={face.label}>
          {face.weight.isRange ? `Variable ${weight}` : face.label}
        </span>
        <span aria-hidden className="leader max-sm:hidden" />
        <div className="flex min-w-0 items-center gap-3 text-[12px] tracking-[0.04em] text-ink-3 uppercase tabular-nums max-sm:order-last max-sm:w-full">
          {face.weight.isRange && (
            <>
              <label htmlFor={`w-${face.key}`} className="sr-only">
                Weight for {familyName} {face.label}
              </label>
              <input
                id={`w-${face.key}`}
                type="range"
                className="weight-range w-24 min-w-0"
                min={face.weight.min}
                max={face.weight.max}
                step={1}
                value={weight}
                onChange={(event) => setWeight(Number(event.target.value))}
              />
            </>
          )}
          <span className="truncate">
            {format} · {face.weight.isRange ? rangeText(face.weight) : face.weight.min}
            {face.italic ? ' · ital' : ''}
          </span>
        </div>
        <DownloadButton
          variant="icon"
          state={state}
          idleLabel="Steal"
          ariaLabel={`Download ${file.name}`}
          onClick={() => void run({ files: [file] })}
          className="ml-auto sm:ml-0"
        />
      </div>
      <DownloadNote state={state} className="pb-2" />
    </li>
  );
}

type AltState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; alternatives: FontAlternative[] }
  | { kind: 'failed' };

/*
  micro-spec: Free lookalikes
  role:      for a face the visitor cannot license, the nearest free family on Google Fonts
  form:      a printed command line "FIND FREE LOOKALIKES" with the swap glyph, underlined on
             hover; answers print as leader lines: family, dots, similarity, an exit glyph
  behaviour: loading keeps the line's width with a spinner; a failed match offers to try again
*/
function Lookalikes({ family, face }: { family: FontFamily; face: Face }) {
  const [alt, setAlt] = useState<AltState>({ kind: 'idle' });

  const find = async () => {
    setAlt({ kind: 'loading' });
    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family: family.family,
          weight: face.variant.weight,
          style: face.variant.style,
          url: face.variant.url,
          referer: face.variant.referer || '',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error();
      setAlt({ kind: 'ready', alternatives: Array.isArray(data.alternatives) ? data.alternatives : [] });
    } catch {
      setAlt({ kind: 'failed' });
    }
  };

  if (alt.kind === 'ready') {
    if (alt.alternatives.length === 0) {
      return <p className="text-[12px] text-ink-2">No close free match in the Google Fonts library.</p>;
    }
    return (
      <div className="flex flex-col gap-1">
        <h3 className="text-[12px] tracking-[0.08em] text-ink-3 uppercase">Free lookalikes</h3>
        <ul className="grid gap-x-8 sm:grid-cols-2">
          {alt.alternatives.map((option, i) => (
            <li key={option.family} className="print-in print-in-short" style={{ '--i': i } as React.CSSProperties}>
              <a
                href={option.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-baseline gap-2 rounded-[3px] py-1 text-[12px] text-ink pointer-coarse:py-3"
              >
                <span className="truncate underline decoration-transparent underline-offset-4 transition-[text-decoration-color] duration-120 ease-out group-hover:decoration-current">{option.family}</span>
                <span aria-hidden className="leader" />
                {option.similarity != null && <span className="text-ink-2 tabular-nums">{option.similarity}%</span>}
                <ExternalIcon className="size-3 shrink-0 self-center text-ink-3 group-hover:text-ink" />
              </a>
              {option.reason && <p className="-mt-1 pb-1 text-[12px] text-ink-3">{option.reason}</p>}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-[12px]">
      <button
        type="button"
        onClick={find}
        disabled={alt.kind === 'loading'}
        aria-busy={alt.kind === 'loading' || undefined}
        className="-ml-1 inline-flex h-8 items-center gap-2 rounded-[3px] px-1 tracking-[0.08em] text-ink-2 uppercase underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color,opacity] duration-120 ease-out hover:text-ink hover:decoration-current active:opacity-70 disabled:cursor-progress pointer-coarse:h-11"
      >
        {alt.kind === 'loading' ? <Spinner /> : <SimilarIcon />}
        {alt.kind === 'loading' ? 'Matching free fonts' : 'Find free lookalikes'}
      </button>
      {alt.kind === 'failed' && (
        <p role="alert" className="text-ink-2">
          <span className="stamp mr-2">Offline</span>
          The matcher did not answer. Try again.
        </p>
      )}
    </div>
  );
}

/*
  micro-spec: Family detail (the opened entry)
  role:      everything about one family: every face, its glyphs, a free way out
  form:      the face ladder, then the glyph set (r1) in the lead face at 12px, then lookalikes;
             all on the family name's left edge, closed by the entry's own rule
*/
export default function FamilyDetail({
  id,
  family,
  faces,
  lead,
}: {
  id: string;
  family: FontFamily;
  faces: Face[];
  lead: Face;
}) {
  const status = usePreview(lead, true);

  return (
    <div id={id} className="px-2 pb-5 lg:pl-14">
      <ul aria-label={`Faces of ${family.family}`} className="border-t border-dashed border-ink/30 pt-2">
        {faces.map((face, i) => (
          <FaceLine key={face.key} familyName={family.family} face={face} i={i} />
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-4">
        <p
          className="text-[12px] leading-[1.7] text-ink [overflow-wrap:anywhere]"
          style={faceStyle(lead, status)}
          aria-label={`Character set of ${family.family}`}
        >
          {GLYPH_LINES.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
        <Lookalikes family={family} face={lead} />
      </div>
    </div>
  );
}
