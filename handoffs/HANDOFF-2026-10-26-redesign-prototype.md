# Handoff: Redesign-Prototypen, alle sieben Seiten - 2026-10-27

## TL;DR
Sieben UI-Prototypen für das Redesign (ADR 0004) sind fertig und committet. **Dashboard und Navigation:** Variante D, eine einklappbare, gruppierte Sidebar mit ⌘K und dem Dashboard aus C. **Journal:** Ansicht D, Tagesprotokoll mit breitem Detail-Sheet. **Trade erfassen:** Ansicht E, Schritte mit Rückmeldung bei jeder Auswahl, als eigene Seite. **Progress:** Ansicht D, Orb und Score-Ring oben, Heatmap und Badge-Liste darunter. **Analytics:** Ansicht D, nach Fragen gegliedert mit kleinen Karten und Detail-Sheet. **Settings:** Ansicht D, eine Seite mit Kontotabelle, Editor im Sheet, Konto in der URL. **Prop Firm Rules:** Ansicht D, Größe zuerst, Karten je Firma, Firmenseite im Sheet. Es gibt keinen offenen Prototyp mehr. Als Nächstes Phase 2 (`/to-spec`) auf `feature/redesign`.

## Ergebnis Dashboard und Navigation (Verdikt)
Frage: *Wie sollen Navigation und Dashboard im neuen Design aussehen und sich anfühlen?*

- **Navigation (D):** Sidebar mit drei Gruppen: Daily (Dashboard, Trade Journal, Econ Calendar), Review (Analytics, Progress, Ledger), Set up (Strategies, Prop Firm Rules, Settings).
  - Einklappbar auf eine 56-px-Icon-Leiste mit Tooltips. Der Toggle sitzt oben neben der Kontoauswahl, nicht beim Logout; alternativ die Taste `[`. Der Zustand wird in localStorage gespeichert.
  - ⌘K-Palette für Seiten, Aktionen und Kontowechsel.
  - „Log trade“ als gefüllter Primary-Button, Taste `C`.
- **Dashboard (C):**
  - Monatskalender als Hauptfläche. Tage sind schwach getönt, grün oder rot nur nach Vorzeichen, nie nach Höhe. Beim Hover hebt sich der Tag an (Scale, Schatten, über den Nachbarn); bei reduzierter Bewegung bleibt nur der Schatten.
  - Rechte Spalte: Streak-Orb (Three.js), Process metrics, Plan und Checkliste.
  - Darunter die Money metrics als Mono-Key/Value-Liste, Equity-Chart und letzte Einträge.
- **Checkliste:** Abhaken streicht wie mit einem Stift durch, Zeile für Zeile nacheinander, mit konstanter Stiftgeschwindigkeit. Die Zeilenboxen werden per `Range.getClientRects()` gemessen. Zurücknehmen nimmt alle Linien gleichzeitig weg.
- **Practice-Konto:** weicher gelber Nebel ohne harte Kante um den gesamten Inhaltsbereich, die Sidebar ist ausgenommen. Vom User nach mehreren Stufen bestätigt: `inset 0 0 140px rgb(251 191 36 / .27), inset 0 0 36px rgb(251 191 36 / .25)`.
- **Schrift:** Instrument Sans, Zahlen in IBM Plex Mono (beide schon lokal in `src/app/fonts`).
- **Stack:**
  - shadcn/ui auf Base UI ist eingeführt.
  - `motion` bleibt Standard.
  - Three.js nur für die Streak-Orb: lazy, mit statischem SVG-Fallback, ohne WebGL oder bei reduzierter Bewegung statisch.
  - **GSAP kommt in den Stack, aber für Landingpage und Billing**, nicht für das Dashboard.

## Ergebnis Journal (Verdikt)
Frage: *Wie sehen dichte Listen, Filter und das Trade-Detail aus?*

