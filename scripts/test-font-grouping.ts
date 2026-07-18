/**
 * Tests for the family grouping rules in app/lib/font-grouping.ts.
 *
 * Run with `npm test`. There is no test framework in this project, so this is a
 * plain tsx script that exits non-zero on failure - the grouping rules are pure
 * functions, so a runner would only add a dependency, not clarity. Swapping this
 * for vitest later is mechanical: each `check(...)` becomes an `expect`.
 */

import { groupFontFaces, type RawFontFace } from '../app/lib/font-grouping';

let passed = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson === expectedJson) {
        passed++;
        console.log(`  pass  ${label}`);
    } else {
        failures.push(`${label}\n    expected ${expectedJson}\n    actual   ${actualJson}`);
        console.log(`  FAIL  ${label}`);
        console.log(`        expected ${expectedJson}`);
        console.log(`        actual   ${actualJson}`);
    }
}

function face(
    family: string,
    weight: string,
    style: string,
    url: string,
    extra: Partial<RawFontFace> = {}
): RawFontFace {
    return {
        name: url.split('/').pop() || '',
        family,
        format: 'WOFF2',
        url,
        weight,
        style,
        ...extra,
    };
}

console.log('\nA family declared once per weight x style collapses to one entry');
{
    const faces: RawFontFace[] = [];
    for (const weight of ['100', '400', '700', '900']) {
        for (const style of ['normal', 'italic']) {
            faces.push(face('Inter', weight, style, `https://x/inter-${weight}-${style}.woff2`));
        }
    }
    const [group, ...rest] = groupFontFaces(faces);
    check('one family', rest.length, 0);
    check('family name', group.family, 'Inter');
    check('keeps every variant', group.variants.length, 8);
    check('representative is upright 400', [group.representative.weight, group.representative.style], ['400', 'normal']);
}

console.log('\nA name suffix that restates the descriptors is stripped');
{
    const groups = groupFontFaces([
        face('Inter', '400', 'normal', 'https://x/a.woff2'),
        face('Inter Italic', '400', 'italic', 'https://x/b.woff2'),
        face('Inter-Bold', '700', 'normal', 'https://x/c.woff2'),
        face('Inter 700', '700', 'italic', 'https://x/d.woff2'),
        face('IBMPlexMono_SemiBoldItalic', '600', 'italic', 'https://x/e.woff2'),
        face('IBMPlexMono', '400', 'normal', 'https://x/f.woff2'),
    ]);
    check('families', groups.map((g) => g.family), ['IBMPlexMono', 'Inter']);
    check('Inter variants', groups[1].variants.length, 4);
}

console.log('\nA name suffix that contradicts the descriptors is a real family name');
{
    const groups = groupFontFaces([
        face('Inter', '400', 'normal', 'https://x/a.woff2'),
        // Upright, so "Italic" is part of the name rather than a restated descriptor.
        face('Inter Italic', '400', 'normal', 'https://x/b.woff2'),
        // A real Google family that sits at weight 400 despite being named Black.
        face('Archivo Black', '400', 'normal', 'https://x/c.woff2'),
    ]);
    check('families', groups.map((g) => g.family), ['Archivo Black', 'Inter', 'Inter Italic']);
}

console.log('\nFamilies that merely share a prefix stay separate');
{
    const groups = groupFontFaces([
        face('Inter', '400', 'normal', 'https://x/a.woff2'),
        face('Inter Display', '400', 'normal', 'https://x/b.woff2'),
        face('InterDisplay', '700', 'normal', 'https://x/c.woff2'),
        face('Geist', '400', 'normal', 'https://x/d.woff2'),
        face('Geist Mono', '400', 'normal', 'https://x/e.woff2'),
    ]);
    check('families', groups.map((g) => g.family), [
        'Geist',
        'Geist Mono',
        'Inter',
        'Inter Display',
        'InterDisplay',
    ]);
}

console.log('\nFamily matching ignores case, whitespace and quoting');
{
    const groups = groupFontFaces([
        face('Inter', '400', 'normal', 'https://x/a.woff2'),
        face('  inter  ', '500', 'normal', 'https://x/b.woff2'),
        face('INTER', '600', 'normal', 'https://x/c.woff2'),
        face('"Inter"', '700', 'normal', 'https://x/d.woff2'),
    ]);
    check('one family', groups.length, 1);
    check('keeps every variant', groups[0].variants.length, 4);
    check('prefers the spelling the site used most', groups[0].family, 'Inter');
}

console.log('\nThe same face reached twice is stored once');
{
    const groups = groupFontFaces([
        face('Inter', '400', 'normal', 'https://x/inter.woff2'),
        face('Inter', '400', 'normal', 'https://x/inter.woff2'),
        face('inter', '400', 'normal', 'https://x/inter.woff2'),
    ]);
    check('de-duplicated', groups[0].variants.length, 1);
}

console.log('\nA preload guess yields to the declared @font-face for the same file');
{
    const groups = groupFontFaces([
        face('Inter-Bold-s', '400', 'normal', 'https://x/Inter-Bold-s.woff2', { provenance: 'preload' }),
        face('Inter', '700', 'normal', 'https://x/Inter-Bold-s.woff2', { provenance: 'declared' }),
    ]);
    check('families', groups.map((g) => g.family), ['Inter']);
    check('one variant', groups[0].variants.length, 1);
    check('keeps the declared weight', groups[0].variants[0].weight, '700');
}

console.log('\nA variable font is one entry, not one per named instance');
{
    const groups = groupFontFaces([
        face('InterVariable', '100 900', 'normal', 'https://x/InterVariable.woff2'),
        face('InterVariable', '100 900', 'italic', 'https://x/InterVariable-Italic.woff2'),
    ]);
    check('one family', groups.length, 1);
    check('one entry per file', groups[0].variants.length, 2);
    check('flagged variable', groups[0].isVariable, true);
    check('representative is upright', groups[0].representative.style, 'normal');
}

console.log('\nThe representative falls back to the closest available weight');
{
    const groups = groupFontFaces([
        face('Foo', '700', 'normal', 'https://x/a.woff2'),
        face('Foo', '500', 'normal', 'https://x/b.woff2'),
        face('Foo', '900', 'italic', 'https://x/c.woff2'),
    ]);
    check('nearest upright weight', [groups[0].representative.weight, groups[0].representative.style], ['500', 'normal']);
}

console.log('\nAn italic-only family still gets a representative');
{
    const groups = groupFontFaces([face('Foo', '400', 'italic', 'https://x/a.woff2')]);
    check('representative', groups[0].representative.style, 'italic');
}

console.log('\nNo faces means no families, which drives the empty state');
check('empty', groupFontFaces([]).length, 0);

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length > 0) {
    process.exit(1);
}
