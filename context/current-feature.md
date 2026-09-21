# Current Feature

Working file with a short lifespan. It holds what is being built **right now** and
nothing else. Durable decisions belong in `project-overview.md`,
`project-structure.md` and `coding-standards.md`.

Rewrite the Feature block for every new piece of work. Append one line to History when
it is done and merged.

Two different lists, do not mix them up:

- **Not Building** in `project-overview.md` — permanent scope limits for the whole
  project.
- **Do not build** below — the local fence for the feature in progress. Things that are
  in scope eventually, but explicitly out of scope for this branch.

---

## Status

**In progress: trade-import** — Branch `feature/trade-import`.

Vorgemerkt als S10b in `decisions.md` (S10a-Block) und in der History; auf Ansage als
**S13** geladen. Der History-Eintrag beim `complete` nennt beide Nummern einmal, danach
gilt S13.

---

## Feature: trade-import

**Goal.** Eine Datei vom Broker, von der Prop-Plattform oder aus TradingView landet als
Trades im Journal, ohne Duplikate zu erzeugen. Dieselbe Datei darf mehrfach importiert
werden: bekannte Zeilen werden übersprungen, geänderte Zeilen aktualisiert — und jede
Handarbeit am Trade (Notiz, Setup, Grade, Screenshot, Tags) überlebt das unangetastet.
Jeder Import ist ein Batch und lässt sich rückgängig machen.

**Scope.**

*Schema — Migration 0010*

- `import_batches` — `id` identity, `user_id`, `account_id`, `filename`, `row_count`,
  `detected_shape`, `created_at`
- `trades.import_batch_id` nullable → `import_batches.id`. `null` heißt handgetippt
- `trades.broker_trade_key` text nullable, Index `(user_id, broker_trade_key)`
- **Kein `import_fingerprint`.** Alle Bestandteile sind bereits Spalten; Tier 2 rechnet
  im Match (siehe Duplikaterkennung). Kein Backfill, kein zweiter Schreibpfad in
  `createTrade`, keine Drift, wenn ein Trade später editiert wird
- `import_batches` in `src/db/index.ts` registrieren

*Domain — rein, ohne DB-Client, Tests im selben Commit*

- `src/domain/import/detect.ts` — Shape-Erkennung: Round-Trip-Zeilen, Einzel-Fills,
  TradingView-Liste. Schlägt sie fehl, nennt der Fehler die gefundenen Header
- `src/domain/import/normalize.ts` — Symbol auf das Journal-Instrument (`MNQU6` → `MNQ`),
  Preise auf die Tick-Größe des Instruments (**erster Leser von
  `instruments.tick_size`**), Richtung, Kontrakte, Datum, Zeitspalte; Zeilenvalidierung
  mit einem Grund je Zeile
- `src/domain/import/fills.ts` — FIFO-Paarung je Instrument in Zeitstempelreihenfolge.
  Ein Round Trip ist fertig, sobald die kumulierte Menge null erreicht
- `src/domain/import/session.ts` — Session aus `entry_time`, mit den in `decisions.md`
  (S10a) festgelegten Fenstern: Asia 18:00–03:00, London 03:00–09:30, NY-AM 09:30–12:00,
  NY-PM 12:00–16:00, außerhalb bleibt sie leer. **Diese Zeile sagte „auf der
  NY-Chart-Uhr" — siehe E4:** die Fenster sind NY-Zeiten, die Chart-Uhr ist es nicht,
  und beide werden je Trade-Datum zusammengeführt
- je Modul `__tests__/<modul>.test.ts`

*Lib*

- `src/lib/csv/parse.ts` plus Tests — RFC 4180, Delimiter-Erkennung (Komma, Semikolon,
  Tab), BOM, eingebettete Zeilenumbrüche, UTF-8. Gegenstück zum Writer aus S10a,
  **keine neue Abhängigkeit** (in `decisions.md` vorentschieden)

*Queries — `src/db/queries/import.ts`*

- Tier-1-Lookup über `broker_trade_key`
- Tier-2-Lookup als ein Statement über `(user_id, trade_date, instrument_id, direction,
  contracts, entry_price, exit_price)`, join `trade_accounts` auf das Zielkonto,
  `occurrence` über `row_number()`
- Batch anlegen, Batch-Liste, Batch entfernen
- Das `account_id` vom Client wird gegen `listOwnedAccountIds` geprüft, wie jede
  Konto-ID im Projekt

*Actions — `src/actions/import.ts`, Zod in `src/schemas/import.ts`*

- `previewImport` — schreibt nichts: nimmt die normalisierten Zeilen, liefert je Zeile
  Ausgang und Grund plus die vier Zähler
