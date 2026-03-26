'use client';

import { FontInfo } from '../types';
import FontCard from './FontCard';

interface FontGridProps {
    fonts: FontInfo[];
    previewText?: string;
}

export default function FontGrid({ fonts, previewText }: FontGridProps) {
    if (fonts.length === 0) return null;
    
    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {fonts.map((font, index) => (
                <FontCard key={`${font.url || font.family}-${index}`} font={font} index={index} previewText={previewText} />
            ))}
        </div>
    );
}