- **Liste (aus C):** Tagesprotokoll. Jeder Handelstag ist ein Abschnitt mit mitlaufender Datumsspalte (Wochentag, Datum, Anzahl Einträge und Missed, Tages-P&L). Darunter eine Zeitleiste der Einträge auf der Chart-Uhr (Punkte nach Vorzeichen gefärbt, Missed grau) und Karten mit erstem Screenshot, Notizauszug, Confluences und Mistakes. Sortiert nach R ist es eine Liste ohne Tage.
- **Filter:** ein „Filter“-Menü für Zeitraum (30d, 90d, Monat, alle), Instrument und Sortierung. Instrumente sind **nach Asset-Klasse gruppiert** (`groupByAssetClass` aus `src/domain/instruments.ts`).
- **Detail (Mischung aus A und C):** Ein Klick öffnet ein **breites Sheet** über dem Protokoll mit der Aufteilung aus A: Execution und Process nebeneinander, Konten, Confluences und Mistakes rechts, darunter Notizen, Screenshots mit Lightbox und Links mit TradingView-Vorschau. Oben stehen **„Open page“** (volle Detailseite `/journal/[id]`) und „Edit“.
- **Regeln eingehalten:** Für einen Zeitraum nur Anzahlen, keine Geldsumme; Tageswerte an den Tagesköpfen. Missed setups mit gleicher Struktur, nur markiert. Geld nur mit Vorzeichenfarbe.
- **Offen für die Spec:** Ob Ledger, Econ Calendar und die Strategies-Liste ebenfalls ein Tagesprotokoll bekommen oder die dichte Tabelle aus Journal-Ansicht A. Die Tabelle passt vermutlich besser zum Ledger.
- **Beobachtung:** Die meisten Einträge haben keinen Screenshot; die Karten zeigen dann ein leeres Bildfeld. In der Spec klären, ob das Feld ohne Screenshot entfällt.

## Ergebnis Trade erfassen (Verdikt)
Frage: *Wie fühlt sich die tägliche Eingabe an: eine Seite oder mehrstufig, Tags, Screenshots und Links, Feedback beim Speichern? Soll das Formular auch als Sheet aus dem Journal aufgehen?*

- **Schritte (E):** fünf Schritte (What, Execution, Why, Reflect, Evidence). Pflichtfelder nur in Schritt 1–2; ab Schritt 3 überspringt „Log now“ den Rest (⌘↵). Enter geht weiter.
- **Auswahl mit Rückmeldung:** lose Buttons statt starrer Segmentleiste. Ein gemeinsamer Auswahl-Hintergrund gleitet per Feder (`layoutId`) zur Wahl, der Druck gibt nach (`whileTap`), ein Haken poppt auf. Ein zweiter Klick hebt die Wahl auf. Vom User ausdrücklich gewünscht: B wirkte zu starr, E „genau so“.
  - Zweier-Antworten (Taken/Missed, Long/Short) als große Karten mit Hinweis; Grade als runde Buttons A–F; Strategie als Buttons.
  - Chips (Konten, Confluences, Mistakes) federn beim Umschalten und zeigen einen Haken. Practice-Konto nicht vorausgewählt, gelber Streifen.
- **Schrittleiste:** zeigt unter jedem Schritt die bisherigen Antworten („NQ · Long“, „London · Reversal“); fertige Schritte bekommen einen Haken.
- **Bewegung:** Schritte gleiten in Laufrichtung, Fortschrittsbalken füllt sich, fehlende Pflichtfelder wackeln. Bei reduzierter Bewegung bleiben nur die Farben.
- **Speichern:** Kreis und Haken werden gezeichnet, „Trade logged“ mit „Log another“ und „View in journal“. Nie das Ergebnis; P&L nur live beim Tippen, in Vorzeichenfarbe.
- **Kein Sheet:** Erfassen bleibt eine eigene Seite `/journal/new`, auch aus dem Journal heraus (Ansicht D verworfen).
- **Offen für die Spec:** Die Confluence-Gruppen machen Schritt 3 zur langen Wand; einklappbare Gruppen prüfen. Ob Import, Settings und Ledger-Eintrag ebenfalls Schritte bekommen oder nur die Auswahl-Bausteine übernehmen.

## Ergebnis Progress (Verdikt)
Frage: *Wie werden Badges, Streak und Weekly Review als Process moments ausdrucksstark, aber verhältnismäßig? Braucht es Three.js über die Orb hinaus?*

