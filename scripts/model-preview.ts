/**
 * Explicit-state model check of the specimen preview status.
 *
 * Explores every ordering, up to DEPTH steps, of what can happen to one
 * preview: the face on screen changes, the row scrolls in or out of view,
 * a font load settles, a timer fires. After every step it checks that the
 * status tells the truth about the face on screen.
 *
 * The real transition (app/lib/preview-state.ts) must pass. Two designs this
 * project actually shipped must fail, which is what proves the model can see
 * the bugs it exists for:
 *   - timer race: the old FontCard raced each load against a 4 s timer and
 *     marked anything slower "blocked" forever (fixed in d2cb795).
 *   - unkeyed status: the hook d2cb795 shipped kept one status per mount, so
 *     after the face changed it still reported the previous face's result.
 */

import { NO_PREVIEW, previewTransition, type PreviewState, type PreviewStatus } from '../app/lib/preview-state';

interface FaceSpec {
    renderable: boolean;
    /** What the browser does with the file. */
    loads: boolean;
}

const FACES: Record<string, FaceSpec> = {
    good: { renderable: true, loads: true },
    refused: { renderable: true, loads: false },
    eot: { renderable: false, loads: false },
};
const KEYS: (string | null)[] = [null, ...Object.keys(FACES)];
const DEPTH = 8;

interface Design<S> {
    name: string;
    init(key: string | null, renderable: boolean): S;
    show(s: S, key: string | null, renderable: boolean): S;
    settled(s: S, key: string, ok: boolean): S;
    timeout(s: S, key: string): S;
    usesTimer: boolean;
    status(s: S): PreviewStatus;
}

const real: Design<PreviewState> = {
    name: 'previewTransition',
    init: (key, renderable) => previewTransition(NO_PREVIEW, { type: 'show', key, renderable }),
    show: (s, key, renderable) => previewTransition(s, { type: 'show', key, renderable }),
    settled: (s, key, ok) => previewTransition(s, { type: 'settled', key, ok }),
    timeout: (s) => s,
    usesTimer: false,
    status: (s) => s.status,
};

type Legacy = { key: string | null; status: PreviewStatus };

const timerRace: Design<Legacy> = {
    name: 'timer race (FontCard before d2cb795)',
    init: (key, renderable) => ({ key, status: renderable ? 'loading' : 'unsupported' }),
    show: (s, key, renderable) => (key === s.key ? s : { key, status: renderable ? 'loading' : 'unsupported' }),
    settled: (s, key, ok) => (key === s.key && s.status === 'loading' ? { key, status: ok ? 'ready' : 'blocked' } : s),
    timeout: (s, key) => (key === s.key && s.status === 'loading' ? { key, status: 'blocked' } : s),
    usesTimer: true,
    status: (s) => s.status,
};

const unkeyed: Design<Legacy> = {
    name: 'unkeyed status (usePreview from d2cb795)',
    init: (key, renderable) => ({ key, status: renderable ? 'loading' : 'unsupported' }),
    show: (s, key) => ({ key, status: s.status }),
    settled: (s, key, ok) => (key === s.key ? { key, status: ok ? 'ready' : 'blocked' } : s),
    timeout: (s) => s,
    usesTimer: false,
    status: (s) => s.status,
};

interface World<S> {
    design: S;
    key: string | null;
    enabled: boolean;
    /** Loads started by an effect whose answer has not arrived yet. */
    pending: string[];
    timers: string[];
    /** Keys whose load an effect started since this face was last put on screen. */
    requested: string[];
}

const renderableOf = (key: string | null) => (key === null ? true : FACES[key].renderable);
const add = (list: string[], key: string) => (list.includes(key) ? list : [...list, key].sort());
const remove = (list: string[], key: string) => list.filter((k) => k !== key);

