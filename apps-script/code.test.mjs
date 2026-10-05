/**
 * Tests for the Apps Script backend: runs Code.gs in a sandbox with mocked
 * Google services. Run with `npm test`.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const code = fs.readFileSync(new URL('./Code.gs', import.meta.url), 'utf8');
const mails = [];
let triggers = [];
const props = { IBAN: 'AT00 TEST', BIC: 'TESTBIC', ACCOUNT_HOLDER: 'Kampfsportverein FightFlow Wien – ASKÖ', NOTIFY_EMAIL: 'club@example.com' };

function makeSheet(name) {
  const data = [];
  const sheet = {
    getName: () => name,
    appendRow: (r) => data.push([...r]),
    getLastRow: () => data.length,
    setFrozenRows() {},
    getRange: (row, col, nr = 1, nc = 1) => ({
      insertCheckboxes() {},
      setFontWeight() {},
      getValues: () => [data[row - 1].slice(col - 1, col - 1 + nc)],
      getValue: () => data[row - 1][col - 1],
      setValue: (v) => { data[row - 1][col - 1] = v; },
      getRow: () => row, getColumn: () => col, getSheet: () => sheet,
    }),
    _data: data,
  };
  return sheet;
}
const sheets = {};
const ctx = {
  console,
  MailApp: { sendEmail: (m) => mails.push(m) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null }) },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  SpreadsheetApp: { getActive: () => ({ getSheetByName: (n) => sheets[n] ?? null, insertSheet: (n) => (sheets[n] = makeSheet(n)), getUrl: () => 'https://docs.google.com/x' }) },
  ScriptApp: { getProjectTriggers: () => triggers, newTrigger: (fn) => ({ forSpreadsheet: () => ({ onEdit: () => ({ create: () => triggers.push({ getHandlerFunction: () => fn }) }) }) }) },
  ContentService: { createTextOutput: (s) => ({ setMimeType: () => JSON.parse(s) }), MimeType: { JSON: 'json' } },
};
vm.createContext(ctx);
vm.runInContext(code, ctx);

test('registration, payment and activation flow', () => {
  // setup
  ctx.setup();
  assert.equal(triggers.length, 1);
  const sheet = sheets['Anmeldungen'];
  assert.equal(sheet._data[0][0], 'Zeitstempel');

  // invalid submissions
  assert.deepEqual(ctx.doPost({ parameter: { name: 'A', email: 'x' } }), { ok: false, error: 'invalid' });
  assert.deepEqual(ctx.doPost({ parameter: { name: 'Max Muster', email: 'max@example.com', membership: 'Basic', month: 'Oktober 2026' } }), { ok: false, error: 'invalid' }, 'consent required');
  // honeypot
  assert.deepEqual(ctx.doPost({ parameter: { website: 'spam' } }), { ok: true });
  assert.equal(sheet._data.length, 1);

  // valid EN registration (mirrors the club's current flow)
  const res = ctx.doPost({ parameter: { name: 'Rodion Test', email: 'Rodion@Example.com', phone: '+43 660 1234567', membership: 'Basic (1 training per week) - 49€/month', month: 'September 2026', experience: 'Some experience', message: '=HYPERLINK("x")', consent: 'yes', lang: 'en' } });
  assert.deepEqual(res, { ok: true });
  const row = sheet._data[1];
  assert.equal(row[2], 'rodion@example.com');
  assert.equal(row[3], "'+43 660 1234567", 'phone stored as text');
  assert.equal(row[7], `'=HYPERLINK("x")`, 'formula neutralised');
  assert.equal(mails.length, 2);
  const [userMail, clubMail] = mails;
  assert.equal(userMail.to, 'rodion@example.com');
  assert.equal(userMail.subject, 'FightFlow — Registration received 🥊');
  assert.match(userMail.body, /Hi Rodion Test,/);
  assert.match(userMail.body, /MEMBERSHIP\nBasic \(1 training per week\) - 49€\/month/);
  assert.match(userMail.body, /TRAINING MONTH\nSeptember 2026/);
  assert.match(userMail.body, /PRICE\n49€ \/ month/);
  assert.match(userMail.body, /IBAN: AT00 TEST\nBIC: TESTBIC\nAccount holder: Kampfsportverein FightFlow Wien – ASKÖ/);
  assert.match(userMail.body, /Payment reference:\nRodion Test, Basic \(1 training per week\) - 49€\/month/);
  assert.equal(clubMail.to, 'club@example.com');
  assert.equal(clubMail.replyTo, 'rodion@example.com');
  assert.match(clubMail.body, /Telefon: \+43 660 1234567/);

  // DE registration with "request" membership → no bank details
  mails.length = 0;
  ctx.doPost({ parameter: { name: 'Anna Beispiel', email: 'anna@example.com', membership: 'Anderes Paket / Anfrage', month: 'November 2026', consent: 'yes', lang: 'de' } });
  assert.equal(mails[0].subject, 'FightFlow — Anmeldung erhalten 🥊');
  assert.doesNotMatch(mails[0].body, /IBAN/);
  assert.match(mails[0].body, /Wir melden uns in Kürze persönlich bei dir\./);

  // Tick "Bezahlt" for row 2 → activation mail once
  mails.length = 0;
  sheet._data[1][9] = true;
  const ev = { range: sheet.getRange(2, 10) };
  ctx.onSheetEdit(ev);
  assert.equal(mails.length, 1);
  assert.equal(mails[0].subject, 'FightFlow — Your membership is active 🥊');
  assert.match(mails[0].body, /Your FightFlow membership is now ACTIVE\./);
  assert.match(mails[0].body, /TRAINING\n1 training per week/);
  assert.equal(Object.prototype.toString.call(sheet._data[1][10]), '[object Date]'); // cross-realm safe
  ctx.onSheetEdit(ev);
  assert.equal(mails.length, 1, 'not sent twice');
});
