/**
 * Serves scripts/fixtures/site over real HTTP and scans it with the real
 * POST /api/extract handler. Each fixture is a pattern a past bug got wrong
 * on a real site, so a regression shows up here before it reaches a user.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/extract/route';
import type { FontFamily } from '../app/types';
import { check, finish } from './check';

const root = resolve('scripts/fixtures/site');
const types: Record<string, string> = { '.html': 'text/html', '.css': 'text/css' };

const server = createServer(async (req, res) => {
    const path = normalize(new URL(req.url || '/', 'http://fixture').pathname);
    const file = join(root, path === '/' ? 'index.html' : path);
    try {
        const body = await readFile(file);
        res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
        res.end(body);
    } catch {
        res.writeHead(404).end();
    }
});

async function main() {
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const response = await POST(
        new NextRequest(`${origin}/api/extract`, {
            method: 'POST',
            body: JSON.stringify({ url: `${origin}/` }),
            headers: { 'content-type': 'application/json' },
        }),
    );
    const body = (await response.json()) as { families: FontFamily[] };
    const byName = new Map(body.families.map((family) => [family.family, family]));

    console.log('\nEvery family on the fixture site is found once');
    check('families', body.families.map((f) => f.family), ['Freight Display', 'Inter Variable', 'Legacy Serif', 'Sohne', 'TwitterChirp']);

    console.log('\nOnly the family that is on Google Fonts is marked free');
    check('free families', body.families.map((f) => [f.family, f.googleFonts ?? null]), [
        ['Freight Display', null],
        ['Inter Variable', 'Inter'],
        ['Legacy Serif', null],
        ['Sohne', null],
        ['TwitterChirp', null],
    ]);

    console.log('\nAn absolute URL behind a leading slash is used as written (bbc.com, f0f5aff)');
    check('Freight Display url', byName.get('Freight Display')?.representative.url,
        'https://static.files.bbci.co.uk/fonts/Freight_Disp_Light.woff2');

    console.log('\nThe last src declaration wins, as in the browser (847e1a6)');
    check('Legacy Serif file', byName.get('Legacy Serif')?.representative.url, `${origin}/fonts/legacy.woff2`);

    console.log('\nA declared @font-face beats the preload filename guess (ba44902)');
    check('Sohne weight', byName.get('Sohne')?.variants.map((v) => v.weight), ['450']);

    console.log('\nUnicode-range subsets reached through @import are one face each (x.com, 160a583)');
    const chirp = byName.get('TwitterChirp');
    check('one variant per weight', chirp?.variants.map((v) => v.weight), ['400', '700']);
    check('Latin subset is the face url', chirp?.variants.map((v) => v.url), [
        `${origin}/fonts/Chirp-Regular.latin.woff2`,
        `${origin}/fonts/Chirp-Bold.latin.woff2`,
    ]);
    check('every subset file kept', chirp?.variants.map((v) => v.subsets?.length), [3, 2]);

    server.close();
    finish();
}

main().catch((error) => {
    console.error(error);
    server.close();
    process.exit(1);
});
