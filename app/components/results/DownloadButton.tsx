'use client';

import type { DownloadState } from './useDownload';
import { CheckIcon, DownloadIcon, Spinner } from './Icons';

/*
  micro-spec: Key / primary (STEAL ALL)
  role:      the report's one big action: take everything the scan found
  form:      the hero's STEAL keycap at printout scale: h-10, px-5, 12px mono caps tracked
             0.125em, radius 3 (the hero key's own); the count rides in the label
  material:  pale keycap plastic, top-lit gradient #eef4ff -> #c4d6fa, ink #16309e at 7.8:1
  depth:     a bevel line on top, a 2px skirt in the casing's shadow blue, a soft cast on paper
  behaviour: hover +4% brightness, 120ms | press travels the 2px skirt and loses its cast in the
             first frame, releases over 160ms on the ease-out curve |
             working "STEALING 7/31" with a progress line along the key's foot | saved: the key
             turns mint, check draws, "STOLEN" for 1.6s | failed: stamp-red "RETRY" |
             disabled while scanning: flat, skirt 1px, muted label
  absent:    a fill in the accent: on paper the keycap is the action, colour is for the stamp

  micro-spec: Key / small (family STEAL)
  form:      h-8, px-3, same plastic and depth at 1px less skirt travel; label "STEAL"

  micro-spec: Key / icon (face download)
  form:      size-8 square keycap with the 16px download glyph; aria-label names the file
*/

type Variant = 'primary' | 'secondary' | 'icon';

const variantClass: Record<Variant, string> = {
  primary: 'key key-primary key-lg gap-2',
  secondary: 'key key-sm gap-2',
  icon: 'key key-icon',
};

function stateLabel(state: DownloadState, idle: string): string {
  switch (state.kind) {
    case 'idle':
      return idle;
    case 'working':
      return state.total > 1 ? `Stealing ${state.done}/${state.total}` : 'Stealing';
    case 'saved':
      return state.skipped.length > 0 ? `Stole ${state.saved}/${state.saved + state.skipped.length}` : 'Stolen';
    case 'failed':
      return 'Retry';
  }
}

export default function DownloadButton({
  variant,
  state,
  idleLabel,
  ariaLabel,
  disabled,
  onClick,
  compactOnPhone = false,
  className = '',
}: {
  variant: Variant;
  compactOnPhone?: boolean;
  state: DownloadState;
  idleLabel: string;
  ariaLabel?: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  const working = state.kind === 'working';
  const saved = state.kind === 'saved';
  const failed = state.kind === 'failed';
  const label = stateLabel(state, idleLabel);
  const tone = saved && state.skipped.length === 0 ? 'key-stolen' : failed ? 'key-failed' : '';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={working || undefined}
      aria-label={variant === 'icon' ? `${ariaLabel}${working ? ', saving' : saved ? ', saved' : ''}` : ariaLabel}
      title={variant === 'icon' ? ariaLabel : undefined}
      className={`relative inline-flex shrink-0 ${compactOnPhone ? 'max-sm:w-12 max-sm:px-0' : ''} items-center justify-center overflow-hidden text-[12px] tracking-[0.125em] whitespace-nowrap uppercase ${variantClass[variant]} ${tone} ${working ? 'cursor-progress' : ''} ${className}`}
    >
      {working ? <Spinner /> : saved ? <CheckIcon /> : <DownloadIcon />}
      {variant !== 'icon' && <span className={`tabular-nums ${compactOnPhone ? 'max-sm:sr-only' : ''}`}>{label}</span>}
      {variant === 'primary' && working && state.total > 1 && (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[#16309e]/40 transition-transform duration-120 ease-out"
          style={{ transform: `scaleX(${state.done / state.total})` }}
        />
      )}
    </button>
  );
}
