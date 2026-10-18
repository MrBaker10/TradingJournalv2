# Optional Claude workflow

Bedienhilfe für die privaten Claude-Skills, kein Pflichtkontext für Codex.
Verbindliche Freigaben stehen in `../AGENTS.md`, Ablauf und Prüfungen in
`ai-interaction.md`. Diese Datei definiert keine zusätzlichen Gates oder Produktregeln.

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
