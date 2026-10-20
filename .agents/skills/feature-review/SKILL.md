---
name: feature-review
description: Prüft den aktuellen Trading-Journal-Slice nach grünen Gates auf Fachregeln, Sicherheit, Scope und Design.
---

# Review

Urteilsarbeit, kein Durchlauf. Läuft nach grünem `verify` und vor `/feature explain`.
Grundlage: aktiver Spec aus `context/current-feature.md` bis `## History` und die
 tatsächlichen Änderungen. Zuerst `git status --short --untracked-files=all` und
`git diff main --name-status`, dann den Diff und die neuen, ungetrackten Dateien
lesen. `git diff` allein erfasst diese nicht. Unverwandte Änderungen ausdrücklich
abgrenzen. Keine Secret-Dateien lesen oder deren Inhalte ausgeben.

Betroffene Kategorien anhand der Änderungen und ihrer Auswirkungen bestimmen,
auch über Aufrufer und gemeinsame Hilfsfunktionen. Nur für diese Kategorien weitere
Regelabschnitte und Code laden. Bereits gelesene, unveränderte Quellen wiederverwenden;
Historien nur gezielt durchsuchen. Scope immer prüfen.

## Reihenfolge

Die sieben Punkte in **genau dieser Reihenfolge** prüfen. Bei jedem: Befund plus
Dateistelle, oder ausdrücklich „nicht berührt".

1. **Money.** Kein Float auf Preisen, Punkten, P&L oder R. `numeric(14,2)` für Währung,
   `numeric(13,5)` für Preise und Punkte, `numeric(12,4)` für die Menge (Kontrakte oder Lots),
   `numeric(18,10)` für FX-Kurse. P&L aus Preisen ist in der `profit_currency` des Instruments
   und wird mit dem Kurs des Handelstags umgerechnet, in `pnl.ts` wie in SQL (`tradePnlCents`,
   `rMultipleSortKey`). Der Override ist USD und wird nie umgerechnet. Domainmathematik in
   ganzzahligen Minor Units. Punktwert aus der `instruments`-Tabelle, nie als Literal in
   einer Komponente. Jede Aggregatquery sagt, ob sie Geld- oder Zählaggregat ist —
   Geld multipliziert mit der Anzahl zugewiesener echter Konten, Zählwerte nicht.
2. **Ownership.** Jede Query filtert auf den aktuellen Nutzer. Keine Route vertraut
   einer ID vom Client ohne Prüfung. Eine `account_id` vom Client wird gegen den
   aktuellen Nutzer verifiziert, bevor ein Trade ihr zugewiesen wird. Konten sind eine
   Berechtigungsgrenze, kein Label.
3. **Visibility.** Keine Route ohne Session erreichbar. Keine öffentliche Seite, kein
   Share-Token, keine Read-only-Ansicht. Eine unauthentifizierte Route ist ein Bug.
   Einzige Ausnahmen: `/`, `/login`, `/register` und `/api/cron/*` (nur mit
   `CRON_SECRET`, ohne Nutzerdaten).
4. **Time.** `entry_time` und `exit_time` bleiben unkonvertiert, `time without time
   zone`. `users.timezone` benennt die Uhr, auf der sie stehen — die Zone, in der der
   Trader sitzt — wird aber nie auf den gespeicherten Wert angewendet. Kommt eine Zeit
   auf einer anderen Uhr herein, wird sie **einmal an der Grenze** umgerechnet und ist
   danach Chart-Uhr (`src/domain/import/normalize.ts`); nichts dahinter rechnet erneut.
   Econ-Events und Audit-Spalten sind `timestamptz`; auf welchen Kalendertag eine
   Audit-Spalte fällt, beantwortet nur eine Zone, und das ist die des Nutzers
   (`calendarDateOf`). Formatierung über `date-fns`, keine ad-hoc-`Date`-Arithmetik.
5. **Domainregeln.** Streak, Consistency Score und Badges entsprechen
   `context/project-structure.md`: 48h-Fenster fürs Zählen, Samstage übersprungen,
   Sonntag zur neuen Woche, ein Grace Day pro Kalendermonat, heute zählt nicht gegen
   den Nutzer. Score monatlich 40/20/25/15, Einträge **erst pro Tag gemittelt**.
   Missed Setups sind `trades.taken = false` und aus jeder P&L-, Win-Rate- und
   R-Zahl ausgeschlossen. Jede Abweichung braucht einen Test, der beweist, dass sie
   gewollt ist.
6. **Performance.** Kein N+1 in Journal-Liste und Analytics. Aggregiert wird in SQL,
   nicht in TypeScript. Aggregationen über die Drizzle Core API, nicht über den
   Relational Query Builder.
7. **Migrationen.** Schemaänderung und generierte Migration liegen im selben Commit.
   Über `db:generate` und `db:migrate` erzeugt, nie `push`.

## Danach

Zusätzlich prüfen und mit denselben Symbolen melden:

- **Scope.** Ist alles aus Goal und Scope umgesetzt? Ist etwas gebaut, was nicht drin
  steht? Ist etwas aus **„Do not build"** trotzdem entstanden — das ist immer 🚫,
  egal wie klein.
- **Design.** `Design.md` ist für alles Visuelle maßgeblich. Prozesswerte bekommen
  Neon, Geldwerte eine semantische Farbe und nichts weiter. Kein Hex, kein `rgba()`
  in einer Komponente. Zahlen mono mit Tabellenziffern.
- **Muster.** Ist ein bestehendes Muster durch ein zweites ergänzt worden statt
  weiterverwendet?

## Ausgabe

Betroffene Punkte knapp mit Symbol und Beleg melden; Details nur für konkrete
Befunde oder offene Fragen. Alle unberührten Punkte in einer Zeile zusammenfassen:

- ✅ erfüllt
- ⚠️ Zweifel oder Qualitätsproblem, mit Dateistelle
- ❌ Ziel verfehlt oder Regel gebrochen
- 🚫 Scope-Verletzung oder „Do not build" berührt
- ➖ nicht berührt

Abschließendes Urteil in einem Satz: **abschlussreif** oder **Nacharbeit nötig**, im
zweiten Fall mit der Liste der Punkte, die zuerst zu beheben sind. Kein ✅ vergeben,
weil etwas plausibel aussieht — bei Unsicherheit ⚠️ und die offene Frage nennen.
