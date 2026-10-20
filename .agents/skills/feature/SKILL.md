---
name: feature
description: Steuert den Trading-Journal-Slice über load, start, verify, explain und complete. Für das fachliche Review verwende feature-review.
---

# Feature Loop

Es gelten `AGENTS.md` und `context/ai-interaction.md`; Fachregeln werden hier nicht
kopiert. Ein Slice pro Branch. Nur die angeforderte Action ausführen.

## Kontext

- `context/current-feature.md` nur bis `## History` lesen; History nur bei konkretem
  Bedarf gezielt suchen. Zum Einfügen einer Zeile genügt der Tabellenkopf.
- `context/decisions.md` nur abschnittsweise lesen: Formatkopf, aktueller Slice oder
  gezielte Themensuche. Nie für einen neuen Eintrag die gesamte Historie laden.
- Bereits gelesene, unveränderte Regeln wiederverwenden. Pflichtlektüre vor Code
  bleibt bestehen; zusätzliche Referenzen nur für betroffene Themen laden.

## Actions

| Action | Anweisung |
|---|---|
| `load` | `actions/load.md`: Spec und „Do not build“ |
| `start` | `actions/start.md`: Branch und Umsetzung |
| `verify` | `actions/verify.md`: Gates und Browserprüfung |
| `explain` | `actions/explain.md`: kompakter Entscheidungsblock |
| `complete` | `actions/complete.md`: freigegebener Abschluss |

Nur die Datei der angeforderten Action lesen. Ohne Action die Optionen nennen und
fragen. Reihenfolge: `load` → `start` → `verify` → `feature-review` → `explain` →
`complete`. Abschluss setzt grüne Gates und ein bestandenes Review des aktuellen
Stands voraus. Prüfungen nicht allein wegen eines Action-Wechsels wiederholen.
