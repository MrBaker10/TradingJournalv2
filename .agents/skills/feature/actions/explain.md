# Explain

1. Goal und Scope aus `context/current-feature.md` bis `## History` lesen.
2. `git status --short --untracked-files=all` und `git diff main --name-status`
   ausführen. Den Diff der betroffenen Dateien lesen; neue, ungetrackte Dateien
   separat einbeziehen, denn `git diff` enthält sie nicht. Unverwandte Änderungen
   benennen, nicht dem Slice zuschreiben. Dateien außerhalb des Scope markieren.
   Keine Secret-Dateien lesen oder deren Inhalte ausgeben.
3. In `context/decisions.md` nur den Formatkopf und, falls vorhanden, den aktuellen
   Slice-Block lesen. Frühere Entscheidungen nur bei konkretem Bedarf per Themensuche
   und begrenztem Abschnitt laden. Fehlt die Datei, mit `# Decisions` anlegen.
4. Einen kompakten Block am Ende anhängen. Bestehende Blöcke bleiben unverändert.
   Existiert bereits ein zutreffender Block dieses Slices, darauf verweisen; bei
   neuen Erkenntnissen nur einen Ergänzungsblock anhängen.

   ```markdown
   ## YYYY-MM-DD — <Slice> — <branch> — noch nicht committet

   **Ergebnis.** Was jetzt möglich ist.
   **Entscheidung.** Was entschieden wurde und warum; sonst „Keine neue Entscheidung.“
   **Verifikation.** Erfolgreiche Prüfungen und verbleibende Prüflücken.
   **Offen.** Nur tatsächlich offene Punkte; sonst Abschnitt weglassen.
   ```

   Dateipfade nur dort nennen, wo sie Wartung oder Verständnis erleichtern. Bei
   Domainänderungen Regel, Modul und absichernden Test nennen; bei Migrationen die
   Migration und Tabelle. Nicht jede geänderte Datei einzeln erklären. Umfang an
   der Komplexität ausrichten, keine feste Wortgrenze.
5. Projektweite Entscheidungen zusätzlich zur Übernahme in die maßgeblichen
   Projektregeln vorschlagen, nicht selbst entscheiden.
6. Im Chat nur das Ergebnis, wesentliche Entscheidungen und den Link zum Block
   nennen. Den Block nicht nochmals ausgeben. Nicht committen.
