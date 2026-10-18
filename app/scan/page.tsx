'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FontFamily } from '../types';
import { hostOf, normalizeScanUrl } from '../lib/scan-url';
import Console from '../components/results/Console';
import ScanHeader from '../components/results/ScanHeader';
import FamilyList from '../components/results/FamilyList';
import ScanPending from '../components/results/ScanPending';
import ScanOutcome from '../components/results/ScanOutcome';

export type ScanState =
  | { phase: 'scanning'; startedAt: number }
  | { phase: 'failed'; message: string }
  | { phase: 'empty' }
  | { phase: 'found'; families: FontFamily[]; elapsedMs: number };

function humanizeExtractError(message: string, host: string): string {
  if (message === 'Invalid URL' || message === 'URL is required') {
    return "That address isn't a valid URL. Check it and scan again.";
  }
  const fetchMatch = message.match(/^Failed to fetch website:\s*(.+)$/i);
  if (fetchMatch) return `${host} answered with an error (${fetchMatch[1]}). It may block automated visits.`;
  if (message === 'network') return 'The scan could not reach the server. Check your connection and retry.';
  return `FontStealer couldn't load ${host}. The address may be mistyped, the site may be down, or it may turn away automated visits.`;
}

/*
  micro-spec: Printout (the sheet every phase is printed on)
  role:      the one surface the results live on; scanning, findings, empty and failed are
             all printed onto the same sheet, so the phase changes the ink, never the paper
  form:      max 920 wide, centred under the console; tractor strips 28px each side (16 on a
             phone) with holes on a 24px pitch; content padded 24px inside the strips
  material:  casing-white stock with the photo's grain multiplied in, bluebar bands on rows
  depth:     contact line plus a long soft cast into the room: the sheet lies on the floor,
             lit from above; it feeds out from under the slot's lip
  behaviour: feeds up 24px out of the slot once, on arrival (420ms, carriage curve)
  absent:    rounded corners (paper is cut), a card border, a second sheet
*/
function ScanScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawUrl = searchParams.get('url');
  const url = rawUrl ? normalizeScanUrl(rawUrl) : '';
  const host = url ? hostOf(url) : '';

  const [scan, setScan] = useState<ScanState>({ phase: 'scanning', startedAt: 0 });
  const requestRef = useRef(0);

  const runScan = useCallback(async (target: string) => {
    const requestId = ++requestRef.current;
    const startedAt = Date.now();
    setScan({ phase: 'scanning', startedAt });
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
      const data = await response.json();
      if (requestId !== requestRef.current) return;
      if (!response.ok) throw new Error(data.error || 'Failed to extract fonts');
      const families: FontFamily[] = [...(data.families || [])].sort((a, b) =>
        a.family.localeCompare(b.family)
      );
      setScan(
        families.length === 0
          ? { phase: 'empty' }
          : { phase: 'found', families, elapsedMs: Date.now() - startedAt }
      );
    } catch (err) {
      if (requestId !== requestRef.current) return;
      const message = err instanceof TypeError ? 'network' : err instanceof Error ? err.message : '';
      setScan({ phase: 'failed', message });
    }
  }, []);

  useEffect(() => {
    if (!url) {
      router.replace('/');
      return;
    }
    void runScan(url);
  }, [url, router, runScan]);

  const goHome = useCallback(() => router.push('/'), [router]);
  const retry = useCallback(() => void runScan(url), [runScan, url]);

  return (
    <div className="results">
      <main className="mx-auto w-full max-w-[920px] px-3 pt-4 pb-24 sm:px-8 sm:pt-10">
        <Console
          key={url}
          state={scan.phase === 'scanning' ? 'printing' : scan.phase === 'failed' ? 'failed' : 'ready'}
          scanned={url}
        />
        <div className="relative z-20 -mt-[19px] px-2 sm:px-4">
          <div className="feed-in">
            <div className="paper px-4 sm:px-7">
              <span aria-hidden className="tractor tractor-l" />
              <span aria-hidden className="tractor tractor-r" />
              <div aria-hidden className="feed-shadow pointer-events-none absolute inset-x-0 top-0 h-6" />
              <div className="relative px-2 sm:px-6">
                <ScanHeader scan={scan} host={host} url={url} />
                {scan.phase === 'scanning' && <ScanPending startedAt={scan.startedAt} onStop={goHome} />}
                {scan.phase === 'found' && <FamilyList families={scan.families} host={host} />}
                {scan.phase === 'empty' && (
                  <ScanOutcome
                    stamp="No webfonts found"
                    body={`${host} loads no font files of its own. It may set type in system fonts, block automated visits, or load its fonts only after someone interacts with it.`}
                    primary={{ label: 'SCAN ANOTHER SITE', onClick: goHome }}
                    secondary={{ label: 'SCAN AGAIN', onClick: retry }}
                  />
                )}
                {scan.phase === 'failed' && (
                  <ScanOutcome
                    stamp="Scan failed"
                    body={humanizeExtractError(scan.message, host)}
                    primary={{ label: 'RETRY SCAN', onClick: retry }}
                    secondary={{ label: 'SCAN ANOTHER SITE', onClick: goHome }}
                  />
                )}
                <footer className="mt-8 pb-6">
                  <div aria-hidden className="double-rule" />
                  <p className="mt-3 text-center text-[12px] tracking-[0.08em] text-ink-3 uppercase">
                    {scan.phase === 'scanning' ? 'Printing' : 'End of report'} · {host}
                  </p>
                </footer>
              </div>
            </div>
            <div aria-hidden className="torn" />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="results" />}>
      <ScanScreen />
    </Suspense>
  );
}
