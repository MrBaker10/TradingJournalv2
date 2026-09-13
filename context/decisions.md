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

## 2026-09-12 — S6 Screenshots und Links — feature/s6-screenshots-und-links — 3a41488

**Gebaut.** Der Nutzer kann bis zu drei Screenshots und beliebig viele Links pro Trade
anhängen — sowohl beim Anlegen unter `/journal/new` als auch nachträglich über einen
Stift-Auslöser in der aufgeklappten Journal-Zeile. Screenshots werden im Browser auf
1600px verkleinert, als JPEG komprimiert und nur über signierte URLs ausgeliefert.
Vorher existierte weder `trade_screenshots` noch `trade_links`, obwohl beide seit
Projektbeginn in `project-overview.md` vorgezeichnet waren.

**Dateien.** `src/domain/trades.ts` (+Test), `src/db/schema/trades.ts`,
`src/db/migrations/0004_flippant_dagger.sql`, `src/lib/uploads/signed-url.ts` (+Test),
`src/lib/uploads/resize-image.ts`, `src/lib/env.ts`, `src/app/api/uploads/route.ts`
(erster Route-Handler im Projekt), `src/db/queries/trades.ts`, `src/actions/trades.ts`,
`src/schemas/trades.ts`, `src/lib/links.ts`, `src/components/trades/screenshot-slots.tsx`,
`src/components/trades/trade-links-input.tsx`,
`src/components/journal/screenshot-lightbox.tsx`, `new-trade-form.tsx` und
`trade-row.tsx` (beide erweitert).

**Migration.** `0004_flippant_dagger.sql` — `trade_screenshots`, `trade_links`, beide
mit `trade_id`-FK (`onDelete: cascade`) und Index.

**Regeln.** „Max. 3 Screenshots pro Trade" lebt in `canAddScreenshot`
(`src/domain/trades.ts`), abgesichert durch `src/domain/__tests__/trades.test.ts`.
Https-Validierung für Links bewusst in `src/schemas/trades.ts` statt in `domain/` —
reine Format-/Sicherheitsprüfung, kein Geschäftsregel-Fall wie die Screenshot-Grenze.

**Entschieden unterwegs.**
- Erfassungszeitpunkt zweimal korrigiert: erst „nur beim Anlegen" vorgeschlagen und mit
  Sascha bestätigt, dann von Sascha zurückgenommen — Screenshots und Links sind jetzt
  auch nachträglich anhäng- und entfernbar, für beide Anhangsarten gleichermaßen.
- Der Stift-Auslöser in der aufgeklappten Zeile ist eine bewusste, mit Sascha
  geklärte Abweichung von Design.md §4.13s wörtlicher Formulierung „kein 'Add
  screenshot' in der Leseansicht" — der Auslöser ist keine leere Einladung, sondern
  eine bewusste Aktion. Vorschlag an Sascha, das als einen Satz in Design.md §4.13
  nachzutragen; nicht selbst entschieden.
- Screenshots werden clientseitig immer nach JPEG neuverschlüsselt, unabhängig vom
  Ausgangsformat — hält `trade_screenshots` exakt bei den vier im Draft stehenden
  Spalten, keine zusätzliche `content_type`-Spalte nötig.
- Hochladen läuft über den Route-Handler (Binärtransport, die einzige von
  `coding-standards.md` erlaubte Ausnahme), Löschen bewusst über eine Server Action
  (kein Binärtransport beteiligt) — bewusste Trennung, kein einheitlicher „Anhänge"-
  Endpunkt für beides.
- Im Review (`/feature-review`) einen echten Bug gefunden und sofort behoben:
  `ScreenshotLightbox` griff beim Server-Render auf `document.body` zu und crashte
  `/journal` mit 500 — behoben über das „erst nach dem Mount portalen"-Muster.
- Im Review danach drei Nacharbeitspunkte gefunden und behoben: stille Fehlschläge im
  Live-Anhänge-Modus (jetzt sichtbares Fehler-Feedback über `InlineMessage`); ein zu
  langes Link-Label beim Anlegen scheiterte beim Submit ohne sichtbaren Fehler (jetzt
  `maxLength` plus `errors.links`-Anzeige); die Screenshot-Obergrenze war dreifach
  unabhängig als Literal `3` dupliziert (jetzt ein Import von
  `MAX_SCREENSHOTS_PER_TRADE`).
