#!/usr/bin/env node
/**
 * Reads the club's two Google Forms (trial training + membership) and writes
 * src/data/google-forms.json so the website's own form can submit straight
 * into them – the club's existing sheet + e-mail automation keeps working.
 *
 * Usage:  npm run forms:sync            (writes the JSON, prints the mapping)
 *         npm run forms:sync -- --dry   (only prints)
 * Behind a proxy run with NODE_USE_ENV_PROXY=1.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONFIG = path.join(ROOT, 'src/data/google-forms.json');
const DRY = process.argv.includes('--dry');

/** Our field → patterns that recognise the question title (EN/DE). */
const MATCHERS = {
  name: /\b(full\s*)?name\b|vor-?\s*und\s*nachname|^name/i,
  email: /e-?mail/i,
  phone: /phone|telefon|handy|mobile|whats\s*app/i,
  membership: /membership|mitglied|package|paket|plan|tarif|option/i,
  month: /month|monat/i,
  date: /date|datum|day|tag|termin|session|when|wann/i,
  experience: /experience|erfahrung|level|niveau/i,
  message: /message|nachricht|comment|kommentar|question|frage|anmerk|note/i,
};

const TYPES = { 0: 'text', 1: 'paragraph', 2: 'choice', 3: 'dropdown', 4: 'checkbox', 5: 'scale', 9: 'date', 10: 'time' };

export function parseForm(html) {
  const m = html.match(/var FB_PUBLIC_LOAD_DATA_ = (\[[\s\S]*?\]);\s*<\/script>/);
  if (!m) throw new Error('FB_PUBLIC_LOAD_DATA_ not found – is the form public?');
  const data = JSON.parse(m[1]);
  const items = data[1]?.[1] ?? [];
  const questions = items
    .filter((it) => Array.isArray(it?.[4]) && it[4][0])
    .map((it) => ({
      title: String(it[1] ?? '').trim(),
      type: TYPES[it[3]] ?? String(it[3]),
      entry: `entry.${it[4][0][0]}`,
      required: Boolean(it[4][0][2]),
      options: (it[4][0][1] ?? []).map((o) => o?.[0]).filter((o) => typeof o === 'string' && o !== ''),
    }));
  const collectsEmail = /name="emailAddress"/.test(html);
  return { title: String(data[3] ?? data[1]?.[8] ?? '').trim(), questions, collectsEmail };
}

export function mapFields(form, ourValues = {}) {
  const fields = {};
  const used = new Set();
  for (const [key, re] of Object.entries(MATCHERS)) {
    if (key === 'email' && form.collectsEmail) {
      fields.email = 'emailAddress';
      continue;
    }
    const q = form.questions.find((q) => !used.has(q.entry) && re.test(q.title));
    if (q) {
      fields[key] = q.entry;
      used.add(q.entry);
    }
  }
  // Choice questions only accept their exact option texts: map ours onto theirs.
  const values = {};
  for (const [key, ours] of Object.entries(ourValues)) {
    const q = form.questions.find((q) => q.entry === fields[key]);
    if (!q?.options.length) continue;
    values[key] = {};
    for (const [id, value] of Object.entries(ours)) {
      const hit = q.options.find((o) => o.toLowerCase().includes(id.toLowerCase()));
      if (hit) values[key][value] = hit;
    }
  }
  const dateQuestion = form.questions.find((q) => q.entry === fields.date);
  return { fields, values, dateType: dateQuestion?.type === 'date' ? 'date' : 'text' };
}

async function main() {
  const config = JSON.parse(await readFile(CONFIG, 'utf8'));
  const ourValues = config.ourValues ?? {};
  for (const type of ['trial', 'membership']) {
    const viewform = config.sources[type];
    const res = await fetch(viewform, { headers: { 'accept-language': 'en' } });
    if (!res.ok) throw new Error(`${res.status} for ${viewform}`);
    const form = parseForm(await res.text());
    const mapped = mapFields(form, type === 'membership' ? ourValues : {});
    console.log(`\n${type.toUpperCase()} – "${form.title}"${form.collectsEmail ? ' (collects e-mail)' : ''}`);
    for (const q of form.questions) {
      const ours = Object.entries(mapped.fields).find(([, e]) => e === q.entry)?.[0] ?? '–';
      console.log(`  ${q.entry.padEnd(18)} ${q.type.padEnd(9)} ${q.required ? '*' : ' '} ${q.title}  →  ${ours}`);
      if (q.options.length) console.log(`  ${''.padEnd(30)}options: ${q.options.join(' | ')}`);
    }
    const missing = form.questions.filter((q) => q.required && !Object.values(mapped.fields).includes(q.entry));
    if (missing.length) console.warn(`  ! required questions without a website field: ${missing.map((q) => q.title).join(', ')}`);
    config[type] = { action: viewform.replace(/\/viewform.*$/, '/formResponse'), ...mapped };
  }
  if (DRY) return;
  await writeFile(CONFIG, JSON.stringify(config, null, 2) + '\n');
  console.log(`\nWritten ${path.relative(ROOT, CONFIG)} – rebuild the site to activate.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