- **Oben, drei Spalten im Stil von B:** Streak als Orb (Three.js, wie auf dem Dashboard) mit Wochenleiste Mo–Fr darunter; Score als Ring aus seinen vier Teilen mit Legende und geloggten Handelstagen; Karte „This week's review“ mit „Write review“.
- **Next up:** die drei Badges, die dem Verdienen am nächsten sind, mit Fortschritt („132/250“).
- **Darunter aus A:** Heatmap der geloggten Handelstage über 26 Wochen (Grace-Tag gestrichelt, heute umrandet) und die Badge-Liste nach Kategorie mit Datum oder Fortschritt.
- **Process moment:** Der Orb sammelt sich, der Tag in der Heatmap pulsiert einmal, ein Lichtstreif läuft über die neue Badge-Zeile. In Ruhe bewegt sich nichts.
- **Weggelassen:** Zeitleiste der Momente (B), Badge-Sternbild (C), Score-Balken und Review-Zeile (A).
- **Three.js** bleibt auf die Orb beschränkt; das Sternbild in SVG mit `motion` reichte, wurde aber verworfen.
- **Mikro-Feedback:** „Write review“ hebt sich beim Hover, der Pfeil rückt nach (150 ms). Tailwind 4 animiert `translate`/`scale` als eigene CSS-Eigenschaften; eine Transition muss diese nennen, nicht `transform`.

## Ergebnis Analytics (Verdikt)
Frage: *Wie liest ein Trader elf Dimensionen, die Ausführung und die Missed setups, ohne Wand aus Tabellen, und wie sehen die Charts aus?*

- **Gerüst aus C:** sechs Fragen (Was trägt, was zieht runter? Wann? Was und wie? Ausführung? Was steht im Weg? Wo zögere ich?). Jede der elf Dimensionen landet in einer Frage. Links läuft ein Inhaltsverzeichnis mit.
- **Raster aus B:** In den Fragen stehen die Dimensionen als kleine Karten nebeneinander: Net P&L mit Avg R daneben, der Balken als dünne Linie unter der Zeile.
- **Detail aus A im Sheet:** Ein Klick auf Karte, Ranking-Zeile oder Spaltenchart öffnet ein breites Sheet mit Balken von der Nulllinie, voller Tabelle und Umschalter für die Kennzahl. Umgeschaltet wird nur dort.
- **„Holding up / Dragging“:** nur nach Avg R gerankt, und nur Werte, bei denen mindestens 3 Trades ein R haben; jede Zeile zeigt R, n und P&L. Geld nur in Vorzeichenfarbe.
- **Wochentag und Stunde** als Spalten von einer Nulllinie, die nach dem Verhältnis von Gewinnen zu Verlusten sitzt.
- **Sheet-Bewegung:** fährt vollständig von rechts ein (600 ms, `cubic-bezier(0.32,0.72,0,1)`, hinaus 300 ms) statt shadcns 2,5-rem-Versatz mit Einblenden. Vom User ausdrücklich gewünscht.
- **Offen für die Spec:** „Not set“ bestimmt oft die Balkenlänge und lässt echte Werte verschwinden (aus der Skalierung nehmen?). Ob alle Sheets, auch das Journal-Detail, so einfahren.

## Ergebnis Settings (Verdikt)
Frage: *Wie ist ein Einstellungsbereich mit vielen Abschnitten aufgebaut, und wie wird ein Konto bearbeitet (Details, Kommissionen, Prop-Firm-Verknüpfung)?*

- **Gerüst aus A:** eine Seite mit den Abschnitten Accounts, Checklist, Data, Security; links eine mitlaufende Navigation. Konten als dichte Tabelle (Währung, Startkapital, Prop Firm mit Statuspunkt, Practice-Streifen). Der Editor öffnet als Sheet von rechts mit den drei Teilen untereinander, dasselbe Muster wie Analytics D.
- **Aus C:** Die Navigation listet unter „Accounts“ jedes Konto einzeln mit Streifen und Statuspunkt. Im Sheet-Kopf stehen „n / total“ und Pfeile zum nächsten und vorherigen Konto; ↑/↓ ebenso. Das Sheet bleibt dabei offen.
- **Aus B:** Das offene Konto steht in der URL (`?account=<id>|new`), damit ein Link von der Dashboard-Karte „Rule status“ direkt das richtige Sheet öffnet und ein Reload es behält. Esc entfernt den Parameter.
- **Weggelassen:** die Reiter und die Kontoseite aus B, der Master-Detail-Aufbau aus C.
- **Erkenntnis:** Das Dialog-Element von Base UI gibt Tastendrücke nicht an `window` weiter. Tastaturkürzel in Sheets gehören an das Sheet selbst.

