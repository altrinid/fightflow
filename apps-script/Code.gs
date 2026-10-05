/**
 * FightFlow – Anmelde-Backend (Google Apps Script, an eine Google-Tabelle gebunden)
 *
 * Was es tut
 *  - nimmt Anmeldungen vom Website-Formular entgegen (POST),
 *  - schreibt sie in das Tabellenblatt „Anmeldungen“,
 *  - schickt der Person sofort die Bestätigung mit den Zahlungsdaten,
 *  - benachrichtigt den Verein,
 *  - schickt automatisch die „Mitgliedschaft aktiv“-Mail, sobald in der
 *    Spalte „Bezahlt“ der Haken gesetzt wird.
 *
 * Einrichtung: siehe README.md in diesem Ordner.
 */

const SHEET_NAME = 'Anmeldungen';
const HEADERS = [
  'Zeitstempel',
  'Name',
  'E-Mail',
  'Telefon',
  'Mitgliedschaft',
  'Startmonat',
  'Erfahrung',
  'Nachricht',
  'Sprache',
  'Bezahlt',
  'Aktivierung gesendet',
];
const COL = Object.fromEntries(HEADERS.map((h, i) => [h, i + 1]));

/** Known paid plans – matched against the submitted membership text. */
const PLANS = [
  {
    match: /basic/i,
    price: { de: '49 € / Monat', en: '49€ / month' },
    training: { de: '1 Training pro Woche', en: '1 training per week' },
  },
  {
    match: /full/i,
    price: { de: '79 € / Monat', en: '79€ / month' },
    training: { de: '3 Trainings pro Woche', en: '3 trainings per week' },
  },
  {
    match: /single/i,
    price: { de: '20 € (Einzeltraining)', en: '20€ (single pass)' },
    training: { de: 'Einzeltraining', en: 'Single pass' },
  },
];

/** Where trial sessions take place (shown in the confirmation mail). */
const GYM_ADDRESS = 'Haymerlegasse 27, Tür 17, 1160 Wien';
const TRIAL_SHEET = 'Probetraining';
const TRIAL_HEADERS = ['Zeitstempel', 'Name', 'E-Mail', 'Telefon', 'Wunschtermin', 'Erfahrung', 'Nachricht', 'Sprache'];

const TEXT = {
  en: {
    registrationSubject: 'FightFlow — Registration received 🥊',
    activationSubject: 'FightFlow — Your membership is active 🥊',
    trialSubject: 'FightFlow — Your free trial training 🥊',
  },
  de: {
    registrationSubject: 'FightFlow — Anmeldung erhalten 🥊',
    activationSubject: 'FightFlow — Deine Mitgliedschaft ist aktiv 🥊',
    trialSubject: 'FightFlow — Dein Gratis-Probetraining 🥊',
  },
};

/* ------------------------------------------------------------------------ */
/* Web app                                                                   */
/* ------------------------------------------------------------------------ */

function doGet() {
  return json_({ ok: true, service: 'FightFlow registration' });
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    // Honeypot – real visitors never fill this field.
    if (p.website) return json_({ ok: true });

    const data = {
      name: clean_(p.name, 120),
      email: clean_(p.email, 160).toLowerCase(),
      phone: clean_(p.phone, 40),
      membership: clean_(p.membership, 120),
      month: clean_(p.month, 40),
      date: clean_(p.date, 80),
      experience: clean_(p.experience, 80),
      message: clean_(p.message, 2000),
      lang: p.lang === 'de' ? 'de' : 'en',
    };

    if (data.name.length < 3 || !isEmail_(data.email) || p.consent !== 'yes') {
      return json_({ ok: false, error: 'invalid' });
    }

    if (p.type === 'trial') {
      if (!data.date) return json_({ ok: false, error: 'invalid' });
      withLock_(() =>
        trialSheet_().appendRow([
          new Date(),
          cell_(data.name),
          cell_(data.email),
          cell_(data.phone),
          cell_(data.date),
          cell_(data.experience),
          cell_(data.message),
          data.lang,
        ]),
      );
      sendTrialMail_(data);
      notifyClub_(data, 'trial');
      return json_({ ok: true });
    }

    if (!data.membership || !data.month) return json_({ ok: false, error: 'invalid' });

    withLock_(() => {
      sheet_().appendRow([
        new Date(),
        cell_(data.name),
        cell_(data.email),
        cell_(data.phone),
        cell_(data.membership),
        cell_(data.month),
        cell_(data.experience),
        cell_(data.message),
        data.lang,
        false,
        '',
      ]);
      sheet_().getRange(sheet_().getLastRow(), COL['Bezahlt']).insertCheckboxes();
    });

    sendRegistrationMail_(data);
    notifyClub_(data, 'membership');
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  }
}

