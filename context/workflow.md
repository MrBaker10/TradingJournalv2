# Optional Claude workflow

Bedienhilfe für die privaten Claude-Skills, kein Pflichtkontext für Codex.
Verbindliche Freigaben stehen in `../AGENTS.md`, Ablauf und Prüfungen in
`ai-interaction.md`. „Was nie ohne mich passiert“ fasst die Haltepunkte der Skills
zusammen und wiederholt dabei Freigaben aus `../AGENTS.md`; darüber hinaus legt diese
Datei keine Gates oder Produktregeln fest.

## Wenn die lokalen Skills installiert sind

Die Skills unter `.claude/` sind ungetrackt. Ihre Verfügbarkeit nicht voraussetzen;
Codex führt den Ablauf aus `ai-interaction.md` direkt aus.

| Befehl | Zweck |
|---|---|
| `/feature load <Beschreibung>` | Aktiven Spec mit Abgrenzung vorbereiten |
| `/feature start` | Vereinbarten Umfang implementieren |
| `/feature verify` | Verbindliche Prüfungen aus `ai-interaction.md` durchführen |
| `/feature-review` | Diff und Produktregeln prüfen |
| `/feature explain` | Dauerhafte Begründung an `decisions.md` anhängen |
| `/feature complete` | Commit vorschlagen; nach Merge `history.md` aktualisieren |

Eine erteilte Freigabe für den konkreten Umfang gilt weiter. Zusätzliche Skill-Pausen
sind anhand des tatsächlich geladenen Skills zu beurteilen, nicht aus dieser Tabelle
abzuleiten. Bei veralteten Skill-Verweisen auf History in `current-feature.md` gilt
`history.md` als neuer Ablageort.

## Kontext klein halten

- Dateipfade und relevante Abschnitte nennen, statt ganze Referenzdateien einzufügen.
- `current-feature.md` enthält nur den aktiven Auftrag; abgeschlossene Arbeit steht
  in `history.md`, frühere Begründungen in `decisions.md`.
- Für unabhängige Aufgaben kann eine frische Sitzung sinnvoll sein. Offene Aufgaben
  vorher mit Status und ausstehenden Prüfungen in `current-feature.md` festhalten.
- Browserprüfungen dürfen durch verfügbare Automation erfolgen; Ergebnis und Klickpfad
  müssen nachvollziehbar sein. Fehlende Browserprüfung bleibt ausdrücklich offen.

---

## Wenn etwas schiefgeht

| Situation | Was ich mache |
|---|---|
| Gate rot | Gezielt nachprüfen, vor Abschluss alle Gates gemäß `ai-interaction.md`. Nach 2–3 Fehlversuchen stoppen |
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
