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

**Nothing in progress.**

### Phase 0 — before the first line of code

- [x] `context/Design.md` written and agreed
- [x] `PropFirmsData.md` cleaned up: 15 headings now parse as `## Name`, the four
      nameless blocks (BluSky, Legends Trading, TradeDay, The Trading Pit) carry their
      name in the heading. Rest of the file byte-identical. Website URLs and
      `last_verified_at` are still absent from the file — open, blocks S11 only.
- [x] P0.2 Scaffold the project and reconcile the command list in `CLAUDE.md` with the
      real `package.json`

---

## Feature: _(none)_

<!--
Filled by `/feature load <description>`. Shape:

**Goal.** One or two sentences: what the user can do afterward that they could not
before.

**Scope.** Files and modules touched, new tables and migrations, new domain modules
with their tests.

### Do not build
At least two concrete, neighbouring-scope exclusions.

### Acceptance
Browser-checkable checkboxes, including the four gates and one explicit click path.

### Open questions
Leave empty, or list what the spec does not decide.
-->

---

## History

One line per merged feature. Newest at the top.

| Date | Feature | Notes |
| --- | --- | --- |
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
