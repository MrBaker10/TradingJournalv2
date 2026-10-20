# Start

## Schritte

1. `context/current-feature.md` nur bis `## History` lesen. Sind Goal, Scope, „Do not build" und Acceptance
   nicht gefüllt: abbrechen mit „Erst `/feature load` ausführen".
2. Branch anlegen. Name aus dem Feature-Namen, Präfix `feature/` für neue Funktionen,
   `fix/` für Korrekturen. Ist unklar, welches Präfix gilt: fragen.
   Auf `main` niemals direkt arbeiten.
3. Status auf `**In progress: <Name>** — Branch <branch>` setzen.
4. **Plan zuerst.** Die betroffenen Dateien in Reihenfolge auflisten, dazu Migrationen
   und Domain-Module. Den Plan ausgeben und Freigabe abwarten, wenn der Slice mehr als
   zwei bis drei Dateien berührt.
5. Umsetzen, in dieser Reihenfolge:
   - **Domain zuerst.** Berührt der Slice `src/domain/**`: das Modul und seine
     Vitest-Suite entstehen zusammen, im selben Commit. Der Test wird zuerst grün,
     bevor eine Query oder ein Screen das Modul benutzt. Nachgelagerte Tests sind für
     Streak, Consistency, Badges und CSV-Erkennung nicht zulässig.
   - Dann Schema und Migration. `pnpm db:generate`, dann `pnpm db:migrate`, niemals
     `push`. Schemaänderung und generierte Migration gehören in denselben Commit.
   - Dann Query, Server Action, Zod-Schema.
   - Dann UI.
6. Während der Umsetzung gilt: minimale Änderung, keine unbeteiligten Refactorings,
   keine „nice to have"-Zusätze. Wirkt ein bestehendes Muster falsch, das sagen statt
   ein zweites einzuführen.
7. Kommt eine Frage auf, die der Spec nicht beantwortet: unter `### Open questions`
   eintragen und fragen. Nicht die bequemste Auslegung wählen.
8. Am Ende: **nicht committen.** Auf `verify` verweisen.
