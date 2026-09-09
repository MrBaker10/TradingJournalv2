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
