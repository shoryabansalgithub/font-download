/**
 * Legal guard: the scan report never offers a download without the licence
 * terms. Two redesigns dropped them (905a4dc cut the disclaimer to one line,
 * 03b474b deleted it), and nothing noticed for months.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ScanHeader from '../app/components/results/ScanHeader';
import { LICENCE_TERMS } from '../app/components/results/LicenceNote';
import ReportFooter, { TERMS } from '../app/components/results/ReportFooter';
import type { ScanState } from '../app/scan/page';
import type { FontFamily } from '../app/types';
import { check, finish } from './check';

const inter: FontFamily = {
    family: 'Inter',
    variants: [{ name: 'Inter.woff2', format: 'WOFF2', url: 'https://example.com/Inter.woff2', weight: '400', style: 'normal' }],
    representative: { name: 'Inter.woff2', format: 'WOFF2', url: 'https://example.com/Inter.woff2', weight: '400', style: 'normal' },
    formats: ['WOFF2'],
    isVariable: false,
};

const phases: [string, ScanState][] = [
    ['found', { phase: 'found', families: [inter], elapsedMs: 1200 }],
    ['scanning', { phase: 'scanning', startedAt: 0 }],
    ['empty', { phase: 'empty' }],
    ['failed', { phase: 'failed', message: 'network' }],
];

const escaped = renderToStaticMarkup(createElement('span', null, LICENCE_TERMS)).slice('<span>'.length, -'</span>'.length);

console.log('\nEvery report that shows a Steal key also prints the licence terms');
for (const [name, scan] of phases) {
    const html = renderToStaticMarkup(createElement(ScanHeader, { scan, host: 'example.com', url: 'https://example.com' }));
    const offersDownload = /Steal all/.test(html);
    const printsTerms = html.includes(escaped);
    check(`${name}: ${offersDownload ? 'download offered, terms printed' : 'no download offered'}`, printsTerms, offersDownload);
}
check('the found report offers a download at all', /Steal all/.test(
    renderToStaticMarkup(createElement(ScanHeader, { scan: phases[0][1], host: 'example.com', url: 'https://example.com' })),
), true);

console.log('\nThe receipt ends with the terms of use, and they disclaim liability');
const footer = renderToStaticMarkup(createElement(ReportFooter, { label: 'End of report · example.com' }));
check('footer offers the terms', /aria-expanded="false"[^>]*>Terms of use/.test(footer), true);
check('terms disclaim liability', TERMS.some((clause) => /aren't liable/.test(clause)), true);
check('terms disclaim warranty', TERMS.some((clause) => /as is, with no warranty/.test(clause)), true);

finish();
