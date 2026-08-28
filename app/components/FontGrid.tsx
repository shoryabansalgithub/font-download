'use client';

import { FontFamily } from '../types';
import FontCard, { hashFontId } from './FontCard';

interface FontGridProps {
  families: FontFamily[];
  previewText?: string;
  /** Editing the specimen in any one row retunes every row, so the faces stay comparable. */
  onPreviewTextChange?: (next: string) => void;
}

function stableFamilyKey(fontFamily: FontFamily, index: number): string {
  const seed = fontFamily.representative.url || fontFamily.family || String(index);
  return `${fontFamily.family}|${hashFontId(seed).slice(0, 12)}`;
}

export default function FontGrid({ families, previewText, onPreviewTextChange }: FontGridProps) {
  if (families.length === 0) return null;

  // One pane of screen glass holding every family as a numbered catalogue row,
  // divided by hairlines - not a tray of floating cards. Full-measure rows
  // because a typeface is judged on a line of text at size; a half-width
  // column chops the specimen into ragged fragments.
  return (
    <section className="panel divide-y divide-[rgba(214,229,255,0.12)] overflow-hidden">
      {families.map((fontFamily, index) => {
        const key = stableFamilyKey(fontFamily, index);
        return (
          <FontCard
            key={key}
            cardKey={key}
            fontFamily={fontFamily}
            index={index}
            previewText={previewText}
            onPreviewTextChange={onPreviewTextChange}
          />
        );
      })}
    </section>
  );
}
