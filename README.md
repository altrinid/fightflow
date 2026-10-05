# FightFlow – Website

Neue Website für den **Kampfsportverein FightFlow Wien – ASKÖ** (Kickboxen, Haymerlegasse 27, 1160 Wien).
Ersetzt die bisherige Google-Sites-Seite [www.fightflow.at](https://www.fightflow.at) – mit allen Inhalten,
Fotos und dem Logo der alten Seite, im gleichen Look (dunkel, Ziegelrot/Graphit aus dem Logo), aber
deutlich schneller, moderner und zweisprachig (DE/EN).

| Messwert (lokal, Lighthouse 13)           | Mobil    | Desktop  |
| ----------------------------------------- | -------- | -------- |
| Performance                               | 99       | 100      |
| Barrierefreiheit                          | 100      | 100      |
| Best Practices                            | 100      | 100      |
| SEO                                       | 100      | 100      |
| Layout Shift (CLS)                        | 0        | 0        |

- Startseite mobil ≈ **170 KB** inkl. Fotos (AVIF/WebP in passender Größe, Lazy Loading), HTML ≈ 24 KB gzip.
- Keine Cookies, kein Tracking, keine Drittanbieter beim Seitenaufruf – Google Maps lädt erst nach Klick.
- 0 Verstöße bei axe-core (WCAG 2.2 AA) auf allen Seiten, Mobil und Desktop.
- SEO: hreflang DE/EN, strukturierte Daten (`SportsClub` mit Adresse, Geo, Trainingszeiten, Preisen; `FAQPage`),
  Sitemap, OG-Bild; alte Google-Sites-URLs (`/home`, `/about`, `/contact`, `/free-trial-training`,
  `/membership-registration`) leiten auf die passenden Abschnitte weiter.

## Inhalte

Alles stammt von der bisherigen Seite (Import in `content/original/`): Slogan, Vorteile, Trainingszeiten
(Di & Do 18:00–19:30, So 14:30–16:00), Preisliste (Probetraining gratis, Einzeltraining 20 €, Basic 49 €,
Full 79 €), FAQ, Head Coach (Weltmeister, 3× Europameister, mehrfacher Russischer Meister), Kontakt,
Instagram, Logo und 11 Fotos. Neu formuliert bzw. ergänzt: deutsche Übersetzung, kurze Texte zu den
Trainingspunkten und Preis-Karten, FAQ „Bezahlung“ (laut Anmelde-E-Mails).

```
src/
  data/site.ts            ← Vereinsdaten, Preise, Zeiten, Fotos (eine Quelle für alles)
  data/google-forms.json  ← Anbindung an die Google Formulare des Vereins
  i18n/de.ts, en.ts       ← alle Texte Deutsch / Englisch
  components/             ← Sektionen (Hero, Coach, Gym, Training, Preise, Anmeldung, FAQ, Kontakt …)
  assets/photos, brand/   ← Fotos und Logo (Astro erzeugt AVIF/WebP)
  styles/global.css       ← Design-Tokens (Farben aus dem Logo, Schriften, Abstände)
  scripts/main.ts         ← das einzige JavaScript: Menü, Scroll-Effekte, Formular, Karte
scripts/
  import-original.mjs     ← holt Texte + Fotos von der alten Google-Sites-Seite
  sync-google-forms.mjs   ← liest die Google Formulare und verbindet das Website-Formular damit
apps-script/              ← optionales eigenes Anmelde-Backend (Google Apps Script) inkl. Tests
```

## Anmeldung (Probetraining & Mitgliedschaft)

Das Formular hat zwei Modi: **Gratis-Probetraining** (mit Auswahl der nächsten Trainingstermine) und
**Mitgliedschaft** (Paket + Startmonat). Wohin die Daten gehen, in dieser Reihenfolge:

1. **Die bestehenden Google Formulare des Vereins** („Trial Training FightFlow“, „Registration FightFlow“) –
   dann bleibt die bisherige Tabelle und der E-Mail-Versand mit den Zahlungsdaten unverändert:

   ```bash
   npm run forms:sync     # liest beide Formulare, schreibt src/data/google-forms.json
   npm run build
   ```

   Das Skript zeigt alle Fragen mit Feld-IDs und Antwortoptionen an und warnt, falls ein Pflichtfeld des
   Formulars keine Entsprechung auf der Website hat.
2. **`PUBLIC_FORM_ENDPOINT`** – eigenes Backend aus [`apps-script/`](apps-script/README.md).
3. **Fallback**: vorausgefüllte E-Mail an `fightflow01@gmail.com`.

## Inhalte pflegen

- **Preise / Zeiten / Adresse**: `src/data/site.ts` (`prices`, `schedule`, `club.gym`).
- **Texte**: `src/i18n/de.ts` und `src/i18n/en.ts`.
- **Fotos**: Datei nach `src/assets/photos/` legen, in `site.ts` importieren und bei `photos` eintragen.
- **Alte Seite erneut importieren**: `npm run import:original` (Texte → `content/original/`,
  Fotos in voller Auflösung → `src/assets/photos/original/`, nicht im Repository).

## Noch vom Verein zu liefern

- [ ] Impressum: ZVR-Zahl, Vereinsanschrift (Sitz), Name des Obmanns · Datenschutz: Hosting-Anbieter
- [ ] Optional: Name und Porträtfoto des Head Coaches (`coach.name`)
- [ ] Neue/übersetzte Texte gegenlesen

Platzhalter sind auf den Rechtsseiten orange markiert.

## Entwicklung

```bash
npm ci
npm run dev        # http://localhost:4321
npm run check      # TypeScript / Astro
npm test           # Tests: Apps-Script-Backend + Google-Forms-Anbindung
npm run build      # statische Seite nach dist/
```

Node ≥ 22.12. Hinter einem Proxy die Skripte mit `NODE_USE_ENV_PROXY=1` starten.

## Veröffentlichen

`dist/` ist eine rein statische Seite und läuft überall (GitHub Pages, Netlify, Cloudflare Pages, Vercel, jeder Webspace).

| Variable               | Zweck                                                   | Standard                    |
| ---------------------- | ------------------------------------------------------- | --------------------------- |
| `SITE_URL`             | absolute Adresse (Canonical, Sitemap, OG)               | `https://www.fightflow.at`  |
| `BASE_PATH`            | Unterpfad, z. B. `/fightflow/` für GitHub Pages          | `/`                         |
| `PUBLIC_FORM_ENDPOINT` | URL des Apps-Script-Backends (falls genutzt)            | leer                        |
| `PUBLIC_NOINDEX`       | `true` für Vorschau-Deployments (nicht indexieren)      | leer                        |

- **Vorschau auf GitHub Pages**: Settings → Pages → Source „GitHub Actions“, dann Workflow
  „Deploy to GitHub Pages“ manuell starten → `https://<user>.github.io/fightflow/` (noindex).
- **Umzug von Google Sites**: `www.fightflow.at` zeigt derzeit per CNAME auf `ghs.googlehosted.com`.
  Beim neuen Hoster die Domain hinzufügen und den CNAME-Eintrag beim Domain-Anbieter umstellen.
