#!/usr/bin/env node
/**
 * Imports the content of the current FightFlow website (Google Sites) so it can
 * be reused in this project:
 *   - every page's text  → content/original/<page>.md
 *   - every photo/logo   → src/assets/photos/original/<page>-<n>.<ext> (largest size Google serves)
 *   - an overview        → content/original/manifest.json
 *
 * Usage:  npm run import:original [-- https://www.fightflow.at]
 * No dependencies – Node 22+. Behind a proxy run with NODE_USE_ENV_PROXY=1.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const START = new URL(process.argv[2] ?? 'https://www.fightflow.at/');
const ROOT = path.resolve(import.meta.dirname, '..');
const TEXT_DIR = path.join(ROOT, 'content/original');
const IMG_DIR = path.join(ROOT, 'src/assets/photos/original');
const MAX_PAGES = 30;
const UA = 'Mozilla/5.0 (FightFlow content import)';

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

const stripTags = (html) =>
  decode(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/[ \t\f\v\r]+/g, ' '),
  )
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');

async function get(url, as = 'text') {
  const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${url}`);
  return as === 'text' ? res.text() : { buffer: Buffer.from(await res.arrayBuffer()), type: res.headers.get('content-type') ?? '' };
}

function slugFor(url) {
  const p = new URL(url).pathname.replace(/\/+$/, '');
  return p ? p.split('/').filter(Boolean).join('-').toLowerCase() : 'home';
}

/** Google user-content images accept a size suffix (=w1280 …); ask for the largest sensible one. */
function fullSize(src) {
  const u = new URL(src, START);
  if (u.hostname.endsWith('googleusercontent.com')) u.pathname = `${u.pathname.replace(/=[^/]*$/, '')}=w2400`;
  return u.href;
}

function extract(html, pageUrl) {
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, '');

  // Text blocks in document order
  const blocks = [];
  const re = /<(h[1-6]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  for (let m; (m = re.exec(body)); ) {
    const text = stripTags(m[2]);
    if (!text) continue;
    const tag = m[1].toLowerCase();
    const prefix = tag.startsWith('h') ? `${'#'.repeat(Number(tag[1]))} ` : tag === 'li' ? '- ' : tag === 'blockquote' ? '> ' : '';
    if (blocks.at(-1) !== prefix + text) blocks.push(prefix + text);
  }

  // Images: <img src/srcset/data-src> and inline background-image urls
  const images = new Map();
  const addImage = (src, alt = '') => {
    if (!src || src.startsWith('data:')) return;
    const url = fullSize(decode(src));
    if (!/\.(svg|gif)(\?|$)/i.test(url) && !images.has(url)) images.set(url, alt);
  };
  for (const m of body.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const attr = (name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i'))?.[1];
    const srcset = attr('srcset')?.split(',').map((s) => s.trim().split(/\s+/)[0]).at(-1);
    addImage(attr('data-src') ?? srcset ?? attr('src'), decode(attr('alt') ?? ''));
  }
  for (const m of body.matchAll(/background-image:\s*url\((?:&quot;|["'])?([^"')&]+)/gi)) addImage(m[1]);

  // Same-site links (navigation)
  const links = new Set();
  for (const m of body.matchAll(/<a\b[^>]*href="([^"#]+)"/gi)) {
    try {
      const u = new URL(decode(m[1]), pageUrl);
      if (u.origin === START.origin && !/\.(pdf|jpe?g|png|zip)$/i.test(u.pathname)) links.add(u.origin + u.pathname);
    } catch {
      /* ignore malformed */
    }
  }

  const title = stripTags(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  return { title, blocks, images: [...images].map(([url, alt]) => ({ url, alt })), links: [...links] };
}

const extFor = (type, url) =>
  type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('avif') ? 'avif' : /\.png(\?|$)/i.test(url) ? 'png' : 'jpg';

await mkdir(TEXT_DIR, { recursive: true });
await mkdir(IMG_DIR, { recursive: true });

const queue = [START.origin + START.pathname];
const seen = new Set();
const downloaded = new Map(); // image url → saved entry (same photo on several pages)
const byHash = new Map(); // content hash → saved entry (Google serves one photo under many urls)
let navTexts = null; // link texts of the site navigation, filtered out of every page
const manifest = { source: START.href, importedAt: new Date().toISOString(), pages: [] };

while (queue.length && seen.size < MAX_PAGES) {
  const url = queue.shift();
  if (seen.has(url)) continue;
  seen.add(url);
  if (url !== START.origin + '/' && new URL(url).pathname === '/home' && seen.has(START.origin + '/')) continue;

  let html;
  try {
    html = await get(url);
  } catch (err) {
    console.warn(`! ${err.message}`);
    continue;
  }
  const slug = slugFor(url);
  const page = extract(html, url);
  if (!navTexts) {
    // list items that occur more than once on the first page are the (repeated) navigation
    const counts = new Map();
    page.blocks.filter((b) => b.startsWith('- ')).forEach((b) => counts.set(b, (counts.get(b) ?? 0) + 1));
    navTexts = new Set([...counts].filter(([, n]) => n > 1).map(([b]) => b.replace(/^- (More)?/, '- ')));
  }
  page.blocks = page.blocks.filter((b) => !navTexts.has(b.replace(/^- (More)?/, '- ')));
  page.links.forEach((l) => !seen.has(l) && queue.push(l));

  const saved = [];
  for (const [i, img] of page.images.entries()) {
    if (downloaded.has(img.url)) {
      saved.push({ ...downloaded.get(img.url), alt: img.alt || downloaded.get(img.url).alt });
      continue;
    }
    try {
      const { buffer, type } = await get(img.url, 'buffer');
      if (buffer.length < 2048) continue; // icons, spacers
      const hash = createHash('sha1').update(buffer).digest('hex');
      if (byHash.has(hash)) {
        downloaded.set(img.url, byHash.get(hash));
        saved.push({ ...byHash.get(hash), alt: img.alt || byHash.get(hash).alt });
        continue;
      }
      const file = `${slug}-${String(i + 1).padStart(2, '0')}.${extFor(type, img.url)}`;
      await writeFile(path.join(IMG_DIR, file), buffer);
      const entry = { file: `src/assets/photos/original/${file}`, alt: img.alt, source: img.url, bytes: buffer.length };
      downloaded.set(img.url, entry);
      byHash.set(hash, entry);
      saved.push(entry);
    } catch (err) {
      console.warn(`! image ${img.url}: ${err.message}`);
    }
  }

  const md = [`<!-- Imported from ${url} on ${manifest.importedAt} -->`, '', `# ${page.title || slug}`, '', ...page.blocks.flatMap((b) => [b, ''])];
  if (saved.length) md.push('## Bilder', '', ...saved.map((s) => `- ${s.file}${s.alt ? ` – ${s.alt}` : ''}`), '');
  await writeFile(path.join(TEXT_DIR, `${slug}.md`), md.join('\n'));

  manifest.pages.push({ url, slug, title: page.title, textBlocks: page.blocks.length, images: saved });
  console.log(`✓ ${url} – ${page.blocks.length} text blocks, ${saved.length} images`);
}

await writeFile(path.join(TEXT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`\nDone: ${manifest.pages.length} pages → content/original/, images → src/assets/photos/original/`);