/* ------------------------------------------------------------------------ */
/* Activation mail when „Bezahlt“ is ticked (installable trigger)            */
/* ------------------------------------------------------------------------ */

function onSheetEdit(e) {
  const range = e && e.range;
  if (!range || range.getSheet().getName() !== SHEET_NAME) return;
  if (range.getColumn() !== COL['Bezahlt'] || range.getRow() < 2) return;
  if (range.getValue() !== true) return;

  const sheet = range.getSheet();
  const row = range.getRow();
  const values = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  if (values[COL['Aktivierung gesendet'] - 1]) return; // already sent

  const data = {
    name: uncell_(values[COL['Name'] - 1]),
    email: uncell_(values[COL['E-Mail'] - 1]),
    membership: uncell_(values[COL['Mitgliedschaft'] - 1]),
    lang: values[COL['Sprache'] - 1] === 'de' ? 'de' : 'en',
  };
  sendActivationMail_(data);
  sheet.getRange(row, COL['Aktivierung gesendet']).setValue(new Date());
}

/* ------------------------------------------------------------------------ */
/* One-time setup – run once from the editor                                 */
/* ------------------------------------------------------------------------ */

function setup() {
  const sheet = sheet_();
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');

  const exists = ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === 'onSheetEdit');
  if (!exists) {
    ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  }

  const missing = ['IBAN', 'BIC', 'ACCOUNT_HOLDER'].filter((k) => !prop_(k));
  if (missing.length) {
    console.warn('Bitte in den Script-Eigenschaften setzen: ' + missing.join(', '));
  }
}

/* ------------------------------------------------------------------------ */
/* Mails                                                                     */
/* ------------------------------------------------------------------------ */

function sendRegistrationMail_(d) {
  const plan = planFor_(d.membership);
  const de = d.lang === 'de';
  const lines = [];

  if (de) {
    lines.push(`Hallo ${d.name},`, '', 'danke für deine Anmeldung bei FightFlow! 🥊', '', 'Wir haben deine Anmeldung erhalten.', '');
    lines.push('MITGLIEDSCHAFT', d.membership, '', 'TRAININGSMONAT', d.month, '');
    if (plan) {
      lines.push('PREIS', plan.price.de, '', 'ZAHLUNG', '', 'Bitte überweise den Beitrag an:', '');
      lines.push(...bankLines_('de'), '', 'Verwendungszweck:', `${d.name}, ${d.membership}`, '');
      lines.push('Deine Mitgliedschaft wird aktiviert, sobald wir deine Zahlung bestätigt haben.', '');
    } else {
      lines.push('Wir melden uns in Kürze persönlich bei dir.', '');
    }
    lines.push('Wir sehen uns im Training! 🥊', '', 'FightFlow');
  } else {
    lines.push(`Hi ${d.name},`, '', 'Thank you for registering with FightFlow! 🥊', '', "We've received your registration.", '');
    lines.push('MEMBERSHIP', d.membership, '', 'TRAINING MONTH', d.month, '');
    if (plan) {
      lines.push('PRICE', plan.price.en, '', 'PAYMENT', '', 'Please make a bank transfer to:', '');
      lines.push(...bankLines_('en'), '', 'Payment reference:', `${d.name}, ${d.membership}`, '');
      lines.push('Your membership will be activated once we confirm your payment.', '');
    } else {
      lines.push("We'll get back to you personally very soon.", '');
    }
    lines.push('See you at training! 🥊', '', 'FightFlow');
  }

  MailApp.sendEmail({
    to: d.email,
    subject: TEXT[d.lang].registrationSubject,
    body: lines.join('\n'),
    name: 'FightFlow',
    replyTo: prop_('REPLY_TO') || undefined,
  });
}

