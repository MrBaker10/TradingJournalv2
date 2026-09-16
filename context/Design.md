# Design.md — Trading-Journal

Designspezifikation für die App hinter dem Login. Sie beschreibt, **wie** die
bestehenden Screens aussehen und sich verhalten sollen, nicht welche Features es
gibt. Grundlage: Vision-UI-Designsprache in der Palette „Marineblau · Azure",
Schrift Instrument Sans, plus die Empfehlungen aus Kapitel 09 (Emotional Design
Case Studies).

Die Landing-Page ist **nicht** Teil dieses Dokuments und kommt später separat.
Sie wäre die einzige öffentliche Seite des Projekts und braucht dafür eine
ausdrückliche Ausnahme von der Regel „no public pages" in `project-overview.md`.

**Stack-Vorgaben aus `coding-standards.md`, die hier gelten:** Tailwind CSS v4 mit
`@theme` in `src/app/globals.css`, keine `tailwind.config.*`, shadcn/ui wo
möglich, keine Inline-Styles. Alles unten Genannte ist deshalb als Token oder
`@utility` formuliert, nicht als Style-Attribut.

**Dark only.** Es gibt keinen Light Mode und keinen Theme-Toggle. Glow liest sich
auf Hell als Unschärfe, und das Leitprinzip in Abschnitt 1 hätte auf Weiß keine
Entsprechung. Light Mode steht in der Roadmap unter Future und wäre eine eigene
Runde, keine Token-Überschreibung.

**Motion:** `motion` (vormals `framer-motion`), Version 13.2.0. Siehe die
Reduced-Motion-Auflage in Abschnitt 5.

**Schrift:** Instrument Sans und IBM Plex Mono über `next/font`, selbst gehostet,
kein externer Font-Request.

---

## 1. Das Leitprinzip

> **Neon markiert Prozess. Geld leuchtet nicht.**

Auf der Progress-Seite steht: *„Consistency, not P&L. Nothing on this page ranks
or rewards money."* Diese Aussage ist die Designregel, nicht nur ein Satz im UI.

| Element | Behandlung |
|---|---|
| Streak, Consistency, Badges, By the book, Reviews, Screenshots, Links | Verlaufsfüllung, Neon-Rand, Glow-Text |
| Net P&L, Avg winner/loser, Expectancy, Best/Worst day, Drawdown | Semantische Farbe (grün/rot), **kein** Glow, **kein** Verlaufs-Tile |
| Regelgrenzen und Übungskonto-Marker | Amber, ruhig, kein Puls |

Konsequenzen, die daraus folgen und nicht verhandelbar sind:

