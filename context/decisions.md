# Decisions

Append-only. Ein Block pro abgeschlossenem Slice, neueste **unten**. Nichts hier wird
umgeschrieben oder gelöscht — auch nicht, wenn eine Entscheidung später revidiert wird.
Dann kommt ein neuer Block, der auf den alten verweist.

Wozu diese Datei da ist: `git log` sagt, *was* sich geändert hat. Die History-Tabelle in
`current-feature.md` sagt, *dass* ein Slice fertig ist. Hier steht, *warum* — und die
kleinen Entscheidungen, die innerhalb eines Slices fielen und zu klein für
`project-overview.md` sind, aber zu wichtig, um sie in einem Commit-Diff zu verstecken.

Diese Datei ist keine Pflichtlektüre. Sie wird gelesen, wenn eine Frage auftaucht, die
sie beantwortet — nicht in jeder Session.

## Format

```
## YYYY-MM-DD — <Slice> — <branch> — <commit-hash>

**Gebaut.** Zwei bis drei Sätze: was danach möglich ist, was vorher nicht ging.

**Dateien.** Die tragenden, nicht alle. Vollständige Liste steht im Commit.

**Migration.** Welche, welche Tabelle. Entfällt, wenn keine.

**Regeln.** Welche Domainregel lebt jetzt in welchem Modul, abgesichert durch welchen
Test. Entfällt, wenn `src/domain/**` nicht berührt.

**Entschieden unterwegs.** Jede Festlegung, die im Slice getroffen wurde und nicht im
Spec stand. Mit einem Satz Begründung. Das ist der Teil, den ich später suche.

**Offen geblieben.** Was bewusst nicht entschieden wurde, und wo es jetzt steht.
```

---

## 2026-09-09 — P0.3 Designfundament — feature/p0-3-designfundament — d50a8f3

**Gebaut.** `globals.css` trägt jetzt die echten Design-Tokens und die `@utility`-Sammlung
aus `Design.md` §2 statt der Scaffold-Defaults. Beide Schriften (Instrument Sans, IBM
Plex Mono) laden selbst gehostet, `MotionConfig reducedMotion="user"` sitzt am App-Root.
Kein Screen sichtbar außer dem globalen `page-glow`-Hintergrund.

**Dateien.** `src/app/globals.css`, `src/app/layout.tsx`, `src/app/fonts/*`,
`package.json`, `pnpm-lock.yaml`. Vollständige Liste im Commit.

**Entschieden unterwegs.**
- Fonts über `next/font/local` mit tatsächlich im Repo vendorten Variable-Font-Dateien
  (`src/app/fonts/InstrumentSans-Variable.woff2`, `src/app/fonts/IBMPlexMono-Variable.woff2`,
  je samt OFL-Lizenztext). Erster Versuch war `next/font/google` — technisch self-hosted
  im Next.js-Sinn (keine Laufzeit-Anfrage), aber es lädt beim Build von Google-Servern.
  Sascha hat das korrigiert: „self-hosted" heißt hier keine Netzwerk-Anfrage an einen
  Drittanbieter, auch nicht einmalig beim Build. Beide Dateien stammen aus den
  offiziellen Foundry-Repos (`github.com/Instrument/instrument-sans`,
  `github.com/IBM/plex`, Paket `plex-mono-variable`), nicht von Google, beide OFL 1.1.
- `page-glow` wird schon in diesem Slice als fixer Hintergrund-Div im Root-Layout
  verdrahtet, obwohl kein Screen gebaut wird — Design.md beschreibt ihn als seitenweit
  konstant, also gehört er ins Layout und nicht in einen Screen. Per Rückfrage mit
  Sascha abgestimmt, bevor `load` geschrieben wurde.
- `body { font-family: var(--font-sans) }` in `globals.css` ergänzt, obwohl das
  Design.md-Dokument diese Zeile nicht explizit vorschreibt — ohne sie würde Tailwind v4
  den Sans-Font nirgends automatisch anwenden.
- `motion@13.2.0` installiert, ohne erneut nachzufragen — der Wert war bereits exakt in
  `coding-standards.md` gepinnt, keine neue Versionsentscheidung.

**Offen geblieben.** Keins.

---

## 2026-09-09 — P0.4 DB-Seam — feature/p0-4-db-seam — 5aae141

**Gebaut.** Die App spricht jetzt mit einer echten Postgres-Datenbank über einen
validierten Drizzle-Client. Ein einzelner geseedeter lokaler Nutzer existiert und ist
über `getCurrentUser()` erreichbar. Ein Storage-Interface mit lokaler Disk-Implementierung
steht bereit, noch ohne Aufrufer. Vorher gab es keine DB-Verbindung, keinen persistenten
Nutzer und keine Storage-Anbindung.

**Dateien.** `src/lib/env.ts`, `drizzle.config.ts`, `src/db/schema/users.ts`,
`src/db/index.ts`, `src/db/migrations/0000_giant_blackheart.sql`, `src/db/seed.ts`,
`src/lib/auth/get-current-user.ts`, `src/lib/storage/`, `package.json`, `CLAUDE.md`.
Vollständige Liste im Commit.

**Migration.** `0000_giant_blackheart.sql`, Tabelle `users`. Über `db:generate` erzeugt,
über `db:migrate` gegen die lokale `tradingjournal`-DB angewendet und geprüft.

**Entschieden unterwegs.**
- Postgres-Treiber `postgres` (postgres.js) — nicht in `coding-standards.md` gepinnt,
  mit Sascha abgestimmt vor dem Schreiben des Specs.
- Primary-Key-Strategie projektweit: Integer statt UUID — mit Sascha abgestimmt, gilt
  für jede künftige Tabelle, nicht nur `users`.
- `users`-Tabelle bekommt das volle Draft-Modell aus `project-overview.md` jetzt, nicht
  nur die Phase-1-Teilmenge — mit Sascha abgestimmt. Daraus folgen zwei Konsequenzen,
  die nicht mehr einzeln abgestimmt wurden, weil sie mechanisch aus dieser Wahl plus
  den bestehenden „Do not build"-Grenzen folgen: `selected_account_id` ohne
  FK-Constraint (Zieltabelle `accounts` existiert nicht), `password_hash`/`totp_secret`
  nullable (Better Auth nicht in diesem Slice).
- `t.integer().generatedAlwaysAsIdentity()` statt `serial()` für die PK-Spalte —
  Drizzles eigene Doku führt `serial` als deprecated zugunsten von Identity-Spalten,
  bleibt aber ein Integer-PK, nur die aktuelle Schreibweise.
- Kein `dotenv`: Node 24 lädt `.env.local` nativ über `--env-file`, alle `db:*`-Scripts
  nutzen das statt einer zusätzlichen Abhängigkeit.
- `db:generate`/`db:migrate` zeigen auf `drizzle-kit/bin.cjs` statt auf den
  `.bin`-Shim, weil pnpms Shim kein reines Node-Skript ist und `node --env-file` daran
  scheitert.
- `tsconfig.json`: `allowImportingTsExtensions: true` ergänzt, damit `seed.ts` seine
  relativen Imports mit `.ts`-Endung behalten kann, die Node für direkte Ausführung
  verlangt.
- Geseedeter User: `username: "local"`, `timezone: "UTC"`, `currencyDisplay: "USD"` —
  Platzhalterwerte ohne Produktbedeutung, in Settings später änderbar.
- `.gitignore` um `/storage/uploads` ergänzt, sonst würden lokale Testdateien der neuen
  Disk-Storage ins öffentliche Repo wandern.
- Kein `"type": "module"` in `package.json`, obwohl Node bei jedem `db:*`-Lauf eine
  Performance-Warnung dazu ausgibt — das Feld global zu setzen wäre riskant für die
  Next.js-/Tailwind-Configs, für eine reine Perf-Notiz nicht das Risiko wert.
- Die liegengebliebene, nie committete P0.3-CLAUDE.md-Aufräumung (decisions.md-Referenz,
  Gate-Zahl drei statt vier) wurde im Review gefunden und als eigener Commit `dfeb37c`
  von diesem Slice getrennt, damit der P0.4-Commit nicht zum Sammelcommit wird.

Die ersten drei Punkte (Treiber, PK-Strategie, `users`-Spaltenumfang) betreffen das
ganze Projekt, nicht nur diesen Slice — Vorschlag: in die Decisions-Liste in
`context/project-overview.md` übernehmen. Das entscheide ich nicht selbst.

**Offen geblieben.** Keins.

---

## 2026-09-09 — S1 App-Shell — feature/s1-app-shell — 0936685

**Gebaut.** Eine authentifizierte Shell unter `src/app/(app)/` mit Sidebar nach
Design.md §4.1 und sieben leeren Routen (Dashboard, Trade Journal, Analytics,
Progress, Prop Firm Rules, Econ Calendar, Settings), je nur eine Überschrift. Vorher
gab es keine Navigation und keine Route außer der P0.3-Platzhalterseite. Erster echter
Verbraucher von `getCurrentUser()` aus P0.4.

**Dateien.** `src/components/shell/nav-items.ts`, `src/components/shell/sidebar.tsx`,
`src/app/(app)/layout.tsx`, die sieben `page.tsx`, `src/app/globals.css`,
`package.json`, `context/coding-standards.md`. Vollständige Liste im Commit.

**Entschieden unterwegs.**
- Sidebar-Breite 260px und Icon-Bibliothek `lucide-react` — beides nirgends
  vorgegeben, vor dem Schreiben des Specs mit Sascha abgestimmt.
- Kein Blur (`backdrop-filter`) und kein shadcn-Primitive auf der Sidebar — §4.1s
  eigene Bullet-Liste verlangt keins von beiden, wörtlich gelesen; `shadcn init`
  bleibt ungetan.
- Vier neue Tokens (`--color-nav-idle`, `--color-nav-hover`,
  `--color-nav-active-ring`, `--color-divider-glow`) in `globals.css` — Design.md
  schreibt explizit vor, dass rgba-Werte aus §4 beim Bauen der Komponente als Token
  ergänzt werden, nicht als Literal übernommen.
- `page-title`-Utility neu angelegt (statt Sidebar-Zustände als Utilities), weil sie
  von jeder künftigen Seite wiederverwendet wird — die Sidebar-Zustände (aktiv/hover/
  Trenner) sind aktuell Einzelverbraucher und stehen direkt als Tailwind-Arbitrary-
  Values mit `var(--token)`.
- Während `verify`, auf direkte Anfrage: ein zweiter Trenner zwischen „Progress" und
  „Prop Firm Rules", nicht Teil des ursprünglichen Specs, in `current-feature.md`
  nachgetragen.
- Während `verify`, ebenfalls auf direkte Anfrage: eine `motion`/`AnimatePresence`-
  Animation auf dem aktiven Nav-Item, über drei Iterationen verfeinert (erst
  gleitendes `layoutId`, dann verworfen zugunsten von unabhängigem Scale/Fade pro
  Item, zuletzt von einem Duration-Tween auf einen Spring umgestellt und dessen
  Stiffness/Damping proportional verlangsamt). Neuer, dauerhafter Motion-Anwendungsfall
  — in `coding-standards.md` nachgetragen. Kein neues Paket, `motion` ist seit P0.3
  installiert.
- Aktiver Nav-Zustand per `pathname === href || pathname.startsWith(href + "/")`,
  nicht nur exakter Vergleich — robust gegen künftige Unterrouten wie
  `/journal/import`.
- `t.integer().generatedAlwaysAsIdentity()`-Konvention aus P0.4 nicht betroffen, da
  dieser Slice kein Schema anfasst.

**Offen geblieben.**
- Im Review als ⚠️ notiert, nicht behoben: die Trennlinie (Verlauf + Glow) steht als
  identischer, langer Tailwind-Arbitrary-Value-String zweimal wörtlich in
  `sidebar.tsx`. Kandidat für eine kleine gemeinsame Klasse oder ein
  `@utility nav-divider`, wenn ein dritter Verbraucher dazukommt.
- Visibility-Hinweis aus dem Review: die sieben Routen sind ohne Session erreichbar,
  wie das ganze Projekt in Phase 1. Kein neuer Verstoß dieser Slice, aber der erste
  Slice mit echten klickbaren App-Routen — `(app)/layout.tsx` ist die vorgesehene
  Stelle für die Better-Auth-Session-Prüfung in Phase 2.

---

## 2026-09-09 — S2 Instruments und P&L — feature/s2-instruments-pnl — 6b406be

**Gebaut.** Der Punktwert eines Futures-Kontrakts kommt jetzt aus der `instruments`-
Tabelle statt aus einem Literal. `src/domain/pnl.ts` leitet P&L und R-Multiple rein aus
Preisen, Richtung, Kontrakten und Punktwert ab, override-fähig. `src/lib/money.ts`
liefert die Umrechnung zwischen Dezimalbetrag und ganzzahligen Cent, die `pnl.ts`
intern nutzt. Vorher gab es weder eine Instrumententabelle noch ein P&L-Modul; jeder
künftige Slice, der einen Punktwert braucht, liest ihn jetzt aus der Tabelle.

**Dateien.** `src/db/schema/instruments.ts`, `src/db/seed-instruments.ts`,
`src/lib/money.ts`, `src/domain/pnl.ts`, die vier zugehörigen Testdateien,
`src/db/index.ts`, `package.json`. Vollständige Liste im Commit.

**Migration.** `0001_good_steve_rogers.sql`, Tabelle `instruments`. Über `db:generate`
erzeugt, über `db:migrate` gegen die lokale DB angewendet.

**Regeln.** „Domain math: integer minor units" lebt in `src/lib/money.ts`, abgesichert
durch `money.test.ts`. „P&L und R-Multiple rein aus Preisen und Punktwert ableiten,
override-fähig" lebt in `src/domain/pnl.ts::calculatePnl`, abgesichert durch
`pnl.test.ts`. „Punktwert nie als Literal" ist strukturell erzwungen: `pnl.ts` nimmt
`pointValue` nur als Parameter, Literale existieren nur im Seeder als Tabellendaten
selbst.

**Entschieden unterwegs.**
- Instrumentenliste (Minis + Micros: ES, NQ, YM, RTY, GC, CL, MES, MNQ, MYM, M2K, mit
  Punktwert/Tick) — im Spec nicht vorgegeben, mit Sascha vor `load` per Rückfrage
  festgelegt, da falsche Punktwerte die Geld-Korrektheit des Tools direkt verletzen.
- R-Multiple-Formel (`P&L ÷ initiales Risiko`, `initiales Risiko = |entry − stop| ×
  point_value × contracts`, `stop_price` Pflicht-Parameter, `null` ohne sinnvollen
  Stop) — nirgends dokumentiert, mit Sascha vor `load` abgestimmt.
- Override-API als ein Funktionsparameter (`calculatePnl(input, overridePnlCents?)`)
  statt zwei getrennter Funktionen — mit Sascha vor `load` abgestimmt.
- Während des Reviews: `pnl.ts` von einer verketteten Float-Multiplikation
  (Preis × Punktwert × Kontrakte, erst am Ende gerundet) auf `BigInt`-Fixpunkt-
  Arithmetik umgebaut (Preise auf Faktor 10 000 skaliert, Multiplikationskette exakt
  in Integer, nur an den beiden Rändern ein einzelner kontrollierter Float-Schritt).
  Grund: die ursprüngliche Fassung widersprach der Regel „nie Float-Arithmetik auf
  Geld" aus `coding-standards.md`, auch wenn sie für die getesteten Größenordnungen
  korrekt rundete. Mit Sascha abgestimmt statt eines API-Wechsels auf String-Inputs,
  um die Signatur stabil zu halten.
- BigInt-Literalsyntax (`10_000n`) scheiterte am TS-Target `ES2017` aus dem
  Next.js-Scaffold (`TS2737`). Statt das Projekt-Target auf ES2020 anzuheben — eine
  projektweite Konfigurationsänderung außerhalb des Slice-Scopes — durchgängig
  `BigInt(...)`-Aufrufe statt der `n`-Suffix-Literale verwendet; funktional identisch,
  keine Zielversion nötig.
- Script `db:seed:instruments` in `package.json` — im Spec nur als „Seeder" benannt,
  Name aus dem bereits dokumentierten Muster `db:seed:propfirms` (`CLAUDE.md`)
  abgeleitet, keine Rückfrage nötig, da reine Namenskonvention.
- `src/db/index.ts`: Schema-Registrierung von `import * as schema from "./schema/
  users.ts"` auf `{ ...users, ...instruments }` umgestellt, da der Client ab jetzt
  mehr als eine Schemadatei kennen muss. Erstes Mal, dass dieses Muster gebraucht
  wurde — künftige Schema-Dateien reihen sich hier ein.

Der BigInt-Fixpunkt-Ansatz für Preis-×-Punktwert-Multiplikationen betrifft
voraussichtlich mehr als diesen Slice — jeder künftige Ort, der Preise mit einem
Punktwert in TypeScript multipliziert (z. B. S4 Trades, CSV-Import), müsste denselben
Mechanismus reproduzieren oder eine gemeinsame Hilfsfunktion daraus machen. Vorschlag:
einen kurzen Hinweis dazu in den „Money"-Abschnitt von `coding-standards.md`
aufnehmen, nicht in die Decisions-Liste von `project-overview.md`, da es sich um eine
Implementierungsregel und keine Produktentscheidung handelt. Das entscheide ich nicht
selbst.

**Offen geblieben.** Die zehn Punktwerte/Ticks sind Standard-CME-Kontraktspezifikationen
aus meinem Wissen, nicht aus einer projekteigenen Quelle geprüft. Im Review als ⚠️
notiert, von Sascha mit „so übernehmen" akzeptiert — bleibt aber ungegenprüft gegen
eine autoritative externe Quelle.

---

## 2026-09-10 — S3 Accounts — feature/s3-accounts — a477853

**Gebaut.** Der Nutzer kann eigene Konten anlegen, umbenennen, sortieren, archivieren
(und wiederherstellen), als Übungskonto markieren und eines als Default für neue Trades
setzen. Konten erscheinen als Kacheln in den Settings und im neuen Kontoschalter in der
Sidebar. Vorher gab es keine Konten, nur den vorbereiteten, ungenutzten
`users.selected_account_id`-Hook.

**Dateien.** `src/db/schema/accounts.ts`, `src/domain/accounts.ts` (+Tests),
`src/db/queries/accounts.ts`, `src/actions/accounts.ts`, `src/schemas/accounts.ts`,
`src/components/settings/*`, `src/components/shell/account-switcher.tsx`,
`src/components/ui/toggle-switch.tsx`. Vollständige Liste im Commit.

**Migration.** `0002_square_psylocke.sql` — neue Tabelle `accounts`, FK-Nachtrag auf
`users.selected_account_id`.

**Regeln.** Geldmultiplikator über echte zugewiesene Konten (`realAccountMultiplier`/
`applyMoneyMultiplier` vs. `countMultiplier`) und Practice-Ausschluss aus jedem
kombinierten Wert (`excludePracticeAccounts`/`contributesToMoneyAggregate`) leben in
`src/domain/accounts.ts`, abgesichert durch `src/domain/__tests__/accounts.test.ts`.
Noch kein echter Aufrufer — das ist die Schnittstelle für S4 (Trades), sobald
`trade_accounts` existiert. Die Kontoschalter-Reihenfolge aus Design.md §4.12
(archiviert nie sichtbar, echte vor Practice-Konten) steckt in `groupAccountsForSwitcher`,
ebenfalls getestet.

**Entschieden unterwegs.**
- Zirkulärer Schema-Import zwischen `accounts.ts` und `users.ts` (jede Tabelle
  referenziert die andere) über Drizzles `.references(() => col)`-Thunk mit explizitem
  `AnyPgColumn`-Rückgabetyp gelöst — ohne den Typ bricht TypeScripts zirkuläre
  Typinferenz. Erster Fall dieser Art im Projekt; jede künftige zirkuläre FK-Beziehung
  zwischen zwei Tabellen braucht denselben Kniff.
- „Ein Default-Konto pro User" auf DB-Ebene über einen Partial-Unique-Index erzwungen
  (`accounts_user_default_unique`, WHERE `is_default_for_new_trades = true`), nicht nur
  in der Action-Logik — Anwendungscode kann sich irren, ein DB-Constraint nicht.
- `countAssignedTrades(accountId)` als echte Funktion mit finaler Signatur angelegt, die
  heute immer `0` zurückgibt (kein `trade_accounts` existiert), statt „Hard Delete immer
  erlaubt" hart im Code zu verdrahten — wenn S4 `trade_accounts` baut, ändert sich nur
  der Funktionskörper, nicht die Action oder ihre Tests.
- UI komplett handgestrickt mit Tailwind und bestehenden Design-Tokens, keine neue
  Dependency (kein shadcn/ui, kein Radix, kein react-hook-form) — vorab mit Sascha
  abgestimmt, shadcn-Einführung verschiebt sich auf eine eigene spätere Aufgabe.
  Sortieren per Auf/Ab statt Drag-and-Drop, aus demselben Grund.
- `<main>` wurde zu einem eigenen Scrollbereich (sticky + overflow-y-auto wie die
  Sidebar) umgebaut, damit der Practice-Amber-Streifen aus Design.md §4.12 beim Scrollen
  tatsächlich fixiert bleibt — eine Layout-Änderung über den Accounts-Rahmen hinaus,
  deshalb vorab mit Sascha abgestimmt statt still mitgezogen.
- Kein Unarchive war die ursprüngliche Entscheidung beim Laden der Spec (Sascha:
  „nicht bauen"). Während der Umsetzung hat er das zurückgenommen und ausdrücklich
  Restore angefragt — jetzt ein einfacher Klick ohne Zwei-Schritt-Bestätigung, da
  unkritisch und jederzeit erneut archivierbar.
- Die Settings-UI wurde über mehrere Feedback-Runden von einer flachen Liste zu einem
  Kachel-Grid mit einer „Geist"-Anlege-Kachel umgebaut (klick zum Aufklappen, schließt
  nach Erfolg automatisch), nachdem Sascha das Anlegen als „ideenlos" und die Kacheln
  als schwer lesbar bezeichnet hatte. Sortier-Pfeile wurden zu einer gerahmten
  Stepper-Box zusammengefasst (waren als zwei lose Icons nicht als ein Control
  erkennbar), der Default-Stern wurde durch einen Haken mit sichtbarer
  Zwei-Schritt-Bestätigung ersetzt (Stern passte semantisch nicht, die Bestätigung war
  unsichtbar), und Practice-Toggle sowie Default-Haken bekamen je eine eigene
  beschriftete Zeile (Label links, Control rechts — das Muster aus dem
  Anlegen-Formular), nachdem am reinen Icon nicht ablesbar war, was es tut.
- Im Review fielen mehrere inline `rgba()`-Werte auf (entgegen „Farben nur als
  `@theme`-Token"). Nachgezogen als echte Tokens: `--color-toggle-track`,
  `--color-cyan-dim`, `--color-cyan-glow`, `--shadow-button-primary(-hover)`, dazu
  `--gradient-success` für den Button-Erfolgszustand. Zwei 40px-Hit-Area-Lücken
  (Restore/Delete in der Archiv-Liste, Cancel in der Anlege-Kachel) ebenfalls im Review
  gefunden und behoben.

Der Thunk-Kniff für zirkuläre Schema-Importe und die neuen Button-/Toggle-Tokens
betreffen voraussichtlich mehr als diesen Slice — jede künftige Tabelle mit einer
zirkulären FK-Beziehung braucht denselben Mechanismus, und jeder künftige Primary-Button
sollte `--shadow-button-primary` statt eines neuen inline-`rgba()`-Werts verwenden.
Vorschlag: einen Hinweis dazu in `coding-standards.md` (Datenbank-Abschnitt) und in
`Design.md`s Token-Liste aufnehmen. Das entscheide ich nicht selbst.

**Offen geblieben.** Der Zwei-Schritt-Bestätigen-Fluss (State + Timeout-Ref + Revert)
ist jetzt dreimal identisch von Hand geschrieben (Archive und Default in
`account-row.tsx`, Delete in `archived-accounts-list.tsx`) statt einmal als Hook
extrahiert — im Review als ⚠️ notiert, nicht behoben, da nicht blockierend. Kandidat für
eine spätere Aufräum-Slice, sobald ein vierter Aufrufer dazukommt.

## 2026-09-10 — S4 Trades und Missed Setups — feature/s4-trades — a1d8ef4

**Gebaut.** Der Nutzer kann über ein neues Formular unter `/journal/new` einen
ausgeführten Trade oder ein Missed Setup loggen — mit live abgeleitetem P&L/R
(überschreibbar), Kontozuweisung auf ein oder mehrere Konten und Confluence-/
Mistake-Tagging. Vorher konnte kein Trade angelegt werden; `src/domain/pnl.ts` und
`src/domain/accounts.ts` hatten keinen echten Aufrufer.

**Dateien.** `src/db/schema/trades.ts`, `src/domain/trades.ts` (+Test),
`src/schemas/trades.ts`, `src/actions/trades.ts`, `src/db/queries/trades.ts`,
`src/db/queries/instruments.ts`, `src/db/queries/accounts.ts` (erweitert),
`src/db/seed-trade-tags.ts`, `src/app/(app)/journal/new/page.tsx`,
`src/components/trades/*`. Vollständige Liste im Commit.

**Migration.** `0003_parallel_pete_wisdom.sql` — sechs neue Tabellen: `trades`,
`trade_accounts`, `confluence_tags`, `trade_confluences`, `mistake_tags`,
`trade_mistakes`.

**Regeln.** „Ein Trade braucht mindestens ein Konto, ein Missed Setup keines" lebt in
`validateTradeAccountAssignment` (`src/domain/trades.ts`), abgesichert durch
`src/domain/__tests__/trades.test.ts` (5 Fälle). `pnl.ts` und `accounts.ts` blieben
unverändert — dieser Slice ist ihr erster echter Aufrufer:
`countAssignedTrades` in `src/db/queries/accounts.ts` ist jetzt eine echte
`trade_accounts`-Query statt des `TODO(S4)`-Stubs aus S3.

**Entschieden unterwegs.**
- Enum-Vokabulare (`session`, `setup_type`, `entry_model`, `result`, `grade`, `felt`)
  und die Seed-Daten für sechs Confluence-Gruppen (58 Tags) und zehn Mistake-Tags standen
  in keiner Datei — mit Sascha vor `start` abgestimmt, nicht geraten.
- Missed-Setup-Feldsichtbarkeit (welche Felder bei `taken=false` gelten) war die
  heikelste Lücke: `project-overview.md` verlangt „mindestens ein Konto pro Trade"
  generell, Sascha hat das explizit auf `taken=true` eingeschränkt — ein Missed Setup
  bekommt bewusst keine Kontozuweisung.
- `direction` ist in beiden Zweigen Pflicht (auch bei Missed Setups), obwohl die
  Feldliste es dort nicht nannte — mit Sascha geklärt statt stillschweigend entschieden.
- `import_batch_id` komplett weggelassen, nicht einmal als ungenutzter Stub — anders als
  `countAssignedTrades` in S3, das bewusst als Vorgriff auf S4 angelegt wurde. Hier
  entschieden: CSV-Import (S10) bekommt die Spalte, wenn es sie braucht.
- `points` ist kein eigenes Formularfeld, sondern wird serverseitig als reine
  Subtraktion abgeleitet (`exitPrice - entryPrice`, vorzeichenabhängig von `direction`)
  statt über `calculatePnl`s BigInt-Pfad — eine einzelne Subtraktion ohne
  Multiplikationskette braucht das Skalierungsverfahren nicht, das für Geldwerte
  gilt.
- Route `/journal/new` statt Modal, aus `project-structure.md`s bereits dokumentierter
  `journal/import/`-Subroute abgeleitet, die das Muster „Anlage-Flows unter
  `/journal/*`" schon vor der eigentlichen Listen-Seite (S5) etabliert.
- Join-Tabellen (`trade_accounts`, `trade_confluences`, `trade_mistakes`) bekamen eine
  Integer-Identity-PK plus Unique-Index statt der zusammengesetzten PK aus dem
  Draft-SQL in `project-overview.md` — konsistent mit der bereits in P0.4
  getroffenen projektweiten Entscheidung für Integer-Identity-PKs auf jeder Tabelle,
  keine neue Festlegung.
- Im Review (`/feature-review`) zwei ⚠️ gefunden und direkt behoben: `getFieldClass`/
  `fieldState` in `new-trade-form.tsx` ergänzen den fehlenden sechsten Feldzustand aus
  Design.md §4.5 (grüner „valid"-Rand, vorher nur default/hover/focus/invalid/disabled
  vorhanden — dieselbe Lücke besteht weiterhin in `account-create-form.tsx` aus S3,
  dort nicht nachgezogen, da außerhalb des Scope dieses Branches); und
  `countExistingConfluenceTags`/`countExistingMistakeTags` in
  `src/db/queries/trades.ts` prüfen Tag-IDs jetzt vor dem Insert auf Existenz, statt
  sich auf einen rohen FK-Fehler zu verlassen — konsistent mit der bereits
  vorhandenen Behandlung von `instrumentId`.

**Offen geblieben.** Beim Verifizieren der Hard-Delete-Blockade (Konto mit
zugewiesenem Trade) zeigte `archived-accounts-list.tsx` (aus S3, hier nicht
angefasst) die Fehlermeldung nicht sichtbar in der `InlineMessage`, obwohl die
Blockade serverseitig nachweislich griff (Account blieb in der DB archiviert, nicht
gelöscht). Nicht untersucht, da außerhalb des Scope dieses Slices — falls das eine
echte UI-Lücke ist, wäre es ein Fix für `archived-accounts-list.tsx` selbst.

## 2026-09-12 — S5 Journal-Liste — feature/s5-journal-liste — 82915fc

**Gebaut.** Der Nutzer kann unter `/journal` seine Trades und Missed Setups sehen,
nach Zeitraum und Instrument filtern, nach Datum oder R-Multiple sortieren und
durchblättern. Übungskonto-only-Trades fehlen in der kombinierten Ansicht, erscheinen
aber als Zähler mit Ein-Klick-Reveal. Vorher war `/journal` nur eine Überschrift mit
Link zu `/journal/new`.

**Dateien.** `src/db/queries/trades.ts` (erweitert um `listJournalTrades`),
`src/app/(app)/journal/page.tsx` (umgebaut), `src/components/journal/*` (neu:
`journal-filters.tsx`, `trade-row.tsx`, `pagination-controls.tsx`,
`hidden-practice-banner.tsx`), `src/lib/journal/href.ts`,
`src/db/queries/__tests__/trades.test.ts`. Außerhalb des ursprünglichen Scope-Blocks,
aber Voraussetzung für den DB-Test: `vitest.config.mts` und `vitest.setup.ts`.

**Migration.** Keine — alle genutzten Tabellen/Spalten existierten bereits seit S3/S4.

**Regeln.** Keine neue Domain-Regel; `src/domain/accounts.ts` und `src/domain/pnl.ts`
blieben unverändert. Die SQL-`EXISTS`-Bedingung für „nur Übungskonten" in
`listJournalTrades` spiegelt `contributesToMoneyAggregate` als reine
Sichtbarkeits-Prüfung, keine neue Geldregel. Der SQL-`rMultipleSortKey` (exportiert)
mirrort `calculatePnl`s R-Formel für `ORDER BY`, abgesichert durch
`src/db/queries/__tests__/trades.test.ts` gegen echtes Postgres (Wegwerf-Insert in
einer zurückgerollten Transaktion, kein Trace in der Dev-DB).

**Entschieden unterwegs.**
- „Kontofilter" aus `project-overview.md` ist der bereits bestehende globale
  Kontoschalter (`users.selected_account_id`), kein zweiter journal-lokaler Filter —
  mit Sascha abgestimmt, keine Annahme.
- Filterfelder (Zeitraum, Instrument), Pagination (Seitenzahlen, URL-State, 25/Seite),
  sortierbare Spalten (Datum, R-Multiple) und der Ein-Klick-Reveal-Mechanismus für
  Übungskonto-Trades standen in keiner Kontextdatei — vor `start` mit Sascha geklärt.
- R-Multiple ist keine Spalte, sondern zur Laufzeit aus Preisen abgeleitet
  (`pnl.ts`); für `ORDER BY` musste die Formel in SQL dupliziert werden (exakte
  `NUMERIC`-Arithmetik, kein Float) statt eine Spalte zu persistieren oder R aus der
  sortierbaren Liste zu streichen — mit Sascha als bewusster Trade-off entschieden.
- Missed Setups (`taken=false`, nie ein Konto) fallen in der Einzelkonto-Ansicht
  folgerichtig raus, bleiben aber in der kombinierten Ansicht gleichwertig sichtbar
  (Design.md §4.9) — eine Konsequenz des Datenmodells, keine neue Regel.
- Im Review (`/feature-review`) zwei Punkte gefunden und behoben: Entry-/Exit-Zeit
  wurden abgefragt, aber nirgends in `trade-row.tsx` gerendert — ergänzt. Und der
  ursprüngliche R-Formel-Test verglich nur zwei JS-Beschreibungen derselben Formel
  miteinander, nicht die echte SQL-Formel gegen echtes Postgres — der Test läuft jetzt
  gegen eine echte, zurückgerollte Transaktion mit dem exportierten
  `rMultipleSortKey`. Dabei kam zutage, dass `pnpm test` `.env.local` bisher gar nicht
  lud (anders als die `db:*`-Skripte) — behoben über `vitest.setup.ts`
  (`process.loadEnvFile`, Node-24-Bordmittel) plus eine Zeile in `vitest.config.mts`.
  Das betrifft das ganze Projekt, nicht nur diesen Slice — Vorschlag an Sascha, das
  zusätzlich in die Decisions-Liste in `context/project-overview.md` aufzunehmen.

**Offen geblieben.** Nichts Neues über den bereits dokumentierten S4-Punkt hinaus.
