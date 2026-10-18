'use client';

import type { FontFamily } from '../../types';
import { facesOf } from '../../lib/faces';
import { filesOf, zipName } from '../../lib/font-files';
import DownloadButton from './DownloadButton';
import DownloadNote from './DownloadNote';
import { useDownload } from './useDownload';

export default function DownloadAll({ families, host }: { families: FontFamily[]; host: string }) {
  const { state, run } = useDownload();

  const faceCount = families.reduce((sum, family) => sum + facesOf(family).length, 0);

  const start = () =>
    void run({
      files: families.flatMap((family) => filesOf(family.family, facesOf(family), family.family)),
      archive: zipName(host, '-fonts'),
    });

  return (
    <div className="flex min-w-0 shrink-0 flex-col items-stretch gap-2 sm:items-end">
      <DownloadButton
        variant="primary"
        state={state}
        idleLabel={faceCount > 0 ? `Steal all ${faceCount}` : 'Steal all'}
        ariaLabel={faceCount > 0 ? `Download all ${faceCount} faces from ${host} as one zip` : 'Download all, available when the scan finishes'}
        disabled={faceCount === 0}
        onClick={start}
        className="min-w-48 max-sm:w-full"
      />
      <DownloadNote state={state} align="end" />
    </div>
  );
}