- `commitImport` — eine `db.transaction`, ganz oder gar nicht. Danach **einmal**
  `awardBadgesQuietly(user.id, user.timezone)`, dann `revalidatePath("/", "layout")`
- `undoImportBatch` — entfernt nur unangetastete Trades dieses Batches
- `ActionResult<T>` und Rückgabeform wie in `src/actions/daily-notes.ts`

*UI — `src/app/(app)/journal/import/`*

- Vier Schritte auf einer Route: Datei oder Paste → Konto → Vorschau → Ergebnis. Das
  erste mehrstufige UI des Projekts, es gibt kein Wizard-Muster zum Abschauen
- Die Vorschautabelle baut ihr Zeilen-Layout selbst, nach denselben Festlegungen wie
  die vier bestehenden Karten (`border-white/8`, `divide-white/6`, 13px Mono,
  `tabular-nums`). Sie ist damit die **fünfte** Kopie — die Extraktion nach `TableHead`,
  `TableRows`, `TableRow` wandert auf Ansage in einen eigenen `refactor:`-Slice, weil
  sie vier gemergte, untestete Karten anfasst und in diesem Commit ohne Netz liefe.
  `decisions.md` und `Design.md` §4.16 haben sie diesem Slice zugewiesen; die
  Vorentscheidung wird beim `complete` entsprechend korrigiert
- Batch-Liste mit Undo. **Der erste Löschpfad für Trades im ganzen Projekt**
- `Design.md` §4.18 für den Import-Flow, im selben Commit — `Design.md` kennt den Screen
  bisher nur als disabled-Zustand in §4.5

### Duplikaterkennung

Zwei Stufen. Tier 1 zuerst; Tier 2 nur, wenn Tier 1 keinen Schlüssel oder keinen Treffer
hat. Der Abgleich läuft **ausschließlich gegen das Zielkonto**, nie kontoübergreifend.

**Tier 1 — Broker-Schlüssel, exakt.** Fill-Level-Datei: Hash über die sortierten
Fill-IDs, aus denen der Round Trip besteht. Round-Trip-Datei mit Trade- oder Order-ID:
diese ID. TradingView-Liste: kein Schlüssel. Gespeichert als `broker_trade_key`. Ein
Treffer ist exakt, ohne Toleranz.

**Tier 2 — Vergleich über die vorhandenen Spalten.** Die einzige Stufe, die einen
**handgetippten** Trade treffen kann.

Der Schlüssel ist die **Einstiegsseite**:

```
account_id | instrument_id | direction | contracts | entry_price | trade_date
```

`exit_price` ist **kein** Schlüsselfeld, sondern ein Vergleichsfeld. Korrigiert am
2026-09-18 gegenüber dem Entwurf, der es in den Schlüssel nahm: damit konnte der
Hauptfall des Features nicht funktionieren. Ein Trade, der beim ersten Import offen war
und beim zweiten geschlossen ist, hätte zwei verschiedene Schlüssel — der Import hätte
ein Duplikat angelegt, statt den Exit nachzutragen. Bei Fill-Dateien fängt Tier 1 das
ab, eine TradingView-Liste läuft voll hinein.

Bewusst **ohne Entry- und Exit-Zeit**: `entry_time` ist die Chart-Uhr des Nutzers und
wird nie konvertiert, ein Broker-Zeitstempel ist eine andere Größe. Die beiden sind nicht
vergleichbar, auch wenn beide `time` heißen.

**Innerhalb einer Schlüsselgruppe wird zweiphasig gepaart.** `row_number()` gibt beiden
Seiten eine feste Reihenfolge, dann:

1. **Exakt** — Importzeilen, deren `exit_price` mit dem eines Journal-Trades
   übereinstimmt (beide leer zählt als Übereinstimmung). Das sind die Skips.
2. **Rest gegen Rest** — die übrig gebliebenen Importzeilen gegen die übrig
   gebliebenen Journal-Trades, in dieser Reihenfolge. Das sind die Updates.

Eine Phase-1-Paarung vor Phase 2 zu ziehen ist der Punkt: sonst würde bei zwei Trades
mit gleichem Einstieg und verschiedenen Exits die Datei den einen Exit auf den anderen
Trade schreiben. Was nach Phase 2 noch übrig ist, ist neu.

Damit lösen sich alle drei Richtungen mit einer Regel: offen → geschlossen (Update),
geschlossen → offen (Skip, weil ein Import nie eine Lücke reißt) und wiederholte
identische Scalps. Liegen drei gleiche Trades in der Datei und einer im Journal, ist das
Ergebnis 1 Skip und 2 neue Trades, nicht 3 Skips.

### Was ein Update überschreiben darf