## Ergebnis Prop Firm Rules (Verdikt)
Frage: *Wie liest sich ein Nachschlagewerk aus 15 Firmen, je ein Programm pro Kontogröße, 18 Regelfelder: Firma durchsehen, Programm finden, bis zu drei vergleichen, verknüpfte Konten erkennen?*

- **Gerüst aus C:** Zuerst die Kontogröße, darunter jede Firma bei dieser Größe als Karte mit sechs Kennzahlen (Size, Target, Max drawdown, Daily loss, Min days, Split) und Tags. Programme, mit denen ein echtes Konto verknüpft ist, stehen vorn und tragen den Kontonamen. Der Vergleich ist ein Panel über den Karten: bis zu drei, wörtlich, nichts bewertet, ein Punkt markiert abweichenden Wortlaut.
- **Aus A:** Die Firmenseite liegt im Sheet, das eine Karte öffnet: Website, Verifizierungsdatum, alle 18 Regeln, und im Kopf der Programm-Umschalter der Firma (50k → 100k ohne Schließen).
- **Vorbelegung:** Die Größe öffnet auf der des verknüpften Kontos, sonst „Any size“.
- **Weggelassen:** B (Tabelle) und die Firmenliste aus A. B scheitert an den Daten: Die Kennzahlen in `PropFirmsData.md` sind Prosa und werden in Spalten abgeschnitten.
- **Regeln:** bleiben wörtlich, fehlende Felder heißen „Not recorded“.
- **Erkenntnis:** Eine Karte mit eigenen Aktionen darf nicht selbst ein Button sein; ein Button im Button ist ungültiges HTML und brach die Hydration.
- **Offen für die Spec:** Ob `PropFirmsData.md` strukturierte Zahlen bekommt (Target, Drawdown, Daily loss), damit eine Ansicht sortieren und filtern kann. Ob Filter und Compare wie in v1 in die URL zurückgehen.

## Was gemacht wurde
- Branch `prototype/redesign-dashboard` von `main` angelegt, Commit `a4f742b` (`chore: prototype redesign navigation and dashboard variants`). Das Verdikt steht auch im Commit-Body.
- Varianten auf dem bestehenden `/dashboard` per `?variant=A|B|C|D`, ohne Parameter v1:
  - A: gruppierte Sidebar, Geist, motion
  - B: Top-Bar im Stripe-Stil, Inter, GSAP-Timeline am Process moment
  - C: Icon-Rail mit ⌘K, Instrument Sans, Three.js-Orb
  - D: Gewinner (Navigation A und C, Dashboard C)
- Die Shell wird clientseitig gewählt (Layouts bekommen keine `searchParams`): `src/components/shell/prototype-shell.tsx`, eingebunden in `src/app/(app)/layout.tsx`. Die Seite wechselt nur den gerenderten Baum, das Data-Fetching in `src/app/(app)/dashboard/page.tsx` ist unverändert.
- Floating-Switcher (nur außerhalb von Production) mit ←/→ und dem Button „Replay process moment“, weil die lokale Streak 0 ist.
- shadcn init (`base-nova`), Tokens in `src/app/globals.css` **auf `.redesign` begrenzt**, damit v1 unverändert bleibt. Die Shell setzt `redesign dark` und die Font-Klasse zusätzlich auf `body`, weil shadcn-Overlays in `body` portalen.
- **Journal-Prototyp:** Branch `prototype/redesign-journal` (abgezweigt von `prototype/redesign-dashboard`), Commit `f690eea` (`chore: prototype redesign journal views`), Verdikt im Commit-Body.
  - Ansichten auf `/journal?variant=D&view=A|B|C|D`, ohne `view` das v1-Journal. A: dichte Tabelle mit Detailseite. B: geteilte Ansicht mit Liste und Detail. C: Tagesprotokoll mit Sheet. D: Gewinner.
  - Der Switcher schaltet auf Journal-Routen `view` (und setzt `variant=D`), sonst `variant`. Konfiguriert in `src/components/prototype/variant.ts` (`JOURNAL_VIEWS`).
  - Code in `src/components/journal/prototype/`. Der gemeinsame Detail-Inhalt `trade-detail-body.tsx` nutzt nur die Daten der Listenzeile (`JournalTradeRow`), keine zusätzliche Abfrage. `/journal/[id]` zeigt mit `view` die neue Detailseite (`trade-detail-page.tsx`).
  - Neu: shadcn `sheet` (`src/components/ui/sheet.tsx`).
