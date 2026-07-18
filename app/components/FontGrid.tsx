'use client';

import { FontFamily } from '../types';
import FontCard, { hashFontId } from './FontCard';

interface FontGridProps {
  families: FontFamily[];
  previewText?: string;
}

function stableFamilyKey(fontFamily: FontFamily, index: number): string {
  const seed = fontFamily.representative.url || fontFamily.family || String(index);
  return `${fontFamily.family}|${hashFontId(seed).slice(0, 12)}`;
}

export default function FontGrid({ families, previewText }: FontGridProps) {
  if (families.length === 0) return null;

  const single = families.length === 1;

  return (
    <div
      className={
        single
          ? 'grid grid-cols-1 gap-5 lg:max-w-[420px]'
          : 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      }
    >
      {families.map((fontFamily, index) => {
        const key = stableFamilyKey(fontFamily, index);
        return (
          <FontCard
            key={key}
            cardKey={key}
            fontFamily={fontFamily}
            index={index}
            previewText={previewText}
          />
        );
      })}
    </div>
  );
}
