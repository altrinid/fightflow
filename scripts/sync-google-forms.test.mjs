/** Tests for the Google Forms sync (parser + field mapping) on synthetic form pages. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseForm, mapFields } from './sync-google-forms.mjs';

/** Builds a page in the structure Google Forms uses (FB_PUBLIC_LOAD_DATA_). */
const page = (title, items, extra = '') =>
  `<html><body>${extra}<script>var FB_PUBLIC_LOAD_DATA_ = ${JSON.stringify([null, ['desc', items], '/forms', title])};</script></body></html>`;

test('maps a membership form incl. collected e-mail and exact options', () => {
  const html = page(
    'Registration FightFlow',
    [
      [111, 'Full name', null, 0, [[1001, null, 1]]],
      [112, 'Phone number', null, 0, [[1002, null, 0]]],
      [113, 'Membership', null, 2, [[1003, [['Basic membership (1 training/week) - 49€/month'], ['Full membership - (3 trainings/week) - 79€/month'], ['Single Pass - 20€']], 1]]],
      [114, 'Training month', null, 3, [[1004, [['October'], ['November']], 1]]],
      [115, 'Comments', null, 1, [[1005, null, 0]]],
      [116, 'Section header without answers', null, 8, null],
    ],
    '<input name="emailAddress">',
  );
  const form = parseForm(html);
  assert.equal(form.title, 'Registration FightFlow');
  assert.equal(form.questions.length, 5);
  assert.equal(form.collectsEmail, true);

  const ours = {
    membership: {
      basic: 'Basic (1 training per week) - 49€/month',
      full: 'Full (3 trainings per week) - 79€/month',
      single: 'Single Pass - 20€',
    },
  };
  const m = mapFields(form, ours);
  assert.deepEqual(m.fields, {
    name: 'entry.1001',
    email: 'emailAddress',
    phone: 'entry.1002',
    membership: 'entry.1003',
    month: 'entry.1004',
    message: 'entry.1005',
  });
  assert.equal(m.values.membership['Full (3 trainings per week) - 79€/month'], 'Full membership - (3 trainings/week) - 79€/month');
  assert.equal(m.values.membership['Single Pass - 20€'], 'Single Pass - 20€');
  assert.equal(m.dateType, 'text');
});

test('detects a Google date question in the trial form', () => {
  const form = parseForm(
    page('Trial Training FightFlow', [
      [1, 'Name', null, 0, [[2001, null, 1]]],
      [2, 'E-Mail', null, 0, [[2002, null, 1]]],
      [3, 'Preferred date', null, 9, [[2003, null, 1]]],
    ]),
  );
  const m = mapFields(form);
  assert.deepEqual(m.fields, { name: 'entry.2001', email: 'entry.2002', date: 'entry.2003' });
  assert.equal(m.dateType, 'date');
});

test('fails loudly when the page is not a public form', () => {
  assert.throws(() => parseForm('<html>Sign in</html>'), /FB_PUBLIC_LOAD_DATA_/);
});
