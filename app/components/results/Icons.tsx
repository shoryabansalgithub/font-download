/*
  micro-spec: Icon set
  role:      the only icons on the results screen; one drawing language for all of them
  form:      16 box, 1.5 stroke, round caps and joins, drawn on the pixel grid at 1x;
             stroke matches Inter 400's stem at 14px, so icon and label carry the same ink
  material:  currentColor only; an icon never owns a colour of its own
  depth:     none
  behaviour: inherits the control's state colour; the check draws once on success
  absent:    filled icons, duotone, a second stroke weight
*/

type IconProps = { className?: string };

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M8 2.5v8m0 0L4.75 7.25M8 10.5l3.25-3.25M3 13.25h10" />
    </svg>
  );
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3.75 10.25 8 6 12.25" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path className="check-draw" d="M3.5 8.5 6.5 11.5 12.5 4.75" />
    </svg>
  );
}


export function ExternalIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9.5 2.75h3.75V6.5M13.25 2.75 7.5 8.5M11.5 9.5v3a.75.75 0 0 1-.75.75h-7.5a.75.75 0 0 1-.75-.75v-7.5a.75.75 0 0 1 .75-.75h3" />
    </svg>
  );
}



export function SimilarIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="6" cy="8" r="3.75" />
      <circle cx="10" cy="8" r="3.75" />
    </svg>
  );
}

export function Spinner({ className }: IconProps) {
  return (
    <svg {...base} className={`motion-safe:animate-spin ${className ?? ''}`}>
      <path d="M8 2a6 6 0 1 0 6 6" />
    </svg>
  );
}