- Eine vierte Review-Anmerkung bewusst offen gelassen: `/api/uploads` prüft die
  Dateigröße, aber nicht, ob die Bytes tatsächlich ein Bild sind — ausdrücklich als
  Transparenz-Notiz ohne Blocker-Charakter eingestuft, nicht angefordert.

**Offen geblieben.** Zwei Punkte, beide nicht selbst entschieden:
1. Design.md §4.13 widerspricht wörtlich dem Stift-Auslöser — Vorschlag oben, einen
   Satz zu ergänzen.
2. Keine serverseitige Formatprüfung des Uploads (siehe „Entschieden unterwegs") —
   bei einem einzelnen lokalen Nutzer ohne echte Auth-Grenze in Phase 1 kein akutes
   Risiko, aber eine Lücke gegenüber „nur Bilder, komprimiert", falls das je relevant
   wird.

---

## 2026-09-12 — S7 Progress-Domain — feature/progress-domain — cd29fe1

**Gebaut.** Die drei Produktregeln aus `project-structure.md` („Rules the code must
honour") existieren jetzt als getestete, DB-freie Module: Streak, Consistency-Score und
Badges. Dazu `badge_defs` mit den zwölf Definitionen in der Datenbank und `user_badges`
als vorbereitete, noch leere Tabelle. Sichtbar ändert sich nichts — der Slice hat
bewusst keinen Aufrufer in der UI und legt das Fundament für die `/progress`-Seite und
die Dashboard-Kacheln.

**Dateien.** `src/domain/streak.ts`, `src/domain/consistency.ts`, `src/domain/badges.ts`
(je mit Vitest-Suite im selben Commit, Tests zuerst geschrieben),
`src/db/schema/badges.ts`, `src/db/seed-badges.ts`, Script `db:seed:badges` und die
Pins `date-fns@4.4.0` / `@date-fns/tz@1.5.0` in `package.json`.
`context/coding-standards.md` §Time ist geändert (siehe „Entschieden unterwegs").

**Migration.** `0005_jittery_photon.sql` legt `badge_defs` (`key` unique als Natural
Key) und `user_badges` (FK auf `users` und `badge_defs`, Unique auf dem Paar,
`earned_at` als `timestamptz`) an. Über `db:generate` erzeugt, mit `db:migrate`
angewandt, im selben Commit wie die Schemadatei. `pnpm db:seed:badges` ist idempotent
(`onConflictDoNothing` auf `key`) und zweimal gegen die lokale DB gelaufen: zwölf
Zeilen, 3 Getting started / 4 Volume / 3 Streaks / 2 Craft.

**Regeln.** Streak: 48h-Fenster ab Mitternacht des `trade_date` in `users.timezone`,
Samstag existiert nicht, Sonntag fällt auf Montag, ein Grace Day pro Kalendermonat (der
zweite Fehltag bricht), heute zählt nie gegen den Nutzer, Backfills zählen für Statistik
und Volume-Badges, erzeugen aber nie eine Streak. Score: monatlich 40/20/25/15, Einträge
**erst pro Tag gemittelt** — zwanzig Trades an einem Tag zählen wie einer, festgenagelt
durch einen eigenen Test. Badges: zwölf Keys in vier Kategorien, Kriterien als
Prädikat-Map neben den Definitionen, damit beides nicht auseinanderläuft. Die
Handelstagsdefinition (`IsoDate`, `isTradingDay`, `toTradingDay`) lebt einmal in
`streak.ts` und wird von den beiden anderen Modulen importiert.

**Entschieden unterwegs.**
- **Die zwölf Badges** waren nirgends definiert — die Docs nannten nur die vier
  Kategorien. Vorschlag gemacht und von Sascha freigegeben: `first_entry`,
  `first_review`, `full_week` (Getting started), `logged_10/50/250/1000` (Volume),
  `streak_7/30/100` (Streaks), `by_the_book_20`, `score_90` (Craft).
- **Die drei Score-Teilmetriken** hatten Gewichte, aber keine Definition. Freigegeben:
  Vollständigkeit = Anteil der Einträge mit Notes, Grade, Felt, mindestens einer
  Confluence und mindestens einem Screenshot oder Link; Planbefolgung = Anteil der
  taken-Trades mit `by_the_book`; Reviewgewohnheit = Anteil der Logging-Tage mit
  `eod_review`.
- **Nenner von `showing_up`** sind die Handelstage bis einschließlich heute, nicht alle
  des Monats — sonst ist der Wert im laufenden Monat irreführend niedrig, und am
  Monatsende sind beide identisch.
- **Tage ohne einen einzigen taken-Trade** fallen aus dem Adherence-Mittel heraus,
  statt als 0 zu zählen; das Loggen von Missed Setups darf keine Punkte kosten. Ein
  Monat mit Einträgen, aber ohne taken-Trade bekommt die vollen 25.
- **Ein Monat ganz ohne Eintrag** bekommt 0 in allen vier Teilwerten, auch bei der
  Planbefolgung. Sonst bekäme ein leeres Journal 25 Punkte geschenkt.
- **Ein samstagsdatierter Eintrag** fällt aus der Streak, statt gefaltet zu werden —
  nur für den Sonntag nennt der Spec eine Faltung.
- **`date-fns` und `@date-fns/tz` neu aufgenommen** (vorher freigegeben), weil
  `coding-standards.md` sie für Datumsarbeit vorschreibt. Beim Einbau nachgemessen:
  `new TZDate("2026-09-09T00:00:00", zone)` liest den String in der **System**-Zeitzone
  und liefert unter verschobener `TZ` den falschen Tag. Nur die Parts-Form
  `new TZDate(2026, 8, 9, zone)` trifft Mitternacht in der Zielzone; für reine
  Kalendermathematik ist das `Z`-Suffix Pflicht. Beides steht als Warnung im Kopf von
  `streak.ts`.
- **`context/coding-standards.md` §Time geändert** — projektweit, nicht nur dieser
  Slice. Die Regel sagte, die Zeitzone des Nutzers gelte „für Econ-Events only". Das
  widerspricht der Entscheidung, dass `today`, „dieser Monat" und der Fensterschluss aus
  `users.timezone` kommen. Neue Fassung: die Zeitzone entscheidet jede
  **Kalendergrenze** plus Econ-Events, `entry_time`/`exit_time` bleiben unkonvertierte
  Chart-Uhr. Vorschlag an Sascha, denselben Satz zusätzlich in die Decisions-Liste in
  `project-overview.md` aufzunehmen; nicht selbst entschieden.
- Im Review vier Nacharbeitspunkte gefunden und behoben: das 48h-Fenster rechnete in
  Millisekunden statt mit `addHours` und in UTC statt in der Nutzerzone; die
  Modulköpfe sagten nicht, dass Einträge und nicht Trade-Zeilen gezählt werden (ein
  Join über `trade_accounts` hätte jede Zahl still verdreifacht); die Herkunft von
  `today` war nicht festgelegt; der bewusste Unterschied zwischen Streak und Score bei
  einem Sonntag, dessen Montag noch nicht da ist, war ungetestet.

**Offen geblieben.**
1. `src/lib/time.ts` mit einem `todayInTimeZone()`-Helfer gibt es noch nicht. Jeder
   künftige Aufrufer muss `today` und `month` selbst in `users.timezone` bilden; der
   Helfer gehört in den Slice, der die Module zum ersten Mal aufruft.
2. `user_badges` ist angelegt, aber leer — das Vergeben von Badges ist ein eigener
   Slice, ebenso `monthly_scores` und der Month-Close-Job.
3. Vorschlag oben zu `project-overview.md`, noch nicht entschieden.

---

## 2026-09-12 — S8 Dashboard — feature/s8-dashboard — 37bf756

**Gebaut.** `/dashboard` ist von einer nackten Überschrift zur vollen Seite geworden:
Metrik-Tafel mit fünfzehn Kennzahlen in **einer** Karte nach `Design.md` §4.7,
P&L-Kalender-Heatmap des laufenden Monats (§4.8), die fünf jüngsten Einträge über die
unveränderte `TradeRow` aus S5 (§4.9), drei Prozess-Kacheln für Streak, Consistency und
Badges (§4.3) und die Plan-Karte mit optionalem End-of-Day-Review (§4.6). Damit gibt es
zum ersten Mal aggregierte Zahlen im UI und einen Ort für den Tagesplan. S8 ist
außerdem der erste Aufrufer der drei Domainmodule aus S7.

**Dateien.** `src/db/queries/dashboard.ts` (sechs Aggregatqueries),
`src/db/queries/daily-notes.ts`, `src/db/schema/daily-notes.ts`,
`src/schemas/daily-notes.ts`, `src/actions/daily-notes.ts`, `src/lib/time.ts` (mit
Tests), fünf Komponenten unter `src/components/dashboard/`,
`src/app/(app)/dashboard/page.tsx`. In `src/db/queries/trades.ts` kamen
`tradePnlCents`, `listRecentTrades` und der gemeinsame Kern `queryTradeRows` dazu;
`hasRealAccount` ist jetzt exportiert. `globals.css` trägt neun neue `@theme`-Token für
Tafel und Kalender.

**Migration.** `0006_panoramic_morgan_stark.sql` legt `daily_notes` an (`user_id`,
`note_date DATE`, `premarket_plan`, `eod_review`, Audit-Spalten, Unique auf
(`user_id`, `note_date`)). Über `db:generate` erzeugt, mit `db:migrate` angewandt, im
selben Commit wie die Schemadatei.

**Regeln.** `src/domain/**` ist **nicht verändert** — die Arbeit steckt darin, die
S7-Module richtig zu füttern. `getStreakEntryDays` gruppiert `group by trade_date` mit
`min(created_at)` und joint **nicht** über `trade_accounts`; ein Copy-Trade auf drei
Konten hätte sonst drei Logging-Tage erzeugt. `getMonthScoreDays` liefert eine Zeile
pro Eintrag mit `EXISTS`-Flags, die Tagesmittelung bleibt in `consistency.ts`. Badges
bekommen `longestStreak` aus `calculateStreak` (Backfills lösen sie nicht aus) und
`entriesLogged` aus der Gesamthistorie (Backfills zählen). Lokal bestätigt: drei am
12.09. nachgetragene Trades vom 1./3./5. erzeugten keine Streak, nur der rechtzeitig
geloggte vom 10. — das 48h-Fenster greift. Neu getestet sind `src/lib/time.ts`
(9 Tests: Zeitzonengrenzen, Monatsränder) und `tradePnlCents` (7 Paritätstests gegen
`calculatePnl` in echtem Postgres, zwei davon auf Sub-Cent-Beträgen).

**Entschieden unterwegs.**
- **Vier Widersprüche zwischen `project-overview.md` E und `Design.md`**, alle Sascha
  vorgelegt und von ihm entschieden: (1) **fünfzehn** statt dreizehn Zellen, weil §4.7
  Missed setups und By the book zusätzlich führt und dreizehn Einzelkarten ausdrücklich
  verbietet; (2) die **Today-Zelle** behält den Inset-Verlauf, ihr Wert bekommt nur die
  semantische Farbe — §4.7 wollte `text-glow`, §1 verbietet Glow auf Geld; (3) die
  **Badge-Kachel** zählt live aus `earnedBadges()`, ohne in `user_badges` zu schreiben;
  (4) **Avg winner/loser und Expectancy** teilen durch die Summe der Kontobeiträge,
  nicht durch die Trade-Zahl, sonst hebt ein Copy-Trade den Mittelwert.
- **Max drawdown** rechnet über den laufenden Monat und misst vom höheren aus laufendem
  Peak und Null. Ein Monat, der nur fällt, hat damit einen Drawdown in Höhe seines
  Verlusts statt gar keinen.
- **Gewinner und Verlierer hängen am abgeleiteten P&L**, nicht am optionalen Feld
  `trades.result`. `result` darf leer bleiben, und eine Win rate, die Net P&L
  widerspricht, ist schlimmer als keine.
- **Ein Tag mit ausschließlich Missed Setups bekommt eine Kalenderkachel**, neutral, mit
  Betrag 0; die Zahl darunter zählt Einträge, nicht gehandelte Trades.
- **Missed Setups folgen dem Kontoschalter nicht** — `src/domain/trades.ts` verbietet
  ihnen jede Kontozuordnung, es gibt also nichts, wonach sich filtern ließe.
- **Streak, Score und Badges folgen dem Kontoschalter ebenfalls nicht**: sie sehen laut
  `project-structure.md` nur echte Konten, unabhängig von der Auswahl. Ein gewähltes
  Übungskonto ändert seine Geldzahlen, nicht seine Prozesszahlen.
- **`export const dynamic = "force-dynamic"` auf der Dashboard-Seite.** Ohne dynamische
  API prerendert Next 16 die Seite beim Build und friert jede Zahl ins Bundle. Gilt
  sinngemäß für jede Seite dieser App, die pro Nutzer rechnet.
- **`tradePnlCents` rundet mit `floor(x + 0.5)`**, weil das bitgenau `Math.round` aus
  `dollarsToCents` ist. Nach dem Muster von `rMultipleSortKey` aus S5: die Formel
  existiert einmal in SQL, und ein Paritätstest gegen `pnl.ts` hält sie fest.
- **`formatCents` in `src/lib/money.ts`** statt einer zweiten Geldformatierung im
  Dashboard. `trade-row.tsx` (aus S6, außerhalb des Scope) wurde mit umgestellt, weil
  beide auf dem Dashboard nebeneinander stehen und sonst `$-120.00` neben `-$120.00`
  erschienen wäre.
- **`InlineMessage` bekam einen `tone`-Prop** (`error` als Default, plus `hint` und
  `success`), damit §4.6 seine dreistufige Live-Rückmeldung bekommt, ohne eine zweite
  Meldungszeilen-Komponente daneben zu stellen. Ebenfalls außerhalb des Scope.
- **Der Aufklapper des Reviews animiert `height: auto` statt `max-height: 230px`.**
  §4.6 nennt 230px; eine feste Höhe würde das Textfeld auf schmalen Fenstern
  abschneiden. Dauer und Kurve bleiben wie dort beschrieben.
- **`daily_notes` bekam `created_at`/`updated_at`**, die der Datenmodell-Entwurf nicht
  nennt — wie bei `trades`, damit die Tabelle nicht als einzige ohne Audit-Spalten
  dasteht.
- Im Review gefunden und behoben: die Eintragszahl in der Kalenderkachel lief in
  Instrument Sans statt IBM Plex Mono. `Design.md` §3 verlangt Mono mit Tabellenziffern
  für **alle** Zahlen, Zählwerte eingeschlossen.

**Offen geblieben.**
1. `bestMonthlyScore` für das Badge `score_90` kommt aus dem live berechneten Score des
   laufenden Monats, weil `monthly_scores` noch nicht existiert. Ein abgeschlossener
   Monat mit 90+ bleibt unberücksichtigt, bis der Month-Close-Slice die Tabelle füllt.
2. Der `@media (prefers-reduced-motion: reduce)`-Block aus `Design.md` §5 fehlt in
   `globals.css` — vermutlich seit P0.3. `MotionConfig reducedMotion="user"` ist da und
   deckt `motion` ab, aber CSS-Transitions und `animate-spin` laufen weiter. Nicht
   angefasst, weil projektweit und außerhalb dieses Slices.
3. Der Kontoschalter in der Sidebar zeigt nach dem Umschalten weiter den alten
   Kontonamen, obwohl Zahlen und Amber-Streifen sofort wechseln; erst ein Reload
   korrigiert das Label. Client-State in `account-switcher.tsx` aus S3.
4. `/settings` wird beim Build als statisch geführt und liest dabei die Datenbank —
   dieselbe Ursache, die auf dem Dashboard mit `force-dynamic` gelöst wurde.
5. `src/components/settings/archived-accounts-list.tsx:81` trägt ein `rgba()`-Literal in
   der Komponente, gegen `coding-standards.md` §Styling. Aus S3, nicht angefasst.
6. `dailyNotes` steht nicht im `schema`-Objekt in `src/db/index.ts`, genau wie `badges`
   aus S7. Folgenlos, solange der Relational Query Builder nicht benutzt wird.
7. **Vorschlag an Sascha, nicht selbst entschieden:** Punkt 7 der Liste oben
   (`force-dynamic` für jede per-Nutzer rechnende Seite) betrifft das ganze Projekt und
   gehört als Zeile in die Decisions-Liste in `project-overview.md`, zusammen mit dem
   Hinweis auf `/settings`.

---

## 2026-09-13 — S9 Progress-Seite — feature/s9-progress-seite — d8a2af2

**Gebaut.** `/progress` erklärt die drei Produktregeln, statt nur ihre Zahlen zu zeigen:
Streak mit den sechs Regeln im Klartext, Consistency Score des laufenden Monats mit der
40/20/25/15-Aufschlüsselung als vier Balken, alle zwölf Badges in vier Kategorien mit
erreicht und offen, und die Grace-Day-Leiste nach `Design.md` §4.4. Vor allem aber wird
die **Badge-Vergabe echt**: `user_badges` wird zum ersten Mal beschrieben, und ein seit
dem letzten Besuch freigeschaltetes Badge bekommt die Karte aus §6. Damit ist der Punkt
abgearbeitet, den S7 und S8 beide vertagt hatten.

**Dateien.** `src/domain/badges.ts` (+ Tests), `src/db/queries/badges.ts`,
`src/lib/badges/sync.ts`, `src/actions/badges.ts`, vier Komponenten unter
`src/components/progress/`, `src/app/(app)/progress/page.tsx`, drei Token in
`globals.css`. Je ein Aufruf in `src/actions/trades.ts` und `src/actions/daily-notes.ts`.
`src/app/(app)/dashboard/page.tsx` liest die Badge-Zahl jetzt aus `user_badges`.

**Migration.** `0007_charming_jackpot.sql` fügt `users.badges_seen_at` (`timestamptz`,
nullable) hinzu. Über `db:generate` erzeugt, mit `db:migrate` angewandt, im selben
Commit wie die Schemadatei.

**Regeln.** Neu in `src/domain/badges.ts`: `badgesToAward(progress, alreadyEarnedKeys)`
als reine Funktion und `DEFERRED_BADGE_KEYS`. Sechs Tests halten fest, dass ein bereits
vergebener Key nicht zweimal kommt, dass ein Fortschritt ohne neue Badges leer
zurückkommt und dass `score_90` auch bei Score 100 nicht vergeben wird. Die S7-Module
bleiben unverändert; sie werden hier zum ersten Mal **schreibend** benutzt, und die
Trennung aus ihren Modulköpfen wird dabei scharf: `longestStreak` kommt aus
`calculateStreak` (Backfills lösen keine Streak-Badges aus), `entriesLogged` aus den
Zählern (Backfills zählen fürs Volumen).

**Entschieden unterwegs.**
- **Die Vergabe läuft in den Schreibpfaden**, nicht beim Rendern: `createTrade` und
  `saveDailyNote` rufen `awardBadgesQuietly`. Ein GET darf keinen Seiteneffekt haben —
  sonst vergibt ein Seitenaufruf, dessen Antwort nie ankommt, trotzdem ein Badge.
- **`score_90` wird noch nicht vergeben.** Sein Kriterium lautet „Finish a month", und
  ohne `monthly_scores` gibt es nur den laufenden, noch fallenden Monatswert. Ein daraus
  geschriebenes Badge wäre permanent und falsch. Es steht sichtbar offen, mit dem
  Hinweis, dass es am Monatsende ausgewertet wird.
- **„Neu freigeschaltet" heißt „seit dem letzten Blick"**, über die neue Spalte
  `users.badges_seen_at`. Die Alternative — ein 24-Stunden-Fenster — hätte die Karte
  mehrfach gezeigt und sie verpasst, wenn jemand zwei Tage nicht hereinschaut.
- **Die Karte meldet sich selbst als gesehen**, per `useEffect` nach dem Rendern, nicht
  während die Seite gebaut wird. Sonst gilt ein Badge auch dann als gesehen, wenn die
  Antwort den Nutzer nie erreicht hat.
- **Micro-Rewards nur, soweit sie auf dieser Seite stattfinden.** Die fünf Toast-Auslöser
  aus §6 brauchen ein Toast-System; Sonner steht zwar in `coding-standards.md`
  §Error handling, ist aber keine Dependency. Eigener Slice.
- **`awardBadgesQuietly` loggt einen Fehler und gibt kein `success: false` zurück.**
  Bewusste Abweichung von `coding-standards.md` §Error handling: der Trade ist an dieser
  Stelle schon geschrieben, „Konnte nicht speichern" wäre gelogen, und der nächste Write
  vergibt nach.
- **`insertEarnedBadges` gibt die tatsächlich geschriebenen Keys zurück** (`returning`
  nach `onConflictDoNothing`), damit der Aufrufer ohne zweites Lesen weiß, was neu ist.
- **Ein Key ohne Zeile in `badge_defs` wird still übersprungen.** Ein vergessener
  `db:seed:badges` darf keinen Trade-Write scheitern lassen.
- **`grace-day-notice.tsx` ist in `streak-card.tsx` aufgegangen.** Der Chevron der Leiste
  öffnet laut §4.4 die Streak-Regeln, und die liegen in derselben Karte; getrennt hätte
  der Aufklappzustand in einen gemeinsamen Elternteil gehoben werden müssen.
- **Der Score-Balken benutzt einundzwanzig statische Breitenklassen** in
  Fünf-Prozent-Schritten statt eines Inline-Styles, weil `coding-standards.md` §Styling
  Inline-Styles verbietet und Tailwind nur Klassen ausgibt, die es im Quelltext sieht.
  Der exakte Wert steht als Zahl daneben.
- **Die Dashboard-Kachel liest jetzt `user_badges`** statt live zu rechnen (im Review
  gefunden, von Sascha freigegeben). Ohne das hätten beide Seiten ab einem Monatsscore
  von 90 unterschiedliche Zahlen gezeigt, weil das Dashboard `score_90` mitgezählt hätte.
  `getBadgeCounters` fällt dort ersatzlos weg.
- **`Design.md` beschreibt die Progress-Seite nicht auf Komponentenebene** — §4.3 und
  §4.4 sind alles, und §10 führt nur Analytics und Prop Firm Rules als offen. Die
  Score-Aufschlüsselung (vier Balken) und das Badge-Raster sind aus den vorhandenen
  Primitiven gebaut, der Balken-Entwurf war vorher freigegeben. Vorschlag: die
  Progress-Seite in §10 nachtragen oder die beiden Komponenten dort beschreiben.

**Offen geblieben.**
1. Zwei Acceptance-Punkte sind nicht im Browser belegt. Die **Grace-Day-Leiste** ließ
   sich nicht auslösen: `graceDayUsed` ist für den Testnutzer `false`, weil der beim
   S8-Test angelegte Trade vom 11.09. die Lücke geschlossen hat. Und der **sichtbare
   Freischalt-Moment über den Trade-Pfad** fehlt: dass `createTrade` den Sync auslöst,
   ist belegt, nur war bei neun Einträgen nichts Neues fällig (`logged_10` braucht zehn).
   Über `saveDailyNote` ist der Moment vollständig belegt.
2. `getStreakEntryDays`, `getMonthScoreDays` und `getBadgeCounters` liegen weiter in
   `src/db/queries/dashboard.ts`, dienen aber inzwischen zwei Seiten und der Vergabe. Ein
   späterer Slice könnte sie nach `src/db/queries/progress.ts` ziehen.
3. `syncUserBadges` rechnet Streak und Score bei jedem Trade- und Notiz-Write neu (drei
   Queries plus zwei reine Funktionen). Unkritisch bei diesen Datenmengen, aber der erste
   Kandidat, falls das Speichern je spürbar langsamer wird.
4. `bestMonthlyScore` wird an `badgesToAward` übergeben und dort durch
   `DEFERRED_BADGE_KEYS` wieder herausgefiltert. Wer `score_90` später freigibt, muss die
   Quelle mitändern; die Bedingung dafür steht im Kommentar über der Konstante.
5. Vorschlag aus „Entschieden unterwegs" zu `Design.md` §10, noch nicht entschieden.

---

## 2026-09-13 — Fix Dynamic Rendering und Reduced Motion — fix/dynamic-rendering-and-reduced-motion — 592e052

**Gebaut.** Zwei Zusagen eingelöst, die das Projekt schriftlich gab und brach. Erstens
wird keine Seite hinter der Session mehr beim Build vorgerendert: `/settings` und
`/journal/new` lasen die Datenbank zur Bauzeit. Zweitens schaltet
`prefers-reduced-motion: reduce` jetzt tatsächlich alles ab — der CSS-Block aus
`Design.md` §5 fehlte seit P0.3 vollständig, sodass jede CSS-Transition und jeder
Spinner weiterlief, während `MotionConfig` seinen Teil längst erfüllte.

**Dateien.** `src/app/(app)/layout.tsx` (eine Zeile), `src/app/(app)/dashboard/page.tsx`
und `src/app/(app)/progress/page.tsx` (ihre Zeilen entfallen), `src/app/globals.css`
(der §5-Block), `src/components/ui/pending-indicator.tsx` (neu) plus die drei
Aufrufstellen in `new-trade-form.tsx`, `plan-card.tsx` und `account-create-form.tsx`.
`context/project-overview.md` und `context/Design.md` §5 sind nachgezogen.

**Regeln.** `src/domain/**` nicht berührt. Der Fix fasst keine Produktregel an.

**Entschieden unterwegs.**
- **`force-dynamic` gehört ins `(app)`-Layout, nicht auf jede Seite.**
  Route-Segment-Konfiguration in einem Layout gilt für jedes Segment darunter, also für
  alle sieben Seiten auf einmal — auch für die noch leeren und die noch nicht gebauten.
  Damit trägt das Segment die Regel statt der Disziplin: eine neue Seite unter `(app)`
  kann sie nicht mehr vergessen. Im Build gegengeprüft: aus vier `ƒ` wurden neun.
  `src/app/page.tsx` bleibt statisch, sie liegt außerhalb und liest nichts.
- **`animation-iteration-count: 1 !important` kam im Review dazu** — eine Zeile mehr,
  als §5 ausschreibt, und die, die den Rest erst wahr macht. `animate-spin` läuft mit
  `infinite`; eine Dauer von 0.01ms stoppt es nicht, sie dreht es hunderttausendmal pro
  Sekunde. Betroffen waren die beiden Icon-Tausch-Stellen, für die der Spec „ohne
  Rotation erkennbar" behauptet hatte. **`Design.md` §5 ist mitkorrigiert**, samt einem
  Absatz, warum die Zeile nicht optional ist, und mit Datum — wer an einem älteren
  Screen arbeitet, weiß damit, dass der Block dort gefehlt haben kann.
- **Der CSS-Block steht außerhalb jedes `@layer`.** Ungelayertes CSS mit `!important`
  schlägt jedes gelayerte Utility, und genau das ist hier die Aufgabe.
- **`PendingIndicator` rendert beide Zustände und lässt CSS wählen**
  (`motion-reduce:hidden` am Icon, `hidden motion-reduce:inline` am Text). Ein
  `matchMedia`-Hook wäre eine Hydration-Abweichung auf genau den Rechnern, für die das
  Ganze gebaut ist: der Server kann nicht wissen, was der Browser bevorzugt.
- **Nur drei der fünf `animate-spin`-Stellen bekommen den Textersatz.** Die beiden
  anderen (`screenshot-slots.tsx`, `trade-links-input.tsx`) tauschen ein `Plus`-Icon
  gegen `Loader2` — der Zustandswechsel steckt im Icon, nicht in der Bewegung, und in
  eine 56px-Kachel passt „Saving…" ohnehin nicht. Beide Dateien blieben unverändert.
- **Drei `biome-ignore`-Kommentare statt einer stehengelassenen Warnung.** Biome meldet
  `lint/complexity/noImportantStyles`; der Gate blieb grün, aber die Ausgabe von
  `pnpm lint` war nicht mehr sauber. Unterdrückt mit Regelnamen und Begründung.
- **Der Umschalt-Beweis kam aus dem CSSOM, nicht aus einer OS-Emulation.** Die
  Chrome-Werkzeuge dieser Session können `prefers-reduced-motion` nicht emulieren.
  Nachgemessen: beide Utilities kompiliert und im Media-Block, Quellreihenfolge 389/390
  hinter `.hidden` (101) und `.animate-spin` (178) — bei gleicher Spezifität entscheidet
  die Reihenfolge, der Media-Block gewinnt also, sobald er greift. Die visuelle
  Bestätigung hat Sascha im Klickpfad übernommen.

**Offen geblieben.**
1. Der barrierefreie Name der drei Buttons setzt sich weiter aus Label und beiden
   Overlays zusammen, weil die Overlays über `opacity` ein- und ausgeblendet werden und
   im Accessibility-Baum bleiben; unter reduzierter Bewegung kommt „Saving…" hinzu.
   Sauber wäre `aria-busy` am Button. Geerbt aus S3/S4/S8, eigener Fix.
2. Drei Altfunde aus den S8- und S9-Reviews sind weiter offen: das stale Label im
   Kontoschalter (S3), das `rgba()`-Literal in `archived-accounts-list.tsx:81` (S3) und
   `dailyNotes` / `badges` fehlen im `schema`-Objekt in `src/db/index.ts`.
