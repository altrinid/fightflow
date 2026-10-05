# FightFlow – Website

Neue Website für den **Kampfsportverein FightFlow Wien – ASKÖ** (Kickboxen, 1020 Wien).
Ersetzt die bisherige Google-Sites-Seite [www.fightflow.at](https://www.fightflow.at): gleicher Verein,
gleicher Anmeldeablauf – aber deutlich schneller, moderner und zweisprachig (DE/EN).

| Messwert (lokal, Lighthouse 13)           | Mobil | Desktop |
| ----------------------------------------- | ----- | ------- |
| Performance                               | 100   | 100     |
| Barrierefreiheit                          | 100   | 100     |
| Best Practices                            | 100   | 100     |
| SEO                                       | 100   | 100     |
| Total Blocking Time / Layout Shift (CLS)  | 0 ms / 0 | 0 ms / 0 |

- **~21 KB** HTML pro Seite (gzip, inkl. komplettem CSS + 3 KB JS), dazu 2 Schriftdateien (67 KB) – sonst nichts.
- Keine Cookies, kein Tracking, keine Drittanbieter-Requests (Schriften lokal) → kein Cookie-Banner nötig.
- 0 Verstöße bei axe-core (WCAG 2.2 AA) auf allen Seiten, Mobil und Desktop.
- SEO: hreflang DE/EN, strukturierte Daten (`SportsClub`, `FAQPage`, `WebSite`), Sitemap, OG-Bild, saubere Titles/Descriptions.

## Aufbau

```
src/
  data/site.ts          ← Vereinsdaten, Preise, Trainingszeiten, Coach, Fotos (eine Quelle für alles)
  i18n/de.ts, en.ts     ← alle Texte Deutsch / Englisch
  components/           ← Sektionen (Hero, Training, Preise, Anmeldung, FAQ …)
  pages/                ← / , /en/ , Impressum, Datenschutz (+ EN), 404
  styles/global.css     ← Design-Tokens (Farben, Schriften, Abstände)
  scripts/main.ts       ← das einzige JavaScript: Menü, Scroll-Effekte, Formular
apps-script/            ← kostenloses Anmelde-Backend (Google Apps Script) inkl. Tests
scripts/import-original.mjs ← holt Texte + Fotos von der alten Google-Sites-Seite
```

## Inhalte pflegen

- **Preise / Pakete**: `memberships` in `src/data/site.ts` (aktuell: Basic, 1×/Woche, 49 €/Monat).
- **Trainingszeiten**: `schedule` in `src/data/site.ts` – sobald befüllt, erscheint der Stundenplan
  automatisch (bis dahin: „auf Anfrage“ mit Anruf-/Mail-Buttons).
- **Coach**: Name, Erfolge und Foto unter `coach` in `src/data/site.ts`.
- **Fotos**: Datei nach `src/assets/photos/` legen, in `site.ts` importieren
  (`import heroImg from '../assets/photos/hero.jpg'`) und bei `photos.hero` / `coach.photo` eintragen.
  Astro erzeugt daraus automatisch AVIF/WebP in passenden Größen.
- **Texte**: `src/i18n/de.ts` und `src/i18n/en.ts`.

### Materialien der alten Seite übernehmen

```bash
npm run import:original            # liest www.fightflow.at
```

speichert alle Texte nach `content/original/*.md` und alle Bilder in voller Auflösung nach
`src/assets/photos/original/` (+ `manifest.json`). Danach Fotos wie oben eintragen.

## Noch vom Verein zu liefern

- [ ] Fotos (Coach, Training, Halle) und – falls vorhanden – Logo-Datei
- [ ] Trainingszeiten und Adresse des Trainingsorts
- [ ] Name und Erfolge des Coaches
- [ ] Impressum: ZVR-Zahl, Vereinsanschrift, Obmann/Obfrau · Datenschutz: Hosting-Anbieter
- [ ] Neu formulierte Texte gegenlesen (Trainingsinhalte, FAQ „Vorerfahrung“ und „Was mitbringen“)

Platzhalter sind auf den Rechtsseiten orange markiert; alles andere blendet sich aus, solange es fehlt.

## Entwicklung

```bash
npm ci
npm run dev        # http://localhost:4321
npm run check      # TypeScript / Astro
npm test           # Tests für das Anmelde-Backend
npm run build      # statische Seite nach dist/
```

Node ≥ 22.12.

## Anmeldung

Das Formular übernimmt den bisherigen Ablauf (Paket + Startmonat → Bestätigung mit Bankdaten per
E-Mail → Aktivierung nach Zahlungseingang). Backend-Einrichtung: [`apps-script/README.md`](apps-script/README.md).
Ohne Backend öffnet das Formular eine vorausgefüllte E-Mail an `fightflow01@gmail.com`.

## Veröffentlichen

`dist/` ist eine rein statische Seite und läuft überall (GitHub Pages, Netlify, Cloudflare Pages, Vercel, jeder Webspace).

| Variable               | Zweck                                                   | Standard                    |
| ---------------------- | ------------------------------------------------------- | --------------------------- |
| `SITE_URL`             | absolute Adresse (Canonical, Sitemap, OG)               | `https://www.fightflow.at`  |
| `BASE_PATH`            | Unterpfad, z. B. `/fightflow/` für GitHub Pages          | `/`                         |
| `PUBLIC_FORM_ENDPOINT` | URL des Apps-Script-Backends                            | leer → E-Mail-Fallback      |
| `PUBLIC_NOINDEX`       | `true` für Vorschau-Deployments (nicht indexieren)      | leer                        |

- **Vorschau auf GitHub Pages**: Settings → Pages → Source „GitHub Actions“, dann Workflow
  „Deploy to GitHub Pages“ manuell starten → `https://<user>.github.io/fightflow/` (noindex).
- **Umzug von Google Sites**: `www.fightflow.at` zeigt derzeit per CNAME auf `ghs.googlehosted.com`.
  Beim neuen Hoster die Domain hinzufügen und den CNAME-Eintrag beim Domain-Anbieter umstellen.
  Die URLs der alten Seite sollten per Weiterleitung auf die neuen Abschnitte zeigen.
