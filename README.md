# Manhwa Reader

Ein eigenständiger Web-Reader für öffentlich abrufbare Manhwa auf https://olympustaff.com/.

## Funktionen

- Olympus-Titel frei suchen oder einen Serienlink einfügen.
- Vollständigen Katalog einschließlich Folgeseiten durchsuchen.
- Alle Kapitel oder einen frei gewählten Bereich in aufsteigender Reihenfolge lesen.
- Kapitel beim Scrollen automatisch nachladen.
- Kapitel, Bild und relative Bildposition dauerhaft pro Browser speichern (Cloudflare D1 und eine zufällige Browserkennung).
- Zuletzt gelesene Serien mit dem gespeicherten Lesepunkt fortsetzen.
- Mobilansicht, einstellbare Lesebreite, klare Fehlerzustände und Links zum Original.

## Nutzung

Die Webadresse ist ohne Konto und ohne ChatGPT-Anmeldung im Browser erreichbar. Eine zufällige, nicht erratbare HttpOnly-Browserkennung trennt die persönlichen Lesestände; die eigentlichen Daten bleiben dauerhaft in D1. Cookies müssen für das Wiedererkennen des Browsers erlaubt sein. Bilder stammen aus den Originalquellen. Nicht öffentlich zugängliche Kapitel und Zugangssperren werden nicht umgangen.

Die erste Titelsuche lädt den paginierten Olympus-Katalog. Ergebnisse erscheinen schon während des Ladens. Ein direkter Serienlink ist schneller.

## Entwicklung

Node.js >=22.13, npm. `npm ci`, `npm run dev`, `npm run build`.

Framework: Vinext / React, Cloudflare Workers. Deploymentmanifest: `.openai/hosting.json`. Für eine andere eigene Installation die Projekt-ID ersetzen und D1-Binding `DB` bereitstellen. Schemaänderungen mit `npm run db:generate` erzeugen; Migrationen unter `drizzle/` anwenden.

Lokale D1-Migration nach dem ersten Build:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_tranquil_kinsey_walden.sql
```

Die Leseansicht nutzt standardmäßig die gesamte Bildschirmbreite. Kopf und Titel verschwinden beim Lesen nach unten und erscheinen beim Scrollen nach oben. Die Werkzeugleisten liegen über dem Bild und erzeugen keinen freien Rand. Escape blendet sie ebenfalls ein.

## Verifikation und Grenzen

TypeScript und Produktionsbuild geprüft. Parser-Tests prüfen Reihenfolge, Dezimalkapitel, Bildextraktion, Pagination und Beschränkung auf Olympus. Die lokale Fortschritts-API wurde mit ungültigen Daten, fremder Origin, anonymer Anfrage und einem vollständigen Speichern/Laden-Zyklus geprüft.

Der direkte Olympus-Zugriff auf dem Entwicklungscomputer wurde durch WatchGuard blockiert. Der veröffentlichte Reader ruft deshalb Katalog und Kapitel serverseitig ab; diese Abrufe wurden am echten Olympus-Inhalt geprüft. Kapitelbilder werden weiterhin direkt aus der Originalquelle geladen. Änderungen des Olympus-HTML, Bildschutz oder Zugangsprüfungen können den Abruf verhindern. Der Reader zeigt dann einen Fehler und den Originallink.

