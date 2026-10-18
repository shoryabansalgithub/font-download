'use client';

import { useMemo } from 'react';
import type { FontFamily } from '../../types';
import { facesOf } from '../../lib/faces';
import { fileOf, zipName } from '../../lib/font-files';
import DownloadButton from './DownloadButton';
import DownloadNote from './DownloadNote';
import { useDownload } from './useDownload';

export default function DownloadAll({ families, host }: { families: FontFamily[]; host: string }) {
  const { state, run } = useDownload();

  const files = useMemo(
    () => families.flatMap((family) => facesOf(family).map((face) => fileOf(family.family, face, family.family))),
    [families]
  );

  const start = () => void run({ files, archive: zipName(host, '-fonts') });

  return (
    <div className="flex min-w-0 shrink-0 flex-col items-stretch gap-2 sm:items-end">
      <DownloadButton
        variant="primary"
        state={state}
        idleLabel={files.length > 0 ? `Steal all ${files.length}` : 'Steal all'}
        ariaLabel={files.length > 0 ? `Download all ${files.length} faces from ${host} as one zip` : 'Download all, available when the scan finishes'}
        disabled={files.length === 0}
        onClick={start}
        className="min-w-48 max-sm:w-full"
      />
      <DownloadNote state={state} align="end" />
    </div>
  );
}