- Neue Dependencies, alle exakt gepinnt:
  - gsap 3.15.0 und @gsap/react 2.1.2: GSAP Standard No-Charge License, kostenlos auch kommerziell; Ausnahme sind Tools, die mit Webflow konkurrieren.
  - three 0.186.1 und @types/three 0.186.0 (MIT).
  - Von shadcn installiert: @base-ui/react 1.9.0, cn 0.5.0, class-variance-authority 0.7.1, cmdk 1.1.1, tw-animate-css 1.4.0, shadcn 4.22.1 (Runtime-Dependency wegen `@import "shadcn/tailwind.css"`).

- **Trade-erfassen-Prototyp:** Branch `prototype/redesign-trade-form` (abgezweigt von `prototype/redesign-journal`), Commit `2d81a53` (`chore: prototype redesign trade form views`), Verdikt im Commit-Body.
  - Ansichten auf `/journal/new?variant=D&view=A|B|C|D|E`, ohne `view` das v1-Formular. A: eine Seite mit Seitenpanel. B: Schritte. C: Quick ticket mit Sitzungsliste. D: Formular als Sheet über dem Journal. E: Gewinner (B mit Rückmeldung).
  - Code in `src/components/trades/prototype/`: `form-kit.tsx` (Zustand im Speicher, Stub-Submit, Bausteine, Block „Prototype“ mit letztem Payload), `trade-form-a…e.tsx`. Switcher-Konfiguration `TRADE_FORM_VIEWS` in `src/components/prototype/variant.ts`; der Switcher schaltet auf `/journal/new` diese Ansichten.
  - Keine neue Dependency; `motion` (13.2.0) war schon da.
- **Progress-Prototyp:** Branch `prototype/redesign-progress` (von `prototype/redesign-trade-form`), Commit `9eb64d1`, Verdikt im Commit-Body.
  - Ansichten auf `/progress?variant=D&view=A|B|C|D`. A: ruhiges Protokoll mit Heatmap. B: Zeitleiste der Momente. C: Bühne mit Orb und Sternbild. D: Gewinner (Mischung).
  - Code in `src/components/progress/prototype/`: `shared.tsx` (Daten, Schalter „Real data / Sample data“, weil der lokale Account keine Streak hat), `progress-a…d.tsx`. Die Seite lädt dafür zusätzlich `getBadgeCounters`, `getBestMonthlyScore` und die letzten Review-Wochen. Der Switcher zeigt auf `/progress` „Replay process moment“.
- **Analytics-Prototyp:** Branch `prototype/redesign-analytics` (von `prototype/redesign-progress`), Commit `a03d2e9`, Verdikt im Commit-Body.
  - Ansichten auf `/analytics?variant=D&view=A|B|C|D`. A: Explorer, eine Dimension auf einmal. B: Report mit kleinen Karten und Sheet. C: Fragen. D: Gewinner (Mischung).
  - Code in `src/components/analytics/prototype/`: `shared.tsx` (Kennzahlen, Zeitraum-Chips, Ausführungs-Charts, Missed-Balken), `analytics-a…d.tsx`. Die Seite reicht zusätzlich `rCounts` je Dimension und Wert durch.
- **Settings-Prototyp:** Branch `prototype/redesign-settings` (von `prototype/redesign-analytics`), Commit `8ef7701`, Verdikt im Commit-Body.
  - Ansichten auf `/settings?variant=D&view=A|B|C|D`. A: eine Seite mit Sheet. B: Reiter (`?tab=`) mit Kontokarten und Kontoseite. C: Master-Detail. D: Gewinner.
  - Code in `src/components/settings/prototype/`: `shared.tsx` (Daten, `AccountEditor`, Checkliste, Sicherheit, Export, Stub-Save), `settings-a…d.tsx`. Jeder Save ist ein Stub.
