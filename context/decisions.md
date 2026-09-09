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
