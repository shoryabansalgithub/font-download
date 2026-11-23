/**
 * The FREE stamp is a licensing claim, so a paid font must never earn it.
 * Every name here was read off a real site's @font-face (Nov 2026 probe of
 * vercel.com, rsms.me, linear.app, stripe.com, github.com, bbc.com,
 * tailwindcss.com, web.dev and smashingmagazine.com), with the licence its
 * own font file declares.
 */

import { readFileSync } from 'node:fs';
import { findGoogleFamily, indexGoogleFamilies } from '../app/lib/google-fonts';
import { check, finish } from './check';

const db = JSON.parse(readFileSync('public/data/font-features.json', 'utf-8')) as { fonts: { family: string }[] };
const index = indexGoogleFamilies(db.fonts.map((f) => f.family));

console.log('\nPaid fonts are never stamped free (their files declare a commercial licence)');
for (const family of ['Berkeley Mono', 'sohne-var', 'BBC Reith Sans', 'BBC Reith Serif', 'Freight Disp Light', 'Elena', 'Mija']) {
    check(family, findGoogleFamily(index, family), null);
}

console.log('\nFonts that are on Google Fonts are stamped, under the spelling sites serve them');
const free: [string, string][] = [
    ['Inter', 'Inter'],
    ['inter', 'Inter'],
    ['Inter Variable', 'Inter'],
    ['InterVariable', 'Inter'],
    ['Geist Mono', 'Geist Mono'],
    ['Mona Sans', 'Mona Sans'],
    ['Hubot Sans', 'Hubot Sans'],
    ['SourceCodePro', 'Source Code Pro'],
    ['ubuntuMono', 'Ubuntu Mono'],
    ['Roboto Mono', 'Roboto Mono'],
    ['__Inter_Fallback_aaf875', 'Inter'],
];
for (const [served, google] of free) {
    check(`${served} -> ${google}`, findGoogleFamily(index, served), google);
}

console.log('\nA name that only shares a prefix with a Google family is not that family');
check('Inter Display is not Inter', findGoogleFamily(index, 'Inter Display') === 'Inter', false);
check('Geist Pixel Grid is not Geist', findGoogleFamily(index, 'GeistPixelGrid') === 'Geist', false);

finish();