- **Prop-Firm-Prototyp:** Branch `prototype/redesign-prop-firms` (von `prototype/redesign-settings`), Commit `7710d2d`, Verdikt im Commit-Body.
  - Ansichten auf `/prop-firms?variant=D&view=A|B|C|D`. A: Directory. B: Tabelle. C: Größe zuerst. D: Gewinner.
  - Code in `src/components/prop-firms/prototype/`: `shared.tsx` (Kennzahlen, Regelliste, Compare-Sheet und -Leiste, Filter), `prop-firms-a…d.tsx`. Die Seite lädt dafür alle Zeilen ungefiltert plus die Kontoverknüpfungen des Users; Filter und Compare liegen im Speicher.

## Aktueller Stand
- Aktueller Branch `prototype/redesign-prop-firms` (`7710d2d`), darunter in dieser Reihenfolge `prototype/redesign-settings` (`8ef7701`), `prototype/redesign-analytics` (`a03d2e9`), `prototype/redesign-progress` (`9eb64d1`), `prototype/redesign-trade-form` (`2d81a53`), `prototype/redesign-journal` (`f690eea`) und `prototype/redesign-dashboard` (`a4f742b`). Alle sieben Prototypen committet. Der letzte Branch enthält alle Prototypen und ist die Primärquelle für die Spec.
- **Uncommittet im Arbeitsverzeichnis:** `GLOSSARY.md` und `docs/adr/0004-redesign-replaces-design-v1.md` aus Phase 1. Sie werden laut Plan in Phase 2 auf `feature/redesign` committet. Beim Branch-Wechsel mitnehmen, nicht auf dem Prototyp-Branch committen.
- Ebenfalls untracked: dieses Handoff unter `handoffs/`.
- Pre-commit-Hook bei allen sieben Commits grün: `pnpm lint`, `pnpm typecheck`, `pnpm test` (79 Dateien, 1335 Tests) und `pnpm build`.
- Im Browser geprüft (Claude in Chrome): alle Varianten, ⌘K, Account-Menü, Practice-Markierung, Sidebar-Toggle, Kalender-Hover, Stift-Durchstreichen (Ablauf per JS gemessen), Konsole ohne Fehler.
- Journal im Browser geprüft: alle Ansichten, Filter (behält `variant` und `view`), Instrumentgruppen, Sheet, „Open page“, Tastatur in A und B, Konsole ohne Fehler.
- Trade erfassen im Browser geprüft: A (Live-P&L NQ +40 Punkte = +$800.00, +2.00R, Speichern), B (Validierung), C (Loggen, Liste, Ticket geleert), D (Sheet, Esc), E (Karten, Auswahl, Echo in der Schrittleiste). Konsole ohne Fehler. In E nicht im Browser geprüft: Speichern mit gezeichnetem Haken, Wackeln der Fehlermeldung.
- Progress im Browser geprüft: alle Ansichten mit echten und Sample-Daten, Replay des Moments in A–D, Hover von „Write review“ gemessen. Konsole ohne Fehler. Reduzierte Bewegung nicht geprüft.
- Analytics im Browser geprüft: A (Dimension, Kennzahl, Execution), B (Raster, Sheet), C (alle Fragen), D (Ranking, Sheet, Inhaltsverzeichnis, Einfahren des Sheets per Positionsmessung). Konsole ohne Fehler.
- Settings im Browser geprüft: A (Tabelle, Sheet mit echten Kommissionen), B (Karten, Kontoseite, Reiter), C (Liste, Editor), D (Deep Link `?account=new`, Esc räumt die URL, Kontoliste, „Next account“ und ↓). Konsole ohne Fehler. Nicht geprüft: Drag & Drop der Checkliste.
- Prop Firm Rules im Browser geprüft: A (Firmenwechsel, Compare-Leiste und Sheet), B (Tabelle), C (Compare-Panel, Regel-Sheet), D (Vorbelegung 25k mit Lucid vorn, Compare-Panel, Sheet mit Programm-Umschalter). Konsole ohne Fehler. Nicht geprüft: Suche, Tag-Filter, Sortierung in B.
- **Nicht geprüft:** Mobile Breiten. Alle Prototypen sind desktop-first, Responsive fehlt.
- Im Prototyp gibt es keine echten Mutationen, mit einer Ausnahme: Die Kontoauswahl nutzt die bestehende Action `setSelectedAccount`. Checklisten-Haken liegen nur im Speicher.

