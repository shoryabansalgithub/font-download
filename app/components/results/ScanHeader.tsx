'use client';

import { useState } from 'react';
import type { FontFamily } from '../../types';
import type { ScanState } from '../../scan/page';
import { facesOf, familyFacts, leadFace, type Face } from '../../lib/faces';
import DownloadAll from './DownloadAll';
import { ExternalIcon } from './Icons';
import { useElapsed } from './ScanPending';
import { faceStyle, usePreview } from './Specimen';

/** Average advance of a hostname's characters in em, measured across the faces sites ship (~0.5-0.56). */
const HOST_EM_PER_CHAR = 0.56;

/** Steps a long hostname down from 48px until it fits the title's measure, never below 24px. */
function hostFontSize(host: string): string {
  return `clamp(24px, calc((100cqi - 44px) / ${Math.max(host.length, 6) * HOST_EM_PER_CHAR}), 48px)`;
}

function primaryFace(families: FontFamily[]): Face {
  const family = families.reduce((best, f) => (facesOf(f).length > facesOf(best).length ? f : best));
  return leadFace(family);
}

/*
  micro-spec: Report title
  role:      the trophy: the site that was scanned, and the first proof its type was taken
  form:      display step, sized to fit the host up to 48px; set in the hero's Newsreader light
             while scanning, printed again in the site's own primary face once that file has
             loaded
  material:  ink on the paper
  behaviour: the reprint is the carriage wipe, left to right; the name never moves
  absent:    "stolen from" eyebrows and counts in the headline: the readout carries numbers
*/
function HostTitle({ face, host }: { face: Face | null; host: string }) {
  const status = usePreview(face, face !== null);
  return status === 'ready' && face ? (
    <span className="print-in block truncate" style={faceStyle(face, status)}>
      {host}
    </span>
  ) : (
    <span className="block truncate font-[family-name:var(--font-newsreader)] font-light">{host}</span>
  );
}

function Readout({ label, value, i }: { label: string; value: React.ReactNode; i: number }) {
  return (
    <div className="print-in print-in-short flex items-baseline gap-2" style={{ '--i': i } as React.CSSProperties}>
      <dt className="shrink-0 text-ink-3">{label}</dt>
      <span aria-hidden className="leader" />
      <dd className="shrink-0 text-ink tabular-nums">{value}</dd>
    </div>
  );
}

/*
  micro-spec: Report readout
  role:      the scan's facts as the machine prints them: label, dot leader, value
  form:      12px mono caps, two columns of leader lines on desktop, one on a phone; label ink-3,
             value ink, leader dotted ink-3 (r1: facts split to the two edges of one measure)
  behaviour: each line prints after the one above, 60ms apart; while scanning the values are
             the CRT's blinking block cursor and the clock counts real seconds
*/
function Facts({ scan }: { scan: ScanState }) {
  const elapsed = useElapsed(scan.phase === 'scanning' ? scan.startedAt : null);

  let rows: [string, React.ReactNode][];
  if (scan.phase === 'found') {
    const facts = scan.families.map(familyFacts);
    rows = [
      ['Families', scan.families.length],
      ['Faces', facts.reduce((total, f) => total + f.faceCount, 0)],
      ['Variable', facts.filter((f) => f.isVariable).length],
      ['Time', `${(scan.elapsedMs / 1000).toFixed(1)} s`],
    ];
  } else if (scan.phase === 'scanning') {
    const seconds = Math.floor(elapsed / 1000);
    const cursor = <span className="cursor" />;
    rows = [
      ['Families', cursor],
      ['Faces', cursor],
      ['Variable', cursor],
      ['Time', seconds < 1 ? 'starting' : `${seconds} s`],
    ];
  } else {
    rows = [
      ['Families', '0'],
      ['Status', scan.phase === 'empty' ? 'Nothing to take' : 'Failed'],
    ];
  }
  return (
    <>
      {rows.map(([label, value], i) => (
        <Readout key={label} i={i} label={label} value={value} />
      ))}
    </>
  );
}

export default function ScanHeader({ scan, host, url }: { scan: ScanState; host: string; url: string }) {
  const [stamp] = useState(() =>
    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  );

  return (
    <section className="pt-8 pb-6 sm:pt-10">
      <div className="flex items-baseline justify-between gap-4 text-[12px] tracking-[0.08em] text-ink-3 uppercase">
        <span>
          <span className="max-sm:hidden">FontStealer · </span>Scan report
        </span>
        <span className="tabular-nums">{stamp}</span>
      </div>

      <div className="@container mt-6 flex min-w-0 items-center gap-3">
        <h1
          data-tb-ignore="type-ladder: once loaded, the title is set in the scanned site's own face"
          key={scan.phase === 'found' ? 'found' : 'pending'}
          className="min-w-0 leading-[1.15] text-ink"
          style={{ fontSize: hostFontSize(host) }}
          title={host}
        >
          <HostTitle face={scan.phase === 'found' ? primaryFace(scan.families) : null} host={host} />
        </h1>
        {url && scan.phase !== 'failed' && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${host} in a new tab`}
            className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-[3px] pointer-coarse:size-12 text-ink-3 transition-colors duration-120 ease-out hover:bg-ink/8 hover:text-ink active:bg-ink/15"
          >
            <ExternalIcon />
          </a>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <dl
          role="status"
          aria-live="polite"
          className="grid w-full max-w-[520px] gap-x-8 gap-y-1.5 text-[12px] tracking-[0.08em] uppercase sm:grid-cols-2"
        >
          <Facts scan={scan} />
        </dl>
        {(scan.phase === 'found' || scan.phase === 'scanning') && (
          <DownloadAll families={scan.phase === 'found' ? scan.families : []} host={host} />
        )}
      </div>
    </section>
  );
}
