/** Blocked: the browser rejected the file. Unsupported: a format no modern browser renders. */
export type PreviewStatus = 'loading' | 'ready' | 'blocked' | 'unsupported';

/** The status always belongs to `key`, so one face's result can never be shown for another. */
export interface PreviewState {
  key: string | null;
  status: PreviewStatus;
}

export type PreviewEvent =
  | { type: 'show'; key: string | null; renderable: boolean }
  | { type: 'settled'; key: string; ok: boolean };

export const NO_PREVIEW: PreviewState = { key: null, status: 'loading' };

/**
 * Only the browser's answer for the face on screen moves it out of loading:
 * no timer, and no late answer for a face that has since been replaced.
 * scripts/model-preview.ts checks this against every ordering of events.
 */
export function previewTransition(state: PreviewState, event: PreviewEvent): PreviewState {
  if (event.type === 'show') {
    if (event.key === state.key) return state;
    return { key: event.key, status: event.key !== null && !event.renderable ? 'unsupported' : 'loading' };
  }
  if (event.key !== state.key) return state;
  return { key: state.key, status: event.ok ? 'ready' : 'blocked' };
}
