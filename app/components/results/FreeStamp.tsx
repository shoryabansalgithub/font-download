import { useId } from 'react';
import { hashFontId } from '../../lib/faces';

const W = 50;
const H = 22;

/** The same family always gets the same impression: its tilt and its wear. */
function impression(seedText: string) {
  const bits = parseInt(hashFontId(seedText), 16);
  const pick = (shift: number, range: number) => ((bits >>> shift) & 0xff) % range;
  return { tilt: -1 - pick(16, 4), seed: pick(24, 97) + 1 };
}

/*
  micro-spec: FREE stamp
  role:      tells the visitor, on the row itself, that this family is free on Google Fonts, so
             they never have to search for a free stand-in to learn it
  form:      a rubber-stamp impression 50x22 beside the family name on its baseline: a 1.5px
             frame and "FREE" in bold mono caps, tilted 1 to 4 degrees (decided per family, so a
             reload never reshuffles it)
  material:  wet stamp-pad ink: deep green #1a6b34 (5.3:1 on paper, 4.6:1 on a band), multiplied
             into the paper; edges roughened a little and the coverage broken by fine speckle,
             never through a letter's whole stroke
  behaviour: lands with a short press (scale 1.15 to 1, 180ms carriage curve) after its row
             prints; still under reduced motion
  absent:    the red stamp ink (that marks refusals and faults), a glow, a badge pill, ink runs (cut on review)
*/
export default function FreeStamp({ family, googleFamily }: { family: string; googleFamily: string }) {
  const id = useId().replace(/:/g, '');
  const { tilt, seed } = impression(family);

  return (
    <span
      className="free-stamp relative inline-block shrink-0 self-center"
      style={{ '--tilt': `${tilt}deg` } as React.CSSProperties}
      title={`Free on Google Fonts as ${googleFamily}`}
    >
      <svg aria-hidden width={W} height={H} viewBox={`0 0 ${W} ${H}`} overflow="visible" className="block">
        <defs>
          <filter id={`ink-${id}`} x="-10%" y="-10%" width="120%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="1" seed={seed} result="grain" />
            <feDisplacementMap in="SourceGraphic" in2="grain" scale="0.8" xChannelSelector="R" yChannelSelector="G" result="rough" />
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed + 7} result="speckle" />
            <feColorMatrix in="speckle" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -9 6.4" result="coverage" />
            <feComposite in="rough" in2="coverage" operator="in" />
          </filter>
        </defs>
        <g filter={`url(#ink-${id})`} fill="currentColor" stroke="currentColor">
          <rect x="0.75" y="0.75" width={W - 1.5} height={H - 1.5} rx="2" fill="none" strokeWidth="1.6" />
          <text
            x={W / 2}
            y={H / 2 + 4.5}
            textAnchor="middle"
            stroke="none"
            fontSize="13"
            fontWeight="700"
            textLength={34}
            lengthAdjust="spacingAndGlyphs"
          >
            FREE
          </text>
        </g>
      </svg>
      <span className="sr-only">Free on Google Fonts</span>
    </span>
  );
}
