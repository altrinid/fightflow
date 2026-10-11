# FightFlow – Website „Champion“

Website des **Kampfsportvereins FightFlow Wien – ASKÖ** (Kickboxen, Haymerlegasse 27, 1160 Wien) im Stil der
Variante „Champion“: dunkel, editorial, Cormorant Garamond + Inter, Rot `#C8102E`.

Statische Seite ohne Build-Schritt – `index.html` im Browser öffnen oder jeden beliebigen Webserver auf den
Ordner zeigen lassen (GitHub Pages, Hostinger, …). Alle Pfade sind relativ, die Seite läuft also im Root
einer Domain genauso wie unter `/fightflow/`.

```
index.html          Startseite (alle Abschnitte)
impressum.html      Impressum        ← Platzhalter [Vereinsanschrift], [ZVR-Zahl], [Obmann] ergänzen
datenschutz.html    Datenschutz      ← Platzhalter [Vereinsanschrift], [Hosting-Anbieter] ergänzen
404.html
css/style.css       alle Stile (Design-Tokens oben in :root)
js/main.js          Scroll-Choreografie, Menü, Formular (GSAP + ScrollTrigger + Lenis)
js/glove.js         3D-Boxhandschuh (three.js), wird erst geladen, wenn der Abschnitt in die Nähe kommt
js/vendor/          three.js 0.170, GSAP 3.12.5, Lenis 1.1.18 – lokal, keine CDN-Aufrufe
models/glove.glb    Handschuh (59k Dreiecke, meshopt + WebP-Texturen, 0,5 MB)
img/                Fotos als WebP in 480/800/1200/1600 px, Logo, Poster des Handschuhs, OG-Bild
fonts/              Cormorant Garamond + Inter (woff2, SIL OFL), lokal eingebunden
```

## Interaktion

- **Hero**: Vollbild-Foto mit langsamem Zoom und Parallax, Überschrift zeilenweise maskiert eingeblendet.
- **Laufschrift** „Train hard · Stay disciplined · Keep moving“ – reagiert auf Scroll-Geschwindigkeit.
- **3D-Handschuh** (Abschnitt „Dein erstes Training“): bleibt beim Scrollen stehen, dreht sich mit dem
  Scroll um 360°, wächst heran; daneben wechseln drei Aussagen. Ohne WebGL bleibt ein Standbild.
- **Trainingsfotos** bewegen sich mit unterschiedlicher Geschwindigkeit (Parallax).
- **Gym-Galerie**: am Desktop angeheftet, Scrollen bewegt die Fotos horizontal; am Handy Wischen.
- **Zitat** leuchtet Wort für Wort beim Scrollen auf, **Zahlen** (49 €, 79 €, 1×, 3×) zählen hoch.
- Alle Fotos: leichter Zoom und Farbe beim Hover. Buttons: Farbwechsel mit Füll-Animation, magnetisch.
- `prefers-reduced-motion`: sanftes Scrollen, Parallax und Pins sind aus, alles ist sofort sichtbar.

## Formular

Das Formular öffnet das E-Mail-Programm mit den Angaben (mailto an fightflow01@gmail.com) – kein Backend
nötig. Zusätzlich ist das bestehende Google-Formular des Vereins verlinkt.

## Lokal ansehen

```bash
python3 -m http.server 8000     # dann http://localhost:8000
```
