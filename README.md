# Manhwa Reader

Ein eigenständiger Web-Reader für öffentlich abrufbare Manhwa auf https://olympustaff.com/.

## Funktionen

- Olympus-Titel frei suchen oder einen Serienlink einfügen.
- Vollständigen Katalog einschließlich Folgeseiten durchsuchen.
- Alle Kapitel oder einen frei gewählten Bereich in aufsteigender Reihenfolge lesen.
- Kapitel beim Scrollen automatisch nachladen.
- Kapitel, Bild und relative Bildposition dauerhaft pro angemeldetem Nutzer speichern (Cloudflare D1).
- Zuletzt gelesene Serien mit dem gespeicherten Lesepunkt fortsetzen.
- Mobilansicht, einstellbare Lesebreite, klare Fehlerzustände und Links zum Original.

## Nutzung

Die veröffentlichte private Webadresse kann direkt im Browser geöffnet werden. Die Anmeldung schützt den persönlichen Lesefortschritt; ein Chat muss nicht geöffnet sein. Bilder stammen aus den Originalquellen. Nicht öffentlich zugängliche Kapitel und Zugangssperren werden nicht umgangen.

Die erste Titelsuche lädt den paginierten Olympus-Katalog. Ergebnisse erscheinen schon während des Ladens. Ein direkter Serienlink ist schneller.

## Entwicklung

Node.js >=22.13, npm. `npm ci`, `npm run dev`, `npm run build`.

Framework: Vinext / React, Cloudflare Workers. Deploymentmanifest: `.openai/hosting.json`. Für eine andere eigene Installation die Projekt-ID ersetzen und D1-Binding `DB` bereitstellen. Schemaänderungen mit `npm run db:generate` erzeugen; Migrationen unter `drizzle/` anwenden.

Lokale D1-Migration nach dem ersten Build:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_tranquil_kinsey_walden.sql
```

Private Hosting-Anmeldung erfolgt über die Plattform. Der lokale Entwicklungsserver verwendet ausschließlich für localhost eine Testanmeldung.

## Verifikation und Grenzen

TypeScript und Produktionsbuild geprüft. Parser-Tests prüfen Reihenfolge, Dezimalkapitel, Bildextraktion, Pagination und Beschränkung auf Olympus. Die lokale Fortschritts-API wurde mit ungültigen Daten, fremder Origin, anonymer Anfrage und einem vollständigen Speichern/Laden-Zyklus geprüft.

Die echte Olympus-Webseite wurde auf dem Entwicklungscomputer durch WatchGuard blockiert. Deshalb konnte die vollständige Live-Kette Titel → Kapitel → Bilder hier nicht verifiziert werden. Änderungen des Olympus-HTML, Bildschutz oder Zugangsprüfungen können den Abruf verhindern. Der Reader zeigt dann einen Fehler und den Originallink.
