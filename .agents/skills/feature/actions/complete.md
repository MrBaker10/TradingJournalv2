# Complete

Vorbereitung und Ausführung trennen. Vor der Ausführung die Zustimmung zu den
konkret benannten Commits, dem Merge und dem Push einholen.

Nur den aktiven Spec vor `## History`, den aktuellen Entscheidungsblock und den
History-Tabellenkopf lesen; keine vollständigen Historien laden.

## Vorbedingungen

Prüfen, bevor irgendetwas passiert. Fehlt eine, hier stoppen und sagen, welche:

- Die Gates nach `context/ai-interaction.md` §Workflow sind auf dem aktuellen
  Stand **grün**. Dokumentationsänderungen zählen ebenfalls als Änderungen.
- `/feature-review` ist gelaufen und hat kein rotes oder 🚫-Ergebnis offen.
- Alle Acceptance-Checkboxen sind erfüllt; bei UI-Änderungen ist die tatsächliche
  Browserprüfung dokumentiert. Eine im Spec verlangte zusätzliche Nutzerabnahme
  liegt vor.
- `/feature explain` ist gelaufen und hat den Block für diesen Slice an
  `context/decisions.md` angehängt. Fehlt er, hier stoppen und `explain` verlangen.

## Hälfte 1 — vorbereiten und fragen

1. `git status` ausführen. Die Ausgabe zeigen.
2. Die zum Slice gehörenden Dateien **einzeln** benennen, die vorgeschlagenen
   `git add`-Befehle zeigen. Kein `git add -A`, kein `git add .`. Liegt etwas
   Unverwandtes im Baum, es benennen und ausdrücklich weglassen — ein Slice, ein Commit.
   Taucht eine `.env`-Datei auf, laut warnen und sie nie stagen; das Repo ist öffentlich.
   `context/decisions.md` und `context/current-feature.md` gehören **nicht** in diesen
   Commit — sie sind Buchführung und kommen zusammen in Schritt 8.
3. Die Commit-Message vorschlagen: Conventional Prefix, ein Satz, kein Hinweis auf
   Claude oder KI-Generierung.
4. Beide Commit-Vorschläge (Slice und Buchführung), Merge und Push als konkretes
   Paket zur Freigabe vorlegen. Erst nach Zustimmung weiter.

## Hälfte 2 — ausführen

5. Die benannten Dateien stagen, committen.
6. `git checkout main`, `git merge <branch>`. Bei einem Konflikt stoppen und fragen.
7. `context/decisions.md`: im Block dieses Slices den Platzhalter
   `noch nicht committet` durch den echten Commit-Hash aus Schritt 5 ersetzen. Das ist
   die einzige erlaubte Änderung an einem bestehenden Block.
8. `context/current-feature.md` zurücksetzen:
   - Status auf `**Nothing in progress.**`
   - Den Feature-Block auf die Vorlage zurückführen (`## Feature: _(none)_` samt
     Template-Kommentar), Goal, Scope, „Do not build", Acceptance und Open questions
     leeren
   - Eine Zeile **oben** in die History-Tabelle einfügen — Datum, Feature, Notes. Die
     Tabelle ist neueste-Zeile-oben, nicht anhängen. Die Notes-Spalte bleibt kurz, der
     Text steht in `decisions.md`
   - Offene Punkte, die das ganze Projekt betreffen, nicht wegwerfen: sie gehören in
     die Decisions- oder Open-Questions-Liste in `context/project-overview.md`. Das
     vorschlagen, nicht selbst entscheiden
9. Beide Buchführungsdateien in **einem** Commit:
   `git add context/current-feature.md context/decisions.md`, dann
   `chore: record <feature> and reset current-feature.md`.
10. `git push origin main` — **einmal**, mit allem drin.
11. Zum Branch **fragen**: soll der lokale Branch gelöscht werden, und falls er auf
    origin liegt, der dort auch? Nichts löschen, was nicht ausdrücklich freigegeben ist.
12. Kurz melden: Commit-Hashes, Links zu History und Entscheidungsblock sowie
    Zustand der Branches. Den Entscheidungsblock nicht erneut ausgeben.

## Nicht tun

- Committen, mergen, pushen oder löschen ohne die jeweilige Rückfrage.
- Zwei Slices in einen Commit ziehen.
- Die History-Tabelle in eine Liste umbauen.
- Einen bestehenden Block in `decisions.md` umschreiben, kürzen oder umsortieren. Die
  einzige Ausnahme ist der Commit-Hash in Schritt 7.
- Bei rotem Gate irgendetwas davon.