**Broker-eigen — darf geschrieben und überschrieben werden.** Datum, Instrument,
Richtung, Kontrakte, Entry-Zeit, Exit-Zeit, Entry-Preis, Exit-Preis, Points, Result.

**Nutzer-eigen — wird von einem Import nie angefasst.** Session¹, Setup-Typ,
Entry-Modell, Stop-Preis, MFE, MAE, Post-Exit-MFE, Grade, P&L-Override, Confluences,
Mistakes, Felt, By the book, Notes, Screenshots, Links, `taken`, Kontozuweisung.

¹ Eine Ausnahme, und nur beim **Anlegen**: ist `session` leer, setzt der Import sie aus
`entry_time`. Beim Update eines gematchten Trades wird sie nie geschrieben.

Ausgang je gematchter Zeile: alle broker-eigenen Felder gleich → **skipped**; mindestens
eines abweichend oder vorher leer → **updated**, separat gezählt. Kein Treffer → **new**.

Der Hauptfall: ein Trade war beim ersten Import noch offen und ist beim zweiten
geschlossen. Exit-Zeit, Exit-Preis, Points und Result werden nachgetragen, jede Notiz und
jeder Tag aus der Zwischenzeit bleibt.

### Regeln, die der Slice trägt

- **P&L ist immer abgeleitet** über `calculatePnl` aus `src/domain/pnl.ts`,
  `pnl_override` bleibt leer. Eine P&L-Spalte in der Datei wird in der Vorschau zum
  Vergleich gezeigt und nicht geschrieben, damit eine einzige Formel für jeden Trade im
  Journal gilt (dieselbe Begründung wie beim Export in S10a)
- **Lokale Zeitspalte vor UTC-Spalte**, die Vorschau sagt welche benutzt wurde. Zeiten
  werden verbatim gespeichert, **nie** konvertiert. Findet sich keine lesbare Zeit, ist
  die Zeile ungültig — `trades.entry_time` ist NOT NULL
- **Unbekanntes Symbol → Zeile ungültig**, mit dem Symbol im Klartext in der Vorschau.
  Kein Auto-Anlegen: ein Instrument ohne echten `point_value` verfälscht jede P&L-Zahl
- **Genau eine `trade_accounts`-Zeile** pro importiertem Trade, auf das gewählte Konto.
  Es gibt keinen numerischen Copy-Trading-Zähler mehr, den ein Import setzen könnte
- **Übungskonten sind wählbar**, amber markiert, mit dem Satz, dass die importierten
  Trades aus jeder kombinierten Zahl fallen
- **Offene Restposition am Dateiende** → als offener Trade importiert, ohne Exit-Zeit und
  Exit-Preis, Result „Not specified". Sie steht danach unter „Fill in the details"; ein
  späterer Import des Schlussfills aktualisiert sie über die Update-Regeln
- **Ergebnismeldung mit drei Zählern:** „Imported 4 · updated 2 · 56 already in your
  journal were skipped."
- **Badges einmal pro Batch**, nach dem Commit. Streak entsteht dadurch nicht: die
  48h-Regel behandelt importierte Alt-Trades als Backfill
- **Die Rohdatei verlässt den Browser nicht.** Parsen, Erkennen und Normalisieren sind
  reine Module und laufen im Client; die Action bekommt nur die normalisierten Zeilen.
  Damit bleibt der Slice unter dem Bodylimit einer Server Action, ohne `next.config.ts`
  anzufassen und ohne einen fünften Eintrag in der Route-Handler-Whitelist
