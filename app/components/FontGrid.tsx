'use client';

import { FontInfo } from '../types';
import FontCard, { hashFontId } from './FontCard';

interface FontGridProps {
  fonts: FontInfo[];
  previewText?: string;
}

function stableFontKey(font: FontInfo, index: number): string {
  const urlHash = hashFontId(font.url || font.family || String(index)).slice(0, 12);
  return `${font.family}|${font.weight || '400'}|${font.style || 'normal'}|${urlHash}|${index}`;
}

export default function FontGrid({ fonts, previewText }: FontGridProps) {
  if (fonts.length === 0) return null;

  const single = fonts.length === 1;

  return (
    <div
      className={
        single
          ? 'grid grid-cols-1 gap-5 lg:max-w-[420px]'
          : 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      }
    >
      {fonts.map((font, index) => {
        const key = stableFontKey(font, index);
        return (
          <FontCard
            key={key}
            cardKey={key}
            font={font}
            index={index}
            previewText={previewText}
          />
        );
      })}
    </div>
  );
}