/** What the hook's effect does after a render: start a load when the face is shown, wanted and drawable. */
function runEffect<S>(design: Design<S>, w: World<S>, depsChanged: boolean): World<S> {
    if (!depsChanged || w.key === null || !w.enabled || !renderableOf(w.key)) return w;
    return {
        ...w,
        pending: add(w.pending, w.key),
        timers: design.usesTimer ? add(w.timers, w.key) : w.timers,
        requested: add(w.requested, w.key),
    };
}

function* steps<S>(design: Design<S>, w: World<S>): Generator<[string, World<S>]> {
    for (const key of KEYS) {
        if (key === w.key) continue;
        const next = { ...w, key, requested: [], design: design.show(w.design, key, renderableOf(key)) };
        yield [`show ${key}`, runEffect(design, next, true)];
    }
    yield [w.enabled ? 'scroll away' : 'scroll near', runEffect(design, { ...w, enabled: !w.enabled }, true)];
    for (const key of w.pending) {
        const ok = FACES[key].loads;
        yield [`${key} ${ok ? 'loads' : 'is refused'}`, { ...w, pending: remove(w.pending, key), design: design.settled(w.design, key, ok) }];
    }
    for (const key of w.timers) {
        yield [`timer for ${key} fires`, { ...w, timers: remove(w.timers, key), design: design.timeout(w.design, key) }];
    }
}

function violation<S>(design: Design<S>, w: World<S>): string | null {
    const status = design.status(w.design);
    const face = w.key === null ? null : FACES[w.key];
    if (status === 'ready' && !(face?.renderable && face.loads)) {
        return w.key === null ? 'says ready with no face on screen' : `says ready, but ${w.key} never loaded`;
    }
    if (status === 'blocked' && !(face?.renderable && !face.loads)) {
        return w.key === null ? 'says blocked with no face on screen' : `says blocked, but the browser never refused ${w.key}`;
    }
    if ((status === 'unsupported') !== (face !== null && !face.renderable)) {
        return `says ${status} for ${w.key ?? 'no face'}`;
    }
    const answered = w.key !== null && w.requested.includes(w.key) && !w.pending.includes(w.key);
    if (status === 'loading' && answered && face?.renderable) {
        return `still loading ${w.key} after the browser answered`;
    }
    return null;
}

function explore<S>(design: Design<S>): { states: number; trace?: string[]; reason?: string } {
    const seen = new Set<string>();
    let frontier: { world: World<S>; trace: string[] }[] = [];
    for (const key of KEYS) {
        for (const enabled of [true, false]) {
            const start: World<S> = {
                design: design.init(key, renderableOf(key)), key, enabled, pending: [], timers: [], requested: [],
            };
            frontier.push({ world: runEffect(design, start, true), trace: [`mount ${key}${enabled ? '' : ' offscreen'}`] });
        }
    }
    for (let depth = 0; depth <= DEPTH && frontier.length > 0; depth++) {
        const next: typeof frontier = [];
        for (const { world, trace } of frontier) {
            const id = JSON.stringify(world);
            if (seen.has(id)) continue;
            seen.add(id);
            const reason = violation(design, world);
            if (reason) return { states: seen.size, trace, reason };
            for (const [label, after] of steps(design, world)) next.push({ world: after, trace: [...trace, label] });
        }
        frontier = next;
    }
    return { states: seen.size };
}

let failed = false;

function expect<S>(design: Design<S>, shouldHold: boolean) {
    const result = explore(design);
    const held = !result.trace;
    const verdict = held === shouldHold ? 'pass' : 'FAIL';
    if (held !== shouldHold) failed = true;
    console.log(`  ${verdict}  ${design.name}: ${held ? 'holds' : 'violated'} (${result.states} states)`);
    if (result.trace) {
        console.log(`        ${result.trace.join(' -> ')}`);
        console.log(`        ${result.reason}`);
    }
}

console.log('\nThe preview status the app ships tells the truth in every ordering');
expect(real, true);

console.log('\nThe model catches the designs that shipped these bugs');
expect(timerRace, false);
expect(unkeyed, false);

console.log('');
if (failed) process.exit(1);
