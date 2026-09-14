# Workflow

Wie ich mit den Skills in diesem Projekt arbeite. Rein operativ: welcher Befehl wann,
in welcher Reihenfolge, mit welcher Sitzungshygiene.

**Was hier nicht steht:** die Regeln selbst. Warum Geld kein Float ist, steht in
`coding-standards.md`. Was die Streak-Regel sagt, steht in `project-structure.md`. Was
der aktuelle Slice ist, steht in `current-feature.md`. Warum ein früherer Slice so
gebaut wurde, steht in `decisions.md`. Diese Datei verweist, sie
kopiert nicht — doppelte Regeln driften auseinander.

---

## Einmalig

```bash
mkdir -p .claude/skills/feature/actions .claude/skills/feature-review
# die sieben Skill-Dateien einlegen
claude plugin validate .claude/skills
```

`.claude/` bleibt vollständig ungetrackt und steht in `.gitignore`. Die Skills
beschreiben meine Arbeitsweise, nicht das Produkt — und das Repo ist öffentlich. Wer
sie versioniert haben will, legt sie in ein eigenes, privates Repo.

---

## Der Slice-Loop

Ein Slice, ein Branch, ein Commit, eine Session.

| Schritt | Befehl | Was ich dabei tue |
|---|---|---|
| 1 | `/feature load <Beschreibung>` | Spec lesen, „Do not build" prüfen, **freigeben** |
| 2 | `/feature start` | Plan lesen, freigeben |
| 3 | `/feature verify` | Gates lesen, **Klickpfad im Browser selbst abgehen** |
| 4 | `/feature-review` | Befunde lesen, entscheiden was nachgearbeitet wird |
| 5 | `/feature explain` | Block lesen — er wird an `context/decisions.md` angehängt, nicht nur ausgegeben |
| 6 | `/feature complete` | Commit-Vorschlag prüfen, **zustimmen**, Branchfrage beantworten |
| 7 | `/clear` | Nächster Slice, frischer Kontext |

Schritt 3 läuft nach jeder Korrektur erneut, komplett. Schritt 4 einmal am Ende.

Vor Schritt 1 das Modell und den Effort setzen, für die laufende Session mit `s` in
der Auswahl:

- Domain-Slices (S2, S3, S7, S10): `/effort xhigh`
- Aggregat-Slices (P0.4, S4, S8): `/effort xhigh`
- Alles andere: `high`

`/feature-review` bringt sein eigenes `xhigh` über die Frontmatter mit, dafür muss ich
nichts umschalten.

---

## Sitzungshygiene

Auf Pro ist der Input der Kostentreiber: jede Nachricht schickt die ganze bisherige
Unterhaltung plus `CLAUDE.md` erneut mit.

- `/clear` zwischen den Slices, nicht `/compact`. Test: würde mein nächster Prompt in
  einem frischen Terminal genauso Sinn ergeben, dann vorher clearen.
- Auf Dateipfade zeigen statt Inhalte einzufügen. `@datei` zieht die ganze Datei plus
  ihren `CLAUDE.md`-Baum in den Kontext — zum Sparen den nackten Pfad nennen.
- `pnpm dev` läuft im zweiten Terminal. Den Browser-Gate nimmt mir niemand ab.
- Ein Slice pro Session. Passt ein Slice nicht in eine Session, war er zu groß
  geschnitten.

---

## Wenn etwas schiefgeht

| Situation | Was ich mache |
|---|---|
| Gate rot | Korrigieren lassen, `/feature verify` von vorn. Nach 2–3 Versuchen am selben Fehler abbrechen und selbst hinsehen |
| Frage mitten im Slice | Antwort geben oder unter `### Open questions` stehen lassen. Nicht „nimm die einfachere Variante" sagen |
| Review findet 🚫 | Zurückbauen, nicht nachträglich in den Spec schreiben. Der Zaun gilt für den Branch, auch wenn die Sache sinnvoll ist |
| Review findet ⚠️ ohne Klarheit | Nachfragen lassen. Ein ✅ aus Plausibilität ist wertlos |
| Falscher Slice geladen | `/feature load` erneut, solange `start` noch nicht gelaufen ist. Danach: Branch verwerfen und neu laden |
| Domain-Test wird angepasst | Immer erklären lassen, warum. Ein geändertes Assert in `src/domain/**` ist eine Regeländerung |

---

## Was nie ohne mich passiert

Vier Punkte, an denen der Skill anhalten muss. Tut er es nicht, ist das ein Fehler im
Skill und keine Zeitersparnis:

1. Spec-Freigabe vor `start`
2. Commit
3. Merge bei Konflikt
4. Jedes Löschen — Datei, lokaler Branch, Remote-Branch

Dazu: keine neue Abhängigkeit und kein Versionssprung ohne Rückfrage.

---

## Slice-Reihenfolge

Phase 0: P0.1 Datencleanup ✔ · P0.2 Scaffold · P0.3 Designfundament · P0.4 DB-Seam

Phase 1: S1 Shell · S2 Instruments und `pnl.ts` · S3 Accounts · S4 Trades ·
S5 Journal-Liste · S6 Screenshots und Links · S7 Progress-Domain · S8 Dashboard ·
S9 Progress-Seite · S10 CSV · S11 Prop Firms

Domain vor Queries, Queries vor UI, Accounts vor Trades, Dashboard vor Analytics.
Analytics und Prop Firm Rules brauchen vorher eine Designrunde, siehe `Design.md`
Abschnitt 10.

---

## Offen

- `pnpm lint` als viertes Gate: noch nicht entschieden. Derzeit läuft es in `verify`
  als Meldung ohne Blockade.
- Verweis auf `/feature` und `/feature-review` in `CLAUDE.md`: würde den Prosa-Absatz
  unter „Workflow" ersetzen und die Datei kürzer machen.
