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

## 2026-09-13 — S10a CSV-Export — feature/csv-export — 33a1432

**Gebaut.** Ein Download in Settings, der das vollständige Journal als CSV liefert: eine
Zeile pro Trade, 33 Spalten, alle Trades — unabhängig vom Kontoschalter, von den
Journal-Filtern und vom Übungskonto-Ausschluss. Feature D in `project-overview.md` deckt
Export *und* Import ab; der Import ist als S10b abgetrennt, weil beides zusammen ein
Commit aus Migration, zwei Domain-Modulen, Wizard und Undo geworden wäre.

**Dateien.** `src/lib/csv/serialize.ts` (RFC-4180-Writer, CRLF, BOM, Quoting),
`src/lib/csv/trade-export.ts` (die Spaltenliste und die Zeilenabbildung),
`src/lib/csv/__tests__/` (27 Tests), `src/db/queries/export.ts`
(`listTradesForExport`, eine Query mit fünf korrelierten Subqueries),
`src/app/api/export/trades/route.ts` (GET, parameterlos),
`src/components/settings/export-card.tsx`. Geändert: `src/lib/money.ts`
(`formatCentsPlain`), sein Test, die Settings-Seite, `project-structure.md` (zwei
Zeilen im Baum), `coding-standards.md` (eine Zeile, siehe unten).

**Regeln.** `src/domain/**` ist nicht berührt. `calculatePnl` aus `src/domain/pnl.ts`
wird benutzt, nicht kopiert: `pnl` und `r_multiple` entstehen im Export über denselben
Weg wie in der Journal-Zeile, damit keine zweite P&L-Formel existiert, die auseinander
driften kann.

**Entschieden unterwegs.**
- **Der Export filtert `accounts.is_practice = false` ausdrücklich nicht.** Jede
  kombinierte Query tut das zuerst (`coding-standards.md`, Money) — der Export ist aber
  keine kombinierte Kennzahl, sondern ein Backup: „an export that depends on a UI filter
  is not a backup". Die Trennung echt/Übung überlebt, weil sie pro Konto geschrieben
  wird, nicht weil Übungszeilen wegfallen. Der Kommentar an `listTradesForExport` sagt
  das, damit das Review es nicht als Verstoß liest.
- **`accounts` und `is_practice` sind zwei positionsgleiche Semikolonlisten**,
  `"Eval 1;Practice A"` / `"false;true"`. Ein einzelnes Boolean pro Trade hätte bei einem
  gemischt zugewiesenen Trade die Zuordnung verloren. `links` und `link_labels` folgen
  demselben Muster. Beide Paare entstehen aus demselben Array, und die Tests nageln die
  Ausrichtung fest.
- **`screenshot_count` steht in der Datei.** Screenshots passen nicht in eine CSV; die
  Lücke ist damit sichtbar statt still — dieselbe Begründung wie beim Übungs-Zähler in
  der Journal-Liste.
- **`formatCentsPlain` neben `formatCents`, keine zweite Geldformatierung woanders.**
  `formatCents` liefert `$1,234.56`: ein Komma mitten im Feld und ein Währungssymbol vor
  einer Zahl, die nichts zurückparst. Die neue Funktion rechnet ganzzahlig auf den Cents.