function sendActivationMail_(d) {
  const plan = planFor_(d.membership);
  const de = d.lang === 'de';
  const lines = de
    ? [
        `Hallo ${d.name},`,
        '',
        'deine Zahlung ist bei uns eingegangen! 🥊',
        '',
        'Deine FightFlow-Mitgliedschaft ist jetzt AKTIV.',
        '',
        'MITGLIEDSCHAFT',
        d.membership,
        '',
        ...(plan ? ['TRAINING', plan.training.de, ''] : []),
        'Du bist jetzt registriert und kannst an deinen Trainings teilnehmen.',
        '',
        'Wir sehen uns im Training!',
        '',
        'FightFlow',
      ]
    : [
        `Hi ${d.name},`,
        '',
        "We've received your payment! 🥊",
        '',
        'Your FightFlow membership is now ACTIVE.',
        '',
        'MEMBERSHIP',
        d.membership,
        '',
        ...(plan ? ['TRAINING', plan.training.en, ''] : []),
        'You are now registered and can attend your scheduled trainings.',
        '',
        'See you at training!',
        '',
        'FightFlow',
      ];

  MailApp.sendEmail({
    to: d.email,
    subject: TEXT[d.lang].activationSubject,
    body: lines.join('\n'),
    name: 'FightFlow',
    replyTo: prop_('REPLY_TO') || undefined,
  });
}

function sendTrialMail_(d) {
  const de = d.lang === 'de';
  const lines = de
    ? [
        `Hallo ${d.name},`,
        '',
        'danke für deine Anmeldung zum Gratis-Probetraining bei FightFlow! 🥊',
        '',
        'WUNSCHTERMIN',
        d.date,
        '',
        'ORT',
        GYM_ADDRESS,
        '',
        'Bring bequeme Sportkleidung und eine Wasserflasche mit. Handschuhe und Bandagen stellen wir dir fürs erste Training gerne zur Verfügung.',
        '',
        'Falls der Termin doch nicht passt, antworte einfach auf diese E-Mail.',
        '',
        'Wir sehen uns im Gym! 🥊',
        '',
        'FightFlow',
      ]
    : [
        `Hi ${d.name},`,
        '',
        'Thank you for signing up for a free trial training at FightFlow! 🥊',
        '',
        'PREFERRED SESSION',
        d.date,
        '',
        'LOCATION',
        GYM_ADDRESS,
        '',
        'Bring comfortable sportswear and a water bottle. We can provide gloves and hand wraps for your first session.',
        '',
        "If the session doesn't work for you after all, just reply to this e-mail.",
        '',
        'See you in the gym! 🥊',
        '',
        'FightFlow',
      ];
  MailApp.sendEmail({
    to: d.email,
    subject: TEXT[d.lang].trialSubject,
    body: lines.join('\n'),
    name: 'FightFlow',
    replyTo: prop_('REPLY_TO') || undefined,
  });
}

function notifyClub_(d, type) {
  const to = prop_('NOTIFY_EMAIL') || Session.getEffectiveUser().getEmail();
  if (!to) return;
  const trial = type === 'trial';
  const body = [
    trial ? 'Neue Anmeldung zum Probetraining:' : 'Neue Anmeldung zur Mitgliedschaft:',
    '',
    `Name: ${d.name}`,
    `E-Mail: ${d.email}`,
    `Telefon: ${d.phone || '–'}`,
    ...(trial ? [`Wunschtermin: ${d.date}`] : [`Mitgliedschaft: ${d.membership}`, `Startmonat: ${d.month}`]),
    `Erfahrung: ${d.experience || '–'}`,
    `Sprache: ${d.lang}`,
    '',
    `Nachricht: ${d.message || '–'}`,
    '',
    `Tabelle: ${SpreadsheetApp.getActive().getUrl()}`,
  ].join('\n');
  const subject = trial ? `Probetraining: ${d.name} (${d.date})` : `Neue Anmeldung: ${d.name} (${d.membership})`;
  MailApp.sendEmail({ to, subject, body, replyTo: d.email });
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

function bankLines_(lang) {
  const holder = lang === 'de' ? 'Kontoinhaber' : 'Account holder';
  return [`IBAN: ${prop_('IBAN')}`, `BIC: ${prop_('BIC')}`, `${holder}: ${prop_('ACCOUNT_HOLDER')}`];
}

function planFor_(membership) {
  return PLANS.find((p) => p.match.test(membership)) || null;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function trialSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(TRIAL_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(TRIAL_SHEET);
    sheet.appendRow(TRIAL_HEADERS);
  }
  return sheet;
}

function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

function clean_(value, max) {
  return String(value || '')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max);
}

/** Store user input as plain text – never as a spreadsheet formula. */
function cell_(value) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

/** Values read back from the sheet may carry the text-escape apostrophe. */
function uncell_(value) {
  return String(value || '').replace(/^'/, '');
}

function isEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
