# Anmelde-Backend (Google Apps Script)

Kleines, kostenloses Backend für das Anmeldeformular – läuft im Google-Konto des Vereins
(`fightflow01@gmail.com`) und bildet den bisherigen Ablauf 1:1 ab:

1. **Anmeldung** → Eintrag in der Tabelle „Anmeldungen“ + sofortige Bestätigungs-Mail
   mit Preis und Bankdaten (gleicher Text wie bisher, auf Deutsch oder Englisch).
2. **Benachrichtigung** an den Verein mit allen Angaben (Antworten geht direkt an die Person).
3. **Zahlung eingegangen** → in der Tabelle den Haken bei „Bezahlt“ setzen → die Mail
   „Your membership is active“ / „Deine Mitgliedschaft ist aktiv“ geht automatisch raus.

## Einrichtung (ca. 10 Minuten)

1. In Google Drive eine neue Google-Tabelle anlegen, z. B. „FightFlow Anmeldungen“.
2. **Erweiterungen → Apps Script** öffnen, den Inhalt von `Code.gs` einfügen.
   Unter **Projekteinstellungen** „appsscript.json im Editor anzeigen“ aktivieren und den
   Inhalt von `appsscript.json` übernehmen.
3. **Projekteinstellungen → Script-Eigenschaften** anlegen:

   | Eigenschaft      | Wert                                          |
   | ---------------- | --------------------------------------------- |
   | `IBAN`           | IBAN des Vereinskontos                        |
   | `BIC`            | BIC                                           |
   | `ACCOUNT_HOLDER` | `Kampfsportverein FightFlow Wien – ASKÖ`      |
   | `NOTIFY_EMAIL`   | Adresse für Benachrichtigungen (optional)     |
   | `REPLY_TO`       | Antwortadresse für Mails an Mitglieder (opt.) |

4. Im Editor die Funktion **`setup`** einmal ausführen und die Berechtigungen bestätigen
   (legt Tabellenkopf und den Trigger für den „Bezahlt“-Haken an).
5. **Bereitstellen → Neue Bereitstellung → Web-App**: Ausführen als „Ich“, Zugriff „Jeder“.
   Die angezeigte URL (`https://script.google.com/macros/s/…/exec`) kopieren.
6. Beim Website-Build die Umgebungsvariable setzen:

   ```bash
   PUBLIC_FORM_ENDPOINT="https://script.google.com/macros/s/…/exec" npm run build
   ```

   (bei GitHub Actions als Repository-Variable `PUBLIC_FORM_ENDPOINT`).

Ohne Endpoint funktioniert das Formular trotzdem: es öffnet dann das E-Mail-Programm
mit einer vorausgefüllten Anmeldung an `fightflow01@gmail.com`.

## Pakete & Preise

Bekannte Pakete stehen oben in `Code.gs` unter `PLANS` (aktuell: Basic, 49 €/Monat).
Neue Pakete dort und in `src/data/site.ts` (`memberships`) ergänzen.

## Tests

```bash
npm test
```

führt `Code.gs` in einer Sandbox mit simulierten Google-Diensten aus (Anmeldung,
Mails, Formel-Schutz in der Tabelle, Aktivierung per Haken).