- **Route-Handler statt Server Action, und die Whitelist in `coding-standards.md` hat
  dafür einen vierten Punkt bekommen** („file downloads that need response headers,
  `/api/export/*`"). Eine Server-Komponente kann `Content-Disposition` nicht setzen. Die
  Alternative — eine Server Action, die die ganze Datei als String zurückgibt, plus
  `Blob`-Download im Client — macht aus einem Lesevorgang einen Schreibvorgang und
  schiebt das gesamte Journal durch die Action-Payload. Von Sascha freigegeben.
- **Die Route nimmt keinen einzigen Parameter entgegen.** Kein Zeitraum, kein Konto,
  keine Nutzer-ID. Das ist zugleich die Ownership-Prüfung (es gibt nichts zu prüfen) und
  die Garantie, dass kein gefilterter Export entstehen kann.
- **`src/lib/csv/trade-export.ts` ist zusätzlich zum Spec entstanden.** Im Scope stand
  nur der Writer; die Zeilenabbildung im Route-Handler wäre eine 120-Zeilen-Funktion ohne
  Testzugriff geworden.
- **`Cache-Control: no-store` am Response**, nicht specced: ein Journal-Dump gehört in
  keinen Cache.

**Für S10b vorentschieden.** Beim Laden von S10a mitentschieden, damit der Reset von
`current-feature.md` sie nicht verliert:
- **CSV-Parser und -Writer werden selbst geschrieben, keine neue Abhängigkeit.** Der
  Writer ist mit S10a da; der Parser kommt als `src/lib/csv/parse.ts` dazu — RFC 4180,
  Delimiter-Erkennung (Komma, Semikolon, Tab), BOM, eingebettete Zeilenumbrüche.
- **Session aus `entry_time` auf der NY-Chart-Uhr**, mit festen Fenstern: Asia
  18:00–03:00, London 03:00–09:30, NY-AM 09:30–12:00, NY-PM 12:00–16:00, außerhalb bleibt
  die Session leer. Eine vom Nutzer gewählte Session wird nie überschrieben. Die Grenzen
  standen in keinem Dokument und sind hier zum ersten Mal festgelegt.
- **`src/domain/import/detect.ts` und `normalize.ts`, Tests zuerst**, plus Migration
  `import_batches` und nullable `trades.import_batch_id`. Datei oder Paste, bis 2000
  Zeilen, Vorschau vor dem Speichern, Kontozuweisung vor der Bestätigung, Undo je Batch.
- **Nicht bauen in S10b:** Broker-API, automatischer Abgleich, Duplikatabgleich über D
  hinaus, Import von Screenshots oder Links.
- Vier Punkte werden beim Laden von S10b geklärt und sind bewusst **nicht** entschieden:
  was „unangetastet" technisch heißt, wie ein unbekanntes Instrument-Symbol behandelt
  wird, was mit teilweise gültigen Zeilen passiert, und ob der Import die Badge-Vergabe
  einmal pro Batch auslöst.

**Projektweit, zur Übernahme vorgeschlagen — nicht selbst entschieden.** Der
Whitelist-Eintrag für Datei-Downloads gilt für jede künftige Export-Route, nicht nur für
diese. Er steht in `coding-standards.md`; ob er zusätzlich in die Decisions-Liste in
`project-overview.md` gehört, entscheidest du.

**Offen geblieben.**
1. Ein Kontoname mit Semikolon zerlegt die parallele Liste. Heute verhindert das nichts.
   Entweder lehnt der Export so einen Namen ab, oder S10b trennt anders. Zu entscheiden
   beim Laden von S10b.
2. Der Export puffert das gesamte Journal als einen String, ohne Streaming. Bei diesem
   Datenstand irrelevant, aber der Punkt, an dem später ein `ReadableStream` fällig wird.
   Ein `LIMIT` ist ausdrücklich keine Lösung — das wäre wieder ein gefilterter Export.
3. `Design.md` §4.2 beschreibt den Ghost-Button als `inset 0 0 0 1px rgba(255,255,255,.12)`,
   der Code benutzt seit S3 durchgehend `border border-white/12`. Die Export-Karte folgt
   dem Code. Der Widerspruch ist älter als dieser Slice und gehört in einen eigenen
   `fix/`-Branch. Ebenso die Hover-Dauer: §4.2 verlangt 150 ms rein und 200 ms raus, die
   Karte nutzt 200 ms in beide Richtungen.
4. Die Time-Zeile der Review-Checkliste in `.claude/skills/feature-review/SKILL.md` steht
   auf dem Stand vor S7 („Zeitzone gilt ausschließlich für Econ-Events"), während
   `coding-standards.md` §Time seit S7 „entscheidet jede Kalendergrenze" sagt. Der
   Dateiname des Exports nutzt `todayInTimeZone` und ist nach der aktuellen Regel richtig.
5. Die drei Altfunde aus S8/S9 sind weiter offen: stale Label im Kontoschalter (S3), das
   `rgba()`-Literal in `archived-accounts-list.tsx:81` (S3), `dailyNotes`/`badges` fehlen
   im `schema`-Objekt in `src/db/index.ts`.

## 2026-09-14 — S11 Prop Firm Rules — feature/prop-firm-rules — 5dbf5c8

**Gebaut.** `/prop-firms` zeigt die 2026er Regelsätze von 15 Prop Firms: durchsuchbar,
über elf Chips filterbar, pro Firma aufklappbar auf alle 18 Regelfelder und bis zu dritt
nebeneinander vergleichbar. Vorher war die Seite eine Überschrift. Die Daten kommen
ausschließlich aus `context/PropFirmsData.md`, geladen über `pnpm db:seed:propfirms`,
beliebig oft wiederholbar.

**Dateien.** `src/lib/prop-firms/parse.ts` (reiner Parser, 19 Tests),
`src/lib/prop-firms/href.ts` (URL-Zustand), `src/db/schema/prop-firms.ts`,
`src/db/seed-propfirms.ts`, `src/db/queries/prop-firms.ts`,
`src/components/prop-firms/` (Filter, Karte, Vergleich),
`src/app/(app)/prop-firms/page.tsx`.

**Migration.** `0008_graceful_kronos.sql` legt `prop_firms` und `prop_firm_programs` an,
FK mit `on delete cascade`, Unique-Index auf `(firm_id, name)` als Konfliktziel des
Seeders.

**Regeln.** `src/domain/**` ist nicht berührt. Der Parser liegt unter
`src/lib/prop-firms/`, nicht unter `src/domain/`: er setzt keine Produktregel um, er
liest ein Dateiformat — dieselbe Schichtung wie `src/lib/csv/` aus S10a. Die
Produktzusage aus `project-overview.md` H) („die App erfindet keine Regel") ist an drei
Stellen erzwungen: alle 18 Felder sind `text` und nullable, der Parser wirft bei jeder
unplatzierbaren Zeile statt ein Feld fallen zu lassen, und ein `null`-Feld rendert
„Not recorded" statt zu verschwinden.

**Entschieden unterwegs.**

1. **Die 18 Regelfelder sind `text`, auch `account_size` und `min_trading_days`.** Die
   Quelle schreibt `$2,000 (EOD)`, `None`, `No stated cap`, `0`. Eine Zahl daraus zu
   ziehen hieße, die Regel zu deuten. `numeric(14,2)` wäre hier die falsche Anwendung der
   Geld-Regel aus `coding-standards.md`: deren Zweck ist Rechengenauigkeit, und hier wird
   nichts gerechnet. Prop-Firm-Limits bleiben ohnehin in USD und werden nie umgerechnet.
2. **Die Filter-Chips kommen aus dem Badge-Block der Datei**, gespeichert als
   `summary_tags text[]`, nicht aus den 18 Feldern abgeleitet. Über die 15 Firmen ergibt
   das elf Chips. Jede Ableitung aus dem Freitext wäre Interpretation gewesen. Mehrere
   Chips wirken als UND (`@>`), zwei Chips derselben Facette liefern also bewusst eine
   leere Liste — die ehrliche Antwort, wenn die App nicht weiß, welche Facette ein Tag
   beschreibt.
3. **`last_verified_at` ist `date`, nicht `timestamptz`.** Die Endung `_at` liest sich wie
   eine Audit-Spalte, ist aber keine: ein von Hand gepflegtes Kalenderdatum ohne Uhrzeit.
   `timestamptz` würde eine Uhrzeit und eine Zone erfinden.
4. **Die Absatzregel im Parser.** Blank Lines sind in dieser Datei Struktur: jeder
   Firmenblock hat die Signatur `[1, 3–5, 1, 36]` — Programmname, Summary-Tags, `target`,
   Regeltabelle. Über alle 15 Blöcke nachgemessen; das erste bekannte Label steht überall
   am Absatzanfang. Genau das ist jetzt Vertrag: teilt sich das erste Label seinen Absatz
   mit der Zeile davor, hat diese Zeile ihr Label verloren und der Parser wirft. Ohne die
   Regel wurde ein Wert vor dem ersten Label stillschweigend zum Summary-Tag und das Feld
   blieb `null`. Preis: entfernt jemand eine Leerzeile, scheitert der Seeder laut. Das ist
   der Zweck, nicht der Nebeneffekt. Kam aus `/feature-review`.
5. **`listPropFirmProgramsByIds` — dritte Query, stand nicht im Spec.** Der Vergleich
   liest die gewählten Programme per Id statt aus der gefilterten Liste. Sonst verliert er
   eine Spalte, sobald ein Filter das gewählte Programm ausblendet: E8 Markets ist
   `Static` und fällt durch den `EOD`-Filter, soll aber in der Vergleichstabelle stehen
   bleiben.
6. **Der Parser lehnt eine Nicht-https-Website ab.** Stand nicht im Spec, aber
   `coding-standards.md` verbietet `http:`, `javascript:` und `data:` überall, wo die App
   einen Anchor rendert. Eine handgepflegte Datei bekommt dafür keine Ausnahme.
7. **Ein erklärender Satz im Seitenkopf** („Recorded by hand in
   context/PropFirmsData.md…"). Das Kernversprechen aus H) ist sonst unsichtbar.
8. **Sortierung alphabetisch nach Firmenname.** Der Spec sagt dazu nichts, und die
   Dateireihenfolge ist keine.
9. **Die Feldlabels bleiben wörtlich wie in der Datei.** „Consistency when funded" hat 23
   Zeichen und liegt damit knapp über der ~22-Zeichen-Grenze für Kapitälchen aus
   `Design.md` §3. Kürzen hieße, ein Regelfeld umzubenennen.
10. **Der Clear-Button setzt `Design.md` §4.2 erstmals wörtlich um** — 150 ms rein,
    200 ms raus, 100 ms active, dazu `active:translate-y-0`, weil §4.2 den Button beim
    Drücken skaliert und nicht versetzt. Damit ist Punkt 3 unter „Offen geblieben" im
    S10a-Block teilweise beantwortet: die Export-Karte bleibt bei pauschal 200 ms und ist
    jetzt sichtbar der Ausreißer. Das Angleichen gehört in einen eigenen `fix/`-Branch.
    Beim Rand folgt der Button weiter dem Code-Muster (`border border-white/12`) statt dem
    Inset-Shadow aus §4.2 — derselbe Widerspruch, ebenfalls älter als dieser Slice.
11. **Mono pro Feld, nicht pro Wert.** Sieben Spalten der Vergleichstabelle bekommen
    `font-mono tabular-nums` (`Design.md` §3, weil Zahlen in Spalten untereinander stehen
    müssen). Die Folge: `None` und `No stated cap` stehen ebenfalls in Mono, weil sie in
    derselben Spalte sitzen wie `$1,000`. Die Alternative wäre eine Werterkennung gewesen
    — genau die Interpretation, die dieser Slice nirgends macht.
12. **Prop Firm Rules wurde ohne Designrunde gebaut**, aus den vorhandenen Primitiven,
    wie S9. `Design.md` §10 sagt weiterhin, dass Filter-Chips und Regel-Detailtabelle eine
    eigene Runde brauchen; `Design.md` ist in diesem Branch unangetastet geblieben.

**Offen geblieben.**
1. `website` und `last_verified_at` sind für keine Firma gepflegt. Der Parser liest beide
   Labels bereits (`Firm website`, `Last verified`), die Spalten bleiben bis dahin `NULL`
   und die Seite sagt „Website not recorded" / „Never verified". Sobald die Datei gepflegt
   wird, greift es ohne Codeänderung. Der Phase-0-Eintrag in `current-feature.md` bleibt
   damit offen.
2. Ein Firmenblock **ohne jedes erkennbare Label** wird weiterhin still zu einem Programm
   mit 18 leeren Feldern. Die Absatzregel deckt diese Fehlerklasse nicht ab. Für die
   echte Datei fängt der Test „fills every one of the eighteen rule fields for every
   program" es ab.
3. Der Seeder räumt nicht auf: verschwindet eine Firma aus der Markdown-Datei, bleibt ihre
   Zeile stehen. Bewusst so, Löschen ist nicht seine Aufgabe.
4. Kein expliziter Fokusring auf den Filter-Chips und dem Karten-Auslöser. `Design.md` §8
   verlangt `2px solid var(--color-cyan)`; im Projekt existiert der nirgends, auch nicht
   in `journal-filters.tsx`. Kein `outline: none` ohne Ersatz gesetzt, der Browser-Ring
   bleibt also. Projektweit offen, gehört nicht in diesen Branch.
5. `firstValue` existiert jetzt zweimal — `journal/page.tsx:21` und
   `prop-firms/href.ts:14`. Drei Zeilen, aber eine Kopie.
6. Die Suche ist ein Seq Scan über `concat_ws` mit `ilike '%…%'`. Bei 15 Zeilen
   Referenzdaten irrelevant; ab vierstelligen Zeilenzahlen wäre ein GIN-Index auf
   `to_tsvector` fällig.
7. Altfund aus S8/S9 weiterhin offen und im Review erneut gesehen: `dailyNotes` und
   `badges` fehlen im `schema`-Objekt in `src/db/index.ts`. Folgenlos, solange nirgends
   `db.query.*` benutzt wird.

## 2026-09-14 — Designrunde 1: Dashboard — feature/dashboard-calm-surfaces — 41d2ce7

**Gebaut.** Das Dashboard reagiert auf Bedienung und drängt sich nicht mehr auf. Icon-
Kacheln und Save-Button tragen eine ruhige Prozessfläche statt Neon, jede ruhende Fläche
antwortet auf den Zeiger, der Streak-Bump und die Meilenstein-Karte aus §6 existieren
erstmals, und das Speichern eines Plans erzeugt einen Toast. Vorher leuchteten Icons und
Button heller als die Zahlen, und außer dem Kalender reagierte nichts auf die Maus.

**Dateien.** `src/app/globals.css` (sieben Tokens plus Sonner-Transition-Override),
`src/components/dashboard/` (progress-tiles, plan-card, pnl-calendar, metric-cell, neu:
streak-bump, milestone-card), `src/components/ui/toast.tsx`,
`src/components/journal/trade-row.tsx`, `src/actions/dashboard.ts`,
`src/db/queries/dashboard.ts`, `src/db/schema/users.ts`, `src/domain/streak.ts`,
`src/app/layout.tsx`, `src/app/(app)/dashboard/page.tsx`. Neue Tests:
`src/db/queries/__tests__/dashboard.test.ts`, `src/app/__tests__/reduced-motion.test.ts`.

**Migration.** `0009_fair_rawhide_kid.sql` fügt `users.dashboard_seen_at timestamptz` und
`users.streak_milestone_seen integer` hinzu, beide nullable.

**Regeln.** `src/domain/streak.ts` bekommt `STREAK_MILESTONES = [7, 30, 100]` und
`pendingStreakMilestone(currentStreak, seen)`: der höchste erreichte, noch nicht gezeigte
Meilenstein — **ohne Rückstau**. Wer 45 Tage schafft, ohne die 7er-Karte gesehen zu
haben, bekommt 30, nicht beide nacheinander. Neun Tests in
`src/domain/__tests__/streak.test.ts`, darunter die Kette `calculateStreak →
pendingStreakMilestone` über sieben echte Handelstage mit übersprungenem Samstag und auf
Montag gefaltetem Sonntag. Streak, Consistency und Badges selbst unverändert.

**Entschieden unterwegs.**

1. **Die ruhige Prozessfläche (§4.14) ist das Kalender-Rezept in Blau.** `.30 → .08`
   Deckkraft und ein 1px-Inset-Rand bei `.45` sind zeichengleich mit `--gradient-day-win`
   und `--shadow-day-win`. Dass beide dieselbe Rezeptur tragen, ist der Punkt: eine
   ruhige Fläche sieht überall gleich ruhig aus, unabhängig von ihrer Farbe.
2. **Nur das Dashboard wurde umgestellt.** Die übrigen zehn `--gradient-info`-Stellen —
   primärer Button überall, Sidebar, Badge-Grid, Score-Balken — bleiben laut. Bewusster
   Zwischenstand, um die neue Tonalität an einer Seite zu beurteilen, bevor sie sich über
   das Projekt legt. `Design.md` §4.2 hält ihn fest, damit er nicht als Schlamperei
   durchgeht. Sichtbare Folge: `milestone-card.tsx` ist ruhig, `unlocked-card.tsx` auf
   Progress ist laut — dieselbe Belohnungsart aus §6 in zwei Tonalitäten.
3. **Das Icon auf der ruhigen Kachel ist cyan, nicht weiß.** Auf der nun dunklen Fläche
   wäre Weiß der hellste Punkt gewesen — das Problem verschoben statt gelöst.
4. **Hover hebt nur an, was klickbar ist.** Kalenderzellen mit Einträgen und Trade-Zeilen
   heben sich um 2px; Metrik-Zellen, Fortschritts-Kacheln und leere Kalendertage hellen
   nur auf. Der Hub ist in diesem Projekt das Zeichen für Klickbarkeit, und eine Fläche
   anzuheben, die auf einen Klick nicht reagiert, ist ein Versprechen ohne Deckung.
5. **Sonner statt Eigenbau**, 2.0.8, exakt gepinnt in `package.json` und
   `coding-standards.md`. `coding-standards.md` sah Sonner seit P0.2 vor; die
   `peerDependencies` akzeptieren React 19. Die beiden Zeiten aus §4.11 (240 ms rein,
   300 ms raus) stehen als CSS-Override in `globals.css`, über Spezifität statt
   `!important`, weil Sonner sein Stylesheet zur Laufzeit injiziert und sonst nach
   Quellreihenfolge gewinnen würde.
6. **Nur die zwei Dashboard-Auslöser** sind angeschlossen. Trade und Missed Setup sitzen
   unter `/journal/new` und brauchen einen Streak-Wert, den `createTrade` heute nicht
   zurückgibt. Eigener Slice.
7. **Gemerkt wird in der DB, nicht in der Session.** `Design.md` §6 schrieb „einmalig für
   eine Session"; gebaut ist „einmalig je Meilenstein" über `users.streak_milestone_seen`,
   wie die Badge-Karte auf Progress seit S9 über `users.badges_seen_at`. Eine
   Session-Merkung hätte dieselbe Karte in jedem neuen Tab erneut gezeigt. §6 ist
   entsprechend korrigiert.
8. **Der Bump-Vergleich liegt in SQL** — und zwar ohne Korrelation, mit gebundener
   User-ID. Zwei Fallen lagen darin, beide im Review gefunden:
   - In TypeScript verglich er einen **String** gegen ein `Date`. Postgres liefert die
     Subquery als Text, `>` wandelt beide Richtung Zahl, der String wird `NaN`, und jeder
     Vergleich ist `false`. Der Bump feuerte damit nur, solange die Spalte `NULL` war —
     genau einmal pro Nutzer, für immer. Das `sql<Date | null>` im Template hatte eine
     Form behauptet, die nichts geprüft hat.
   - Die korrelierte SQL-Variante rendert in einer **Select-Liste** unqualifiziert:
     `where "user_id" = "id"`, was Postgres als `trades.user_id = trades.id` las.
     Drizzle qualifiziert in einer `where`-Klausel, in einer Select-Liste nicht.
   Beides ist durch fünf Integrationstests abgedeckt, von denen vier die Spalte
   **setzen** — der `NULL`-Kurzschluss hatte den Fehler zuvor verdeckt.
9. **`markStreakMilestoneSeen()` nimmt keine Argumente.** Eine frühere Fassung nahm den
   Meilenstein vom Client und prüfte nur, dass es 7, 30 oder 100 war — womit ein
   handgemachter Aufruf 100 hätte speichern und jede künftige Karte verstummen lassen
   können. Der Server kennt den Streak selbst. `src/schemas/dashboard.ts` entfiel dadurch
   und wurde nach Rückfrage gelöscht.
10. **Reduced Motion ist durch einen Test gesichert, nicht durch einen Blick.**
    `src/app/__tests__/reduced-motion.test.ts` prüft, dass der
    `prefers-reduced-motion`-Block alle drei Deklarationen inklusive `!important` trägt
    und dass `<MotionConfig reducedMotion="user">` an der Wurzel steht. Genau die Zeile
    `animation-iteration-count` fehlte bis zum 13.09., und ohne sie dreht ein Spinner
    hunderttausendmal pro Sekunde statt zu stoppen. Ein DevTools-Häkchen prüft einmal,
    ein Test prüft immer.
11. **`notifyProcess` bleibt neben `ToastViewport`.** Im Review als Vermischung von
    Komponente und Funktion notiert, nach Prüfung zurückgezogen: `src/lib/` und
    `src/hooks/` enthalten kein einziges `.tsx`, der Umzug hätte also ein neues Muster
    eingeführt, um ein bestehendes aufzuräumen.
12. **§4.3 stimmte schon vorher nicht.** Der Satz „der Streak-Tile ist das einzige
    animierte Element im Dashboard" war bereits falsch, seit der Kalender sich beim Laden
    aufbaut. Korrigiert.

**Offen geblieben.**
1. Ob die ruhige Fläche projektweit wird, entscheidet die nächste Designrunde. Bis dahin
   tragen die beiden Belohnungskarten aus §6 unterschiedliche Tonalitäten.
2. Der grüne Erfolgszustand des Save-Buttons (§4.2) und der Toast (§6) feuern beide beim
   Speichern. Beides ist so vorgeschrieben; der Klickpfad wurde damit abgenommen.
3. Wie sich Reduced Motion **anfühlt**, hat niemand geprüft — der Test sichert nur, dass
   beide Mechanismen vorhanden und vollständig sind.
4. Der 2px-Hub der Kalenderzellen aus S8 (`whileHover` in `pnl-calendar.tsx`) kommt
   nachweislich nie an. Drei Diagnoseversuche blieben ohne Ursache; das Farb-Hover
   daneben funktioniert. Eigener `fix/`-Branch.
5. Der Slice enthält einen Fremdeingriff, der in einen **eigenen `fix:`-Commit** gehört:
   `src/db/queries/trades.ts` und seine zwei neuen Tests. Siehe den folgenden Block.

## 2026-09-14 — Fix: Missed Setups bei gewähltem Konto — feature/dashboard-calm-surfaces — 9e416ad

**Gebaut.** Missed Setups verschwanden aus Journal und „Recent trades", sobald im
Kontoschalter ein Konto gewählt war. Gemessen: mit „Main" 7 Zeilen ohne Missed Setup, mit
„All accounts" 9 mit zweien. Jetzt liefern beide 9.

**Dateien.** `src/db/queries/trades.ts` (`isVisibleForAccount`),
`src/db/queries/__tests__/trades.test.ts` (zwei Tests).

**Regeln.** `queryTradeRows` machte im Einzelkonto-Zweig einen `innerJoin` auf
`trade_accounts`. Ein Missed Setup hat **null** Kontozuweisungen — `src/domain/trades.ts`
verlangt ein Konto nur bei `taken = true` — und eine Zeile ohne Join-Partner ist eine
Zeile, die weg ist. Der „All accounts"-Zweig hatte die Regel richtig
(`taken = false or ...`), dieser hatte sie vergessen. Ersetzt durch ein `exists`-Prädikat
nach dem Vorbild von `hasRealAccount`, abgedeckt vom Index `trade_accounts_unique`.

**Entschieden unterwegs.** **Ein Missed Setup erscheint bei jeder Kontoauswahl**, weil es
zu keinem Konto gehört. Für den Einzelkonto-Fall stand das nirgends geschrieben; es ist
die Lesart, die der „All accounts"-Zweig seit S5 hat und die `Design.md` §4.9 verlangt
(„verpasste Setups werden nicht kleiner, blasser oder weiter unten dargestellt"). Zwei
Tests halten es fest. Die Regel bleibt unberührt, dass Missed Setups aus jeder P&L-,
Win-Rate- und R-Zahl ausgeschlossen sind — der Fix ändert nur die Liste, keine Kennzahl.

**Offen geblieben.** Der Fehler stammt aus S5 und lief seither mit. Ob andere Stellen
dieselbe Annahme treffen — dass jeder Trade mindestens eine Kontozuweisung hat — ist
nicht systematisch geprüft.

## 2026-09-14 — Phase-0-Block aus current-feature.md entfernt — main — noch nicht committet

**Gebaut.** Nichts. Aufräumen der Arbeitsdatei.

**Warum.** `current-feature.md` ist laut eigener Kopfzeile eine Datei mit kurzer
Lebensdauer. Der Phase-0-Block stand dort seit dem ersten Tag, alle drei Punkte waren
abgehakt, Phase 1 ist abgeschlossen — und ein Satz darin war seit S11 schlicht falsch
(„blocks S11 only"; S11 ist gebaut und war nie blockiert).

**Was der Block sagte**, weil P0.1 sonst nirgends festgehalten ist — weder in der
History-Tabelle noch hier:

- `context/Design.md` geschrieben und abgestimmt.
- **P0.1 — `PropFirmsData.md` bereinigt:** Alle 15 Überschriften parsen jetzt als
  `## Name`; zuvor stand dort `##Name` ohne Leerzeichen. Vier Blöcke hatten ihren
  Firmennamen verloren (BluSky, Legends Trading, TradeDay, The Trading Pit) und tragen
  ihn wieder in der Überschrift. Der Rest der Datei ist byte-identisch geblieben.
- P0.2 — Projekt gescaffoldet, Befehlsliste in `CLAUDE.md` mit der echten
  `package.json` abgeglichen.

**Offen geblieben.** `website` und `last_verified_at` sind in `PropFirmsData.md` weiterhin
für keine Firma gepflegt. Das ist **kein Blocker** — der Parser aus S11 liest beide Labels
bereits, die Spalten bleiben bis dahin `NULL`, und die Seite sagt „Website not recorded"
bzw. „Never verified". Sobald die Datei gepflegt wird, greift es ohne Codeänderung.

## 2026-09-14 — Fix: Kalender-Hover als CSS statt motion — fix/calendar-hover-lift — c4d314a

**Gebaut.** Der 2px-Hub auf Kalendertagen mit Einträgen funktioniert. Er stand seit S8 als
`whileHover={total ? { y: -2 } : undefined}` im `motion.div` der Zelle und kam dort
nachweislich nie an — drei Diagnoseversuche in der Designrunde blieben ohne Ursache.

**Dateien.** `src/components/dashboard/pnl-calendar.tsx`, `context/coding-standards.md`.

**Regeln.** Die richtige Frage war nicht, warum `motion` nicht anspringt, sondern warum
`motion` überhaupt zuständig war. `Design.md` §5 teilt die Arbeit ausdrücklich auf:
„Hover, Fokus, Farb- und Randwechsel bleiben CSS-Transitions. `motion` übernimmt nur das
Aufklappen von Zeilen und Aufklappern, den Streak-Bump und den Aufbau von Kalender und
Score beim Laden." Ein Hover-Hub ist ein Hover. Er hätte nie `whileHover` sein dürfen.

Der Aufbau beim Laden (`initial`/`animate`) bleibt bei `motion` — der steht in derselben
Aufzählung auf der anderen Seite.

**Entschieden unterwegs.**

1. **Der Hub ist `hover:-translate-y-0.5` auf dem inneren Element**, bedingt gesetzt: nur
   Tage mit Einträgen tragen die Klasse, leere nicht. Das ersetzt die `total`-Prüfung, die
   vorher in `whileHover` steckte, und hält die Regel „Anheben bedeutet klickbar" an
   derselben Stelle wie die Farbe.
2. **Die Transition nennt `translate`, nicht `transform`.** Tailwind v4 setzt
   `-translate-y-*` über die CSS-Property `translate` — im erzeugten Stylesheet steht
   `translate: var(--tw-translate-x) var(--tw-translate-y)`. Mein erster Wurf nannte
   `transform` und hätte den Hub hart springen lassen. Beide Punkte stehen jetzt in
   `coding-standards.md` unter Motion.
3. **`Design.md` §4.8 bleibt unverändert.** Der Abschnitt beschrieb das Verhalten von
   Anfang an richtig; abgewichen ist nur die Umsetzung. Es gab nichts zu korrigieren, nur
   etwas zu erfüllen.

**Offen geblieben.** Die visuelle Abnahme lief über Sascha, nicht über Messung. Drei
Messversuche lieferten Startwerte statt Hover-Werte; erst ein Screenshot zeigte, dass die
Seite unter dem Cursor weggescrollt war und die Maus die Zelle längst verlassen hatte.
Belegt ist per DOM und erzeugtem Stylesheet: `whileHover` ist weg, die Hub-Klasse hängt
nur an Tagen mit Einträgen, und die Hover-Regel steht mit höherer Spezifität nach der
Idle-Regel. Ob es sich richtig anfühlt, hat ein Mensch entschieden.

## 2026-09-16 — Equity-Kurve im Dashboard — feature/equity-curve — fd3404a

**Gebaut.** `/dashboard` zeigt den laufenden Monat als kumulierte Flächenkurve zwischen
Metrik-Tafel und Kalenderraster: laufende Summe der Tages-P&L ab Monatsanfang,
zweifarbig an der Nulllinie, mit Tooltip aus Datum, Stand und Tagesergebnis. Dazu, als
zweite und unabhängige Hälfte, bekommt die Hauptspalte rechts eine Rinne für den
Scrollbalken — der lag vorher auf der Kante jeder Karte.

**Dateien.** Neu: `src/domain/equity.ts` samt `__tests__/equity.test.ts` (19 Tests),
`src/components/dashboard/equity-curve.tsx`. Geändert:
`src/app/(app)/dashboard/page.tsx`, `src/app/(app)/layout.tsx`,
`src/app/globals.css`, `src/lib/time.ts` samt Test, `package.json`/`pnpm-lock.yaml`
(`recharts` 3.10.1, der Pin aus `coding-standards.md`, erstmals installiert),
`context/Design.md` (neuer §4.15), `context/coding-standards.md`.

**Regeln.** `buildEquitySeries` ist rein und rechnet ausschließlich in ganzzahligen
Cent: laufende Summe, Y-Bereich auf runde Beträge nach außen gerundet, Tick-Werte, und
der Nulldurchgang als Verhältnis 0–1. Die Reihe kommt aus `getMonthDayTotals`, das den
Kontomultiplikator und den Übungskonto-Ausschluss bereits angewandt hat — das Modul
multipliziert und filtert deshalb nichts. Ein Tag mit nur verpassten Setups kommt mit
`amountCents: 0` an und liegt als flacher Punkt auf der Kurve: journaliert, aber ohne
Wirkung auf die Summe. Streak, Consistency Score und Badges sind nicht berührt.

**Entschieden unterwegs.**

1. **Der Nulldurchgang kommt aus der eigenen Achsenarithmetik, nicht aus den
   Recharts-Hooks.** Das offizielle Beispiel misst ihn über `useYAxisScale()` am
   gerenderten Chart. Da die Komponente die Y-Domain selbst setzt und die Skala darüber
   linear ist, ist `domainMax / (domainMax - domainMin)` derselbe Wert — nur ohne DOM
   prüfbar und im Domain-Modul getestet.
2. **Die Verläufe sind über `gradientUnits="userSpaceOnUse"` an die Plot-Fläche aus
   `usePlotArea()` gebunden.** Die Vorgabe `objectBoundingBox` spannt den Verlauf über
   das Kästchen der *gezeichneten Form*; die Fläche wird wegen `baseValue={0}` bis zur
   Nulllinie gezeichnet und nicht bis zum Rahmen, also ist ihr Kästchen nicht die Achse
   und der Farbwechsel läge daneben.
3. **Sämtliche Diagrammfarben stehen als CSS-Regeln in `globals.css`, nicht in der
   Komponente.** Grund ist eine harte Eigenschaft von SVG: in einem
   Presentation-Attribut ist `var(--token)` nicht erlaubt, ein Token über eine
   Recharts-Farb-Prop durchzureichen bleibt also wirkungslos. Eine CSS-Regel auf
   dasselbe Element schlägt das Attribut. Das gilt auch für `stop-color` an den
   Verlaufsstopps — die trugen zwischenzeitlich ein Inline-`style`, und
   `coding-standards.md` hatte dafür eine Ausnahme von „No inline styles" bekommen.
   Beides ist nach dem Review zurückgenommen: eine Projektregel aufzuweichen, weil die
   eigene Umsetzung sonst nicht passt, ist die falsche Richtung, zumal die Ausnahme für
   jedes künftige Diagramm gegolten hätte.
4. **Die Achse hat eine Untergrenze und einen Sonderfall.** Schrittweite mindestens
   $1, weil keine Achse in Bruchteilen eines Dollars beschriftet wird; ein Monat, dessen
   Kurve die Null nie verlässt, rundet sonst auf die Domain `[0, 0]` und jede Ableitung
   daraus teilt durch eine Spanne von null — er bekommt stattdessen einen Schritt Luft
   nach oben und unten. Beides fanden die Tests, nicht der Browser.
5. **Achsenbeschriftung in `--color-fg-muted` bei 12px, mit Tabellenziffern.** Der
   erste Wurf stand in `--color-fg-subtle` bei 10,5px. `Design.md` §8 nennt diesen Ton
   „mit 12px die untere Grenze und nur für Nebeninformationen erlaubt, nie für Werte" —
   auf der Y-Achse stehen Beträge. Kein anderes Bauteil im Projekt setzt einen Betrag in
   diesem Ton. Aus dem Review.
6. **`formatMonthLabel` ist neu in `src/lib/time.ts`**, UTC-verankert wie
   `formatDayLabel` und mitgetestet. `pnl-calendar.tsx` formatiert denselben Monatskopf
   weiter inline mit `date-fns` — damit gibt es vorübergehend zwei Wege. Den Kalender
   umzustellen lag außerhalb dieses Slices und ist bewusst nicht passiert.
7. **Der rechte Rand ist 16px zusätzliches Padding in `<main>`**, keine Änderung an der
   Seitenpolsterung. So liegt der Scrollbalken des eigenen Scroll-Containers in einer
   Rinne statt auf dem Karteninhalt. Wirkt auf alle sieben Seiten.
8. **`Design.md` §4.15 ist nach der Umsetzung entstanden, nicht davor.** Das ist die
   Reihenfolge, die das Dokument eigentlich nicht haben soll; die Kurve war visuell
   nirgends festgelegt, und eine Komponente ohne Eintrag wäre eine stille Entscheidung
   gewesen. Der Abschnitt legt für jedes künftige Diagramm fest, dass eine Geldkurve
   keinen Schein bekommt — die Kalender-Ausnahme aus §4.8 gilt dort ausdrücklich nicht.
9. **Tailwind v4 scannt jede Datei im Projekt, auch Markdown in `context/`.** Eine
   Utility mit eckigen Klammern, die als Prosa in `current-feature.md` stand, wurde als
   echte Regel erzeugt und ließ `globals.css` nicht mehr parsen: der Dev-Server lieferte
   eine weiße Seite, der Produktions-Build lief unbeeindruckt durch. Steht jetzt unter
   Tailwind CSS v4.

**Offen geblieben.**

- **Die kumulierte Summe existiert zweimal.** `getMonthDayTotals` berechnet sie in SQL
  (CTE `cumulative`), benutzt sie für `maxDrawdownCents` und wirft sie weg;
  `buildEquitySeries` rechnet sie in TypeScript neu. Semantisch identisch, Risiko klein.
  Zusammenzuführen hieße, `DayTotal` um `equityCents` zu erweitern — den Rückgabetyp, an
  dem auch der Kalender hängt. Fällt beim Slice für die Kurven pro Konto, der die Query
  ohnehin anfassen muss.
- **Die X-Achse ist kategorial über Tage mit Einträgen**, eine Woche Pause sieht aus wie
  ein Tag. Bei einem Monat mit höchstens 31 Punkten bleibt die Verzerrung begrenzt; auf
  `/analytics` mit Quartal oder Jahr nicht mehr. Eine Datumsachse verlangt zuerst eine
  Antwort darauf, welchen Stand ein Tag ohne Eintrag trägt — fachlich der fortgeschriebene
  vorherige, womit der Monat an jedem Wochenende ein Plateau bekäme. Gehört zur
  Analytics-Runde.
- **`prefers-reduced-motion` ist verdrahtet, aber nicht unter Emulation geprüft.**
  `isAnimationActive` hängt an `useReducedMotion()`, weil Recharts in JavaScript animiert
  und weder `MotionConfig` noch der CSS-Block es erreicht. Die Emulation war mit den
  vorhandenen Werkzeugen nicht auslösbar.
- **Leerer Monat und Kontoschalter sind im Code abgedeckt, im Browser aber nie zu sehen
  gewesen** — die Seed-Daten haben in jedem Monat Einträge und kennen nur ein Konto.
- **Die Abnahme von §4.15 steht aus.** Der Abschnitt beschreibt die Umsetzung korrekt,
  aber drei Punkte darin sind Festlegungen für jedes künftige Diagramm und nicht bloß
  Beschreibung.

## 2026-09-18 — S12a Analytics-Dimensionen — feature/analytics-dimensions — ec803ad

**Gebaut.** `/analytics` zeigt die elf Dimensionen aus `project-overview.md` §F — Konto,
Setup-Typ, Entry-Modell, Session, Instrument, Wochentag, Stunde, Confluence,
Gefühlslage, Ausführungsnote, Fehler — je mit Trades, Win Rate, Netto-P&L und avg R,
dazu einen Missed-Setups-Abschnitt ohne eine einzige Geldzahl. Zeitraum über Von/Bis
plus vier Presets, Default „Alles", alles in `searchParams`. Die Seite folgt dem
Kontoschalter wie Dashboard und Journal.

S12 ist bewusst geteilt: Haltedauer, Risikokalibrierung aus MFE/MAE und Exit-Effizienz
aus Post-exit MFE sind **S12b** und standen in diesem Branch unter „Do not build".

**Dateien.** Domain: `src/domain/analytics.ts` (26 Tests, vor der ersten Query grün).
Queries: `src/db/queries/analytics.ts` — `getDimensionBreakdowns` als *ein*
`UNION ALL` über elf `GROUP BY`, `getMissedSetupBreakdowns` über vier; dazu
`src/db/queries/__tests__/analytics.test.ts` mit 16 Tests gegen echtes Postgres.
UI: `src/components/analytics/{dimension-table,missed-setups-section,range-filter}.tsx`,
`src/lib/analytics/href.ts`, `src/app/(app)/analytics/page.tsx`.
`Design.md` §4.16 neu, §10 fortgeschrieben.

Außerhalb des Scope, beides aus dem Review: `src/components/ui/value-bar.tsx` mit
`score-breakdown.tsx` als zweitem Aufrufer, und `src/lib/search-params.ts` mit
`journal/href.ts` als zweitem Aufrufer. Dazu `rangeForPreset` in `src/lib/time.ts`.

**Migration.** Keine. Keine neue Tabelle, keine neue Spalte, keine neue Abhängigkeit.

**Regeln.** Geldaggregat ist allein `netPnlCents`; `trades`, `wins`, `rSum` und `rCount`
sind Zählaggregate. Übungskonten fallen vor jeder Summe raus, das allein gewählte Konto
ist der einzige Pfad zu ihren Zahlen und multipliziert nie. Missed Setups sind
`taken = false`, aus jeder Geldspalte draußen und bei gewähltem Konto trotzdem sichtbar,
weil sie kein Konto tragen. `entry_time` bleibt unkonvertiert — die Stunden-Dimension
ist Chart-Uhr. avg R mittelt über die Trades mit Stop-Preis, nicht über alle.

**Entschieden unterwegs.**

- **„Nach Konto" summiert unmultipliziert.** Der Join über `trade_accounts` fächert den
  Trade selbst je Konto auf, die Gruppierung *ist* dort also schon der Multiplikator.
  Zusätzlich `moneyContribution` zu benutzen hätte einen Drei-Konten-Copy-Trade neunfach
  gezählt. Die einzige Stelle im Projekt, an der ein Geldaggregat bewusst nicht
  multipliziert — deshalb steht die Begründung im Kopf von `analytics.ts` und ein Test
  darauf.
- **Ein `UNION ALL` statt elf Round-Trips**, verkettet über `.unionAll()` statt
  `unionAll(a, b, ...rest)`: die variadische Form verlangt ein Tupel, ein per `map`
  gebautes Array ist keins. `GROUPING SETS` scheidet aus, weil drei Dimensionen eigene
  Joins brauchen.
- **Confluence und Fehler über LEFT JOIN**, damit ein Trade ohne Tag als „Not set"
  auftaucht statt aus der Tabelle zu fallen. Ein Trade mit drei Confluences steht in drei
  Zeilen — die Spalte „Trades" summiert sich dort nicht auf die Gesamtzahl, und die Karte
  sagt das.
- **Wochentag zeigt sieben Buckets.** Die Sonntag-auf-Montag-Regel steht unter „Streak"
  und gilt dem Zählen von Logging-Tagen, nicht der Frage, wann gehandelt wurde.
- **„Not set" ist eine eigene Zeile am Ende**, nicht ein weggelassener Bucket — sonst
  kommen die Anteile nicht auf 100 %, und eine Dimension, die niemand pflegt, ist selbst
  ein Befund. In den Missed Setups umgekehrt: Buckets mit null Verpassten fallen raus,
  weil der Abschnitt „wo zögere ich" beantwortet.
- **Acht Zeilen je Karte, Rest hinter „Show all (n)".** Abgeschnitten wird nichts.
- **Der Anteil im Missed-Abschnitt hat einen scope-abhängigen Nenner**, weil ein Missed
  Setup kein Konto trägt und deshalb in jeder Auswahl mitzählt, während die genommenen
  Trades daneben gefiltert sind. Auf einem kleinen Konto liest sich daraus sonst eine
  Quote, die es nicht gibt. Gelöst als Microcopy unter der Überschrift, nicht als
  Umbau der Regel.
- **Der Missed-Balken trägt Neon.** Ein Missed Setup speist Streak und Badges und fasst
  kein Geld an, ist also Prozess (§1). Dass er genauso aussieht wie ein Score-Balken, ist
  die Aussage. Seit dem `ValueBar`-Auszug ist das erzwungen statt behauptet.
- **`ReadExecutor`** — ein optionaler Lese-Parameter auf beiden Query-Funktionen, den
  Produktion nie setzt. Die Alternative wäre gewesen, die Geldregeln gegen echtes
  Postgres *nicht* zu testen oder Fixture-Daten in die Dev-Datenbank zu schreiben.
  Erste Transaktionsnaht in `src/db/queries/`; `src/actions/*` reichen `tx` schon länger
  herum.
- **Datumsfelder sind uncontrolled, mit `key`.** Ein `type="date"` feuert Change mit
  leerem Wert, solange das Datum halb getippt ist; ein controlled Feld schreibt das
  zurück und setzt den Datumseditor mitten in der Eingabe zurück. Der `key` erzwingt den
  Remount, wenn ein Preset den Zeitraum löscht — das braucht `journal-filters.tsx` nicht,
  weil dort niemand außer dem Feld selbst die Daten ändert.
- **Presets werden auf dem Server aufgelöst**, nicht im Browser: ein Preset ist eine
  Kalendergrenze, und die gehört in die Zeitzone des Nutzers. Deshalb `range=30d` in der
  URL und `rangeForPreset` neben `monthRangeOf`, statt fertiger Daten aus der
  Client-Komponente.
- **Zwei Duplikate aufgelöst, die dieser Slice selbst erzeugt hat** (aus dem Review):
  `FILL_WIDTHS` lag danach dreimal im Projekt, jetzt einmal in
  `src/components/ui/value-bar.tsx`, das auch die Farbregel aus §1 trägt;
  `buildAnalyticsHref` war `buildJournalHref` mit anderem Basispfad, beide laufen jetzt
  über `buildHref` in `src/lib/search-params.ts`.

**Offen geblieben.**

- **Die elf Zweige scannen `trades` elfmal**, und `realAccountCount` ist in zehn davon
  eine korrelierte Subquery pro Zeile. Für ein persönliches Journal über
  `trades_user_date_idx` unkritisch und derselbe Ausdruck, den das Dashboard schon fährt.
  Fällt auf, wenn ein Nutzer je fünfstellig viele Trades hat.
- **§4.16 ist beschrieben, nicht entworfen.** Wie bei der Progress-Seite nach S9: aus
  vorhandenen Primitiven gebaut und nie gegen die anderen Screens gehalten. Die eigene
  Runde aus §10 steht weiter aus und wird spätestens mit S12b fällig, dessen drei
  Auswertungen vermutlich keine Bucket-Tabelle sind.
- **`ReadExecutor` ist eine Testnaht im Produktionscode.** Bewusst so entschieden, aber
  wenn das Muster sich über `src/db/queries/` ausbreitet, gehört es einmal grundsätzlich
  entschieden statt slice-weise.
- **Keine Dimension hatte in den Seed-Daten mehr als acht Buckets**, der Aufklapper war
  nur mit vorübergehend gesenkter Grenze zu sehen. Mit echten Daten ungeprüft.
- **Leerer Zustand einer Dimension und der Leerzustand des Missed-Abschnitts** sind im
  Code abgedeckt, im Browser aber nie aufgetreten.

## 2026-09-18 — S12b Execution-Auswertungen — feature/analytics-execution — 44447c5

**Gebaut.** `/analytics` beantwortet jetzt auch die drei Fragen zur Ausführung, die
`project-overview.md` §F nur beim Namen nannte: **Haltedauer** (Gewinner und Verlierer
getrennt), **Risikokalibrierung** als MAE/MFE-Verteilung je Ergebnis, und
**Exit-Effizienz** aus dem manuellen Post-exit-MFE. Drei eigene Abschnitte unter den
elf Dimensionskarten, über den Missed Setups. Damit ist §F vollständig; in Phase 1
fehlt nur noch der CSV-Import.

**Dateien.** Domain: `src/domain/execution.ts` (20 Tests, vor der ersten Query grün).
Queries: der Execution-Block in `src/db/queries/analytics.ts` mit
`getExecutionSummary` und `getExcursionBuckets`, je ein Statement; der Fixture-Harness
in `src/db/queries/__tests__/analytics.test.ts` kann jetzt Zeiten und Excursion-Werte,
17 neue Tests. UI: `src/components/analytics/{hold-time-card,risk-calibration-card,
exit-efficiency-card}.tsx` und zwei Queries mehr in `src/app/(app)/analytics/page.tsx`.
`Design.md` §4.17 neu, §4.16 fortgeschrieben.

**Migration.** Keine. `mfe_r`, `mae_r`, `post_exit_mfe_r`, `entry_time` und `exit_time`
existieren seit S4 — der Slice liest nur, was nie ausgewertet wurde.

**Regeln.** Alles hier ist Zählaggregat: `tradePnlCents` dient als Vorzeichentest und
Null-Prüfung, nie als Summand, und kein `moneyContribution` kommt vor. Nur
`taken = true`. Scope, Zeitraum und Übungsfilter laufen unverändert über `scopeWhere`.
Auf den drei Abschnitten steht keine einzige Geldzahl.

**Entschieden unterwegs.**

- **Die drei Kennzahlen waren nirgends definiert.** §F nennt „hold time, risk
  calibration from MFE/MAE, exit efficiency from post-exit MFE" und hört da auf; weder
  `Design.md` noch dieses Dokument sagten, wie gerechnet wird. Die vier Festlegungen
  unten sind deshalb im `load` getroffen worden, nicht aus einem Dokument übernommen.
- **Risikokalibrierung ist die klassische MAE-Studie:** wie weit gingen die Gewinner
  gegen dich, wie weit liefen die Verlierer für dich. Die erste Hälfte beantwortet „wie
  viel Stop brauche ich wirklich", die zweite „wie viel gebe ich zurück". Vier Karten,
  je Mittelwert plus Fünf-Bucket-Verteilung.
- **Exit-Effizienz ist `r / (r + post-exit MFE)`, nur über Gewinner.** Ein Verlust hat
  keine Effizienz, und der Nenner würde eine erfinden; bei `r + post <= 0` ist der Wert
  `null` statt 0. Daneben das entgangene R absolut.
- **Ein Ausstieg vor dem Einstieg ist eine Nacht, keine negative Dauer**, gerechnet als
  plus 24 Stunden. Futures laufen fast rund um die Uhr. Es gibt kein Ausstiegsdatum,
  gegen das man das prüfen könnte — `trades` trägt ein `trade_date`, also ist „früher
  auf der Uhr" das einzige Signal, das da ist.
- **MAE und MFE zählen über den Betrag.** `src/schemas/trades.ts` nimmt `z.number()`
  und das Formular sagt nicht, ob `-0.5` oder `0.5` zu tippen ist — ohne `abs()` hinge
  die ganze Auswertung an einer Eingabegewohnheit. Das galt zuerst nur fürs Bucketing;
  **das Review fand, dass der MFE-Mittelwert daneben das Vorzeichen noch las**, ein
  negatives MFE also im 2–3R-Balken saß und gleichzeitig als −2,50R gemittelt wurde.
  Seitdem gilt `abs()` für beide, mit eigenem Test.
- **Ohne Stop-Preis zählt keine Excursion.** MFE und MAE sind in R gespeichert, und R
  ist ohne Stop nicht definiert — das Formular nimmt die Felder trotzdem an. Mittelwert
  und Verteilung filtern deshalb auf `stop_price is not null` (`hasDefinedR` in
  `analytics.ts`). Das schließt an zwei bestehende Entscheidungen an, statt eine dritte
  zu erfinden: `rMultipleSortKey` ist ohne Stop NULL, avg R aus S12a übergeht solche
  Trades also längst, und Post-exit MFE erscheint im Formular erst, wenn ein Stop
  gesetzt ist (`superRefine` in `src/schemas/trades.ts`). Ein Mittelwert mit der Einheit
  R, der definierte und undefinierte R vermischt, ist schlechter als einer über weniger
  Trades. Betraf bei der Einführung null Datensätze — reine Definitionsschärfe. Zwei
  Tests, und die Fixtures der Excursion-Tests tragen den Stop-Preis jetzt sichtbar je
  Trade, statt ihn in einem Default zu verstecken.
- **Die Bucket-Grenzen stehen genau einmal.** Die SQL-`CASE` wird aus `MAE_BUCKETS` /
  `MFE_BUCKETS` generiert, und ein Test hält das Ergebnis gegen `bucketIndexOf` — SQL
  und Achsenbeschriftung können nicht auseinanderlaufen.
- **Leere Buckets bleiben stehen**, leere Missed-Buckets nicht. Bei einer Verteilung
  ist die Lücke der Befund; bei „wo zögere ich" ist eine Nullzeile die Antwort auf eine
  Frage, die niemand gestellt hat.
- **Hypothetisches wird nie grün.** MFE, Post-exit MFE und das entgangene R sind
  Beträge, die nie realisiert wurden. §4.9 verbietet das für den „would-be R" einer
  verpassten Position; §4.17 zieht die Regel jetzt ausdrücklich auf jede nicht
  realisierte Zahl. Der erfasste Anteil dagegen leuchtet — er misst Ausführung, nicht
  Ertrag.
- **`getExecutionSummary` liefert eine Zeile pro Ergebnis**, nicht die eine Zeile, die
  der Spec beschrieb. Ein `GROUP BY` über das Ergebnis spart die doppelte Spaltenliste;
  ein Statement bleibt es. Abweichung vom Spec-Wortlaut, nicht von seiner Absicht.
- **Der Bucket-Index wird in einer Subquery berechnet und außen über seinen Alias
  gruppiert.** Die direkte Fassung scheiterte an Postgres: Drizzle bindet jede
  Bucket-Grenze als eigenen Parameter, dieselbe `CASE` rendert in der Select-Liste als
  `$2…$10` und in `GROUP BY` als `$13…$21`, und Postgres vergleicht syntaktisch — das
  kostet ein `must appear in the GROUP BY clause`. Dieselbe Familie wie die
  Qualifizierungs-Falle, die seit Designrunde 1 in `coding-standards.md` steht.

**Offen geblieben.**

- **Das Zeilen-Layout liegt vierfach im Code** — `dimension-table`,
  `missed-setups-section`, `hold-time-card` und `risk-calibration-card` bauen dieselbe
  Kopfzeile, denselben `divide-y`-Block und dieselbe Label-links-Zahlen-rechts-Zeile.
  Sieben Design-Festlegungen (`border-white/8`, `divide-white/6`, 13px Mono,
  `tabular-nums`, `truncate`, `shrink-0`, `py-2`), viermal getippt. Entschieden:
  **jetzt nicht auflösen.** Zwei der vier stammen aus S12a und sind gemerged, ein
  Auszug wäre also kein Execution-Commit mehr; und vier Kopien sind die Zahl, bei der
  man das Muster erkennt, aber noch nicht bezahlt. Zusammengezogen wird beim
  CSV-Import, der mit seiner Vorschautabelle die fünfte mitbringt — dann gibt es fünf
  echte Fälle statt vier plus einer Vermutung darüber, was die fünfte braucht. Die
  Form dann: kleine Primitiven (`TableHead`, `TableRows`, `TableRow`) ohne
  Spaltenkonfiguration, **keine** `DataTable` mit `columns`-Prop — die vier Karten
  unterscheiden sich in Balken, Aufklapper und Zahlentonart genug, dass eine
  Konfigurationssprache schwerer zu lesen wäre als das Markup, das sie ersetzt.
- **Die Beschriftung des MAE-Felds ist ungeklärt.** Rechnerisch ist das Vorzeichen
  durch `abs()` erledigt — beide Schreibweisen liefern dasselbe Ergebnis, und `abs()`
  bleibt auch künftig das Netz. Was fehlt, ist dass der Nutzer weiß, was erwartet wird:
  das Feld heißt nur „MAE (R)" und `src/schemas/trades.ts` nimmt `z.number()` ohne
  Einschränkung. **Entschieden: ein eigener kleiner `fix:`-Slice am Formular**, der die
  Konvention an das Feld schreibt. Nicht hier, weil er `new-trade-form.tsx` anfasst und
  einen eigenen Klickpfad braucht.
- **Neun reine Testtrades liegen jetzt im Dev-Journal** (drei aus S12a, vier aus
  diesem Slice, zwei ältere). Sie verschieben jede Zahl auf Dashboard, Analytics und
  Progress; die Haltedauer-Karte zeigt deshalb 45m über zwölf Gewinner statt der
  isolierten 95m aus dem Spec. Die im Klickpfad geprüften Zahlen sind die, die nur an
  den vier neuen Trades hängen. **Bewusst stehen gelassen** — es ist eine
  Entwicklungsdatenbank, und einen Lösch-Pfad für Trades hat die App ohnehin nicht.

---

## 2026-09-21 — S13 CSV-Import (vorgemerkt als S10b) — feature/trade-import — 5aab3c5

**Gebaut.** Eine Fill-Datei von der Prop-Plattform landet als Trades im Journal, und
dieselbe Datei darf beliebig oft erneut laufen: bekannte Zeilen werden übersprungen,
geänderte aktualisiert, und jede Handarbeit am Trade — Notiz, Setup, Grade, Screenshot,
Tag — überlebt das unangetastet. Jeder Import ist ein Batch und lässt sich rückgängig
machen. Damit ist Phase 1 inhaltlich vollständig.

**Dateien.** Domain: `src/domain/import/` mit `types`, `detect`, `normalize`, `fills`,
`match`, `outcome`, `session` — je mit Testdatei, 62 Tests. Lib: `src/lib/csv/parse.ts`
(RFC 4180, Delimiter-Erkennung, BOM, eingebettete Zeilenumbrüche) und `calendarDateOf`
in `src/lib/time.ts`. Queries: `src/db/queries/import.ts` mit dem Tier-1/Tier-2-Lookup,
der Batch-Liste und `removeUntouchedTrades`, 21 Tests gegen echtes Postgres. Actions:
`previewImport`, `commitImport`, `undoImportBatch` in `src/actions/import.ts`, Zod in
`src/schemas/import.ts`. UI: `src/app/(app)/journal/import/page.tsx` und die sechs
Komponenten unter `src/components/import/`. `Design.md` §4.18 neu.

**Migration.** `0010_tiresome_mockingbird` — Tabelle `import_batches`, dazu
`trades.import_batch_id` (nullable, `null` heißt handgetippt) und
`trades.broker_trade_key` mit Index auf `(user_id, broker_trade_key)`. Schemaänderung
und Migration liegen im selben Commit.

**Regeln.** `detect.ts` erkennt die Dateiform allein an der Kopfzeile und wirft mit den
gefundenen Headern im Klartext (7 Tests). `normalize.ts` besitzt die **Uhr** — es ist
die einzige Stelle im Projekt, die einen Broker-Zeitstempel konvertiert — und das
**Instrument**: Symbolauflösung gegen die Instrumententabelle und Tick-Rundung, erster
Leser von `instruments.tick_size` (17 Tests). `fills.ts` paart FIFO je **Kontrakt** in
Zeitstempelreihenfolge, mit mengengewichtetem Durchschnittspreis in BigInt.
`match.ts` hält die zweiphasige Paarung, `outcome.ts` die Schreibfreigabe: die
Update-Menge wird ausschließlich aus der broker-eigenen Liste gebaut, ein nutzereigenes
Feld kann gar nicht in ein UPDATE geraten. `session.ts` führt die NY-Fenster und die
Nutzeruhr je Trade-Datum zusammen (13 Tests).

**Entschieden unterwegs.**

- **Die Chart-Uhr ist die Zeitzone, in der der Trader sitzt**, geführt in
  `users.timezone`. Das stand in keinem Dokument: `CLAUDE.md` nannte `entry_time` die
  „Chart-Uhr", ohne zu sagen, welche Zone das ist. Die Beispieldatei erzwang die
  Antwort, weil sie zwei Zeitspalten hat und keine davon die NY-Uhr ist. **Betrifft
  das ganze Projekt** — steht jetzt in `CLAUDE.md` und im `Time`-Abschnitt von
  `coding-standards.md`; der Eintrag in die Decisions-Liste von `project-overview.md`
  ist vorgeschlagen, nicht vorgenommen.
- **Der Import liest die UTC-Spalte, nicht die lokale.** Die lokale Spalte der Datei
  zeigt die Anzeigeeinstellung der Broker-Plattform — bei dieser Datei zufällig Berlin —
  und kann sich ändern, ohne dass die Datei es sagt. Umgerechnet wird **einmal**, an
  der Dateigrenze. `trade_date` und `entry_time` stammen aus demselben umgerechneten
  Zeitpunkt: ein Fill um 23:30 UTC ist in Berlin der Folgetag, und ein Datum, das der
  Uhrzeit daneben widerspricht, ist schlimmer als beide Varianten.
- **Die Session-Fenster bleiben New Yorker Zeiten und wandern je Trade-Datum in die
  Nutzerzone.** Die Namen benennen echte Markt-Sessions. Je Datum, weil New York und
  Europa an verschiedenen Tagen umstellen: meist sechs Stunden Versatz, drei Wochen im
  März und eine Ende Oktober fünf. Ein fester Versatz hätte die Grenzfälle still
  verschoben, zwei Tests halten sie fest.
- **`users.timezone` ist jetzt `Europe/Berlin`** statt `UTC`. Ein Feld in `/settings`
  kommt mit Phase 2 — in Phase 1 gibt es genau einen Nutzer, und ein Formular dafür
  wäre eine Fläche ohne Nutzen.
- **MGC im Instrumenten-Seeder**, Punktwert 10, Tick 0.10. Ohne ihn fielen 10 der 42
  Round Trips der Beispieldatei als unbekanntes Symbol heraus. Die beiden Zahlen
  stammen aus der Kontraktspezifikation, nicht aus der Datei — der einzige Wert in
  diesem Slice, der nicht aus den Daten kommt.
- **`detect.ts` erkennt vorerst nur die Fill-Form.** Round-Trip- und
  TradingView-Header stehen in keinem Dokument, und ein Erkenner gegen geratene
  Spaltennamen wäre ein Erkenner gegen eine Vermutung. Beide kommen als eigene
  Funktionen dazu, sobald echte Exporte vorliegen; `ImportShape` trägt alle drei Namen
  bereits.
- **`fills.ts` gruppiert über den Kontrakt, nicht über das Instrument.** Die
  Beispieldatei enthält MNQU6 und MNQZ6 nebeneinander. Würde die Symbolauflösung vor
  der Paarung laufen, liefe eine September-Position gegen einen Dezember-Fill. Die
  Reihenfolge parse → fills → normalize ist deshalb nicht vertauschbar.
- **`RawTrade.sourceRow` stand hart auf `0`.** Ein Round Trip nennt jetzt die Zeile
  seines Eröffnungs-Fills — ohne das hätte die Vorschau auf keine Zeile zeigen können.
- **Ein `db.execute<Row>()`-Generic ist eine ungeprüfte Behauptung.** `created_at` war
  als `Date` deklariert und kam als `string`: ein rohes Statement trägt keinen
  Drizzle-Column-Mapper. Typecheck, 470 Tests und Build waren grün, und die Batch-Liste
  stürzte beim ersten Rendern mit Inhalt ab. `coding-standards.md` hatte den Fall für
  `sql<T>` bereits seit Designrunde 1 — die Regel ist jetzt um `db.execute` erweitert,
  der Mapper wandelt wie `dashboard.ts` mit `new Date(...)`, und der Query-Test nennt
  `createdAt` ausdrücklich. Die eigentliche Lücke war die Prüfung: alle Kontrollen
  liefen gegen eine **leere** Batch-Liste.
- **Die fünfte Kopie des Zeilen-Layouts bleibt stehen.** S12b hatte die Extraktion nach
  `TableHead`/`TableRows`/`TableRow` diesem Slice zugewiesen. Sie ist auf Ansage in
  einen eigenen `refactor:`-Slice verschoben worden, weil sie vier gemergte, untestete
  Karten anfasst und in diesem Commit ohne Netz liefe. `Design.md` §4.16 bleibt
  unverändert; §4.18 trägt die Korrektur.
- **Undo bestätigt in sich selbst**, zweiter Klick auf denselben Knopf, kein
  `window.confirm` — ein modaler Dialog blockiert jedes weitere Browser-Ereignis.

**Offen geblieben.**

- **Der Klickpfad im Browser ist ungeprüft.** Die Chrome-Extension war die ganze
  Session nicht verbunden. Geprüft wurde stattdessen über gerenderte Seiten per HTTP
  und über die echten Server-Actions gegen die Datenbank: Import (42 neu), Wiederholung
  (42 Skip), offene Restposition, Update mit erhaltener Notiz und Setup, Undo mit
  „Remove 41 of 42", unbekanntes Symbol. Die vier Wizard-Schritte sind als Interaktion
  nie angefasst worden.
- **Round-Trip- und TradingView-Erkennung fehlen**, bis die Exporte vorliegen.
- **Die Tabellen-Extraktion** aus S12b steht weiter aus, jetzt mit fünf echten Fällen
  statt vier.
- **Die Beispieldatei deckt nicht alles ab:** keine offene Restposition (dafür wurde
  eine gekürzte Kopie gebaut), kein Dezimalkomma, nur ein Konto, keine P&L-Spalte.
- **Die Entwicklungsdatenbank ist auf Ansage geleert worden** — alle Trades, Konten,
  Daily Notes und Badges. Das kehrt die Entscheidung aus S12b um, die Testtrades stehen
  zu lassen. Stammdaten (Instrumente, Tags, Badge-Definitionen, Prop-Firmen) und der
  Seed-Nutzer stehen. `pnpm db:seed` würde ein Default-Konto „Main" neu anlegen.
- Der Fix an der Archiv-Liste in `/settings` liegt als eigener Commit `e03ae5f`
  daneben: `archived_at` wurde in der Laufzeitzone formatiert statt in der des Nutzers.
  Fremder Slice, deshalb nicht im Import-Commit.

---

## 2026-09-21 — S13 Nachtrag: Review, Klickpfad, Update-Bündelung — feature/trade-import — 20b092d, 8616a36

Ergänzt den S13-Block oben. Der bleibt unverändert stehen; zwei seiner Punkte unter
**Offen geblieben** sind inzwischen erledigt, ein dritter kam hinzu.

**Gebaut.** Das Review nach der siebenteiligen Checkliste ist nachgeholt worden, der
Klickpfad ebenfalls. Daraus drei Commits: der Archiv-Fix (`e03ae5f`, schon im S13-Block
genannt), ein `refactor:` an der Preisarithmetik und ein `perf:` am Schreibpfad.

**Erledigt aus dem S13-Block.**

- **Der Klickpfad ist gelaufen.** Konto über `/settings` anlegen, `/journal` → Import,
  Datei wählen (42 Round Trips aus 104 Zeilen), Konto, Vorschau (42 · 0 · 0 · 0, erste
  Zeile `MNQ long 2 · 2026-08-13 · 17:57 · — · new`), bestätigen („Imported 42 · updated
  0 · 0 already in your journal were skipped."), Batch-Liste („Fills (1).csv · Main ·
  Sep 21 · fills · Remove 42 of 42"), Journal mit Session und semantischer P&L-Farbe,
  dieselbe Datei erneut (0 · 0 · 42), Undo über die zweistufige Bestätigung, Dashboard
  zurück auf null. Keine Konsolenmeldung auf keinem Schritt. Das `17:57` im Browser ist
  die Bestätigung von E1 und E2 im echten Rendering.
- **Die N+1-Schleife bei den Updates ist weg.** Siehe unten.

**Entschieden unterwegs.**

- **Die Preis-Skala lag fünffach im Code.** `pnl.ts` exportiert jetzt `toScaledPrice`
  und `fromScaledPrice`; `fills`, `normalize`, `match` und `outcome` benutzen sie. Vier
  Literale `10_000` waren vier Definitionen davon, was ein Preis ist.
- **`derivePoints` rechnete in Float und rundete danach**, während `pnl.ts` dieselbe
  Subtraktion vollständig in BigInt fuhr. Kein Fehler bei Indexpreisen, aber zwei
  Methoden für eine Sache. Jetzt eine.
- **`Comparison<T>.value` ist `NonNullable`.** „Ein Import reißt nie eine Lücke" hing an
  einem `if` und einem `as never`; ein durchgerutschtes `null` wäre als Text `"null"` in
  einer `numeric`-Spalte gelandet. Die Regel steht jetzt im Typ.
- **Updates gehen gebündelt raus, ein Statement je Feldsignatur** (`updateImportedTrades`
  statt `updateImportedTrade`), über eine `VALUES`-Liste auf die Trade-ID gejoint.
  Gemessen: 200 geschlossene Positionen kosten **ein** UPDATE statt 200, und alle 200
  behalten ihren eigenen Exit-Preis. Die `SET`-Liste nennt weiterhin nur die Felder, die
  sich unterscheiden — alle zehn zu schreiben wäre einfacher gewesen, dann hinge die
  Lücken-Regel aber am Inhalt der `VALUES`-Liste statt an der Form des Statements.
  Spaltennamen kommen ausschließlich aus `UPDATABLE_COLUMN`, getippt über
  `BrokerOwnedField`, und jedes Tupel trägt seine eigenen Casts, weil Postgres sie sonst
  aus der ersten Zeile ableitet und eine zufällig leere erste Zeile die Typen für alle
  folgenden entschiede.
- **`getOwnedImportBatch` war toter Code** und ist mit der Umschreibung derselben Datei
  entfallen. Der Batch-Besitz wird in den schreibenden Anweisungen selbst geprüft.
- **Punkt 4 der Review-Checkliste widersprach E1.** Er verlangte, die Nutzerzone gelte
  „ausschließlich für Econ-Events". Korrigiert in
  `.claude/skills/feature-review/SKILL.md` — **die Datei ist gitignored**, die Korrektur
  liegt also nur lokal und fehlt nach einem frischen Clone.

**Offen geblieben.**

- **„Import 0 trades" ist klickbar**, wenn die Vorschau nur Skips meldet. Der Knopf tut
  nichts Schädliches — `commitImport` kehrt früh zurück —, sollte aber `disabled` sein.
  Aus dem Klickpfad gefunden, eigener kleiner `fix:`.
- **Das „Add account"-Formular bleibt im Hintergrund-Tab bei Opacity 0.** `motion`
  treibt die Animation nicht voran, solange der Tab unsichtbar ist. Betrifft
  Automatisierung, nicht einen Nutzer im fokussierten Tab. S3-Code, nicht angefasst.
- **Nach dem Perf-Umbau nur skriptgeprüft:** offene Restposition, unbekanntes Symbol,
  Übungskonto. Der Update-Pfad — der einzige, den der Umbau berührt — lief end-to-end
  durch die echten Actions.
- Round-Trip- und TradingView-Erkennung sowie die Tabellen-Extraktion stehen weiter aus,
  unverändert gegenüber dem S13-Block.

## 2026-09-22 — Dashboard-Zeitraum — feature/dashboard-range — 2d68415

**Gebaut.** Die Equity-Kurve im Dashboard läuft jetzt vom ersten Trade bis heute statt
über den laufenden Monat, mit Monatslabels samt Jahr auf der X-Achse. Der P&L-Kalender
blättert über `?month=YYYY-MM` zwischen Monaten, begrenzt auf den Monat des ersten
Trades und den laufenden Monat. Metrik-Tafel, Streak und Score bleiben beim laufenden
Monat.

**Dateien.** `src/db/queries/dashboard.ts` (`getMonthDayTotals` → `getDayTotals` mit
optionaler Range), `src/domain/equity.ts` (`monthTicks`), `src/lib/time.ts`
(`shiftMonth`, `formatMonthTickLabel`, `formatDateWithYear`),
`src/lib/dashboard/href.ts` (neu), `src/app/(app)/dashboard/page.tsx`,
`src/components/dashboard/equity-curve.tsx`, `src/components/dashboard/pnl-calendar.tsx`,
`context/Design.md` §4.8 und §4.15.

**Regeln.**

- **Die Kurve summiert über den ganzen übergebenen Zeitraum, ohne Neustart an der
  Monatsgrenze.** Lebt in `buildEquitySeries`, abgesichert durch „carries the sum across
  a month boundary". Der Test „ends on the month's net P&L" heißt jetzt „ends on the net
  P&L of the whole stretch" — der Erwartungswert ist derselbe, nur die Aussage passt
  zum neuen Zeitraum.
- **Eine Monatsmarke je Monat, auf einem tatsächlich gezeichneten Datum.**
  `firstDayOfEachMonth` in `equity.ts`, abgesichert durch die fünf Tests unter „the
  month marks": einschließlich Jahreswechsel und „picks a date that is really on the
  curve".
- Geldregeln über mehrere Monate (Multiplikator, Übungskonten, ein gewähltes Konto,
  Drawdown ab Null) sind erstmals für `getDayTotals` gegen echtes Postgres getestet:
  zehn Fälle in `dashboard.test.ts`.

**Entschieden unterwegs.**

- **`?month` wird auf 01–12 geprüft, nicht nur auf zwei Ziffern.** `2026-13` passte auf
  das lockere Muster, machte aus `monthRangeOf` ein Invalid Date und brachte die Seite
  mit einem 500 herunter.
- **Der laufende Monat schreibt keinen URL-Parameter.** „Jetzt" ist kein Zustand, der
  synchron gehalten werden muss. `buildHref` lässt ein `undefined` weg.
- **Der Monats-Drawdown bleibt eine eigene Abfrage** (`getDayTotals(scope,
  monthRangeOf(month))`) und wird nicht aus der Gesamtreihe herausgeschnitten. Er misst
  ab dem Höchststand oder Null *innerhalb* des Monats; ein Ausschnitt der Gesamtreihe
  würde den Höchststand des Vormonats mitschleppen. Die Kalendertage dagegen sind ein
  Ausschnitt der Gesamtreihe, keine dritte Abfrage.
- **Die Monatsmarken wählt die Domain, nicht Recharts.** Recharts würde jeden Punkt
  beschriften und „Aug 2026" zwanzigmal drucken. Liegt die ganze Reihe in einem Monat,
  schaltet die Achse auf Tageslabels zurück.
- **Kurvenkopf „13 Aug 2026 — today"** über `formatDateWithYear`, der Zeitraum
  beschreibt sich aus dem ersten Punkt der Reihe, ohne eigene Abfrage.
- **`ReadExecutor` in `dashboard.ts`** als Test-Naht für die Transaktion mit Rollback,
  nach dem Muster von `analytics.ts` und `import.ts`, lokal mit eigenem `Pick`. Den Typ
  zusammenzulegen wäre ein eigener Refactor.
- **Außerhalb des Scope:** `firstValue` lag identisch in `analytics/page.tsx`,
  `journal/page.tsx` und `lib/prop-firms/href.ts` und wäre auf der Dashboard-Seite ein
  viertes Mal entstanden. Er steht jetzt einmal in `src/lib/search-params.ts` neben
  `buildHref`. Kein Verhalten geändert; im Review als Scope-Abweichung gemeldet und im
  Branch belassen.

**Offen geblieben.**

- **Ein `?month` außerhalb des Bereichs wird nicht begrenzt.** `2099-01` oder ein Monat
  vor dem ersten Trade zeigt ein leeres Raster mit nur einer aktiven Richtung. Kein
  Absturz (200), aber auch keine Begrenzung auf die Grenzen. Aus dem Review, nicht
  entschieden.
- `ReadExecutor` existiert jetzt dreimal mit verschiedenem `Pick`.

## 2026-09-22 — P2.1 Better Auth — feature/better-auth — aa4efdf

**Gebaut.** Die App hat jetzt eine Anmeldung. Man meldet sich mit Nutzername und Passwort
an und bei aktivierter Zwei-Faktor-Anmeldung zusätzlich mit einem TOTP-Code oder
Backup-Code. Registrierung, Passwortwechsel, 2FA und Kontolöschung stehen in `/settings`,
abmelden kann man über die Sidebar. Ohne Session ist nur `/login`, `/register` und
`/api/auth/*` erreichbar. Bisher gab `getCurrentUser()` jedem den geseedeten Nutzer
`local` zurück. Der ist jetzt der Demo-User mit Passwort aus `DEMO_USER_PASSWORD` und
behält seine Daten.

**Dateien.** `src/lib/auth/auth.ts` (Better-Auth-Konfiguration),
`src/lib/auth/get-current-user.ts` (Session statt Seed-User, gleiche Signatur),
`src/proxy.ts`, `src/app/api/auth/[...all]/route.ts`, `src/db/schema/auth.ts`,
`src/db/schema/users.ts`, `src/app/(auth)/*`, `src/components/auth/*`,
`src/components/settings/{security-section,password-card,two-factor-card,totp-qr,delete-account-card}.tsx`,
`src/db/seed.ts`, `src/lib/env.ts`, `context/Design.md` §4.19.

**Migration.**
- **0011** (erzeugt, von Hand ergänzt): `users` bekommt `email`, `email_verified`,
  `image`, `two_factor_enabled`, `display_username` und `updated_at`. Neu sind
  `auth_sessions`, `auth_accounts`, `auth_verifications` und `auth_two_factors`, alle mit
  Integer-Identity. Die Fremdschlüssel von `accounts`, `trades`, `daily_notes`,
  `user_badges` und `import_batches` auf `users` bekommen `ON DELETE CASCADE`. Von Hand
  ergänzt ist der Nachtrag der E-Mail für bestehende Nutzer, bevor `NOT NULL` greift.
  drizzle-kit hätte die Spalte sofort `NOT NULL` angelegt.
- **0012** (erzeugt): löscht `users.password_hash` und `users.totp_secret`. Die Trennung
  von 0011 hat einen Grund: Bei hinzugefügten und gelöschten Spalten in einem Schritt
  fragt drizzle-kit interaktiv, ob es Umbenennungen sind.
- **0013** (handgeschrieben): `trade_accounts_account_id_accounts_id_fk` wird `DEFERRABLE
  INITIALLY DEFERRED`. drizzle-kit kann das nicht ausdrücken, der Snapshot kennt es
  deshalb nicht. Das schadet nicht, weil drizzle-kit Aufschiebbarkeit nicht vergleicht.
  Ein Hinweis steht als Kommentar in `src/db/schema/trades.ts`.

**Regeln.** `src/domain/**` ist nicht berührt. Durch Tests abgesichert:
- Die Kaskade beim Löschen eines Nutzers erreicht jede Tabelle, und ein Konto mit
  zugewiesenen Trades lässt sich weiterhin nicht löschen
  (`src/db/queries/__tests__/user-deletion.test.ts`, gegen echtes Postgres).
- Die Formulargrenzen entsprechen denen von Better Auth (`src/schemas/__tests__/auth.test.ts`).
- Die Platzhalter-E-Mail wird kleingeschrieben
  (`src/lib/auth/__tests__/placeholder-email.test.ts`).
- Das TOTP-Label enthält nie `users.invalid` (`src/lib/auth/__tests__/totp-label.test.ts`).

**Entschieden unterwegs.**
- **Version 1.7.5 statt des Pins 1.7.3**, auf Anweisung. Dazu `uqr` 0.1.3 für den
  QR-Code: keine Abhängigkeiten, Typen mitgeliefert. `qrcode` hätte yargs und pngjs
  mitgezogen.
- **`users` ist Better Auths Nutzertabelle**, mit Integer-IDs über `generateId:
  "serial"`. Alle bestehenden Fremdschlüssel bleiben. Better Auth gibt IDs als String
  zurück, `getCurrentUser()` wandelt sie einmal mit `Number()` um.
- **Better Auths „account" heißt hier `auth_accounts`**, damit eine Zugangszeile nie mit
  einem Handelskonto in `accounts` verwechselt wird.
- **Keine E-Mail.** Better Auth 1.7.5 verlangt sie trotzdem als eindeutiges Pflichtfeld.
  Gespeichert wird `<username>@users.invalid`. Das setzt ein `databaseHooks`-Hook
  serverseitig, was auch immer der Client schickt. `.invalid` ist nach RFC 2606
  reserviert.
- **Der TOTP-Kontoname** ist in Better Auth fest `user.email`. Vor dem QR-Code wird er
  durch den Nutzernamen ersetzt (`totp-label.ts`), sonst stünde der Platzhalter in der
  Authenticator-App.
- **Löschen nur mit Passwort**, erzwungen über einen `hooks.before` auf `/delete-user`.
  Ohne ihn akzeptiert Better Auth eine Session, die jünger als einen Tag ist.
- **Kaskade statt Löschfunktion.** Meine erste Annahme, NO ACTION werde erst am Ende des
  Statements geprüft, war falsch: Der Test scheiterte an `trade_accounts → accounts`.
  Entschieden wurde `DEFERRABLE INITIALLY DEFERRED` (0013). Der Schlüssel hat bewusst
  keine Kaskade, damit das Löschen eines Kontos nicht still seine Zuweisungen mitnimmt.
- **Screenshots beim Löschen.** `beforeDelete` liest die Storage-Schlüssel, `afterDelete`
  entfernt die Dateien, nachdem die Zeile weg ist. Die Kaskade nimmt die
  Screenshot-Zeilen mit, deshalb müssen die Schlüssel vorher gelesen werden.
- **Registrierung** ist über `REGISTRATION_OPEN` steuerbar. Nur der exakte Wert `"true"`
  öffnet sie, eine vergessene Variable schließt sie also. `disableSignUp` sperrt den
  Endpunkt, nicht nur den Screen.
- **Session 7 Tage**, einmal am Tag verlängert (Standard von Better Auth). **2FA ist
  optional** pro Nutzer. Die Backup-Codes werden einmal angezeigt und gelten beim Login.
  **`/`** leitet auf `/dashboard`, ohne Session schickt `proxy.ts` vorher auf `/login`.
- **`proxy.ts` prüft die volle Session**, nicht nur das Cookie. Der Proxy läuft in
  Next 16 auf Node, die Datenbank ist dort erreichbar. `/api/*` antwortet ohne Session
  mit 401 statt einer Weiterleitung. Jede Seite, Action und Route prüft trotzdem erneut
  über `getCurrentUser()`, laut Next-Doku ist der Proxy keine Berechtigungsgrenze.
- **`getCurrentUser` in Reacts `cache()`** (aus dem Review): Layout und Seite teilen sich
  eine Session-Abfrage pro Request.
- **`/api/uploads` GET** prüft zusätzlich, dass der Schlüssel dem angemeldeten Nutzer
  gehört. Eine weitergegebene signierte URL reicht nicht mehr.
- **`/is-username-available` ist abgeschaltet** (aus dem Review). Sonst hätte jeder ohne
  Anmeldung prüfen können, welche Nutzernamen existieren.
- **Nur TOTP.** `twoFactor.enable` wird mit `method: "totp"` aufgerufen. Die Methode
  „otp" würde Codes per Mail oder SMS verschicken.
- **Klickpfad-Korrektur:** Nach „Set up" war nicht erkennbar, dass nach dem Passwort der
  QR-Code kommt. Die Karte sagt jetzt „Step 1 of 2 … Step 2 of 2", der Button heißt
  „Show QR code".
- **Außerhalb des Scope:** Die Test-Fixtures in `analytics`, `dashboard` und
  `trades.test.ts` bekommen nur die neue Pflichtspalte `email`, keine Assertion ist
  geändert.

**Offen geblieben.**
- **`SubmitButton` und `AuthField`** (`src/components/auth/`) doppeln den Button und die
  Feldklassen aus `account-create-form.tsx`. `GHOST_BUTTON` in `two-factor-card.tsx`
  doppelt die Klassen der Export-Karte. Die Komponenten werden auch in Settings benutzt,
  gehören also eher nach `components/ui`. Das Zusammenlegen ist ein eigener
  `refactor:`-Slice.
- **Scheitert `afterDelete`** beim Entfernen der Dateien, ist der Nutzer schon gelöscht.
  Die Karte meldet dann trotzdem „Nothing was removed". Auf lokaler Platte ist das
  praktisch ausgeschlossen, mit R2 muss es gelöst werden.
- **Formulare validieren beim Absenden**, nicht live beim Tippen wie in `Design.md`
  §4.5. Das ist dasselbe Muster wie in `account-create-form`.
- **Für den Neon/Vercel-Slice:** `BETTER_AUTH_URL` deckt nur eine Domain ab.
  Preview-Deployments brauchen `trustedOrigins`, sonst scheitert die Origin-Prüfung.
  Screenshots liegen weiterhin auf lokaler Platte.
- **`pnpm build` bei laufendem `pnpm dev`** ließ den Dev-Server mit einem alten
  `auth.ts`-Modul weiterlaufen. Erst ein Neustart half.

## 2026-09-22 — P2.2 Neon + Vercel — feature/neon-vercel — b59dc13

**Gebaut.** Die Datenbank läuft auf Neon, die App auf Vercel. Neon-Projekt
`tradingjournal` (`restless-hat-06633519`) in aws-eu-central-1 mit PG 18. Main trägt
Production: Migrationen 0000–0013 und die Referenz-Seeds (Instruments, Trade-Tags,
Badges, Prop Firms), aber keinen Nutzer. Der feste Branch `preview` trägt alle
Preview-Deployments. Er ist von Main abgezweigt und hat zusätzlich den Demo-User
`local`. Das Vercel-Projekt `sascha-backers-projects/tradingjournal` läuft in fra1 und
hat fünf Variablen in Production und vier in Preview. Die Secrets sind pro Umgebung neu
erzeugt und wurden nie ausgegeben. Klickpfad auf der Preview:
Login → Dashboard → neuer Trade → Journal → Settings. Keine Konsolenmeldung, kein
Runtime-Fehler.

**Dateien.** `src/db/index.ts` (`prepare: false`), `src/lib/env.ts`
(`DATABASE_URL_DIRECT`, `VERCEL_URL`, `VERCEL_BRANCH_URL`, alle optional),
`drizzle.config.ts` (direkte URL, wenn gesetzt), `src/lib/auth/trusted-origins.ts` mit
Test, `src/lib/auth/auth.ts` (`trustedOrigins`), `vercel.json` (`regions: ["fra1"]`),
`.vercelignore`. Doku: `CLAUDE.md` (Neon-Befehle), `coding-standards.md`
(Postgres-Zeile).

**Entschieden unterwegs.**
- **Frankfurt statt iad1.** Das Vercel-Projekt stand auf iad1. Wichtig ist, dass
  Function und DB in derselben Region stehen, und Frankfurt liegt beim Nutzer. Die
  Region steht in `vercel.json` und nicht in `vercel.ts`, weil `vercel.ts` die neue
  Dependency `@vercel/config` bräuchte.
- **`prepare: false` gilt überall**, auch lokal. Neons Pooler arbeitet im
  Transaction-Mode, eine Prepared Statement bleibt an einer Server-Verbindung hängen,
  und die nächste Query landet auf einer anderen. Eine Weiche für lokal würde zwei
  Pfade bedeuten, die sich unterschiedlich verhalten. Der Preis ist ein erneutes Parsen
  pro Statement.
- **Gepoolt zur Laufzeit, direkt für Migrationen.** Die App liest nur `DATABASE_URL`,
  auf Neon ist das die `-pooler`-URL. `DATABASE_URL_DIRECT` liest nur drizzle-kit, weil
  eine Migration eine Session braucht. Lokal fehlt die Variable, und der Fallback nimmt
  `DATABASE_URL`. Die Seeds laufen über den Pool, weil sie `src/db/index.ts` benutzen,
  und funktionieren damit.
- **`channel_binding=require` aus den Neon-URLs gestrichen**, nur `sslmode=require`
  bleibt. postgres.js reicht unbekannte Query-Parameter als Server-Parameter weiter.
  Den Parameter hätte es also dem Server geschickt, statt ihn selbst auszuwerten.
  Geprüft, dass die Verbindung ohne ihn steht, nicht, dass sie mit ihm scheitern
  würde.
- **Neon-URLs lokal in eigenen Dateien.** `.env.neon.production` und
  `.env.neon.preview` sind gitignored, Modus 600. Sie werden als zweites `--env-file`
  hinter `.env.local` geladen, und Node lässt die spätere Datei gewinnen. Vor dem
  ersten Lauf wurde der Host ausgegeben und geprüft, dass wirklich Neon getroffen wird.
  Das `db:*`-Script mit fest verdrahtetem `.env.local` bleibt unverändert, für Neon
  kommt kein eigenes Script dazu. Die Befehle stehen in `CLAUDE.md`.
- **`trustedOrigins` exakt, ohne Wildcard.** `deploymentOrigins` macht aus
  `VERCEL_URL` und `VERCEL_BRANCH_URL` eine `https`-Liste. Jede Preview vertraut damit
  nur sich selbst, nicht allen Deployments im Scope. `BETTER_AUTH_URL` ist auch in
  Preview die Production-URL, weil die Preview-Origin über diese Liste hereinkommt.
  Dass die Liste wirklich greift, belegt der Login: Better Auths `validateFormCsrf`
  erzwingt die Origin-Prüfung, sobald `Sec-Fetch-*`-Header da sind, und Chrome sendet
  sie.
- **Der Demo-User nur auf `preview`**, damit Previews ohne Registrierung testbar sind.
  Das Passwort ist dasselbe `DEMO_USER_PASSWORD` aus `.env.local`. Die Preview steht
  zusätzlich hinter der Deployment Protection von Vercel.
- **Leak beim ersten Preview-Deploy.** `vercel deploy` aus dem Working Tree liest
  `.gitignore` nicht, und eine `.vercelignore` gab es nicht. Hochgeladen wurden damit
  `.env.neon.*` mit dem Neon-Passwort, `tmp/import-samples/Fills (1).csv` und
  `.claude/`. `.env.local` schließt Vercel selbst aus. Behoben so: das Deployment
  gelöscht, das Passwort von `neondb_owner` auf beiden Branches zurückgesetzt, lokale
  Dateien und beide Vercel-`DATABASE_URL` aktualisiert, `.vercelignore` angelegt.
  Deren Muster sind am Root verankert: der erste Versuch mit einem nackten `storage/`
  schloss auch `src/lib/storage` aus und ließ den Build scheitern. **Regel:** Vor
  jedem `vercel deploy` aus dem Working Tree die Dateiliste des Deployments auf `.env*`
  prüfen.
- **`vercel link` schreibt in `.env.local`.** Es hängt einen Block mit
  `VERCEL_OIDC_TOKEN` an und lässt die übrigen Werte stehen. `vercel env pull` würde
  die Datei dagegen mit dem Stand der Development-Umgebung überschreiben, und die ist
  leer. Deshalb nie `vercel env pull`.
- **Die Vercel-Variablen sind vom Typ Secret**, der Standard der CLI. Sie lassen sich
  also nicht zurücklesen. Zum Ändern gibt es `vercel env update`.

**Offen geblieben.**
- **Production ist noch nicht verifiziert.** Der Merge nach `main` löst den ersten
  grünen Production-Build aus. Danach registrierst sich Sascha, `REGISTRATION_OPEN`
  geht auf `false`, es folgt ein Redeploy, und `/register` muss abgewiesen werden.
- **Die App verbindet sich als `neondb_owner`**, also als Eigentümerin der Datenbank
  mit DDL-Rechten. Eine eigene App-Rolle mit weniger Rechten wäre ein eigener
  Hardening-Punkt.
- **Screenshots scheitern auf Vercel.** Das ist die bekannte Lücke, `LocalDiskStorage`
  schreibt ins schreibgeschützte Dateisystem. R2 ist ein eigener Slice.
- **Eine neue Migration muss von Hand auf beide Neon-Branches.** Nichts erinnert daran
  oder erzwingt es.
- **Das Datumsfeld in `/journal/new`** war beim Klickpfad leer, deshalb kam
  „Invalid date“. Nicht geprüft, ob das lokal genauso ist. Mit diesem Slice hat es
  nichts zu tun.

## 2026-09-22 — Production befristet offen für Testnutzer — kein Slice

**Warum.** Production dient für eine begrenzte Zeit als Testumgebung: Freunde
registrieren sich selbst, legen Fake-Trades an und geben Feedback. Niemand nutzt es
produktiv, die Datenbank wird am Ende geleert. `REGISTRATION_OPEN` bleibt deshalb
vorerst `true` statt direkt nach der ersten Registrierung zuzugehen.

**Rückweg.** Neon-Snapshot `pre-friends-test` (`snap-calm-poetry-b1jljetn`) vom Branch
`main`, angelegt bevor sich der erste Nutzer registriert hat. Zustand: Migrationen
0000–0013 und die Referenz-Seeds, null Nutzer. Ein Snapshot und nicht Point-in-time,
weil `history_retention_seconds` auf 21600 steht — sechs Stunden reichen für eine
Testphase über Tage nicht.

**Ende der Testphase.** Entweder Restore des Snapshots oder `delete from users` gegen
`main`; alle acht Nutzer-FKs stehen auf `ON DELETE CASCADE`, die Referenzdaten hängen
nicht an `users` und überleben beides. Der Unterschied: der Restore setzt auch die
Identity-Sequenzen zurück. Danach `REGISTRATION_OPEN` auf `false`, Redeploy, und prüfen,
dass `/register` abweist. *Enddatum offen.*

**Bekannte Lücke für die Tester.** Screenshots scheitern in Production, weil
`LocalDiskStorage` ins schreibgeschützte Dateisystem schreibt. `storage.put` läuft vor
dem `insert`, es bleibt also keine verwaiste Zeile in `trade_screenshots` zurück. Die
Tester werden vorgewarnt, R2 bleibt ein eigener Slice.

**Damit erledigt.** Der Punkt „Production ist noch nicht verifiziert" aus P2.2.

**Offen.** Kein `robots.txt` und kein Meta-`noindex` im Projekt, während `/register`
offen steht. Bewusst nicht angefasst.

## 2026-09-23 — P2.2 Storage auf R2 — feature/storage-r2 — 145c1db

**Gebaut.** Screenshots liegen in Produktion in einem privaten Cloudflare-R2-Bucket
statt auf der Platte der Function. Hinter dem bestehenden `StorageAdapter` steht eine
zweite Implementierung, davor eine Weiche über `STORAGE_DRIVER`. Kein Aufrufer des
Uploads ändert sich: `signed-url.ts`, `src/app/api/uploads/route.ts` und die drei
Screenshot-Komponenten sind im Diff nicht enthalten. Klickpfad lokal gegen den echten
Bucket gelaufen — Trade mit Screenshot angelegt, Anzeige, Lightbox, zweiter Screenshot
über den Stift, beide gelöscht; danach meldet `ListObjectsV2` null Objekte. Keine
Konsolenmeldung.

**Dateien.** `src/lib/storage/r2.ts` (neu), `src/lib/storage/index.ts` (Weiche),
`src/lib/storage/types.ts` und `local-disk.ts` (`deleteMany`),
`src/lib/auth/delete-user-files.ts`, `src/lib/env.ts`,
`src/lib/storage/__tests__/index.test.ts` (neu, 19 Tests), `package.json`
(`@aws-sdk/client-s3` 3.1132.0), `context/coding-standards.md`.

**Entschieden unterwegs.**
- **Die signierte URL bleibt die eigene der App, keine von S3.** Der Bucket ist privat,
  die Credentials bleiben auf dem Server, und `/api/uploads` prüft Session, HMAC und
  Key-Präfix, bevor es die Bytes streamt. Presigned URLs hätten den Aufrufer geändert
  und den Besitzcheck aus der Kette genommen. Preis: jedes Bild läuft durch die
  Function statt direkt aus R2.
- **`STORAGE_DRIVER` explizit statt aus den R2-Variablen abgeleitet.** Eine vergessene
  Variable in Produktion soll den Start abbrechen, nicht still auf das
  schreibgeschützte Dateisystem zurückfallen. Nebeneffekt, der den Slice erst
  verifizierbar machte: R2 ließ sich lokal prüfen, statt erst im Deployment.
- **`R2_ENDPOINT` ist der volle Host, keine Account-ID.** Ein Bucket mit Jurisdiktion
  ist nur über seinen eigenen Host erreichbar (`<id>.eu.r2.cloudflarestorage.com`); aus
  Teilen zusammengebaut hätte der Code festgeschrieben, welche Jurisdiktionen es gibt.
  Der Bucket liegt in der EU-Jurisdiktion.
- **SDK-Version bewusst nicht die neueste.** `3.1138.0` war vier Stunden alt, pnpms
  Mindest-Release-Frist hätte es blockiert und schrieb stattdessen 19 Ausnahmen in
  `pnpm-workspace.yaml`. Stattdessen `3.1132.0` (acht Tage alt), das ohne jede Ausnahme
  durchgeht. **Regel:** Schreibt `pnpm add` etwas in `minimumReleaseAgeExclude`, ist das
  kein Rauschen, sondern der umgangene Supply-Chain-Schutz — eine gereifte Version
  nehmen statt die Ausnahme mitzucommitten.
- **`deleteMany` am Interface, nach dem Review ergänzt.** Der Wechsel Platte → Netzwerk
  macht aus N Dateisystemoperationen N HTTP-Requests, und die Zahl der Screenshots eines
  Nutzers ist unbegrenzt; die Kontolöschung wäre gegen das Function-Timeout gelaufen,
  und scheitert sie, ist der Nutzer schon gelöscht (P2.1). Gegen R2 ein
  `DeleteObjectsCommand` je 1000 Keys, gemessen ein Call statt zwölf. Das ist die eine
  Stelle, an der der Slice doch einen Aufrufer anfasst — bewusst, und `delete-user-files.ts`
  stand nie auf der „Do not build"-Liste.
- **Teilfehler eines Batch-Deletes werden geworfen.** S3 antwortet auch dann 200, wenn
  einzelne Keys scheitern; ohne den Blick in `Errors` bliebe eine Datei still liegen.
- **Die Konfiguration ist ein Typ, kein Cast.** `createStorage` nimmt eine
  unterschiedene Union, damit ein Aufruf mit `r2` ohne Credentials am Compiler scheitert
  statt an einem `endpoint: undefined` zur Laufzeit. Der Test, der diesen Fall abfing,
  konnte dafür entfallen.
- **`requestChecksumCalculation` nicht gesetzt.** R2 unterstützt CRC-64/NVME seit Juli
  2025, die alte Inkompatibilität ist erledigt. Käme doch ein `400 BadDigest`, ist das
  die erste Spur.

**Offen geblieben.**
- **Die HMAC-Negativprobe ist im laufenden Server nicht isolierbar.** Eine manipulierte
  `/api/uploads`-Signatur liefert 401 vom Proxy, weil der Session-Gate vorher greift;
  dass die Signaturprüfung selbst 403 gibt, belegt nur `signed-url.test.ts`.
- ~~**Production ist noch nicht geprüft.**~~ Erledigt am 23.09.2026, siehe den Nachtrag
  unten.
- **`get` lädt das Objekt vollständig in den Speicher** (`transformToByteArray`), wie
  `readFile` vorher. Bei 8 MB Upload-Limit unkritisch, aber kein Streaming.
- **Verwaiste Objekte räumt weiterhin niemand auf.** Stand schon im Spec unter „Do not
  build" und bleibt es.

## 2026-09-23 — P2.2 Nachtrag: R2 in Vercel scharf geschaltet — kein Branch, kein Commit

**Gemacht.** Reine Konfiguration, kein Code. `STORAGE_DRIVER=r2`, `R2_ENDPOINT` und
`R2_BUCKET` als Config, `R2_ACCESS_KEY_ID` und `R2_SECRET_ACCESS_KEY` als Secret — alle
fünf für Production **und** Preview. Werte über stdin aus `.env.local` übergeben, nicht
über `--value`, damit kein Secret in der Prozessliste steht. Danach Redeploy desselben
Commits.

**Verifiziert in Production**, Klickpfad auf `tradingjournal-gamma-three.vercel.app`:
Trade mit Screenshot angelegt → Objekt `screenshots/3/1/…jpg` im Bucket, 2,7 KB PNG
serverseitig zu 9,5 KB JPEG konvertiert; Thumbnail und Lightbox laden über
`/api/uploads` (200 im Log); zweiter Screenshot über den Stift; beide gelöscht →
`ListObjectsV2` meldet wieder null Objekte. Keine Konsolenmeldung, nur 200er im
Server-Log, kein `BadDigest`.

**Entschieden unterwegs.**
- **Preview teilt sich den Bucket mit Production.** Bewusst, weil die Preview-DB eine
  Neon-Branch der Production-Daten ist und dieselben Storage-Keys trägt — Preview zeigt
  damit echte Screenshots. **Preis:** ein in Preview gelöschter Trade löscht das Objekt
  auch für Production. Wer das nicht will, braucht einen zweiten Bucket samt eigenem
  Token, nicht bloß eine zweite Variable.
- **Die drei unkritischen Variablen bleiben Config, nicht Secret.** Ein Secret lässt
  sich nicht zurücklesen; `STORAGE_DRIVER`, `R2_ENDPOINT` und `R2_BUCKET` will man beim
  nächsten Fehler ohne Cloudflare-Login sehen können. Nur die Credentials sind Secret.

**Nebenbefund, der Production blockiert hat.** `/register` gab „couldn't create the
account". Ursache war nicht R2: `BETTER_AUTH_URL` zeigte auf einen anderen Host als den
aufgerufenen, und `trustedOrigins` ist `baseURL` plus `VERCEL_URL`/`VERCEL_BRANCH_URL`
(`src/lib/auth/trusted-origins.ts`) — der Alias war in keiner der drei enthalten, also
403 „Invalid origin" auf `/api/auth/sign-up/email`. `BETTER_AUTH_URL` (Production) zeigt
jetzt auf `https://tradingjournal-gamma-three.vercel.app`. **Regel:** `BETTER_AUTH_URL`
muss exakt der Host sein, unter dem die Seite tatsächlich aufgerufen wird; kommt später
eine eigene Domain, muss sie hier mit.

**Offen.** Die beiden projektgebundenen Production-Hosts
(`…-sascha-backers-projects.vercel.app`, `…-git-main-…`) antworten 401, stehen also
hinter Deployment Protection. Für die Freunde-Runde ist `tradingjournal-gamma-three`
die einzige brauchbare URL — eine eigene Domain ist damit nicht dringend, aber der
saubere Weg.

---

## 2026-09-24 — S14 Trade-Detailseite und Bearbeiten — feature/trade-detail-edit — 4a3204f

**Gebaut.** Ein Trade lässt sich nachträglich ändern — jedes Feld, nicht nur seine
Anhänge. `/journal/[id]` zeigt ihn auf einer eigenen Seite, `/journal/[id]/edit`
bearbeitet ihn im selben Formular wie „New trade", vorbefüllt, inklusive Löschen.
Dazu zeigt das Journal endlich die Confluences und Mistakes, die seit S4 gespeichert,
aber nie gelesen wurden, und ein TradingView-Link trägt sein Chart als Vorschau.

**Dateien.** `src/app/(app)/journal/[id]/page.tsx` und `[id]/edit/page.tsx` (neu),
`src/components/journal/trade-detail.tsx` und `link-card.tsx` (neu),
`src/components/trades/new-trade-form.tsx` → `trade-form.tsx` mit Create-/Edit-Modus,
`src/components/journal/trade-row.tsx` (Zeile ist jetzt ein Link),
`src/db/queries/trades.ts` (`getJournalTradeById`, `insertTradeWithRelations`,
`replaceTradeWithRelations`, zwei neue jsonb-Subqueries),
`src/db/queries/accounts.ts` (`listAssignableAccounts`), `src/actions/trades.ts`
(`updateTrade`, `deleteTrade`), `src/lib/links.ts` (`snapshotImageUrl`).

**Migration.** Keine. Das Datenmodell reichte seit S4, nur gelesen wurde es nie
vollständig.

**Regeln.** `src/domain/**` unverändert. `validateTradeAccountAssignment` bekommt in
`updateTrade` einen zweiten Aufrufer und trägt dort dieselbe Regel: ein ausgeführter
Trade braucht mindestens ein Konto.

**Entschieden unterwegs.**

- **Detailseite statt aufklappender Zeile.** Mit Sascha geklärt. Die Detailzeile aus
  §4.9 konnte nicht mehr fassen, was hingehört — Confluences nach Gruppe, Mistakes,
  Notizen in voller Länge, Chart-Vorschauen, der Weg ins Bearbeiten. Zwei Orte für
  dieselben Felder hätten sich auseinanderentwickelt. §4.9 ist entsprechend
  umgeschrieben, das Aufklappen ersatzlos gestrichen, das Dashboard zieht über
  dieselbe Komponente mit.
- **Confluences als Zähler in der Zeile, als Badges auf der Seite.** Ausgeschrieben
  stünden bei fünf Confluences zwei Zeilen dort, wo bei anderen eine steht.
- **Das Link-Vorschaubild ist abgeleitet, nicht abgerufen.** Sascha wollte ein Bild
  zum Link; `coding-standards.md` verbietet den serverseitigen Abruf einer fremden URL
  (SSRF), `Design.md` §4.13 verbot das Thumbnail *mit dieser Begründung*. Aus
  `tradingview.com/x/<id>/` folgt die Bildadresse aber durch eine feste Regel
  (Verzeichnis = erstes Zeichen der id, kleingeschrieben) — `snapshotImageUrl` ist
  reine Zeichenkettenarbeit, das Bild holt der Browser. Die Sicherheitsregel bleibt
  damit unangetastet und wurde **nicht** geändert; §4.13 hat den eng gefassten Zusatz
  bekommen. Die Ableitung ist am 2026-09-23 gegen den echten Host geprüft: richtig
  abgeleitet 200 `image/png`, dieselbe id im falschen Verzeichnis 403. Drei
  Alternativen lagen auf dem Tisch — Host-Allowlist mit Server-Abruf (hätte CLAUDE.md
  und coding-standards.md aufgemacht, Rest-Risiko DNS-Rebinding) und „nur
  Screenshots"; die String-Umformung bekommt das Bild ohne die Regel zu kosten.
- **`updateTrade` schreibt alle Spalten und ersetzt die drei Join-Tabellen.** Ein
  Teil-Update ließe beim Umschalten auf „Missed setup" Exit, Kontrakte, Ergebnis und
  Override als Geister hinter einem `taken = false` stehen, und eine abgewählte
  Confluence verschwände nie. `points` wird mitgerechnet, weil es eine persistierte
  Spalte ist.
- **Die Schreiblogik liegt in `src/db/queries/trades.ts`, nicht in der Action.**
  Vitest löst den `@`-Alias nicht auf, Server Actions sind hier deshalb nicht
  importierbar — deswegen gibt es im ganzen Projekt keinen Action-Test. Statt die
  Toolchain dafür zu ändern, ist die SQL dorthin gewandert, wo
  `coding-standards.md` sie ohnehin verortet; die Action behält Validierung,
  Ownership und Revalidation. `insertTradeWithRelations` und
  `replaceTradeWithRelations` nehmen die Transaktion als Parameter, damit ein Test
  sie gegen echtes Postgres laufen lassen und zurückrollen kann.
- **`getJournalTradeById` bekommt eine eigene Sichtbarkeit (`"owner"`).** Der
  Listen-Zweig blendet bei „All accounts" einen Trade aus, der nur auf Übungskonten
  liegt. Auf seiner eigenen Seite muss er trotzdem aufgehen, sonst bricht
  „Nothing disappears silently" genau dort, wo alles zu sehen sein soll. Ownership
  bleibt die einzige Bedingung; ein fremder Trade liefert `null`, nicht einen Fehler,
  damit „gibt es nicht" und „gehört dir nicht" ununterscheidbar bleiben.
- **`listAssignableAccounts` statt `listOwnedAccountIds` im Edit-Pfad.** Letztere
  filtert archivierte Konten weg — beim Anlegen richtig, beim Bearbeiten hätte sie
  einem alten Trade stumm die Zuweisung abgezogen, und ein Trade ohne Konto ist ein
  verbotener Zustand. Regel: eine archivierte Zuweisung darf bleiben, nie neu
  entstehen. Formular und Action lesen dieselbe Query, damit die angebotene und die
  akzeptierte Menge nicht auseinanderlaufen.
- **Links bleiben aus `updateTrade` heraus.** Auf einem existierenden Trade sind sie
  eigene Zeilen, die live angelegt und entfernt werden; sie aus der Payload zu
  ersetzen hätte gelöscht, was der Nutzer in diesem Formular nie angefasst hat.
  Screenshots können eine Server Action ohnehin nicht mitnehmen.
- **`CLAUDE.md` unter „Traps" ist geschärft, nicht aufgeweicht.** Der Satz sagt jetzt
  „no server-side previews" und benennt die eine erlaubte Form samt Begründung:
  ableiten ist kein Abrufen, und alles, was eine Anfrage vom Server braucht, um
  herauszufinden, worauf ein Link zeigt, bleibt verboten. Mit Sascha abgestimmt.
- **Der Stift-Auslöser aus S6 ist verschwunden.** Damit ist der seit S6 offene
  Widerspruch zu §4.13 („kein ‚Add screenshot' in der Leseansicht") erledigt: die
  Leseansicht hat keinen mehr, Anhänge werden im Bearbeiten-Formular verwaltet.

**Offen geblieben.**

1. Der Klickpfad für einen praxis-only Trade über seine direkte URL ist im Browser
   nicht gelaufen — in der lokalen Datenbank gibt es kein Übungskonto. Die Regel ist
   stattdessen als Query-Test gegen echtes Postgres festgenagelt
   (`trade-detail.test.ts`), zusammen mit dem Gegenstück, dass derselbe Trade in
   `listJournalTrades` fehlt.
2. Ein einzelner bestehender Link lässt sich weiterhin nicht bearbeiten, nur
   hinzufügen und entfernen. Ebenso wenig lassen sich Screenshots oder Links
   umsortieren.

## 2026-09-24 — Startseite und Proxy bei DB-Ausfall — feature/landing-page — dfec8ad

**Anlass.** `localhost:3000` warf `Uncaught APIError: Failed to get session`. Die
lokale Postgres lief nicht; mit einem gültig signierten Session-Cookie fragt
`auth.api.getSession()` im Proxy die Datenbank und wirft. `/login` lud, weil es
öffentlich ist und keine Datenbank braucht.

**Gebaut.** `/` ist eine öffentliche Startseite mit „Sign in" und „Create account"
(letzteres nur bei `REGISTRATION_OPEN=true`, wie der Link im `LoginForm`). Die Seite
liegt in `src/app/(auth)/page.tsx`, damit sie `force-dynamic` aus dem Layout erbt,
und liest weder Session noch Daten. `src/proxy.ts` fängt einen Fehler aus
`getSession` ab: Seiten bekommen 503 als Klartext, `/api/*` 503 als JSON, die Ursache
geht ins Server-Log.

**Entscheidungen.**
- **Ein Lesefehler ist nicht „abgemeldet".** Ein Redirect nach `/login` hätte den
  Ausfall versteckt, und der Login scheitert an derselben Datenbank.
- **`/` ist eine bewusste Ausnahme von „Nothing is shared, ever"**, mit Sascha
  abgestimmt und in `CLAUDE.md` benannt. Sie zeigt nichts außer zwei Links.
- **Kein Redirect eingeloggter Nutzer von `/`.** Er bräuchte wieder einen
  Session-Check und damit die Datenbank.

**Geprüft.** Gates grün. Build auf Port 3001 gegen einen leeren DB-Port: `/` → 200,
`/dashboard` mit gültig signiertem Cookie → 503-Text, `/api/export/trades` → 503
JSON, ohne Cookie → Redirect `/login`, Log zeigt `ECONNREFUSED`. Im Browser führen
beide Buttons zu `/login` und `/register`, keine Konsolenfehler. Der Login selbst ist
nicht durchgeklickt worden.

## 2026-09-24 — Designrunde Trade-Detailseite — feature/trade-detail-polish — 24fb826

**Anlass.** Die Detailseite `/journal/[id]` aus S14 wirkte zu dunkel: Badges auf
`--gradient-inset`, Account-Chips auf `--color-well`, Metazeile in
`--color-fg-subtle`, Betrag in 18px. Keine Stelle der Seite zog den Blick.

**Gebaut.** Der Kopf ist die eine laute Stelle: Instrument als `page-title` (`<h1>`),
Tags auf `--gradient-dark-soft`, Betrag 26px 700 Mono, weiter nur grün/rot. Execution
steht als vier Zeilen — Prices, Time (mit „Held"), Excursion, Process — statt als
Feldraster. Confluences und Accounts tragen die blaue ruhige Fläche aus §4.14, Mistakes
die neutrale. Abschnittstitel in `cap` + `cap-neon`.

**Dateien.** `src/components/journal/trade-detail.tsx` (Kopf, `ExecutionRow`,
`Chip` mit `tone`, `Tag`); `src/db/queries/trades.ts` (`holdMinutes` exportiert und in
`queryTradeRows` selektiert, `JournalTradeRow.holdMinutes`);
`src/db/queries/analytics.ts` (importiert `holdMinutes` statt ihn selbst zu
definieren); `src/db/queries/__tests__/trade-detail.test.ts` (ein Test);
`context/Design.md` §4.20 und §4.14 „Stand".

**Regeln.** Die Haltedauer bleibt Chart-Uhr minus Chart-Uhr, ohne Zone, über
Mitternacht plus 24 Stunden. Festgenagelt durch „derives the hold time in minutes,
overnight included" in `trade-detail.test.ts` (31 und 165 Minuten gegen echtes
Postgres).

**Entschieden unterwegs.**
- **Kachelraster verworfen.** Ein erster Zwischenstand setzte jedes Execution-Feld in
  eine eigene Inset-Kachel. Das Design-Review mit dem `frontend-design`-Skill befand:
  acht gleiche Kacheln in einer Karte trennen, was zusammen gelesen wird (Preise,
  Zeiten), und liefen bei schmaler Breite über. Ersetzt durch Zeilen.
- **Mistakes neutral statt cyan.** In der blauen Prozessfläche sah ein Fehler aus wie
  etwas Verdientes. Mit Sascha abgestimmt.
- **`holdMinutes` wohnt jetzt in `trades.ts`.** `analytics.ts` importiert schon aus
  `trades.ts` (`rMultipleSortKey`, `tradePnlCents`); andersherum wäre ein Zyklus
  entstanden. Das Generic ist dabei auf `sql<string | null>` korrigiert, weil
  `numeric` als String ankommt. Die Erweiterung der gemeinsamen Query hat Sascha
  gegenüber „Haltedauer weglassen" gewählt.
- **Betrag 26px**, nicht 21px wie der Metrikwert aus §3: der Kopf ist hier der
  Blickfang der Seite, nicht eine Zahl unter fünfzehn.

**Offen geblieben.**
1. Mistake-Chip, Missed-Kopf und `cap cap-practice` im Account-Chip sind nicht im
   Browser gesehen — lokal gibt es keine Mistakes, keine Missed Setups und kein
   Übungskonto.
2. `divide-white/8` ist eine Farbangabe als Utility, wie das bestehende
   `border-white/8` in `link-card.tsx` und `account-row.tsx`. Ein Token dafür wäre ein
   eigener Aufräum-Slice.
3. Als Nächstes vereinbart: D (Chip-Labels in Normalschreibung) und E (zwei Spalten
   ab `lg`) im eigenen Branch, danach F (Preisband Stop/Entry/Exit mit MFE/MAE) als
   eigenes Feature.

## 2026-09-24 — Detailseite: Badge-Schrift und Zwei-Spalten-Layout — feature/trade-detail-layout — ddf1943

**Gebaut.** Badge-Labels (Accounts, Confluences, Mistakes) stehen in 13px 500 in der
Schreibweise des Nutzers statt in Kapitälchen. Ab `lg` liegt unter dem Kopf ein
Raster: links Execution, Notes, Screenshots, Links; rechts eine 20rem-Spalte mit
Accounts, Confluences und Mistakes.

**Dateien.** `src/components/journal/trade-detail.tsx` (`chipLabel`, `Section` mit
`className`, Raster mit `hasRail`); `context/Design.md` §4.20.

**Entschieden unterwegs.**
- **Ein Raster statt zwei Spalten-Wrapper.** Mit zwei Wrappern hätte die Reihenfolge
  unter `lg` gewechselt (erst alles Linke, dann die Spalte). So bleibt die DOM-Reihenfolge
  die alte einspaltige, und ab `lg` setzt `col-start` die Karten. Die rechte Spalte
  spannt vier Zeilen, die vierte ist `1fr` und nimmt den Überhang — mit lauter
  `auto`-Zeilen hätte Grid ihn gleichmäßig verteilt und Lücken zwischen die linken
  Karten gerissen.
- **Keine rechte Spalte, keine zweite Spalte.** Ohne Accounts, Confluences und
  Mistakes (etwa ein Missed Setup ohne Tags) bekommt das Raster keine
  Spaltendefinition.
- **Der Practice-Marker bleibt `cap`.** Er ist ein Etikett, kein Name.

**Offen geblieben.** Der Fall ohne rechte Spalte und der Practice-Marker sind nicht
im Browser gesehen — lokal gibt es keinen Trade ohne Account und kein Übungskonto.

## 2026-09-24 — Preisband auf der Trade-Detailseite — feature/trade-price-band — 0d5a832

**Gebaut.** Auf der Detailseite ersetzt ein Band die Zeile „Prices", sobald der
Trade einen Stop-Preis hat: eine R-Achse mit Stop bei −1R, Entry bei 0, Exit beim
erzielten R, dahinter MAE- und MFE-Spanne, nach dem Exit der Post-exit-Lauf
gestrichelt. Nur Entry → Exit und der Exit-Marker sind grün oder rot. Ein Missed
Setup bekommt kein Exit und nichts Grünes.

**Dateien.** `src/domain/price-band.ts` (neu, `buildPriceBand`: Achse, Positionen,
Ticks, Labelzeilen) mit `src/domain/__tests__/price-band.test.ts` (19 Tests);
`src/components/journal/price-band.tsx` (neu, SVG, misst seine Breite);
`src/components/journal/trade-detail.tsx`; `context/Design.md` §4.21 (neu) und
Verweis in §4.20; `context/coding-standards.md` § Charts.

**Regeln.** R ohne Stop ist undefiniert → kein Band (Test „returns null without a
stop price"). MFE und MAE zählen über den Betrag wie in S12b (Test „counts MFE and
MAE by magnitude"). Das would-be R eines Missed Setups wird nie Exit (Test
„has no exit and nothing realised").

**Entschieden unterwegs.**
- **Scope-Grenze.** „No live market data, charts or price feeds" aus
  `project-structure.md` trifft das Band nicht: es zeigt nur Eingaben des Trades,
  lädt nichts und zeichnet keinen Kursverlauf. Mit Sascha abgestimmt.
- **Achse in R statt Preis**, Band statt der Prices-Zeile, Missed Setup mit
  would-be-Spanne — alle drei mit Sascha vor dem Start festgelegt.
- **Handgebautes SVG statt Recharts.** Kein Hover, kein Tooltip, keine
  Achseninteraktion. Das `<svg>` hat keine `viewBox`, Positionen stehen als
  Prozentattribute — Text behält seine Größe, und „No inline styles" hält ohne
  Ausnahme. `coding-standards.md` § Charts sagt das jetzt.
- **Labelzeilen nach echter Breite.** Der erste Stand prüfte Kollisionen mit einem
  festen Abstand in Prozent; bei 484px Bandbreite (unter `lg`) überlappten „Stop"
  und „Entry". Jetzt bekommt `buildPriceBand` die Labelbreiten in Prozent der
  gemessenen Breite, rechnet mit Intervallen samt Randausrichtung, und die
  Komponente misst sich per `ResizeObserver`. Die Glyphenbreiten sind geschätzt,
  `LABEL_GAP` fängt die Abweichung. Nachgemessen bei 1000 und 1440px Fensterbreite
  für drei Trades: keine Überlappung, nichts über dem Rand.
- **R-Arithmetik für Geometrie.** `buildPriceBand` rechnet mit `number` auf R —
  aber nur Positionen fürs Zeichnen, keine Kennzahl, die angezeigt oder gespeichert
  wird. Dieselbe Art Float wie `capturedShare` in `execution.ts`.

**Offen geblieben.**
1. Lokale Testdaten: Stops, MFE, MAE und Post-exit auf 4903 und 7448 per SQL
   gesetzt, Missed Setup 8843 neu angelegt. Das Speichern eines Stops über das
   Bearbeiten-Formular ist in diesem Slice nicht erneut durchgeklickt.
2. Unter der App-Shell gibt es weiter kein mobiles Layout; das Band ist bis
   ~470px Breite geprüft.

## 2026-09-24 — Trade-Formular neu gegliedert — feature/trade-form-layout — b0b0027

**Anlass.** Design-Review von `/journal/new` mit dem `frontend-design`-Skill: fünf
Karten ohne Namen und ohne erkennbare Gruppierung, ein flacher „Live P&L / R"-Balken
als einziges lebendiges Element, eine Wand aus rund 60 gleich gewichteten Confluences,
Mistakes im Setup-Block, das Pflichtfeld Accounts ganz unten ohne Kennzeichnung.

**Gebaut.** Abschnitte Trade · Execution · Setup · Review · Attachments in der
Reihenfolge der Detailseite; Pflichtmarken; gewählte Chips im Look der Badges der
Detailseite (Mistakes neutral); eine feste Leiste unten mit Live-P&L als Metrikwert
und dem Button; das Preisband aus 4.21 live in Execution; Zurück-Link auf
`/journal/new`. Gilt für Anlegen und Bearbeiten.

**Dateien.** `src/components/trades/trade-form.tsx` (`FormSection`, `RequiredMark`,
`FormField` mit `required`/`className`, Band-Input, Leiste, Löschen-Karte außerhalb
des `<form>`); `tag-multi-select.tsx` (`tone`, leisere Gruppennamen);
`account-multi-select.tsx`; `src/app/(app)/journal/new/page.tsx`; `context/Design.md`
§4.22 (neu), §4.20, §4.14.

**Entschieden unterwegs.**
- **`required` + `noValidate` statt `aria-required`.** Biome lehnt `aria-required`
  an `date`- und `time`-Inputs ab (keine passende Rolle). Das native `required` sagt
  es assistiver Technik an jedem Feld; `noValidate` hält die Browser-Blasen fern, so
  bleibt Zod der einzige Validator (§4.5). Nebenwirkung: ein Schrittfehler wie 2,5
  Kontrakte blockt nicht mehr der Browser, sondern meldet Zod.
- **Accounts ohne `required`-Attribut.** Es ist eine Button-Gruppe; die Pflicht zeigt
  die Marke, die Meldung kommt wie bisher aus der Validierung.
- **Placeholder bleiben verschieden.** Im Review als Inkonsistenz genannt, beim Bauen
  als Absicht erkannt: „Select…" bei Pflicht-Selects, „—" bei optionalen. §4.22 sagt
  das jetzt.
- **Leiste auf deckender `bg-bg`-Fläche statt Blur** (Blur-Budget, §2); die Fläche ist
  genau so groß wie die Karte, damit kein flacher Streifen über dem Seitenglühen liegt.
- Pflichtfelder gegen `createTradeSchema` abgeglichen: immer Datum, Instrument,
  Richtung, Entry-Zeit, Entry-Preis; bei gehandelt zusätzlich Exit-Zeit, Exit-Preis,
  Kontrakte, mindestens ein Account.

**Geprüft.** Gates grün. Im Browser einen gehandelten Short mit Stop, Account,
Confluence und Mistake angelegt (Band und Leiste live: +$100.00, +2.50R), auf der
Detailseite geprüft, über Edit MAE geändert und gespeichert, ein Missed Setup
angelegt (Band ohne Exit, „Missed setup — no P&L"). Bei 1000px kein horizontaler
Überlauf, Leiste bündig am unteren Rand. Keine Konsolenmeldung. Beide Testtrades
danach per SQL entfernt, Stand wieder 50 Trades, 0 mit Stop, 0 Missed; kein Badge
vergeben.

**Offen geblieben.** Mistake-Labels sind in den Seed-Daten kleingeschrieben — eigene
Datenpflege. Der Primärbutton bleibt laut (§4.14 offen).

## 2026-09-24 — Kontowährung und ECB-Kurse — feature/account-currency — fbce7ec

**Gebaut.** Ein Konto hat eine Währung, USD (Standard) oder EUR, wählbar beim Anlegen
und in der Kontokachel, gesperrt mit Begründung, sobald dem Konto ein Trade zugewiesen
ist. Dazu die Infrastruktur, um einen Betrag mit dem ECB-Kurs eines Handelstags nach USD
umzurechnen: Tabelle `fx_rates`, reines Rechenmodul, Adapter für frankfurter und
`ensureFxRates`, das fehlende Kurse nachholt. Vorbereitung für `ftmo-import`, dessen
Datei-P&L in EUR kommt, während „Trades are stored in USD" gilt. Kein Aufrufer im
Import, keine Zahl im UI ändert sich.

**Dateien.** `src/domain/fx.ts` (neu: `ACCOUNT_CURRENCIES`, `toUsdCents`, `rateFor`,
`datesNeedingFetch`, `shiftDate`) mit `__tests__/fx.test.ts`;
`src/lib/fx/frankfurter.ts` (neu: `parseRates`, `fetchEcbRates`) mit Test;
`src/db/schema/fx-rates.ts` (neu), `src/db/schema/accounts.ts` (`currency` + Check);
`src/db/queries/fx.ts` (neu: `ensureFxRates`), `src/db/queries/accounts.ts`
(`hasTrades` in `listAllAccountsForSettings`, `updateAccountCurrency`), Query-Tests in
`src/db/queries/__tests__/fx.test.ts`; `src/schemas/accounts.ts`,
`src/actions/accounts.ts` (`setAccountCurrency`, `createAccount` mit Währung);
`src/components/settings/account-create-form.tsx`, `account-row.tsx`;
`context/Design.md` §4.12.

**Migration.** `0014_closed_tusk.sql`: `fx_rates (currency, rate_date, rate_vs_usd
numeric(12,6))` mit PK `(currency, rate_date)`; `accounts.currency text not null default
'USD'` plus `accounts_currency_check`. Bestehende Konten werden USD. Lokal angewendet,
Neon steht aus.

**Regeln.**
- `toUsdCents` rechnet in BigInt mit dem Kurs als Dezimal-String (höchstens sechs
  Nachkommastellen, wie die Spalte), rundet symmetrisch vom Nullpunkt weg. Test:
  „rounds half away from zero", „is exact where a float would drift".
- `rateFor`: Kurs des Tages, sonst der letzte davor, höchstens 7 Tage zurück (längste
  ECB-Lücke ist Ostern mit vier Tagen), nie vorwärts. Test: „gives a Saturday and a
  Sunday Friday's rate", „gives up after seven days".
- `datesNeedingFetch`: ein Tag gilt erst als abgedeckt, wenn ein Kurs an oder nach ihm
  gespeichert ist — sonst bekäme ein Montag den Freitagskurs, nur weil der Montag noch
  nicht abgeholt wurde. Test: „needs a day after the last stored rate, even when rateFor
  would answer".
- Die Währungssperre sitzt im `UPDATE … WHERE NOT EXISTS (trade_accounts …)` selbst,
  nicht in einer vorherigen Zählung. Test gegen Postgres: „refuses once a trade is
  assigned", „refuses an account the user does not own".

**Entschieden unterwegs.**
- **`providers=ecb` ist Pflicht.** frankfurter hat eine v2-API, die ohne Angabe 98
  Quellen mischt und auch Wochenendwerte liefert — am 2026-09-18 1,1492 gemischt gegen
  1,1460 ECB. Das Projekt verlangt ECB-Referenzkurse (`project-overview.md`).
- **Externer Abruf im Request-Pfad ist hier zulässig.** Das SSRF-Verbot gilt
  nutzergelieferten Adressen; diese ist fest im Code, nur die Datumsgrenzen sind
  Parameter. Abgerufen wird nur, was `fx_rates` nicht beantwortet, mit 10 s Timeout,
  danach liest alles aus der Tabelle. Entschieden von Sascha: Kurse werden beim Import
  nachgeholt, nicht per täglichem Job.
- **Upsert statt Insert-if-missing**, damit wiederholte oder parallele Aufrufe harmlos
  sind und eine revidierte Quelle den gespeicherten Kurs korrigiert.
- **`rate_vs_usd` ist `numeric(12,6)`** — neue Präzision neben (14,2) und (12,4), weil
  ein Kurs weder Geldbetrag noch Preis ist; die ECB liefert bis zu fünf Dezimalen.
- **Die Sperre wird in der Query-Schicht getestet, nicht über die Action**, weil Vitest
  den `@`-Alias der Actions nicht auflöst (wie in S14).
- **Währungs-Tag auf der neutralen Fläche aus §4.20**, nicht auf `bg-white/5` — im Review
  korrigiert, ebenso `shiftDate` auf `TZDate` + date-fns statt eigener `Date.UTC`-Rechnung.
- Der Workflow kennt keinen Parkplatz für einen Spec. Auf Saschas Wahl steht
  `ftmo-import` bis zum Merge unter „Next up" in `current-feature.md`.

**Offen geblieben.**
- Migration auf den Neon-Branches `preview` und Production.
- Klickpfad in `/settings` von Sascha abzunehmen.
- Für `ftmo-import`: was mit einem Trade passiert, der am selben Tag importiert wird,
  bevor die ECB den Tageskurs veröffentlicht hat — `rateFor` gibt dann den Vortageskurs.
- Solange ein letzter angefragter Tag auf einem Wochenende nach dem letzten
  gespeicherten Kurs liegt, fragt jeder Aufruf erneut an; harmlos, eine Anfrage.

## 2026-09-25 — FTMO-Import mit Bruchteil-Lots und vorläufigem FX-Kurs — feature/ftmo-import — b6f1183

**Gebaut.** `/journal/import` erkennt neben dem Tradovate-Fill-Export die FTMO-Kontohistorie
(MetaTrader-CSV) und legt deren CFD-Trades mit Bruchteil-Lots, ursprünglichem Stop und der
P&L aus der Datei an — auf einem EUR-Konto mit dem ECB-Kurs des `trade_date` nach USD
umgerechnet. Fehlt der Tageskurs noch (vor ca. 16 Uhr MEZ), wird mit dem letzten Kurs
importiert, als vorläufig markiert und nachts von `job:fx` korrigiert. Vorschau zeigt
Datei-P&L (Kontowährung), P&L aus den Preisen (USD) und den gespeicherten USD-Wert; die
Detailseite zeigt einen neutralen Hinweis, solange der Kurs vorläufig ist. Das
Instrument-Tile der Trade-Zeile kürzt CFD-Symbole.

**Dateien.**
- Domain: `src/domain/pnl.ts` (Menge skaliert in BigInt, `roundDiv`),
  `src/domain/fx.ts` (`applicableRate`, `finalRateFor`, `isProvisional`,
  `convertForTrade`, `correctionFor`), `src/domain/trades.ts`
  (`importMarksAfterEdit`), `src/domain/import/detect.ts` (Formatliste `fills` + `ftmo`),
  `src/domain/import/ftmo.ts` (neu, `readFtmoRows`), `src/domain/import/normalize.ts`
  (`fromWallClock`, Stop auf den Tick), `src/domain/import/types.ts`
  (`filePnlCents`, `stopPrice`, `stopNotice`, `ImportShape` + `"ftmo"`),
  `src/domain/import/fills.ts` — jeweils mit Tests, neu `ftmo.test.ts`.
- Schema/DB: `src/db/schema/trades.ts`, `src/db/seed-instruments.ts` (US100.cash,
  US30.cash, XAUUSD), `src/db/queries/import.ts` (Insert mit Markern, `TOUCHED`),
  `src/db/queries/fx.ts` (`listConvertedTrades`, `applyFxCorrections`,
  `isTradeFxProvisional`), `src/db/queries/accounts.ts` (`findImportAccount`),
  `src/db/queries/trades.ts` (`fxRateDate`, numerische Menge), `src/db/queries/export.ts`.
- Job: `src/lib/fx/job.ts` (`runFxJob`), `src/db/job-fx.ts` (`pnpm job:fx`),
  `src/app/api/cron/fx/route.ts`, `vercel.json` (Cron 03:00 UTC), `src/lib/env.ts`
  (`CRON_SECRET`), `src/proxy.ts` (`/api/cron/` ohne Session).
- Server/UI: `src/actions/import.ts` (`convertRows`, `computePnl`),
  `src/actions/trades.ts`, `src/schemas/import.ts`, `src/schemas/trades.ts`
  (`quantityField`), `src/components/import/file-step.tsx`, `preview-step.tsx`,
  `src/components/journal/trade-detail.tsx`, `trade-row.tsx`,
  `src/components/trades/trade-form.tsx`, `src/app/(app)/journal/[id]/page.tsx`.
- Lib: `src/lib/csv/decode.ts` (neu, `decodeByHeader`), `src/lib/csv/trade-export.ts`
  (Menge ohne Füllnullen), `src/lib/journal/tile-label.ts` (neu) — mit Tests.
- Doku: `CLAUDE.md`, `context/coding-standards.md`, `context/Design.md` §4.9,
  `context/project-overview.md` (Open Questions).

**Migration.** `0015_amazing_grey_gargoyle.sql`: `trades.contracts` integer →
`numeric(12,4)` (Werte bleiben), neu `pnl_source numeric(14,2)`, `fx_rate_date date`.
`0016_careful_fixer.sql`: `stop_imported boolean not null default false`. Beide per
`db:generate`/`db:migrate`, lokal angewendet, Neon steht aus.

**Regeln.**
- Menge mit Nachkommastellen geht wie ein Preis skaliert in die BigInt-Rechnung;
  gerundet wird halb Richtung +∞ wie `Math.round` und wie `floor(x*100+0.5)` in SQL.
  Tests: `pnl.test.ts` „fractional quantities", Gleichlauf gegen Postgres in
  `db/queries/__tests__/trades.test.ts` („agrees on …" mit Bruchteil-Lots und halben Cents).
- Vorläufig ist ein Kurs, solange `fx_rate_date` nicht der Kurs ist, den `finalRateFor`
  für `trade_date` festlegt; endgültig ist er, sobald ein Kurs an oder nach dem
  `trade_date` gespeichert ist. Samstag mit Freitagskurs ist nach Montag erledigt.
  Tests: `fx.test.ts` „finalRateFor", „isProvisional", „correctionFor"; Job gegen
  Postgres in `db/queries/__tests__/fx.test.ts` „job:fx".
- Handedit gewinnt: nur ein tatsächlich geänderter Wert löscht seinen Marker
  (`pnl_source`/`fx_rate_date` bzw. `stop_imported`). Test: `trades.test.ts`
  „importMarksAfterEdit"; Undo-Verhalten gegen Postgres in `import.test.ts`
  „FTMO rows".
- FTMO-Zeit ist Berliner Wanduhr und wird genau einmal in `users.timezone` umgerechnet
  (`fromWallClock`). Tests: `ftmo.test.ts`, `normalize.test.ts` „fromWallClock".
- SL auf der Verlustseite wird Stop, auf/hinter dem Entry oder leer nicht; Tests in
  `ftmo.test.ts`.

**Entschieden unterwegs.**
- **Vorläufiger Kurs:** importieren, markieren, nachts korrigieren; Markierung über das
  Kursdatum; Handedit gewinnt; Hinweis in Vorschau und Detailseite (Sascha).
- **Vorläufig gegen gespeicherte Kurse**, nicht `fx_rate_date < trade_date` — sonst
  bliebe jeder Wochenend- und Feiertagstrade für immer markiert (Sascha).
- **`pnl_source` speichert die Datei-P&L in Kontowährung**, damit der Job exakt neu
  rechnet statt aus dem gerundeten USD-Wert zurück.
- **Import-Marker für Batch-Undo:** `pnl_override` und `stop_price` zählten als
  Handarbeit, Undo hätte keinen FTMO-Trade entfernt. Override zählt nur ohne
  `pnl_source`, Stop nur ohne `stop_imported` (Sascha). `pnl_source` wird deshalb bei
  jedem Import mit Datei-P&L gesetzt, auch auf einem USD-Konto.
- **Acceptance in USD:** Das Journal zeigt die umgerechneten USD-Werte, die EUR-Beträge
  stehen in Vorschau und `pnl_source`, bis `display-currency` kommt (Sascha).
- **Menge ist `numeric(12,4)`** statt `integer`; `coding-standards.md` angepasst.
- **`/api/cron/*` ohne Session**, geschützt über `CRON_SECRET` (konstante Zeit), liefert
  nur Zähler; in `CLAUDE.md` als Ausnahme eingetragen (Sascha).
- **Die Job-Währung kommt aus dem Konto des Import-Batches**, nicht aus späteren
  Zuordnungen — es ist die Währung, in der die Datei war.
- **Kein ECB-Kurs erreichbar:** Der Import bricht mit eigener Meldung ab und schreibt
  nichts; gibt es für ein Datum gar keinen Kurs, nennt der Fehler Datum und Zeile.
- **Schon die Vorschau holt fehlende Kurse**, damit sie den gespeicherten Wert und
  „provisional" zeigen kann; der Commit rechnet trotzdem neu.
- **Encoding nach Kopfzeile:** `ftmo.csv` ist Mac Roman, nicht Windows-1252 wie in der
  Spec angenommen; UTF-8, Windows-1252 und Mac Roman werden probiert, gewinnt die erste
  Variante mit bekannter Kopfzeile (Sascha).
- **Beispieldatei hat 30 Trades**, nicht 29; Acceptance angepasst (Sascha).
- **Leeres SL** meldet „no SL in the file — not imported" statt „SL at or past entry".
- **Tile-Kürzel:** Teil vor dem ersten Punkt, ab fünf Zeichen 9px — unter der kleinsten
  Stufe der Schrifttabelle (10.5px), in Design.md §4.9 als Ausnahme festgehalten (Sascha).
- **Spalte „From prices"** erscheint auch bei Tradovate-Zeilen der Vorschau.
- **Kontotyp CFD/Futures nicht gebaut.** Empfehlung: Art am Instrument; als offene
  Frage in `project-overview.md`.
- **Startguthaben** für die Equity-Kurve wird eigener Slice `account-balance` nach
  diesem (Sascha); Fragen in `project-overview.md`.

**Offen geblieben.**
- Migration `0015` + `0016` auf Neon `preview` und Production; `CRON_SECRET` in Vercel
  setzen — beides nur nach Rückfrage.
- `listConvertedTrades` wächst ohne Grenze: Wochenend- und Feiertagstrades behalten
  `fx_rate_date < trade_date` für immer und werden jede Nacht gelesen (ohne Abruf).
  Bei einem Nutzer unkritisch.
- Doppelte Rundung: `toMinorUnits` in `ftmo.ts` entspricht der Rundung in
  `toUsdCents`; bei Gelegenheit zusammenlegen.
- Die Vorschau ist mit „From prices" breiter geworden; gehört zum Mobile-Slice.
- „provisional" im Browser nicht gesehen — mit der Beispieldatei nicht auslösbar, nur
  durch Tests belegt.
- Die Änderung an der Review-Checkliste (`.claude/skills/feature-review/SKILL.md`) liegt
  in einem gitignorten Ordner und wird nicht mitcommittet.