## Nächste Schritte
Nicht jede Seite bekommt einen Prototyp, sondern jedes noch offene Muster. Die Shell von D gilt in allen Prototypen als gesetzt. Jeder Prototyp läuft als Sub-Shape A auf seiner bestehenden Route, auf einem eigenen Branch **vom jeweils letzten Prototyp-Branch (jetzt `prototype/redesign-prop-firms`)**, denn dort gibt es Shell D, shadcn-Setup, den Switcher und das Muster `?view=`. Aufzurufen mit `?variant=D&view=…`; für eine neue Seite im Switcher ein eigenes `…_VIEWS` analog zu `JOURNAL_VIEWS` anlegen.

| Muster | Seiten | Abdeckung |
|---|---|---|
| Übersicht, Kalender, Kennzahlen | Dashboard | erledigt (D) |
| Regeln und Grenzen je Konto | Prop Firm Rules | erledigt (Prop Firms D) |
| Dichte Tabellen, Detail | Journal, Trade-Detail, Ledger, Econ Calendar, Strategies-Liste | erledigt (Journal D) |
| Formulare, Eingabe | Trade erfassen/bearbeiten, Import, Ledger-Eintrag | erledigt (Trade-Form E) |
| Einstellungen, Konten verwalten | Settings | erledigt (Settings D) |
| Process metrics, Belohnung | Progress, Weekly Review, Badges | erledigt (Progress D) |
| Auswertung, Charts | Analytics | erledigt (Analytics D) |
| Auth | Login, Register | über die Spec |

1. ~~Prototyp Journal~~: erledigt, siehe „Ergebnis Journal“.
2. ~~Prototyp Trade erfassen~~: erledigt, siehe „Ergebnis Trade erfassen“.
3. ~~Prototyp Progress~~: erledigt, siehe „Ergebnis Progress“.
3a. ~~Prototyp Analytics~~: erledigt, siehe „Ergebnis Analytics“.
3b. ~~Prototyp Settings~~: erledigt, siehe „Ergebnis Settings“.
3c. ~~Prototyp Prop Firm Rules~~: erledigt, siehe „Ergebnis Prop Firm Rules“.
4. **Phase 2 `/to-spec`:**
   - Branch `feature/redesign` von `main`; ADR 0004 und `GLOSSARY.md` dort committen.
   - `context/Design.md` nach `context/Design-v1.md` archivieren und ein neues, kurzes `context/Design.md` aus dem Verdikt oben schreiben (Vorschlag, dann OK des Users).
   - `AGENTS.md`, `context/project-overview.md` und `context/coding-standards.md` anpassen (jeweils Vorschlag, dann OK).
   - Stack-Ergänzungen in die Spec aufnehmen; GSAP mit dem Vermerk „Landingpage und Billing“.
   - Feature-Stopp auf `main` bis zum Merge.
5. Beim Umsetzen den Prototyp **neu schreiben, nicht übernehmen**. `prototype/*`, Switcher und Varianten-Code gehören nicht nach `main`. shadcn-Setup, Token-Begrenzung und das Portal-Problem (Body-Klassen) sind Erkenntnisse für die echte Umsetzung.

## Offene Punkte / Risiken
- **ADR ergänzen:** Die GSAP-Entscheidung (Landingpage und Billing) und der Prototyp-Branch als Primärquelle sollten im ADR- bzw. Spec-Kontext festgehalten werden. Der ADR selbst ist noch uncommittet.
- **Tokens:** Die neuen shadcn-Tokens sind global in `@theme inline` registriert (`--color-border`, `--color-primary` usw.), aber nur unter `.redesign` definiert. Auf `feature/redesign` werden sie global; dann prüfen, dass v1-Code nicht kollidiert. Eine Prüfung per grep in dieser Session fand keine Kollision.
- **Generierter shadcn-Code:** `src/components/ui/command.tsx` legt im `CommandDialog` keinen eigenen `<Command>` um den Inhalt; Aufrufer müssen ihn selbst wrappen. `src/components/ui/input-group.tsx` braucht zwei `biome-ignore` für a11y-Regeln.
- **Neben v1-Primitives:** Die shadcn-Komponenten liegen in `src/components/ui/` neben den v1-Primitives (toast, toggle-switch, …). Das ADR sieht vor, dass shadcn die Primitives ersetzt.
- **Practice-Nebel:** Die Intensität ist vom User bestätigt; in der Spec als Token festhalten.

