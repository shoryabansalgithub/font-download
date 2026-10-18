'use client';

import { useEffect, useState } from 'react';
import { formatInfo, type Face } from '../../lib/faces';
import { previewSources } from '../../lib/font-files';

/** Blocked: the browser rejected the file. Unsupported: a format no modern browser renders. */
export type PreviewStatus = 'loading' | 'ready' | 'blocked' | 'unsupported';

const loads = new Map<string, Promise<boolean>>();

function previewFamily(face: Face): string {
  return `fs-${face.key}`;
}

function createFace(face: Face, source: string, unicodeRange?: string): FontFace {
  const css = `url("${source.replace(/"/g, '%22')}")`;
  const descriptors = { style: face.italic ? 'italic' : 'normal', ...(unicodeRange && { unicodeRange }) };
  try {
    return new FontFace(previewFamily(face), css, { ...descriptors, weight: face.variant.weight || '400' });
  } catch {
    return new FontFace(previewFamily(face), css, descriptors);
  }
}

function load(face: Face): Promise<boolean> {
  let pending = loads.get(face.key);
  if (!pending) {
    const [primary, ...loadedOnDemand] = previewSources(face).map(({ source, unicodeRange }) => createFace(face, source, unicodeRange));
    pending = primary
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
        for (const subset of loadedOnDemand) document.fonts.add(subset);
        return true;
      })
      .catch(() => false);
    loads.set(face.key, pending);
  }
  return pending;
}

export function usePreview(face: Face | null, enabled: boolean): PreviewStatus {
  const renderable = face ? formatInfo(face.variant.format).renderable : true;
  const [status, setStatus] = useState<PreviewStatus>(renderable ? 'loading' : 'unsupported');
  useEffect(() => {
    if (!face || !enabled || !renderable) return;
    let live = true;
    load(face).then((ok) => live && setStatus(ok ? 'ready' : 'blocked'));
    return () => {
      live = false;
    };
  }, [face, enabled, renderable]);
  return status;
}

export function faceStyle(face: Face, status: PreviewStatus, weight = face.renderWeight): React.CSSProperties {
  return status === 'ready'
    ? { fontFamily: `"${previewFamily(face)}", ui-sans-serif, system-ui`, fontWeight: weight, fontStyle: face.italic ? 'italic' : 'normal' }
    : { fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontWeight: 400 };
}

/*
  micro-spec: Specimen line
  role:      the face doing the job it was bought for: setting the visitor's own words
  form:      xs (12/16, the captain's size), one line, truncated with an ellipsis; the face's
             own weight and style; no tracking change, the face's spacing is the point
  material:  ink on the page; while the file loads, the same words in the system face at
             ink-3 hold the line's width so nothing reflows when the real face lands
  behaviour: when the face arrives during this mount, the line prints in left to right
             (clip wipe, 260ms, carriage curve) - the machine setting the type; a face that
             was already loaded appears without the wipe; blocked or unsupported prints a muted dash
  absent:    a skeleton bar: the words are known before the font is, so show them
*/
export function Specimen({ face, status, text }: { face: Face; status: PreviewStatus; text: string }) {
  const [arrivedLive] = useState(status !== 'ready');
  const printed = status === 'ready' && arrivedLive;

  if (status === 'blocked' || status === 'unsupported') {
    return (
      <span aria-label="Preview unavailable" className="block text-xs text-ink-3/60">
        –
      </span>
    );
  }

  return (
    <span
      className={`block text-xs [overflow-wrap:anywhere] ${status === 'ready' ? 'text-ink' : 'text-ink-3'} ${printed ? 'print-in' : ''}`}
      style={faceStyle(face, status)}
    >
      {text || ' '}
    </span>
  );
}
