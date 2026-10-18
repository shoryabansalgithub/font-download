'use client';

import { memo, useEffect, useId, useRef, useState } from 'react';
import type { FontFamily } from '../../types';
import { facesOf, familyFacts, hashFontId, leadFace } from '../../lib/faces';
import { downloadOf, filesOf } from '../../lib/font-files';
import DownloadButton from './DownloadButton';
import DownloadNote from './DownloadNote';
import FamilyDetail from './FamilyDetail';
import { ChevronIcon } from './Icons';
import { faceStyle, Specimen, usePreview } from './Specimen';
import { useDownload } from './useDownload';

export function familyKey(family: FontFamily, index: number): string {
  return `${family.family}|${facesOf(family)[0]?.key ?? hashFontId(String(index))}`;
}

/** Facts joined by dots that break after a dot, never before one: each dot is glued to its token. */
function WrappingFacts({ tokens, className }: { tokens: string[]; className: string }) {
  return (
    <span className={className}>
      {tokens.map((token, i) => (
        <span key={token}>
          <span className="whitespace-nowrap">
            {token}
            {i < tokens.length - 1 ? ' ·' : ''}
          </span>{' '}
        </span>
      ))}
    </span>
  );
}

function useNearViewport<T extends Element>() {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);
  return [ref, near] as const;
}

/*
  micro-spec: Family line (one entry on the report)
  role:      one typeface the site loads: its number, its name in itself, the visitor's words in
             it, what files back it, and the key that takes it
  form:      a band of bluebar stock. Desktop: one line on the column head's grid, 64 high - No.
             12px mono, name 24px in the face, specimen 12px in the face, files 12px mono caps
             right-aligned on the name's baseline (r2), then the STEAL key. Phone: number and name
             on one line with the key, specimen and files printed under the name
  material:  paper; even entries sit on the casing-side band (#e1e4fa); a hairline rule in ink
             at 30% closes each entry
  depth:     flat: it is printed, not placed
  behaviour: the whole entry prints in, line by line down the sheet (60ms apart); hover darkens
             the band 4%; the disclosure turns its chevron 90deg in 160ms and prints the faces
             below; focus draws the ink ring around the disclosure
  absent:    cards, borders, a hover lift: a printout has no hover state of its own beyond ink
*/
function FamilyRow({
  family,
  rowKey,
  index,
  text,
  onBlocked,
}: {
  family: FontFamily;
  rowKey: string;
  index: number;
  text: string;
  onBlocked: (key: string, blocked: boolean) => void;
}) {
  const faces = facesOf(family);
  const facts = familyFacts(family);
  const lead = leadFace(family);
  const [ref, near] = useNearViewport<HTMLLIElement>();
  const status = usePreview(lead, near);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { state, run } = useDownload();

  useEffect(() => {
    if (status === 'ready' || status === 'blocked') onBlocked(rowKey, status === 'blocked');
  }, [status, rowKey, onBlocked]);

  const download = () => void run(downloadOf(filesOf(family.family, faces), family.family));

  const formatTokens = [facts.formats.join(' '), faces.length > 1 ? `${faces.length} faces` : '1 face'];
  const weightTokens = facts.hasItalic ? [...facts.weights, 'ital'] : facts.weights;
  const formatLine = formatTokens.join(' · ');
  const weightLine = weightTokens.join(' · ');

  return (
    <li ref={ref} className="band border-b border-ink/30" style={{ '--i': index + 4 } as React.CSSProperties}>
      <div className="print-in print-in-entry flex items-start gap-3 px-2 transition-colors duration-120 ease-out hover:bg-ink/8 lg:items-center lg:gap-4">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((prev) => !prev)}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-[3px] py-3 text-left transition-colors duration-120 ease-out active:bg-ink/8 lg:items-center lg:py-0"
        >
          <span className="grid min-w-0 flex-1 grid-cols-[2rem_minmax(0,1fr)] gap-x-3 gap-y-1 lg:grid-cols-[2rem_minmax(0,1fr)_minmax(0,14rem)] lg:gap-x-4 lg:py-3">
            <span className="flex items-center gap-1 self-center text-[12px] text-ink-3 tabular-nums lg:row-span-2">
              {String(index + 1).padStart(2, '0')}
              <ChevronIcon
                className={`size-3 transition-transform duration-160 ease-out motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}
              />
            </span>
            <span
              title={family.family}
              className="text-[20px] leading-[1.25] text-ink [overflow-wrap:break-word] sm:text-[24px] lg:truncate"
              style={faceStyle(lead, status)}
            >
              {family.family}
            </span>
            <span className="col-start-2 min-w-0 lg:row-start-2">
              <Specimen face={lead} status={status} text={text} />
            </span>
            <span className="col-start-2 flex min-w-0 flex-wrap items-baseline gap-x-2 text-[12px] tracking-[0.04em] text-ink-3 uppercase tabular-nums lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:flex-col lg:items-end lg:justify-center lg:gap-y-1">
              {status === 'blocked' && <span className="shrink-0 text-stamp">Blocked ·</span>}
              {status === 'unsupported' && <span className="shrink-0 text-stamp">No preview ·</span>}
              <WrappingFacts tokens={[...formatTokens, ...weightTokens]} className="min-w-0 lg:hidden" />
              <span className="max-w-full truncate max-lg:hidden">{formatLine}</span>
              <span className="max-w-full truncate max-lg:hidden" title={weightLine}>
                {weightLine}
              </span>
            </span>
          </span>
        </button>
        <div className="flex shrink-0 py-3 lg:w-[6.5rem] lg:justify-end lg:py-0">
          <DownloadButton
            variant="secondary"
            compactOnPhone
            state={state}
            idleLabel="Steal"
            ariaLabel={
              faces.length > 1
                ? `Download ${family.family}, ${faces.length} faces as a zip`
                : `Download ${family.family}`
            }
            onClick={download}
          />
        </div>
      </div>
      <DownloadNote state={state} className="px-2 pb-3 pl-14" />
      {open && <FamilyDetail id={panelId} family={family} faces={faces} lead={lead} />}
    </li>
  );
}

export default memo(FamilyRow);
