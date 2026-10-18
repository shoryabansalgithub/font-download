'use client';

import type { DownloadState } from './useDownload';

/*
  micro-spec: Download note
  role:      says what a download could not do: the files a zip skipped, or why it failed
  form:      12px mono, printed under the key it belongs to, aligned to the key's edge, led by a
             small stamp ("REFUSED" / "FAILED") in the warm stamp ink
  behaviour: appears with the state that caused it and stays until the next download; a partial
             zip is never announced as plain success
  absent:    a toast: it would vanish before the list of skipped files could be read
*/
export default function DownloadNote({
  state,
  align = 'start',
  className = '',
}: {
  state: DownloadState;
  align?: 'start' | 'end';
  className?: string;
}) {
  const partial = state.kind === 'saved' && state.skipped.length > 0;
  if (state.kind !== 'failed' && !partial) return null;

  const edge = align === 'end' ? 'sm:justify-end sm:text-right' : '';
  let message = '';
  if (state.kind === 'failed') message = state.message;
  else if (state.kind === 'saved') {
    const more = state.skipped.length > 2 ? ` and ${state.skipped.length - 2} more` : '';
    message = `The site refused ${state.skipped.slice(0, 2).join(', ')}${more}. The zip holds the rest.`;
  }

  return (
    <div className={className}>
      <p role={partial ? 'status' : 'alert'} className={`flex max-w-80 items-baseline gap-2 text-[12px] text-ink-2 ${edge}`}>
        <span className="stamp shrink-0">{partial ? 'Refused' : 'Failed'}</span>
        <span className="min-w-0 [overflow-wrap:anywhere]">{message}</span>
      </p>
    </div>
  );
}
