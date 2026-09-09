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

**In progress: P0.2 — Scaffold und Toolchain.**

### Phase 0 — before the first line of code

- [x] `context/Design.md` written and agreed
- [x] `PropFirmsData.md` cleaned up: 15 headings now parse as `## Name`, the four
      nameless blocks (BluSky, Legends Trading, TradeDay, The Trading Pit) carry their
      name in the heading. Rest of the file byte-identical. Website URLs and
      `last_verified_at` are still absent from the file — open, blocks S11 only.
- [ ] P0.2 Scaffold the project and reconcile the command list in `CLAUDE.md` with the
      real `package.json`

---

## Feature: P0.2 — Scaffold und Toolchain

**Goal.** Ein leeres, lauffähiges Next-16-Projekt im Repo, dessen `package.json` die
exakten Pins aus `coding-standards.md` trägt und dessen Skripte mit der Befehlsliste in
`CLAUDE.md` abgeglichen sind. Danach kann jeder weitere Slice die drei Gates benutzen,
weil sie auf einem leeren Projekt bewiesen grün sind.

**Scope.**

- `git init` im lokalen Ordner, `.gitignore`, erster Commit, Remote
  `https://github.com/MrBaker10/TradingJournalv2.git` (öffentlich).
- Postgres lokal: 18.4 aus DBngin, entschieden. Die Pin-Zeile in
  `coding-standards.md` ist entsprechend präzisiert.
- Scaffold über `pnpm create next-app` (TypeScript, Tailwind, App Router, Turbopack,
  `src/`-Verzeichnis, keine Import-Alias-Änderung).
- Aufräumen nach dem Generator, vollständige Liste:
  - `eslint`, `eslint-config-next` und `@eslint/*` deinstallieren, `eslint.config.mjs`
    bzw. `.eslintrc*` löschen. Grund: Biome only, typescript-eslint kann TS 7 nicht.
  - Prettier-Reste löschen, falls vorhanden.
  - Prüfen, dass **keine** `tailwind.config.ts|js` existiert. Falls doch: löschen.
  - Demo-Inhalt der generierten Startseite auf ein Minimum reduzieren, `public/*.svg`
    des Generators löschen, generiertes `README.md` durch einen Einzeiler ersetzen.
  - Alle Caret-Ranges in `package.json` auf exakte Versionen setzen.
- Exakte Pins setzen: Next 16.3.4, React 19.2.8, react-dom 19.2.8, TypeScript 7.0.2,
  Tailwind 4.3.3, Biome 2.5.12, Vitest 4.1.11. Nichts darüber hinaus.
- `biome.json` anlegen, `vitest.config.ts` anlegen, ein Smoke-Test unter
  `src/domain/__tests__/` damit `pnpm test` nicht an einer leeren Suite scheitert.
- `tsconfig.json` mit `strict: true` prüfen.
- Skripte in `package.json`: `dev`, `build`, `typecheck`, `test`, `lint`. Die übrigen
  Einträge der Befehlsliste in `CLAUDE.md` (`db:*`, `job:*`, `test:e2e`) kommen erst mit
  dem Slice, der ihr Ziel anlegt. Die Abweichung wird in `CLAUDE.md` als Zeile notiert,
  nicht stillschweigend gelassen.

### Do not build

- Kein Drizzle, kein DB-Client, kein Schema, keine Migration, kein `.env` — das ist P0.4.
- Keine `@theme`-Tokens, keine Fonts über `next/font`, kein `MotionConfig`, keine
  `@utility`-Sammlung — das ist P0.3. `globals.css` bleibt beim Generator-Minimum.
- Kein Screen, keine Sidebar, keine Route außer der generierten Startseite — das ist S1.
- Kein `shadcn/ui init`.
- Kein Playwright und kein `test:e2e`-Skript.
- Keine `db:*`- oder `job:*`-Skripte, solange ihr Ziel nicht existiert.
- Keine Installation von Zod, React Hook Form, `@hookform/resolvers`, Recharts oder
  `motion`. Jedes davon kommt mit dem Slice, der es braucht.
- Kein Docker, kein CI-Workflow, keine Husky/lint-staged-Hooks.
- Keine Änderung an `next.config.ts` über das Generator-Minimum hinaus. Insbesondere
  **kein** `cacheComponents`.

### Acceptance

- [ ] `pnpm dev` startet, die Startseite lädt im Browser ohne Konsolenfehler.
- [ ] `pnpm typecheck` grün, `pnpm test` grün (ein Smoke-Test), `pnpm build` grün.
- [ ] `pnpm lint` läuft mit Biome durch.
- [ ] `package.json` enthält ausschließlich exakte Versionen, keine `^` und keine `~`.
- [ ] Im Projekt existiert keine `eslint*`-, `prettier*`- oder `tailwind.config.*`-Datei.
- [ ] Befehlsliste in `CLAUDE.md` und `package.json` stimmen überein, oder die
      Abweichung steht als Zeile in `CLAUDE.md`.
- [ ] Erster Commit auf `main`, Remote gesetzt, Branch `feature/scaffold` gemerged.

### Open questions

- Soll `pnpm lint` viertes Gate werden? `CLAUDE.md` nennt nur drei.
- `project-structure.md` widerspricht sich unter „Open decisions": „Three things remain"
  gegen „None. Everything technical is settled." `CLAUDE.md` verweist auf drei offene
  Fragen am Ende von `project-overview.md`, wo „None" steht. Welche drei sind gemeint?
- Datenmodell hat kein Feld für die pro User erinnerte Kontoauswahl. Spätestens in S3
  zu entscheiden, Browser-Storage ist durch `coding-standards.md` ausgeschlossen.
- Econ-Kalender-Seite: in der Phase-1-Liste nicht enthalten, im Modulverzeichnis schon.
  Wird bis auf Widerruf als Phase 2 behandelt.

---

## History

One line per merged feature. Newest at the top.

| Date | Feature | Notes |
| --- | --- | --- |
| — | — | Nothing merged yet |