- Kein Konfetti, kein Sound, keine Prozent-Delta-Badges („+18 %") bei Geldwerten.
- Kein Badge, kein Streak-Fortschritt und kein Score, der an P&L hängt.
- Ein roter Tag löst keine Animation aus. Kein Shake, kein Blinken, kein Alarm.
- Ein grüner Tag löst keine Feier aus. Die Zahl ist grün, das ist alles.

Begründung aus den Lektionen: L07 verlangt, dass Belohnungen **proportional und
verdient** sind, L08 verlangt **bedeutungsvolle Metriken** statt hohler Punkte.
Ein glühender P&L-Wert würde beides brechen, weil ein guter Monat Zufall sein kann.

---

## 2. Tokens

Vollständig in `src/app/globals.css` unter `@theme`. Werte in Hex/RGBA, weil das
Farbmodell aus dem Vision-UI-Vorbild kommt und exakt getroffen werden soll.

```css
@import "tailwindcss";

@theme {
  /* --- Flächen --- */
  --color-bg:            #0F1535;
  --color-card-from:     rgba(6, 11, 40, 0.94);
  --color-card-to:       rgba(10, 14, 35, 0.49);
  --color-inset-from:    rgba(24, 29, 60, 0.94);
  --color-inset-to:      rgba(10, 14, 35, 0.49);
  --color-well:          rgba(6, 11, 40, 0.66);   /* Inputs */

  /* --- Text --- */
  --color-fg:            #FFFFFF;
  --color-fg-muted:      #A0AEC0;
  --color-fg-subtle:     #718096;
  --color-fg-placeholder:#5B6B8C;

  /* --- Akzent (Prozess) --- */
  --color-info:          #0075FF;
  --color-cyan:          #21D4FD;

  /* --- Semantisch (Geld & Regeln) --- */
  --color-success:       #01B574;
  --color-success-fg:    #01D98C;   /* Zahlen auf dunkel */
  --color-success-hi:    #22F0A0;   /* nur Kalender-Kachel */
  --color-danger:        #E31A1A;
  --color-danger-fg:     #FF6A6A;
  --color-danger-hi:     #FF7B7B;
  --color-warning:       #FFB547;

  /* --- Verläufe --- */
  --gradient-info:  linear-gradient(310deg, #0075FF 0%, #21D4FD 100%);
  --gradient-card:  linear-gradient(126.97deg,
                      var(--color-card-from) 19.41%,
                      var(--color-card-to)   76.65%);
  --gradient-inset: linear-gradient(126.97deg,
                      var(--color-inset-from) 19.41%,
                      var(--color-inset-to)   76.65%);
  --gradient-dark:  linear-gradient(310deg, #141727 0%, #3A416F 100%);
  --gradient-edge:  linear-gradient(126.97deg,
                      rgba(255,255,255,.20),
                      rgba(255,255,255,.04) 60%,
                      rgba(255,255,255,.12));
  --gradient-edge-neon: linear-gradient(310deg,
                      rgba(33,212,253,.85),
                      rgba(0,117,255,.28) 55%,
                      rgba(255,255,255,.10));

  /* --- Schatten & Neon --- */
  --shadow-card:      0 20px 50px -30px rgba(0,0,0,.9);
  --shadow-neon:      0 0 14px rgba(33,212,253,.55), 0 0 42px rgba(0,117,255,.35);
  --shadow-neon-soft: 0 0 10px rgba(33,212,253,.35);
  --shadow-neon-edge: 0 0 26px -6px rgba(0,117,255,.42);
  --shadow-neon-hover:0 0 20px rgba(33,212,253,.70), 0 0 54px rgba(0,117,255,.50);
  --shadow-focus:     0 0 0 3px rgba(33,212,253,.16), 0 0 22px -6px rgba(33,212,253,.55);
  --shadow-button-primary:       0 0 0 1px rgba(33,212,253,.5), var(--shadow-neon);
  --shadow-button-primary-hover: 0 0 0 1px rgba(33,212,253,.5), var(--shadow-neon-hover);

  /* --- Radien --- */
  --radius-card: 20px;
  --radius-ctl:  12px;
  --radius-xs:   9px;

  /* --- Schrift --- */
  --font-sans: "Instrument Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;

  /* --- Motion --- */
  --ease-soft: cubic-bezier(.2, .7, .3, 1);

  /* --- Übungskonto --- */
  --color-practice:      #FFB547;          /* = warning, eigener Name für eigene Bedeutung */
  --color-practice-dim:  rgba(255,181,71,.16);
  --shadow-practice:     inset 3px 0 0 0 #FFB547;
}
```

**Keine Farbliterale in Komponenten.** Die `rgba(...)`-Werte, die unten in
Abschnitt 4 zur Beschreibung stehen, werden beim Bauen der jeweiligen Komponente
als Token ergänzt, nicht als Literal übernommen. Das ist nicht Kosmetik: es ist
die einzige Vorbereitung, die einen späteren Light Mode überhaupt möglich hält.

### Hintergrund der Seite

Drei radiale Verläufe, `position: fixed`, `pointer-events: none`, hinter allem.
Nicht pro Seite variieren — der Hintergrund ist konstant, damit Navigation ruhig
wirkt.

```css
@utility page-glow {
  background:
    radial-gradient(700px 440px at   0%   0%, rgba(0,117,255,.26), transparent 66%),
    radial-gradient(640px 400px at 100%   2%, rgba(33,212,253,.16), transparent 66%),
    radial-gradient(900px 520px at  50% 108%, rgba(0,117,255,.13), transparent 70%);
}
```

### Utilities

```css
/* Standardkarte */
@utility card-surface {
  background: var(--gradient-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  position: relative;
}

/* Verlaufsrahmen (1px, per Mask) — neutral */
@utility edge {
  &::after {
    content: "";
    position: absolute; inset: 0; padding: 1px;
    border-radius: inherit;
    background: var(--gradient-edge);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude; -webkit-mask-composite: xor;
    pointer-events: none;
  }
}

/* Verlaufsrahmen — Neon, nur für Prozess-Karten */
@utility edge-neon {
  box-shadow: var(--shadow-card), var(--shadow-neon-edge);
  &::after {
    content: "";
    position: absolute; inset: 0; padding: 1px;
    border-radius: inherit;
    background: var(--gradient-edge-neon);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude; -webkit-mask-composite: xor;
    pointer-events: none;
  }
}

/* Glühende Zahl — ausschließlich Prozess-Werte */
@utility text-glow {
  color: var(--color-cyan);
  text-shadow: 0 0 22px rgba(33,212,253,.65);
}

/* Kapitälchen-Label */
@utility cap {
  font-size: .656rem;      /* 10.5px */
  font-weight: 600;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--color-fg-muted);
}
@utility cap-neon {
  color: var(--color-cyan);
  text-shadow: var(--shadow-neon-soft);
}
```

### Blur-Budget

`backdrop-filter` ist teuer und ruckelt beim Scrollen, sobald viele Karten es
gleichzeitig haben. Deshalb: **echter Blur nur auf Sidebar und Toasts.** Alle
anderen Karten bekommen nur den Verlauf, keinen Blur. Das ist optisch praktisch
nicht unterscheidbar und kostet nichts.

---

## 3. Typografie

Zwei Familien, klare Aufteilung:

- **Instrument Sans** — alles außer Zahlen.
- **IBM Plex Mono** mit `font-variant-numeric: tabular-nums` — **alle** Zahlen:
  Preise, R-Multiples, Geld, Zählwerte, Datumsangaben in Tabellen, Streak-Tage,
  Score. Grund: Zahlen in Spalten müssen untereinander stehen, und ein wechselnder
  Zeichenabstand bei laufenden Werten wirkt unruhig.

| Rolle | Größe | Gewicht | Besonderheit |
|---|---|---|---|
| Seitentitel („Welcome back, Sascha") | 19px | 700 | uppercase, `letter-spacing: .06em` |
| Sektionslabel („Plan today's session") | 10.5px | 600 | `cap` + `cap-neon` |
| Kachelwert (Streak, Consistency) | 26px | 700 | mono, `text-glow` |
| Metrikwert (Net P&L …) | 21px | 700 | mono, semantische Farbe |
| Kartentitel | 15px | 600 | — |
| Body | 14px | 400 | `line-height: 1.5` |
| Sekundär / Hilfetext | 12–13px | 400 | `--color-fg-muted` |
| Fußnote | 11.5px | 400 | `--color-fg-subtle` |

**Kapitälchen** sind für Labels und Tabellenköpfe gesetzt — das ist Teil des
Looks. Sie gelten **nicht** für Fließtext, Fehlermeldungen, Microcopy oder
Buttons. Wenn ein Label länger als etwa 22 Zeichen wird, ist es zu lang für
Kapitälchen und muss gekürzt werden, nicht umgebrochen.

---

## 4. Komponenten

### 4.1 Sidebar

- Karte mit `card-surface edge`, `position: sticky`, `top: 24px`,
  `height: calc(100vh - 48px)`, eigener Scroll.
- Marke: 28px Tile mit `--gradient-info` und `--shadow-neon`, darunter Wortmarke
  in Kapitälchen.
- Trenner: 1px Linie als Verlauf von transparent über `rgba(33,212,253,.45)` nach
  transparent, mit `0 0 8px` Schein.
- Nav-Item: 30px Icon-Tile, matt (`rgba(255,255,255,.06)`) im Ruhezustand.
- **Aktiv**: Item bekommt Inset-Verlauf plus `inset 0 0 0 1px rgba(33,212,253,.28)`,
  das Icon-Tile wechselt auf `--gradient-info` mit `--shadow-neon`. Nur ein
  aktives Item, nie zwei.
- Hover: nur Hintergrund `rgba(255,255,255,.04)` und Textfarbe. Kein Glow, sonst
  ist die Unterscheidung aktiv/hover weg.
- Fuß: Nutzerkarte mit Inset-Verlauf, darin Sign-out als einzelner Icon-Button.
  Kein Theme-Toggle, die App ist dark only.
- Sieben Items in dieser Reihenfolge: Dashboard, Trade Journal, Analytics,
  Progress, Prop Firm Rules, Econ Calendar, Settings.
- Über der Nutzerkarte sitzt der Kontoschalter aus 4.12.

### 4.2 Buttons

Zwei Varianten. Primär trägt den Verlauf, sekundär ist Glas.

```
primary : background var(--gradient-info); color #fff;
          box-shadow var(--shadow-button-primary)
ghost   : background rgba(255,255,255,.05);
          box-shadow inset 0 0 0 1px rgba(255,255,255,.12)
```

Fünf Zustände, festes Timing-Set (L09):

| Zustand | Dauer | Verhalten |
|---|---|---|
| idle → hover | 150 ms | `translateY(-1px)`, `brightness(1.1)`, `--shadow-neon-hover` |
| hover → idle | 200 ms | zurück, langsamer als rein, damit schnelles Überfahren nicht flackert |
| active | 100 ms | `scale(.978)`, kein Versatz |
| loading | 200 ms Crossfade | Label `opacity: 0`, Spinner absolut zentriert eingeblendet |
| success | 800 ms Haltezeit | Grüner Verlauf `#019A63 → #01D98C`, danach zurück auf idle |

**Der Button behält in jedem Zustand seine Breite.** Label und Overlay liegen
übereinander, das Overlay ist `position: absolute; inset: 0`. Nichts unter dem
Button darf springen (L09).

Der Erfolgszustand ist der einzige Ort, an dem Grün leuchten darf — er bestätigt
eine Handlung, nicht einen Geldbetrag.

**Offen seit Designrunde 1:** Der „Save plan"-Button im Dashboard trägt im
Ruhezustand die ruhige Prozessfläche aus 4.14 statt `--gradient-info` und
`--shadow-button-primary`. Alle übrigen Primärbuttons („New trade", Trade
speichern, Konto anlegen) stehen noch auf der lauten Variante oben. Das ist ein
bewusster Zwischenstand, kein Versehen: die neue Tonalität wird erst an einer
Seite beurteilt, bevor sie sich über das Projekt legt. Der Erfolgszustand bleibt
in **beiden** Varianten laut.

### 4.3 Gamification-Kacheln (Streak, Consistency, Badges)

- `card-surface edge-neon`, Padding 18/20.
- Links: `cap`-Label, Wert 26px mono mit `text-glow`, darunter Zusatzzeile in
  `--color-fg-subtle` („Longest 21d", „of 100 · 16/19 days", „Tap for criteria",
  „This month").
- Rechts: 46px Tile, **ruhige Prozessfläche nach 4.14** — `--gradient-info-soft`,
  `--shadow-info-soft`, Icon in `--color-cyan`. Bis zur Designrunde 1 waren das
  `--gradient-info` und `--shadow-neon`; die Kachel überstrahlte damit den Wert,
  den sie beschriftet.
- Der Streak-Tile bumpt bei einem neu geloggten Trade **einmal**:
  `scale(1) → 1.14 → 1` über 620 ms mit `--ease-soft`. Kein Dauerpuls.
  Ausgelöst wird er über `users.dashboard_seen_at` — gebumpt wird, wenn seit dem
  letzten Dashboard-Besuch ein Trade dazukam, und die Kachel verbucht den Bump
  danach selbst. Bis zur Designrunde 1 stand hier, er sei „das einzige animierte
  Element im Dashboard"; das stimmte schon davor nicht, weil der Kalender sich
  beim Laden aufbaut und seit Designrunde 1 auch einen Hover hat.

### 4.4 Hinweisleiste (Grace Day)

Volle Breite, `--radius-card`, Amber-Inset:
`inset 0 0 0 1px rgba(255,181,71,.3)` plus `0 0 24px -12px rgba(255,181,71,.5)`.
30px Icon-Tile in `rgba(255,181,71,.16)`. Erste Teilsatz fett und weiß, Rest in
`--color-fg-muted`. Chevron rechts, klickbar, öffnet die Streak-Regeln.

Diese Leiste ist eine Erklärung, keine Warnung. Kein Rot, kein Ausrufezeichen,
kein Dismiss-Button — sie verschwindet, wenn der Grace Day nicht mehr aktuell ist.

### 4.5 Formularfelder

Die Regeln aus L10, wörtlich umgesetzt:

- **Label steht immer über dem Feld** und bewegt sich nie. Keine Floating Labels,
  keine Platzhalter als Label-Ersatz.
- Feld: `--color-well`, `1px solid rgba(255,255,255,.12)`, `--radius-ctl`.
- Hover: Rand auf `rgba(33,212,253,.35)`, 200 ms.
- Fokus: Rand `--color-cyan` plus `--shadow-focus`, 200 ms. Kein Layout-Wechsel.
- **Die Meldungszeile unter dem Feld existiert von Anfang an** mit
  `min-height: 18px`. Sie wird nur ein- und ausgeblendet (`opacity`,
  `translateY(-3px)`, 200 ms), nie eingefügt. Damit springt nichts, wenn eine
  Meldung erscheint.
- Live-Validierung beim Tippen, nicht erst beim Absenden. Zwischenstufen sind
  erlaubt: zu kurz → neutraler Hinweis, gültig → grüne Bestätigung.
- Fehler: `--color-danger-fg`, weicher Randwechsel. **Kein Shake**, kein hartes
  Rot, kein Icon-Sprung.

Sechs Zustände, die jedes Feld können muss: default, hover, focus, valid,
invalid, disabled (z. B. „Locked — imported from CSV").

### 4.6 Plan-Karte („Plan today's session")

- `card-surface edge-neon` — sie ist Prozess, darf also leuchten.
- Einleitungstext, dann Feld „Pre-market plan" mit Placeholder
  „Levels, bias, what you'll take and what you'll leave alone."
- Live-Feedback: unter 20 Zeichen neutraler Hinweis („A bit more — levels and
  bias, not just a word."), ab 20 Zeichen grüne Bestätigung („Reads like a plan
  you can be held to").
- Absenden mit leerem Feld: Meldung am Feld, Fokus zurück ins Feld. **Kein Modal,
  kein Toast für Fehler** — Fehler stehen dort, wo sie entstehen.
- „Add end-of-day review" ist ein Aufklapper, kein neuer Screen:
  `max-height` 0 → 230px über 300 ms, Chevron dreht 180°.

### 4.7 Metrik-Tafel

Die Monatskennzahlen liegen in **einer** Karte als 4-Spalten-Raster, getrennt
durch `inset -1px -1px 0 rgba(255,255,255,.07)` pro Zelle — nicht als einzelne
schwebende Karten. Grund: dreizehn optisch identische Karten erzeugen keine
Hierarchie, man sucht dann jede Zahl einzeln.

Pro Zelle: `cap`-Label, Wert 21px mono, optionale Kontextzeile
(„Per trade", „From equity peak", „Sep 3").

- Geldwerte: `--color-success-fg` / `--color-danger-fg`, kein Glow.
- Regelwerte: `--color-warning`.
- Prozesswerte: `text-glow`.
- Die Zelle **Today** ist hervorgehoben: Inset-Verlauf
  `rgba(0,117,255,.16) → rgba(33,212,253,.05)` und Wert in `text-glow`. Sie ist
  der einzige Wert, der sich im Tagesverlauf ändert.

Drei Kennzahlen kommen zu Dashboard1 hinzu und sind Prozesswerte, also `text-glow`:
**Missed setups**, **By the book** und **Current streak**. „Room to daily loss"
gehört ausdrücklich **nicht** dazu: der Wert setzt voraus, dass ein Konto sein
Prop-Firm-Programm kennt, und diese Verknüpfung liegt in der Roadmap unter Future.

### 4.8 Kalender-Heatmap

- Wochentagskopf `S M T W T F S` in Kapitälchen, `--color-fg-subtle`.
- 7-Spalten-Raster, Lücke 8px, Zelle `aspect-ratio: 1/.82`, `--radius-ctl`.
- Leere Vormonatszellen: transparent, kein Rahmen.
- Geloggter Tag zeigt Tageszahl oben, darunter Betrag (mono, 700) und
  Trade-Anzahl.
- Grüner Tag: Verlauf aus `rgba(1,181,116,.3)`, Inset `rgba(1,217,140,.45)`,
  Betrag in `--color-success-hi`.
- Roter Tag: Verlauf aus `rgba(227,26,26,.28)`, Inset `rgba(255,106,106,.4)`,
  Betrag in `--color-danger-hi`.
- Breakeven-Tag: neutral, Betrag in `--color-fg-muted`.
- **Heute**: `inset 0 0 0 1.5px var(--color-cyan)` plus
  `0 0 22px -4px rgba(33,212,253,.75)` — unabhängig davon, ob der Tag grün, rot
  oder leer ist.
- Hover, in zwei Stufen (Designrunde 1):
  - **Jede** Zelle hellt Fläche und Rand auf — `hover:bg-white/5` plus der
    Hover-Rand ihres Zustands (`--shadow-day-win-hover`, `--shadow-day-loss-hover`,
    `--shadow-day-flat-hover`), 150 ms. Der Rand bleibt dabei in seiner Farbe:
    ein grüner Tag wird heller grün, nicht weiß.
  - **Nur Tage mit Einträgen** heben sich zusätzlich um `translateY(-2px)`. Ein
    leerer Tag ist kein Link, und ihn anzuheben würde eine Reaktion versprechen,
    die beim Klick ausbleibt.
- Kein Tooltip-Modal; Klick öffnet die Trades des Tages im Journal.

Hier ist der farbige Schein auf Geldtagen ausdrücklich erlaubt, weil er
**Dichte** codiert und nicht Belohnung: man erkennt auf einen Blick, wie der
Monat verteilt ist. Er ist auf der Kachel, nicht auf der Zahl im Dashboard.

### 4.9 Trade-Zeile („Recent trades")

- Zeile als eigene Fläche mit Inset-Rahmen, 10px Abstand zur nächsten.
- Links 38px Instrument-Tile, ruhige Prozessfläche nach 4.14:
  `--gradient-info-soft` mit `--shadow-info-soft` und cyanem Symbol für
  gehandelte Trades, `--gradient-dark-soft` mit `--shadow-dark-soft` und
  Symbol in `--color-fg-muted` für verpasste Setups. **Beide sind gleich
  gebaut**, die Farbe ist der einzige Unterschied — verpasste Setups werden
  nicht kleiner, blasser oder weiter unten dargestellt. Sie sind gleichwertige
  Einträge. Bis zur Designrunde 1 trugen beide den satten Verlauf.
- Titelzeile: Instrument plus Tags (`short`, `loss`/`win`/`missed`, `Grade B`),
  darunter Metazeile in `--color-fg-subtle`.
- Rechts: Betrag mono, darunter R-Multiple. Bei verpassten Setups steht dort
  „—" und als Unterzeile „+1.80R would-be" in `--color-fg-subtle` — der
  hypothetische Wert wird nie in Grün gezeigt. Datenherkunft: `mfe_r` auf einem
  Eintrag mit `taken = false`, es gibt keine eigene Spalte dafür.
- Screenshots und Links erscheinen erst in der aufgeklappten Detailzeile, nicht in
  der Kopfzeile. Siehe 4.13.
- Hover: `translateY(-1px)` plus Neon-Inset. Klick klappt die Detailzeilen an
  ihrer Stelle auf (260 ms), die Liste fließt nicht um.

### 4.10 Schnellzugriff-Karten

Vier gleich große Karten am Fuß des Dashboards: Kapitälchen-Titel in
`cap-neon`, darunter ein Satz in `--color-fg-muted`. Hover: `translateY(-2px)`
plus Neon-Inset. Texte wie im Ist-Stand („Where your edge actually lives",
„15 firms, 2026 rule sets").

### 4.11 Toast

- Unten rechts, gestapelt, `gap: 10px`, `aria-live="polite"`.
- Inset-Verlauf, `inset 0 0 0 1px rgba(33,212,253,.45)` plus
  `0 0 30px -8px rgba(0,117,255,.7)`, echter Blur erlaubt.
- 26px Häkchen-Tile in `--gradient-info`.
- Einblenden 240 ms, Standzeit 4200 ms, Ausblenden 300 ms.
- Nie blockierend, nie mittig, nie mit Button. Ein Toast ist eine Bestätigung,
  keine Entscheidung.

---

### 4.12 Kontoschalter und Übungskonto

Der Schalter sitzt in der Sidebar über der Nutzerkarte, nicht im Seitenkopf, damit
er auf jeder Seite an derselben Stelle steht.

- Fläche mit Inset-Verlauf, `--radius-ctl`, darin `cap`-Label „ACCOUNT", darunter
  der Kontoname in 14px 600.
- Aufgeklappt: „All accounts" zuerst, danach die echten Konten in ihrer
  Sortierreihenfolge, darunter durch einen Trenner abgesetzt die Übungskonten.
- „All accounts" bedeutet alle echten Konten. Das steht als Unterzeile in
  `--color-fg-subtle` im Aufklapper, damit die Zahl nicht erklärt werden muss.
- Archivierte Konten erscheinen nicht.

**Der Übungskonto-Marker ist keine Dekoration, sondern eine Absicherung.** Ist ein
Übungskonto gewählt, rendert die App Zahlen in derselben grünen und roten Semantik
wie echtes Geld. Ohne dauerhaften Marker sieht ein Backtest-Ergebnis aus wie ein
Kontoauszug. Deshalb:

- `--shadow-practice` als 3px-Amber-Streifen an der linken Kante des Inhaltsbereichs,
  fixiert, scrollt nicht weg.
- Amber-Chip „PRACTICE" in `cap` neben dem Kontonamen im Schalter, mit
  `--color-practice-dim` als Fläche.
- Kein Glow, kein Puls, keine Animation. Amber ist hier ruhig, wie bei den
  Regelgrenzen.
- **Nicht** blasser, kleiner oder tiefer platziert. Ein Übungskonto ist kein
  minderwertiger Eintrag, es ist ein anders etikettierter.

Der Wechsel des Kontos ist ein Farb- und Zahlenwechsel, kein Seitenwechsel: 200 ms
Crossfade auf den Werten, das Layout bleibt stehen.

### 4.13 Screenshots und Links am Trade

Beide liegen in der aufgeklappten Detailzeile, nebeneinander in einer Reihe.

- Screenshot: 56px Vorschau-Tile, `--radius-xs`, Inset-Rahmen. Klick öffnet ein
  Lightbox-Overlay, kein neuer Tab. Maximal drei.
- Link: Chip mit `--gradient-inset`, 1px Inset-Rand, Kapitälchen-Label aus dem
  Titel oder der Domain, davor ein 14px Icon. Beliebig viele.
- Ein Link öffnet in einem neuen Tab, mit `rel="noopener noreferrer"`. Es gibt
  **keine** Vorschau, kein eingebettetes Chart und kein Thumbnail von der
  Zieladresse — das wäre ein serverseitiger Abruf einer fremden URL und ist in
  `coding-standards.md` verboten.
- Fehlt beides, steht dort nichts. Kein leerer Platzhalter, kein „Add screenshot"
  in der Leseansicht.

### 4.14 Ruhige Prozessfläche

Eingeführt in Designrunde 1, weil `--gradient-info` plus `--shadow-neon` auf dem
Dashboard alles andere überstrahlte — die Icon-Kacheln und der Save-Button waren
heller als die Zahlen, die sie begleiten.

Das Rezept ist nicht neu erfunden, sondern von den Geldtagen der Kalender-Heatmap
(4.8) übernommen und nur eingefärbt: **schwacher Verlauf, 1px-Inset-Rand in der
Akzentfarbe, kein Schein nach außen.**

```
--gradient-info-soft: linear-gradient(310deg,
                        rgba(0,117,255,.30) 0%,
                        rgba(0,117,255,.08) 100%);
--shadow-info-soft:   inset 0 0 0 1px rgba(33,212,253,.45);
```

Die Deckkraftwerte `.30 → .08` und der Rand bei `.45` sind zeichengleich mit
`--gradient-day-win` und `--shadow-day-win`. Dass beide Flächen dieselbe Rezeptur
tragen, ist der Punkt: eine ruhige Fläche sieht überall gleich ruhig aus,
unabhängig von ihrer Farbe.

**Wofür.** Flächen, die etwas *begleiten*: Icon-Kacheln, sekundäre Aktionsflächen,
alles, was neben einem Wert steht und nicht wichtiger sein darf als er. Das Icon
darauf steht in `--color-cyan`, nicht in Weiß — Weiß wäre auf der nun dunklen
Fläche wieder der hellste Punkt und hätte das Problem nur verschoben.

**Wofür nicht.** Der Erfolgszustand eines Buttons (4.2) und die „Heute"-Markierung
im Kalender (4.8). Beide bestätigen oder verorten etwas und dürfen deshalb
leuchten.

**Stand.** Heute benutzt nur das Dashboard diese Fläche — die drei
Gamification-Kacheln (4.3) und der „Save plan"-Button (4.6). Ob sie sich über das
Projekt legt, entscheidet die nächste Runde.

---

### 4.15 Equity-Kurve

Der laufende Monat als kumulierte Flächenkurve, in einer `card-surface edge`-Karte
über die volle Breite, zwischen Metrik-Tafel (4.7) und Kalenderraster (4.8). Kopf
wie beim Kalender: `cap cap-neon` links, Monatsname in `--color-fg-subtle` rechts.

**Die Kurve ist ein Geldwert.** Sie bekommt deshalb semantische Farbe und keinen
Schein — kein Cyan, kein `text-glow`, kein Halo (1, 9). Die Ausnahme von 4.8 gilt
hier ausdrücklich nicht: dort codiert der Schein die Dichte über den Monat und
sitzt auf einer kleinen Kachel, hier wäre er eine Feier auf einer großen Fläche.

- **Zweifarbig an der Nulllinie.** Linie in `--color-success-fg` über Null und
  `--color-danger-fg` darunter, Fläche in `--color-success` / `--color-danger`.
  Der Wechsel liegt exakt auf `y = 0`, nicht am Rand des gezeichneten Bereichs.
- **Die Fläche verläuft vom Rand zur Null**, `.30 → .02` Deckkraft. Weit weg von
  Null ist sie am kräftigsten, an der Nulllinie verschwindet sie. Gelesen wird
  damit der Abstand zu Null, nicht die Farbe an sich. `.30` ist derselbe Startwert
  wie bei `--gradient-day-win` und `--gradient-info-soft` (4.8, 4.14).
- **Die Fläche liegt zwischen Kurve und Nulllinie**, nicht zwischen Kurve und
  Rahmenunterkante. Eine Verluststrecke ist ein Loch unter der Linie, keine Säule
  vom Boden aus.
- **Raster** nur waagerecht, gestrichelt `3 4`, in `--color-chart-grid`. Die
  Nulllinie ist heller (`--color-chart-zero`) — sie ist keine Hilfslinie, sondern
  die Grenze, an der die Kurve die Farbe wechselt.
- **Achsen** ohne eigene Linie und ohne Ticks, Beschriftung in
  `--color-chart-axis` bei 12px. Nicht kleiner und nicht in `--color-fg-subtle`:
  auf der Y-Achse stehen Beträge, und 8 lässt den dunkelsten Ton nur für
  Nebeninformationen zu. Die Y-Achse steht in Mono mit Tabellenziffern, weil dort
  Geld steht (3); die X-Achse trägt Tageslabels im Format „Sep 3".
- **Y-Bereich** immer inklusive Null, nach außen auf runde Beträge gerundet, vier
  Schritte. Ein Monat, der nur gestiegen ist, zeigt die Null trotzdem — sonst
  fehlt die Linie, von der er sich entfernt hat.
- **Hover**: senkrechte Cursorlinie in `--color-chart-zero`, ein Punkt auf der
  Kurve (Loch in `--color-bg`, Rand in derselben Farbe) und eine kleine
  `card-surface edge`-Fläche mit Datum, Stand und Tagesergebnis. Kein Modal, kein
  Klickziel: der Weg zu den Trades eines Tages ist die Kalenderkachel.

**Leerer Monat.** Kein leeres Achsenkreuz, sondern derselbe ruhige Satz wie unter
„Recent trades" (4.9).

**Motion.** Der Aufbau ist die Einzeichnung der Kurve beim Laden, einmal. Recharts
animiert in JavaScript — weder `MotionConfig` noch der
`prefers-reduced-motion`-Block in `globals.css` erreicht das, die Animation muss in
der Komponente abgeschaltet werden (5).

**Stand.** Eine Kurve, der laufende Monat, dem Kontoschalter folgend. Kurven pro
Konto nebeneinander stehen in der Roadmap unter Future und brauchen eine eigene
Runde — zusammen mit den Balkendiagrammen von Analytics (10).

---

## 5. Motion

| Moment | Dauer | Kurve |
|---|---|---|
| Hover rein | 150 ms | ease-out |
| Hover raus | 200 ms | ease-out |
| Druck | 100 ms | ease-in |
| Farb-/Randwechsel | 200 ms | `--ease-soft` |
| Loading-Crossfade | 200 ms | linear |
| Erfolg halten | 800 ms | — |
| Zeile aufklappen | 260 ms | `--ease-soft` |
| Aufklapper (Review) | 300 ms | `--ease-soft` |
| Streak-Bump | 620 ms | `--ease-soft`, einmalig |
| Kalender/Score-Aufbau beim Laden | 900–1300 ms | `--ease-soft`, mit 240 ms Verzögerung |

Regeln:

- **Alles unter 300 ms**, außer den drei bewusst langsamen Momenten oben (L08:
  über 300 ms bricht die Verbindung zwischen Handlung und Reaktion).
- Kein Element animiert **ohne Auslöser**, außer dem einmaligen Aufbau beim
  Laden einer Seite.
- Keine Animation darf Layout verschieben. Bewegt werden nur `opacity`,
  `transform`, `box-shadow`, `max-height` und Farben.
- Vollständige Unterstützung für `prefers-reduced-motion: reduce` — dann sind
  **alle** Transitions und Animationen aus, und jeder Zustand muss ohne Bewegung
  erkennbar bleiben (Spinner wird zu statischem Text „Saving…", Streak-Bump
  entfällt, Kalender steht sofort).

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
```

**Die Zeile `animation-iteration-count` ist nicht optional.** Eine Endlosanimation
wie ein rotierender Spinner läuft mit `infinite`; eine Dauer von `.01ms` stoppt sie
nicht, sie dreht sie hunderttausendmal pro Sekunde. Erst der gekappte Zähler beendet
sie. Der Block stand bis 2026-09-13 ohne diese Zeile hier und war damit genau für
die Elemente wirkungslos, für die er am nötigsten ist.

**Der CSS-Block oben genügt nicht.** `motion` animiert über JS-gesetzte
Inline-Styles und ignoriert die Regel vollständig. Es braucht zusätzlich
`<MotionConfig reducedMotion="user">` an der App-Wurzel. Ohne das ist die Zusage
in diesem Abschnitt für alles falsch, was mit `motion` gebaut wird, und genau das
wäre eine stille Barrierefreiheitslücke.

Arbeitsteilung: Hover, Fokus, Farb- und Randwechsel bleiben CSS-Transitions.
`motion` übernimmt nur das Aufklappen von Zeilen und Aufklappern, den Streak-Bump
und den Aufbau von Kalender und Score beim Laden.

---

## 6. Micro-Rewards

Aus L07: proportional, verdient, nicht blockierend. Aus L08: sofort, konsistent,
sichtbarer Fortschritt.

| Auslöser | Reaktion | Größe |
|---|---|---|
| Trade geloggt | Toast + Streak-Bump | klein |
| Plan gespeichert | Toast | klein |
| Tag reviewed | Toast + Consistency-Wert aktualisiert | klein |
| Missed Setup geloggt | Toast, gleiche Größe wie bei einem echten Trade | klein |
| Streak-Meilenstein (7 / 30 / 100) | Karte im Dashboard, einmalig je Meilenstein | mittel |
| Badge freigeschaltet | Karte plus Badge füllt sich auf Progress | mittel |
| Profitabler Tag | **nichts** | — |
| Grüner Monat | **nichts** | — |

Toast-Texte nennen immer die **Prozess**folge, nie Geld:
„Trade logged · streak 15 days · consistency +2", nicht „Nice profit!".

Ein verpasstes Setup wird genauso belohnt wie ein gehandelter Trade. Das ist
absichtlich: es ist die einzige Möglichkeit, ehrliches Journaling nicht zu
bestrafen.

**Korrigiert in Designrunde 1:** Die Meilenstein-Karte stand hier als „einmalig
für eine Session". Gebaut ist sie als **einmalig je Meilenstein**, gemerkt in
`users.streak_milestone_seen` — genauso wie die Badge-Karte auf Progress seit S9
über `users.badges_seen_at` merkt. Eine Session-Merkung hätte dieselbe Karte in
jedem neuen Tab erneut gezeigt, und das ist keine Belohnung, sondern Rauschen.
Wer 30 erreicht, ohne die 7er-Karte je gesehen zu haben, bekommt 30 — nicht
beides nacheinander.

---

## 7. Microcopy

Ton: sachlich, direkt, auf Augenhöhe. Kein „Oops", keine Entschuldigung, kein
Ausrufezeichen, kein Emoji im UI.

| Situation | Nicht so | So |
|---|---|---|
| Plan leer | „This field is required" | „Write your levels first — this is what plan adherence checks against." |
| Preis ungültig | „Invalid input" | „Price only — digits and up to two decimals." |
| Plan zu kurz | „Too short" | „A bit more — levels and bias, not just a word." |
| Speichern fehlgeschlagen | „Error submitting form" | „Couldn't save. Your text is still here — try again." |
| Noch keine Gewinner | „N/A" | „No winning trades yet" |
| Noch nichts geloggt | „0" | „Log a trade — taken or missed — and this month's score starts building." |

Leerzustände erklären, was als Nächstes passiert, und geben nie das Gefühl, man
hinke hinterher. Der Ist-Stand („No winning trades yet", „Nothing logged this
month yet") hat genau die richtige Tonalität — die wird beibehalten.

---

## 8. Barrierefreiheit

- Fokusring überall sichtbar: `2px solid var(--color-cyan)`, `outline-offset: 2px`.
  Nie `outline: none` ohne Ersatz.
- Interaktive Flächen mindestens 40px hoch.
- Farbe ist nie der einzige Träger einer Information: `win`/`loss`/`missed`
  stehen als Text im Tag, nicht nur als Farbe.
- Kalenderzellen brauchen ein `aria-label` mit Datum, Betrag und Trade-Anzahl,
  weil die visuelle Kodierung sonst nicht ankommt.
- Toasts in einem `aria-live="polite"`-Container.
- Kontrast: `--color-fg-subtle` (#718096) auf `--color-bg` ist mit 12px die
  untere Grenze und nur für Nebeninformationen erlaubt, nie für Werte oder
  Bedienelemente.

---

## 9. Anti-Patterns

Direkt aus den Lektionen, hier als Verbotsliste:

- Antwortzeit über 300 ms ohne Loading-Zustand (L08).
- Inkonsistente Rückmeldung — dieselbe Handlung reagiert manchmal, manchmal
  nicht (L08).
- Übergroße Feier für eine kleine Handlung (L08, L07).
- Bedeutungslose Metriken, die nicht mit echtem Fortschritt zusammenhängen (L08).
- Verschwindende oder wandernde Labels (L10).
- Fehler erst beim Absenden, alle gleichzeitig (L10).
- Shake, hartes Rot, springende Felder (L10, L11).
- Layout-Shift beim Loading (L09).
- Animation, die Bedienung verlangsamt oder ohne Auslöser läuft (L11).
- Glow oder Feier auf Geldwerten (Abschnitt 1).

---

## 10. Entschieden und noch offen

Die fünf Punkte dieses Abschnitts sind abgearbeitet:

1. **„Nicht bauen"-Liste** — gefunden, sie hat zwei Orte: dauerhafte Grenzen unter
   „Not Building" in `project-overview.md`, der Zaun pro Branch in
   `current-feature.md`. Dieses Dokument bleibt trotzdem bei den Screens, die es
   gibt.
2. **Motion-Bibliothek** — `motion` 13.2.0 ist eingeplant, mit der Arbeitsteilung
   und der `MotionConfig`-Auflage aus Abschnitt 5.
3. **Light Mode** — entfällt. Dark only, kein Toggle, Light Mode in der Roadmap
   unter Future.
4. **Zusatzkennzahlen** — Missed setups, By the book und Current streak sind
   aufgenommen. „Room to daily loss" ist gestrichen.
5. **Landing-Page** — bleibt ein separates Dokument und braucht als einzige
   öffentliche Seite eine ausdrückliche Ausnahme von der „no public pages"-Regel.

Offen bleiben zwei, weil sie Gestaltung und nicht Entscheidung sind:

- **Analytics und Prop Firm Rules** sind hier nicht auf Komponentenebene
  beschrieben. Die Balkendiagramme, die Filter-Chips und die Regel-Detailtabelle
  brauchen eine eigene Runde, sobald das Dashboard steht.
- **Die Progress-Seite** ist hier nur über 4.3 (Gamification-Kacheln) und 4.4
  (Grace-Day-Leiste) abgedeckt. Für die Aufschlüsselung des Consistency Score in
  seine vier Teilwerte und für das Raster der zwölf Badges gibt es keine Vorgabe.
  S9 hat beides aus den vorhandenen Primitiven gebaut — der Score als vier
  Balken in einer `card-surface edge-neon`-Karte mit `--gradient-info` als
  Füllung und `--color-bar-track` als Spur, die Badges als Kacheln mit
  `edge-neon` und Verlaufsfläche im erreichten und matter Fläche im offenen
  Zustand. Das ist tragfähig, aber nicht entworfen: es hat nie jemand gegen die
  anderen Screens gehalten. Eine eigene Runde, zusammen mit Analytics.

---

## Herkunft der Regeln

| Lektion | Woraus hier was wurde |
|---|---|
| L07 Micro-Rewards | Abschnitt 6, Streak-Bump, Proportionalität, reduced-motion |
| L08 Feedback-Loops | 300-ms-Grenze, Konsistenz, sichtbarer Fortschritt, Anti-Patterns |
| L09 Button-Feedback | Fünf Button-Zustände, festes Timing-Set, kein Layout-Shift |
| L10 Form-Animationen | Feste Labels, Live-Validierung, reservierte Meldungszeile, weiche Fehler |
| L11 Trust & Premium | Glide statt Snap, Glow statt Flash, ruhige sensible Momente |
| L04 Layered Scroll | Nur für die Landing-Page relevant, hier absichtlich nicht verwendet |