## Wichtige Pfade & Befehle
- `pnpm dev`, dann `http://localhost:3000/dashboard?variant=D`: Gewinner ansehen, ←/→ schaltet Varianten.
- `src/components/shell/prototype/shell-d.tsx`: Gewinner-Navigation (Collapse, Practice-Nebel).
- `src/components/dashboard/prototype/dashboard-c.tsx`: Gewinner-Dashboard (Kalender, Hover, Tönung).
- `src/components/dashboard/prototype/parts.tsx`: `PenStrike`, `LocalChecklist`, `EquityChart`, `monthCells`.
- `src/components/dashboard/prototype/streak-orb.tsx`: Three.js-Orb mit SVG-Fallback.
- `src/components/prototype/`: Varianten-Logik, Switcher, Fonts, ⌘K-Palette, Account-Menü, gruppierte Nav.
- `pnpm dev`, dann `http://localhost:3000/journal?variant=D&view=D`: Journal-Gewinner ansehen.
- `src/components/journal/prototype/journal-c.tsx`: Journal C und D (`JournalD` = `JournalC` mit `mixed`).
- `src/components/journal/prototype/trade-detail-body.tsx`: Detail-Inhalt (Sheet und Seite).
- `pnpm dev`, dann `http://localhost:3000/journal/new?variant=D&view=E`: Trade-Form-Gewinner ansehen.
- `src/components/trades/prototype/trade-form-e.tsx`: Gewinner (`Choice`, `ToggleChips`, `CardChoice`, Schrittleiste, gezeichneter Haken).
- `src/components/trades/prototype/form-kit.tsx`: gemeinsamer Zustand und Stub-Submit der Ansichten.
- `pnpm dev`, dann `http://localhost:3000/progress?variant=D&view=D`: Progress-Gewinner, oben rechts „Sample data“, im Switcher „Replay process moment“.
- `src/components/progress/prototype/progress-d.tsx`: Progress-Gewinner, setzt sich aus Teilen von `progress-a…c.tsx` zusammen.
- `pnpm dev`, dann `http://localhost:3000/analytics?variant=D&view=D`: Analytics-Gewinner.
- `src/components/analytics/prototype/analytics-d.tsx`: Analytics-Gewinner (Fragen, Raster, Sheet mit eigener Einfahr-Bewegung).
- `pnpm dev`, dann `http://localhost:3000/settings?variant=D&view=D`: Settings-Gewinner; `&account=new` öffnet das Sheet direkt.
- `src/components/settings/prototype/settings-d.tsx`: Settings-Gewinner (Navigation mit Kontoliste, Sheet mit Pfeilen, `?account=`).
- `pnpm dev`, dann `http://localhost:3000/prop-firms?variant=D&view=D`: Prop-Firm-Gewinner.
- `src/components/prop-firms/prototype/prop-firms-d.tsx`: Prop-Firm-Gewinner (Größe zuerst, Karten, Firmenseite im Sheet).
- `src/app/globals.css` (Ende der Datei): auf `.redesign` begrenzte shadcn-Tokens (`--positive`, `--negative`, `--process`).
- `docs/adr/0004-redesign-replaces-design-v1.md`: Regeln des Redesigns (uncommittet).
- Postgres läuft lokal in DBngin auf `localhost:5432` und muss vor `pnpm dev`, `pnpm test` und Commits laufen.

## Kontext-Notizen
- Den shadcn-Init nicht interaktiv starten: `pnpm dlx shadcn@4.22.1 init -b base -t next -p nova --no-monorepo --no-rtl -y`. Der Init ändert das Root-Layout (Geist mit `--font-sans`, Selbstreferenz in `@theme inline`) und setzt globale `body`/`*`-Styles. Beides wurde zurückgenommen bzw. eingegrenzt.
- Hydration: SVG-Koordinaten aus `Math.cos`/`Math.sin` runden, sonst unterscheiden sich Server und Client in der letzten Nachkommastelle.
- Tastatur-Handler: `event.target` kann `window` sein; vor `.closest()` mit `instanceof Element` prüfen.
- Das Konto im lokalen Account wurde während der Session mehrfach gewechselt; zuletzt war „Sim (test)“ ausgewählt, vom User selbst gesetzt.
