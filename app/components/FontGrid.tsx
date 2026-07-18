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

  // A stack of full-measure rows, not a grid of tiles. A typeface is judged on a
  // line of text at size; a half- or quarter-width column chops the specimen into
  // ragged fragments and shrinks the one thing the user came to look at.
  return (
    <div className="flex flex-col gap-4">
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
    </div>
  );
}