- **Undo entfernt nur Unangetastetes.** Handgetippte Trades sind nie dabei. Jeder
  importierte Trade, an dem seither gearbeitet wurde, bleibt und steht im Knopf
  („Remove 56 of 56"). Zahlen rechnen sofort neu, verdiente Badges bleiben verdient

### Grenzen und Validierung

- Max 2000 Zeilen und 2 MB. Größer → Ablehnung in der Vorschau mit der Zahl, nie stilles
  Kürzen
- CSV oder TSV, UTF-8, BOM wird toleriert. Dezimalpunkt, kein Dezimalkomma
- Ungültig ist eine Zeile, wenn Instrument, Richtung, Kontrakte, Entry-Preis oder
  Entry-Zeit nicht lesbar sind. Alles andere darf leer sein
- Ungültige Zeilen werden mit Grund gelistet, ausgeschlossen und **blockieren den Rest
  der Datei nicht**
- Geschrieben wird nur auf das in Schritt 2 gewählte Konto und nur für den
  angemeldeten Nutzer

*Außerdem angefasst:* `context/Design.md` (neuer §4.18; §4.16 bleibt unberührt),
`context/project-structure.md` (Baum: `import.ts` unter Actions, Queries und Schemas,
`fills.ts` und `session.ts` unter `domain/import/`, `csv/parse.ts`).

### Do not build

- Broker- oder Prop-Plattform-API, OAuth, geplanter oder automatischer Abgleich
- Manuelles Column-Mapping-UI, auch nicht für eine einzelne Spalte
- Mehrere Konten aus einer Datei bedienen
- **„Sessions from entry time" als Backfill auf bestehende Trades.** Der Import setzt die
  Session nur an Zeilen, die er selbst anlegt. Der Knopf, der das Journal rückwirkend
  füllt, ist ein eigener Slice — auch wenn das Referenz-Screenshot ihn auf dieselbe Seite
  stellt
- Gebühren, Kommissionen, Swaps
- Zeilen in der Vorschau editieren
- Hintergrundjobs, Queues, gestückelte oder fortsetzbare Importe
- Screenshots oder Links importieren
- Undo für handgetippte Trades
- Jede Änderung am **New-Trade-Formular**. `src/actions/trades.ts` bleibt ebenfalls
  unberührt: durch den Verzicht auf `import_fingerprint` gibt es dort nichts zu schreiben
- Ein Instrument aus einem unbekannten Symbol anlegen
- **Die Extraktion der Tabellen-Primitiven** (`TableHead`, `TableRows`, `TableRow`) und
  jeder Umbau von `dimension-table`, `missed-setups-section`, `hold-time-card` oder
  `risk-calibration-card`. Eigener `refactor:`-Slice, auf Ansage vom 2026-09-18

### Acceptance

- [ ] `pnpm typecheck` grün
- [ ] `pnpm test` grün, mit Tests für `detect`, `normalize`, `fills`, `session`,
      `csv/parse` und den Match-Queries gegen echtes Postgres
- [ ] `pnpm build` grün
- [ ] **Klickpfad Import:** `/journal` → „Import" → Datei mit Round-Trip-Zeilen wählen →
      Konto wählen → Vorschau zeigt vier Zähler und je Zeile einen Grund → bestätigen →
      Ergebnis nennt „Imported n · updated 0 · 0 skipped" → `/journal` zeigt die Trades
- [ ] **Klickpfad Wiederholung:** dieselbe Datei erneut importieren → Vorschau meldet
      alles als skip → bestätigen → die Zahl im Journal ist unverändert
- [ ] **Klickpfad Update:** an einem importierten Trade im Journal eine Notiz und ein
      Setup setzen, in der Datei dieselbe Zeile um Exit-Preis und Exit-Zeit ergänzen →
      erneut importieren → Vorschau meldet „updated 1" → danach trägt der Trade den Exit
      **und** die Notiz **und** das Setup
- [ ] **Klickpfad Fills:** Fill-Level-Datei importieren → die Fills sind zu Round Trips
      gepaart, eine unabgeschlossene Position landet als offener Trade
- [ ] **Klickpfad Undo:** Batch-Liste öffnen → der Knopf nennt „Remove n of m" →
      entfernen → der handangereicherte Trade bleibt, die unangetasteten sind weg, die
      Dashboard-Zahlen folgen
- [ ] Ungültige Zeile (unbekanntes Symbol) steht mit Grund in der Vorschau und blockiert
      den Rest der Datei nicht
- [ ] Übungskonto als Ziel: amber markiert, Hinweis sichtbar, die Trades tauchen in
      keiner kombinierten Zahl auf
- [ ] Keine neuen Konsolenfehler auf allen vier Schritten

### Open questions

Beim `start` am 2026-09-18 geklärt, hier festgehalten statt gelöscht:

- **Einstieg:** ein Knopf in `/journal` neben „New trade", Route `/journal/import`.
  Keine Karte in `/settings`.
- **„Unangetastet" beim Undo:** die vom Import gesetzte Session zählt **nicht** als
  Handarbeit — sonst wäre jeder importierte Trade sofort geschützt und das Undo könnte
  nie etwas entfernen. Angetastet ist ein Trade, wenn eines von `notes`, `setup_type`,
  `entry_model`, `stop_price`, `mfe_r`, `mae_r`, `post_exit_mfe_r`, `grade`, `felt`,
  `by_the_book`, `pnl_override` gesetzt ist, oder wenn mindestens ein Screenshot, Link,
  Confluence oder Mistake daran hängt.

- **`result` beim Import:** aus dem P&L-Vorzeichen abgeleitet — > 0 Win, < 0 Loss,
  genau 0 Breakeven. **`Scratch` wird nie abgeleitet**, das ist ein Urteil über die
  Ausführung und keine Zahl. Ein offener Trade behält `result = null`. Beim Update eines
  gematchten Trades zieht `result` mit, wenn sich der Exit ändert — es steht auf der
  broker-eigenen Seite.

Gelöst am 2026-09-21 mit der ersten echten Beispieldatei:

- **Echte Beispieldateien für `detect.ts` und `normalize.ts`.** Es liegt ein Tradovate
  **Fill-Export** vor (`tmp/import-samples/Fills (1).csv`, 104 Fills, 42 Round Trips,
  ungetrackt). Round-Trip- und TradingView-Export fehlen weiter; `detect.ts` erkennt
  deshalb nur die Fill-Form und lehnt alles andere mit den gefundenen Headern im
  Klartext ab. Die beiden Erkenner kommen als eigene Funktionen dazu, sobald die
  Exporte da sind — die Modulstruktur ändert sich dafür nicht.

### Entscheidungen beim Bau, 2026-09-21

Die Beispieldatei hat eine Festlegung erzwungen, die über diesen Slice hinausreicht.

- **E1 — Die Chart-Uhr ist die Zeitzone, in der der Trader sitzt**, geführt in
  `users.timezone`. Nicht New York, nicht die Anzeigezone der Broker-Plattform.
  `entry_time` und `exit_time` tragen sie und werden weiterhin nie konvertiert.
- **E2 — Der Import liest die UTC-Spalte, nicht die lokale.** Die lokale Spalte der
  Datei zeigt die Anzeigeeinstellung der Plattform (bei dieser Datei zufällig Berlin)
  und kann sich ändern, ohne dass die Datei es sagt. Die Umrechnung passiert **einmal**
  in `normalize.ts`. `trade_date` und `entry_time` stammen aus demselben umgerechneten
  Zeitpunkt, sonst widerspricht der Kalender der Uhrzeit daneben.
- **E3 — `users.timezone` ist `Europe/Berlin`** statt `UTC`. Ein Feld in `/settings`
  kommt mit Phase 2; in Phase 1 gibt es genau einen Nutzer.
- **E4 — Die Session-Fenster bleiben New Yorker Zeiten** und werden je Trade-Datum in
  die Nutzerzone gerechnet. Die Namen benennen echte Markt-Sessions. Je Datum, weil New
  York und Europa an verschiedenen Tagen auf Sommerzeit umstellen: meist sechs Stunden
  Versatz, drei Wochen im März und eine Ende Oktober fünf.
  `sessionFromEntryTime(entryTime, tradeDate, timeZone)`.
- **E5 — MGC (Micro Gold) im Instrumenten-Seeder**, Punktwert 10, Tick 0.10. Ohne ihn
  fielen 10 der 42 Round Trips als unbekanntes Symbol heraus.
- **E6 — `RawTrade.sourceRow` war hart auf `0`.** Ein Round Trip nennt jetzt die Zeile
  seines Eröffnungs-Fills, sonst könnte die Vorschau auf keine Zeile zeigen.

---

## History

One line per merged feature. Newest at the top.

| Date | Feature | Notes |
| --- | --- | --- |
| 2026-09-18 | S12b — Execution-Auswertungen | `/analytics` beantwortet jetzt auch die drei Fragen zur Ausführung aus §F: **Haltedauer** je Ergebnis, **Risikokalibrierung** als MAE/MFE-Verteilung nach Gewinnern und Verlierern, **Exit-Effizienz** als `r / (r + post-exit MFE)` über Gewinner. Drei eigene Abschnitte, und auf keinem steht eine Geldzahl. Die drei Kennzahlen waren nirgends definiert — die Rechenregeln sind im `load` entschieden worden: ein Ausstieg vor dem Einstieg ist eine Nacht und zählt plus 24 Stunden, MFE und MAE zählen über den Betrag (das Formular sagt nicht, welches Vorzeichen zu tippen ist) und brauchen einen Stop-Preis, weil R ohne Stop nicht definiert ist. Alles Hypothetische bleibt weiß: §4.9 verbot Grün für den „would-be R" einer verpassten Position, `Design.md` §4.17 zieht die Regel jetzt auf jede nicht realisierte Zahl. `src/domain/execution.ts` (20 Tests), zwei Queries in `analytics.ts` mit je einem Statement, 19 Query-Tests gegen echtes Postgres. Die Bucket-Grenzen erzeugen die SQL-`CASE`, damit Achse und Abfrage nicht auseinanderlaufen; gruppiert wird über einen Subquery-Alias, weil Drizzle jede Grenze als eigenen Parameter bindet und Postgres `GROUP BY` syntaktisch vergleicht. Das Review fand, dass der MFE-Mittelwert das Vorzeichen noch las, während der Balken daneben schon den Betrag nahm. Damit ist §F vollständig; in Phase 1 fehlt nur der CSV-Import. Details in `decisions.md`. |
| 2026-09-18 | S12a — Analytics-Dimensionen | `/analytics` zeigt die elf Dimensionen aus §F — Konto, Setup-Typ, Entry-Modell, Session, Instrument, Wochentag, Stunde, Confluence, Gefühlslage, Ausführungsnote, Fehler — je mit Trades, Win Rate, Netto-P&L und avg R über einen Zeitraum aus Von/Bis plus vier Presets, dazu einen Missed-Setups-Abschnitt ohne eine einzige Geldzahl. Beide Queries sind je *ein* `UNION ALL` über ihre `GROUP BY` — elf Aufschlüsselungen kosten einen Round-Trip. Kontoscope, Übungsfilter und Geldmultiplikator sind aus `dashboard.ts` nach `queries/scope.ts` gewandert und werden jetzt geteilt. Die Falle des Slices: „Nach Konto" fächert über `trade_accounts` selbst je Konto auf, die Gruppierung *ist* dort der Multiplikator — zusätzlich zu multiplizieren hätte einen Drei-Konten-Copy-Trade neunfach gezählt; `coding-standards.md` sagt das jetzt als „multiply exactly once", 16 Query-Tests gegen echtes Postgres nageln es fest. `Design.md` §4.16 beschreibt die Tabelle, entworfen ist sie nicht. Aus dem Review zwei Auszüge, die dieser Slice selbst verdoppelt hatte: `ValueBar` trägt jetzt die Farbregel aus §1, `buildHref` die searchParams-Logik. S12b bringt Haltedauer, Risikokalibrierung und Exit-Effizienz. Details in `decisions.md`. |
| 2026-09-16 | Equity-Kurve im Dashboard | `/dashboard` zeigt den laufenden Monat als kumulierte Flächenkurve zwischen Metrik-Tafel und Kalender — zweifarbig an der Nulllinie, grün über und rot unter Null, kein Schein auf einem Geldwert. Keine neue Query: `buildEquitySeries` in `src/domain/equity.ts` (19 Tests) summiert dieselbe Tagesreihe, die der Kalender malt, und liefert Y-Bereich, Ticks und Nulldurchgang als reine Arithmetik. Erstes Diagramm im Projekt, deshalb Recharts 3.10.1 installiert und `Design.md` §4.15 plus ein `Charts`-Abschnitt in `coding-standards.md` angelegt. Farben laufen über CSS-Klassen, weil `var()` in einem SVG-Presentation-Attribut nicht auflöst — eine zwischenzeitliche Ausnahme von „No inline styles" ist nach dem Review wieder raus. Dazu eine Rinne für den Scrollbalken in `<main>`, der vorher auf der Kante jeder Karte lag. Gefunden unterwegs: Tailwind v4 scannt auch Markdown in `context/`, eine Utility als Prosa im Spec ließ `globals.css` nicht mehr parsen. Details in `decisions.md`. |
| 2026-09-14 | Fix — Kalender-Hover als CSS | Der 2px-Hub auf Kalendertagen mit Einträgen stand seit S8 als `whileHover` im `motion.div` und kam dort nie an. `Design.md` §5 weist Hover ausdrücklich CSS zu — der Hub ist jetzt `hover:-translate-y-0.5`, bedingt nur auf Tagen mit Einträgen, und die Transition nennt `translate` statt `transform`, weil Tailwind v4 `translate-*` über diese Property setzt. Beide Fallen stehen jetzt in `coding-standards.md` unter Motion. §4.8 blieb unverändert: der Abschnitt war immer richtig, nur die Umsetzung wich ab. Details in `decisions.md`. |
| 2026-09-14 | Designrunde 1 — Dashboard | Icon-Kacheln und Save-Button tragen die ruhige Prozessfläche aus dem neuen `Design.md` §4.14 — das Kalender-Rezept in Blau, kein Neon-Halo mehr; die Zahlen sind jetzt das Hellste auf der Seite. Dazu Hover auf allen ruhenden Flächen (Anheben nur, wo klickbar), das Kalenderraster antwortet je Zustand in seiner Farbe, Instrument-Kacheln in „Recent trades" gleich gebaut für gehandelt und verpasst. Neu: Streak-Bump und Meilenstein-Karte aus §6 über `users.dashboard_seen_at` / `streak_milestone_seen` (Migration 0009, S9-Muster), `pendingStreakMilestone` in `streak.ts` mit neun Tests, Sonner 2.0.8 für Toasts beim Speichern. Der Bump-Vergleich liegt in SQL, nicht in TypeScript — dort verglich er einen String gegen ein `Date` und war immer falsch. Reduced Motion ist durch einen Wächtertest gesichert. Details in `decisions.md`. |
| 2026-09-14 | Fix — Missed Setups bei gewähltem Konto | `queryTradeRows` schloss Missed Setups aus Journal und „Recent trades" aus, sobald ein Konto gewählt war: der Einzelkonto-Zweig machte einen `innerJoin` auf `trade_accounts`, und ein Missed Setup hat keine Kontozuweisung. Ersetzt durch `isVisibleForAccount` nach dem Vorbild von `hasRealAccount`, zwei Tests. Fehler stammt aus S5. Details in `decisions.md`. |
| 2026-09-14 | S11 — Prop Firm Rules | `/prop-firms` zeigt die 2026er Regelsätze von 15 Firmen: Suche, elf Filter-Chips aus dem Badge-Block der Quelldatei, aufklappbare Detailansicht mit allen 18 Feldern, Vergleich von bis zu drei Programmen. `prop_firms`/`prop_firm_programs` (alle 18 Regelfelder `text`, weil die Quelle `$2,000 (EOD)` und `No stated cap` schreibt und eine Zahl daraus zu ziehen die Regel deuten hieße), reiner Parser in `src/lib/prop-firms/parse.ts` mit 19 Tests, idempotenter `db:seed:propfirms`. Der Parser wirft bei jeder unplatzierbaren Zeile — die Absatzregel schließt die Lücke, durch die ein Wert vor dem ersten Label still zum Summary-Tag wurde. `website` und `last_verified_at` sind in der Quelldatei noch ungepflegt, die Seite sagt das. Details in `decisions.md`. |
| 2026-09-13 | S10a — CSV-Export | `/settings` lädt das vollständige Journal als CSV: eine Zeile pro Trade, 33 Spalten, alle Trades — ohne Kontoschalter, ohne Journal-Filter, ohne Übungskonto-Ausschluss, weil ein gefilterter Export kein Backup ist. `listTradesForExport` (eine Query, fünf korrelierte Subqueries), `src/lib/csv/` mit RFC-4180-Writer und Zeilenabbildung (27 Tests), `formatCentsPlain` neben `formatCents`, Route-Handler `/api/export/trades` ohne jeden Parameter. `accounts` und `is_practice` sind positionsgleiche Semikolonlisten, damit der Echt/Übung-Split einen Re-Import überlebt. `coding-standards.md` hat dafür einen vierten Whitelist-Punkt für Datei-Downloads bekommen. Import folgt als S10b. Details in `decisions.md`. |
| 2026-09-13 | Fix — Dynamic Rendering und Reduced Motion | `force-dynamic` sitzt jetzt einmal im `(app)`-Layout und deckt alle sieben Seiten hinter der Session ab; `/settings` und `/journal/new` lasen vorher die Datenbank zur Bauzeit. Dazu der fehlende `prefers-reduced-motion`-Block aus `Design.md` §5 in `globals.css` — inklusive `animation-iteration-count: 1`, ohne die eine Endlosanimation nicht stoppt, sondern beschleunigt; §5 ist mitkorrigiert. Neu: `PendingIndicator`, der bei reduzierter Bewegung „Saving…" statt eines Spinners zeigt. Details in `decisions.md`. |
| 2026-09-13 | S9 — Progress-Seite | `/progress` mit den Streak-Regeln im Klartext, dem Consistency Score als 40/20/25/15-Balken, den zwölf Badges in vier Kategorien und der Grace-Day-Leiste (§4.4). Die Badge-Vergabe ist jetzt echt: `badgesToAward` in `src/domain/badges.ts` (rein, getestet), `syncUserBadges` in den Schreibpfaden `createTrade` und `saveDailyNote`, `users.badges_seen_at` samt Migration für die einmalige Freischalt-Karte aus §6. `score_90` bleibt bis zum Month-Close zurückgestellt. Die Dashboard-Kachel liest dieselbe Quelle. Details in `decisions.md`. |
| 2026-09-12 | S8 — Dashboard | `/dashboard` zeigt die Metrik-Tafel mit fünfzehn Kennzahlen in einer Karte (§4.7), P&L-Kalender-Heatmap (§4.8), Recent trades über die bestehende `TradeRow` (§4.9), Streak-/Consistency-/Badge-Kacheln (§4.3) und die Plan-Karte mit optionalem End-of-Day-Review (§4.6). `daily_notes` samt Migration, `src/db/queries/dashboard.ts` mit sechs Aggregatqueries (jede als Geld- oder Zählaggregat deklariert, `is_practice = false` zuerst), `src/lib/time.ts` als erster Aufrufer der S7-Module. `src/domain/**` unverändert. Details in `decisions.md`. |
| 2026-09-12 | S7 — Progress-Domain | `src/domain/streak.ts`, `consistency.ts` und `badges.ts` als reine, getestete Module (62 Tests, Tests zuerst): 48h-Fenster in `users.timezone`, Samstag übersprungen, Sonntag auf Montag, ein Grace Day pro Monat; Score 40/20/25/15 mit Tagesmittelung zuerst; zwölf Badges in vier Kategorien. `badge_defs` und `user_badges` samt Migration, idempotenter `db:seed:badges`. `date-fns`/`@date-fns/tz` neu, `coding-standards.md` §Time auf „Zeitzone entscheidet jede Kalendergrenze" geändert. Kein UI-Aufrufer. Details in `decisions.md`. |
| 2026-09-12 | S6 — Screenshots und Links | Bis zu drei Screenshots (im Browser auf 1600px verkleinert, als JPEG komprimiert, nur über signierte URLs ausgeliefert) und beliebig viele https-only Links pro Trade — sowohl beim Anlegen als auch nachträglich über einen Stift-Auslöser in der Journal-Zeile. `trade_screenshots`/`trade_links`, erster Route-Handler des Projekts (`src/app/api/uploads/route.ts`). Details in `decisions.md`. |
| 2026-09-12 | S5 — Journal-Liste | `/journal` zeigt Trades und Missed Setups mit Filtern (Zeitraum, Instrument), Sortierung (Datum/R-Multiple) und Pagination. Übungskonto-only-Trades sind ausgeblendet, aber per Zähler mit Ein-Klick-Reveal sichtbar. `listJournalTrades` in `src/db/queries/trades.ts`, vier neue Komponenten unter `src/components/journal/`. Details in `decisions.md`. |
| 2026-09-10 | S4 — Trades und Missed Setups | `trades`-Tabelle samt `trade_accounts`, `confluence_tags`/`trade_confluences`, `mistake_tags`/`trade_mistakes`, Seeder für sechs Confluence-Gruppen und zehn Mistakes. `src/domain/trades.ts` (Konto-Pflicht nur bei taken=true), New-Trade-Formular unter `/journal/new` mit live abgeleitetem P&L/R aus `pnl.ts`. Erster echter Aufrufer von `pnl.ts` und `accounts.ts`. Details in `decisions.md`. |
| 2026-09-10 | S3 — Accounts | `accounts`-Tabelle (Partial-Unique-Index für Default), `src/domain/accounts.ts` (Geldmultiplikator, Practice-Ausschluss, Kontoschalter-Gruppierung), Kontoverwaltung als Kacheln in Settings, Kontoschalter in der Sidebar nach Design.md §4.12. Details in `decisions.md`. |
| 2026-09-09 | S2 — Instruments und P&L | `instruments`-Tabelle (Punktwert, Tick), idempotenter Seeder für zehn Futures (Minis + Micros), `src/lib/money.ts` (integer minor units) und `src/domain/pnl.ts` (P&L/R-Multiple, override-fähig, BigInt-Fixpunkt-Arithmetik). Details in `decisions.md`. |
| 2026-09-09 | S1 — App-Shell | Authentifizierte Shell unter `src/app/(app)/` mit Sidebar nach `Design.md` §4.1 (sieben Nav-Punkte, aktiver Zustand mit `AnimatePresence`-Scale/Fade-Spring), sieben leere Seiten mit Überschrift. Erster Verbraucher von `getCurrentUser()`. Details in `decisions.md`. |
| 2026-09-09 | P0.4 — DB-Seam | Drizzle-Client gegen lokales Postgres 18, `users`-Tabelle (volles Datenmodell) mit erster Migration, `getCurrentUser()` liefert den geseedeten Nutzer, lokales Storage-Interface. Details in `decisions.md`. |
| 2026-09-09 | P0.3 — Designfundament | Design-Tokens und `@utility`-Sammlung aus `Design.md` §2 in `globals.css`, Instrument Sans + IBM Plex Mono selbst gehostet über `next/font/local` (vendorte Dateien, keine Google-Anfrage), `MotionConfig reducedMotion="user"` im Root-Layout. Details in `decisions.md`. |
| 2026-09-09 | P0.2 — Scaffold und Toolchain | Next 16.3.4 Scaffold, exakte Pins, Biome/Vitest/tsconfig, `CLAUDE.md`-Befehlsliste um P0.2-Abweichung ergänzt. `next.config.ts` nach Review um nicht-autorisiertes `agentRules: false` bereinigt. |
| — | — | Nothing merged yet |
