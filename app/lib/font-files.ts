import { zipSync, type Zippable } from 'fflate';
import { formatInfo, type Face } from './faces';

export interface FontFile {
  name: string;
  /** What fetch() reads: the data: URL itself, or the same-origin font proxy. */
  source: string;
  folder?: string;
}

type Collected =
  | { ok: true; file: FontFile; blob: Blob }
  | { ok: false; file: FontFile; error: string };

function safeStem(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w.-]+/g, '')
    .replace(/^[.-]+|[.-]+$/g, '');
}

function fontSource(url: string, referer: string | undefined): string {
  if (url.startsWith('data:')) return url;
  return `/api/font?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(referer || '')}`;
}

function partsOf(face: Face): { url: string; format: string; unicodeRange?: string }[] {
  return face.variant.subsets ?? [face.variant];
}

export function previewSources(face: Face): { source: string; unicodeRange?: string }[] {
  return partsOf(face).map((part) => ({ source: fontSource(part.url, face.variant.referer), unicodeRange: part.unicodeRange }));
}

export function faceStem(familyName: string, face: Face): string {
  const style = face.weight.isRange
    ? face.italic ? 'Variable-Italic' : 'Variable'
    : safeStem(face.label);
  return `${safeStem(familyName) || 'font'}-${style}`;
}

function fontFaceRule(familyName: string, face: Face, file: string, unicodeRange: string): string {
  return [
    '@font-face {',
    `  font-family: "${familyName.replace(/["\\]/g, '\\$&')}";`,
    `  font-style: ${face.italic ? 'italic' : 'normal'};`,
    `  font-weight: ${face.variant.weight};`,
    `  src: url("${file}");`,
    `  unicode-range: ${unicodeRange};`,
    '}',
  ].join('\n');
}

/**
 * The files that make up the faces. A face split into unicode-range subsets
 * ships every subset, plus one stylesheet that maps each subset file back to
 * its code points: the subsets only work as one font when loaded with them.
 */
export function filesOf(familyName: string, faces: Face[], folder?: string): FontFile[] {
  const rules: string[] = [];
  const files = faces.flatMap((face) => {
    const parts = partsOf(face);
    return parts.map((part, i) => {
      const name = `${faceStem(familyName, face)}${parts.length > 1 ? `.${i + 1}` : ''}.${formatInfo(part.format).ext}`;
      if (part.unicodeRange) rules.push(fontFaceRule(familyName, face, name, part.unicodeRange));
      return { name, source: fontSource(part.url, face.variant.referer), folder };
    });
  });
  if (rules.length === 0) return files;
  const css = `data:text/css;charset=utf-8,${encodeURIComponent(`${rules.join('\n\n')}\n`)}`;
  return [...files, { name: `${safeStem(familyName) || 'font'}.css`, source: css, folder }];
}

export function downloadOf(files: FontFile[], stem: string): { files: FontFile[]; archive?: string } {
  return files.length === 1 ? { files } : { files, archive: zipName(stem) };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('No payload');
  const header = dataUrl.slice(0, comma);
  const data = dataUrl.slice(comma + 1);
  const mime = header.match(/^data:([^;,]*)/i)?.[1] || 'application/octet-stream';
  if (!/;base64/i.test(header)) return new Blob([decodeURIComponent(data)], { type: mime });
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function readSource(source: string): Promise<Blob | string> {
  if (source.startsWith('data:')) {
    try {
      return dataUrlToBlob(source);
    } catch {
      return 'Invalid data URL';
    }
  }
  try {
    const response = await fetch(source);
    if (!response.ok) return `HTTP ${response.status}`;
    return await response.blob();
  } catch {
    return 'Network error';
  }
}

async function collectOne(file: FontFile): Promise<Collected> {
  const blob = await readSource(file.source);
  if (typeof blob === 'string') return { ok: false, file, error: blob };
  if (blob.size === 0) return { ok: false, file, error: 'Empty file' };
  return { ok: true, file, blob };
}

export async function collect(
  files: FontFile[],
  onProgress?: (done: number, total: number) => void,
  concurrency = 4,
): Promise<Collected[]> {
  const results = new Array<Collected>(files.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < files.length) {
      const index = next++;
      results[index] = await collectOne(files[index]);
      done++;
      onProgress?.(done, files.length);
    }
  };
  const lanes = Math.max(1, Math.min(concurrency, files.length));
  await Promise.all(Array.from({ length: lanes }, worker));
  return results;
}

function uniquePath(path: string, taken: Set<string>): string {
  const slash = path.lastIndexOf('/');
  const dot = path.lastIndexOf('.');
  const split = dot > slash + 1 ? dot : path.length;
  let candidate = path;
  // Compared case-insensitively because macOS and Windows unzip onto case-insensitive disks.
  for (let n = 2; taken.has(candidate.toLowerCase()); n++) {
    candidate = `${path.slice(0, split)} (${n})${path.slice(split)}`;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

export async function zipFiles(entries: { file: FontFile; blob: Blob }[]): Promise<Blob> {
  const taken = new Set<string>();
  const tree: Zippable = {};
  const buffers = await Promise.all(entries.map((entry) => entry.blob.arrayBuffer()));
  entries.forEach(({ file }, i) => {
    const path = file.folder ? `${file.folder}/${file.name}` : file.name;
    tree[uniquePath(path, taken)] = [new Uint8Array(buffers[i]), { level: 0 }];
  });
  // zipSync always allocates a plain ArrayBuffer; fflate just types it loosely.
  const zipped = zipSync(tree) as Uint8Array<ArrayBuffer>;
  return new Blob([zipped], { type: 'application/zip' });
}

export function saveBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/** `zipName("stripe.com", "-fonts")` -> "stripe.com-fonts.zip"; `zipName("Inter")` -> "Inter.zip". */
export function zipName(stem: string, suffix = ''): string {
  return `${safeStem(stem) || 'fonts'}${suffix}.zip`;
}
