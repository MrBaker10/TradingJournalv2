# 03: Numbers, money and dates formatted by language

**What to build:** Under `/de` money reads `1.234,56 $`, dates `29.10.2026`, and month
and day names are German; under `/en` nothing changes. The existing money and time
formatters take the interface language, English by default so no caller breaks, and
every caller passes the resolved language. Chart-clock times are never shifted.

**Blocked by:** 01 (Routing under a language prefix and language resolution).

Status: done

## Acceptance

- [x] Every money, number and date shown in the interface follows the language.
- [x] CSV export values are unchanged in both languages.
- [x] No new `number` arithmetic on money; only the formatting locale changes.
- [x] `money.test.ts` and `time.test.ts` cover both languages: negative, compact and
      thousands variants, day, month and event labels.
- [x] Ordered verification gate passes; browser check of dashboard, journal, analytics
      and ledger in both languages, no new console errors.

## Review

- Gate: lint, typecheck, test (107 files, 1633 tests, none skipped), build — green.
- Formatters take the language, English by default: `formatCents` (`language` option),
  `formatCentsCompact`, `formatCentsThousands`, the date labels in `time.ts` (patterns
  per language) and `formatR`/`formatShare`/`formatMetric`. New: `src/lib/numbers.ts`
  (prices, R, factors, shares) and `formatNumericDate`, `formatWeekdayLabel`,
  `formatLongDateLabel`, `weekdayLabels` in `time.ts`. `INTL_LOCALES` lives in
  `languages.ts`. CSV export untouched.
- `listAccountSizes` returns `cents` instead of a formatted `label`; the chip formats it
  in the page language (DB test adjusted, executed).
- Browser (production build on :3001 with `BETTER_AUTH_URL=http://localhost:3001` for
  that process, demo user, read-only): dashboard, journal, trade detail, analytics,
  ledger, progress, weekly review, econ calendar, prop firms, strategies, settings in
  both languages; `/de` shows `-1.609,00 $`, `27.10.2026`, `29. Okt.`, `Oktober 2026`,
  `Mo … So`, `-1,00R`, `41 %`; `/en` unchanged; 390px checked for `/de`; no console
  errors.
- Left on purpose: `$50,000` on prop firms is the verbatim `accountSize` rule text;
  econ forecast/actual figures are feed text; analytics weekday bucket labels are
  dimension labels (ticket 09); the `x.x MB` error sentence in `file-step.tsx` becomes a
  key in 05/09; form input values keep the dot (ticket 04).
- Seen, not changed: on the desktop month calendar a day's amount overlaps "entries"
  in both languages (pre-existing; German is one character longer).
- Code review (standards + spec): fixed — raw `contracts` in the import preview,
  three local `signedR` copies replaced by `formatR`, numeric-date and short-weekday
  patterns moved into the per-language table, `numbers.ts` added to
  `project-structure.md`. Not changed: one `useLocale()` per component instead of a
  bound-formatter hook (follows the next-intl pattern already used), and the English
  default parameter, which the ticket asks for.
