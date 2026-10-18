'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { collect, saveBlob, zipFiles, type FontFile } from '../../lib/font-files';

export type DownloadState =
  | { kind: 'idle' }
  | { kind: 'working'; done: number; total: number }
  | { kind: 'saved'; saved: number; skipped: string[] }
  | { kind: 'failed'; message: string };

export interface DownloadRequest {
  files: FontFile[];
  /** Zip filename. Without it, only the first collected file is saved. */
  archive?: string;
}

const SAVED_HOLD_MS = 1600;

export function useDownload() {
  const [state, setState] = useState<DownloadState>({ kind: 'idle' });
  const busy = useRef(false);

  useEffect(() => {
    if (state.kind !== 'saved' || state.skipped.length > 0) return;
    const id = window.setTimeout(() => setState({ kind: 'idle' }), SAVED_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [state]);

  const run = useCallback(async ({ files, archive }: DownloadRequest) => {
    if (busy.current || files.length === 0) return;
    busy.current = true;
    setState({ kind: 'working', done: 0, total: files.length });
    try {
      const results = await collect(files, (done, total) => setState({ kind: 'working', done, total }));
      const ok = results.filter((r) => r.ok);
      const skipped = results.filter((r) => !r.ok).map((r) => r.file.name);
      if (ok.length === 0) {
        const reason = results.find((r) => !r.ok);
        setState({
          kind: 'failed',
          message:
            files.length === 1
              ? `The site refused the file${reason && !reason.ok ? ` (${reason.error})` : ''}.`
              : `The site refused all ${files.length} files.`,
        });
        return;
      }
      if (archive) {
        saveBlob(await zipFiles(ok), archive);
      } else {
        saveBlob(ok[0].blob, ok[0].file.name);
      }
      setState({ kind: 'saved', saved: ok.length, skipped });
    } catch {
      setState({ kind: 'failed', message: 'The download could not be assembled.' });
    } finally {
      busy.current = false;
    }
  }, []);

  return { state, run };
}
