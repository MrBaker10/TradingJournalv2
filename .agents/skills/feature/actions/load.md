# Load

Schreibt den Spec des nächsten Slices in `context/current-feature.md`. Kein Code in
dieser Action, keine Datei außer der Arbeitsdatei wird angefasst.

## Schritte

1. `context/current-feature.md` nur bis `## History` lesen. Ist dort ein Feature aktiv (Status nicht
   „Nothing in progress"), abbrechen und melden: erst `complete`, dann neu laden.
2. Argumente nach „load" prüfen. Sie sind eine **Kurzbeschreibung des Slices**, keine
   Dateireferenz — Specs leben nur in dieser Datei, es gibt kein Spec-Archiv.
   Ist das Argument leer: fragen, welcher Slice gemeint ist. Nicht raten.
3. Den Slice gegen die dauerhaften Grenzen prüfen:
   - `context/project-overview.md`, Abschnitt „Not Building"
   - `context/project-structure.md`, Abschnitt „Not in scope"
   Berührt der Slice etwas daraus, hier stoppen und fragen.
4. Den Feature-Block in `context/current-feature.md` ersetzen:
   - `## Feature: <Name>` — der Name wird später der Branchname, also kurz und
     kebab-fähig
   - `**Goal.**` Ein bis zwei Sätze: was der Nutzer danach kann und vorher nicht
   - `**Scope.**` Betroffene Dateien und Module, neue Tabellen und Migrationen, neue
     Domain-Module mit ihren Tests
   - `### Do not build` — **Pflichtfeld.** Mindestens zwei konkrete Einträge aus der
     Nachbarschaft des Slices. „Kein Kontoschalter in diesem Branch", nicht „einfach
     halten". Lässt sich das nicht füllen, ist der Slice nicht scharf genug: fragen
     statt weitermachen
   - `### Acceptance` — Checkboxen, im Browser prüfbar formuliert, plus die Verifikation
     nach `context/ai-interaction.md` §Workflow. Bei UI-Änderungen den **Klickpfad**
     festlegen: Screens, Interaktionen und erwartete Ergebnisse. Andernfalls die
     Browserprüfung als nicht anwendbar begründen. Zusätzliche Nutzerabnahme nur
     festhalten, wenn sie verlangt ist
   - `### Open questions` — leer lassen oder das eintragen, was der Spec nicht
     entscheidet
5. Status auf `**In progress: <Name>** — Spec geladen, nicht gestartet` setzen.
6. Den fertigen Spec ausgeben und **um Freigabe bitten**. Erst nach Freigabe darf
   `start` laufen.

## Nicht tun

- Aus einer knappen Beschreibung Goals „generieren" und damit Scope erfinden.
- Den Phase-0-Block oder die History-Tabelle verändern.
- Ordner wie `context/features/` anlegen. Es gibt sie nicht und sie sind entschieden.
