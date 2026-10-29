# Interface language

Status: ready-for-agent

## Problem Statement

The journal speaks only English. A German-speaking trader reads every label, form,
error message and explanation in a second language, including the info popovers that
carry the product's non-obvious rules (a missed setup never counts for P&L, a practice
account stays out of combined figures). Numbers and dates are always shown in US
format, so `1,234.56` and `10/29/2026` read wrong to a German user, and a price typed
with a decimal comma is not understood.

## Solution

The user chooses the **interface language**, English or German, in Settings. The
choice is stored on the user and follows them to every device. Every page lives under
a language prefix (`/en/…`, `/de/…`), so a link names its language; opening a link in
the other language shows that page in that language without changing the stored
choice. Before signing in, the browser's language decides (German if the browser asks
for German, otherwise English), and a small switch in the footer of the signed-out
pages overrides it.

Everything the app itself writes is translated: navigation, forms, buttons, empty
states, validation and error messages, info popovers, and the fixed lists of mistakes,
confluences and badges. What the user typed (account, strategy and note texts) and
data from outside sources (econ event titles, prop firm and instrument names) stay as
they are. Established trading terms stay English in the German interface (Trade,
Missed setup, Drawdown, Payout …; see `GLOSSARY.md` → "German interface").

Numbers, money and dates are displayed in the format of the interface language.
Number inputs in either language accept a comma or a dot as the decimal separator and
no thousands separator. CSV import and export keep their file format regardless of the
language.

The shared demo account can switch language too, but only for the visitor's own
browser; the demo user's stored language never changes (ADR 0008).

## User Stories

1. As a German-speaking user, I want to read the whole app in German, so that I do not have to translate while journaling.
2. As a user, I want to choose English or German in Settings, so that the app speaks my language.
3. As a user, I want my language choice to follow my account, so that I see the same language on my laptop and my phone.
4. As a user, I want the language to apply immediately after I change it in Settings, so that I see the result without signing out.
5. As a user, I want every page URL to carry its language, so that a bookmark or a link opens in the language it was saved in.
6. As a user opening an `/en/…` link while my account is set to German, I want that page shown in English without my setting changing, so that a foreign link does not silently reconfigure my account.
7. As a user opening a path without a language prefix, I want to be redirected to my stored language, so that old bookmarks keep working.
8. As a user signing in, I want to land in my stored language, so that I do not have to switch after every login.
9. As a visitor who is not signed in, I want the front page, sign-in and registration in my browser's language, so that I understand the app before I have an account.
10. As a visitor whose browser is neither German nor English, I want English, so that I get a complete interface.
11. As a visitor, I want a language switch in the footer of the signed-out pages, so that I can correct the browser's guess before registering.
12. As a visitor who switched language on a signed-out page, I want that choice remembered in this browser, so that the next visit starts in the same language.
13. As a new user, I want my account to start in the language of the page I registered on, so that I do not have to set it again.
14. As an existing user, I want my account to stay in English after the change, so that nothing switches under me without my choice.
15. As a demo visitor, I want to switch the demo to German, so that I can judge the German interface.
16. As a demo visitor, I want my language switch not to affect other demo visitors, so that the shared demo stays predictable.
17. As a German user, I want established trading terms such as Trade, Missed setup, Drawdown and Payout to stay English, so that the vocabulary matches my platform and community.
18. As a German user, I want the info popovers in German, so that the product's rules are explained in my language.
19. As a German user, I want the mistakes, confluences and badges in German, so that the tags I pick and the badges I earn read naturally.
20. As a user, I want my own account names, strategy texts and notes untouched by the language, so that what I wrote stays as I wrote it.
21. As a user, I want econ event titles and prop firm names shown as the source names them, so that I can match them to the outside world.
22. As a German user, I want money shown as `1.234,56 $`, so that amounts read correctly.
23. As a German user, I want dates shown as `29.10.2026` and month and day names in German, so that the calendar reads naturally.
24. As a German user, I want to type a price with a decimal comma, so that my keyboard habit works.
25. As a user in either language, I want a dot to work as the decimal separator as well, so that pasting from a platform never fails.
26. As a user, I want `1.234` in a price field to always mean one point two three four, so that a thousands separator can never multiply a value by a thousand.
27. As a user, I want validation and error messages in my language, so that I understand what to fix.
28. As a user, I want CSV import to read broker files the same way in both languages, so that switching language never breaks an import.
29. As a user, I want CSV export to produce the same file in both languages, so that my spreadsheets and scripts keep working.
30. As a user of a screen reader, I want the page to declare its language, so that the text is pronounced correctly.
31. As a user, I want browser tab titles in my language, so that I can find the right tab.
32. As a user, I want analytics grouped by mistake or confluence to show translated labels, so that the charts read in my language.
33. As the maintainer, I want a check that fails when a German text is missing, so that an untranslated string never ships.
34. As the maintainer, I want one place that decides the language for a request, so that the rules can be tested and changed in one spot.
35. As the maintainer, I want a third language to need only a new dictionary and a new allowed value, so that growth does not mean moving routes again.

## Implementation Decisions

- **Library:** `next-intl` (new dependency, approved). Check the current version and its
  Next 16 / proxy integration in its docs and in `node_modules/next/dist/docs/` before
  installing; record the pin in `package.json` as usual.
- **Languages:** a closed set `en | de`, English the fallback. The set lives in one
  module; the dictionary, routing, validation and the database check derive from it.
- **Routing:** every page moves under a `[locale]` segment, both languages always
  prefixed. `/api/*` stays unprefixed. Internal links and redirects go through the
  library's locale-aware navigation helpers, never hand-built prefixes.
- **Language resolution (new seam):** a pure function takes the URL prefix, the signed-in
  user's stored language (if any), the language cookie, the `Accept-Language` header and
  returns either the language to render or the prefixed path to redirect to. Rules:
  a valid prefix wins for that page; without a prefix a signed-in user goes to
  `users.language`, otherwise cookie → `Accept-Language` → English. After sign-in the
  redirect goes to `users.language`. The proxy calls this function; it holds no rules
  of its own.
- **Proxy:** the existing auth gate in the proxy is combined with the locale step. The
  public paths (front page, sign-in, registration) become public under each prefix; the
  auth exceptions in `coding-standards.md` → "Visibility" are not broadened.
- **Schema:** `users.language text not null` with a check constraint on the allowed set;
  the generated migration fills existing rows with `en`. Registration writes the
  language of the registration page.
- **Settings:** a language control in Settings, next to the timezone, saved by a Server
  Action that validates the value against the closed set and writes only the current
  user's row. For the demo user the action does not write; it switches the visitor's
  URL and cookie only.
- **Signed-out switch:** a small switch in the footer of the auth layout sets the language
  cookie and navigates to the same page under the other prefix.
- **Dictionaries:** one dictionary per language, keyed by area (shell, dashboard,
  journal, trade form, import, analytics, progress, prop firms, econ calendar, ledger,
  strategies, settings, auth, validation). English is the reference; German must have
  every key. The info popover texts move from the term explanations into the
  dictionaries; the link from each explanation to its `GLOSSARY.md` entries stays.
- **Fixed lists:** `mistake_tags` and `confluence_tags` get a `key text not null unique`
  column, following `badge_defs`. The trade tag seeder supplies keys and stays
  idempotent on them. The interface shows the dictionary text for the key; the stored
  English `label` stays as reference and is what CSV export writes. Badge titles and
  descriptions are shown from the dictionary by their existing `key`.
- **Validation messages:** schema messages become dictionary keys resolved where the
  message is shown, so Server Actions return keys or codes, not English sentences.
- **Formatting:** the money and time formatters take the interface language and use the
  matching `Intl` locale (`en-US`, `de-DE`). No `number` arithmetic is added; only the
  formatting locale changes. Chart-clock times are still never shifted by any timezone.
- **Decimal input:** one shared normaliser accepts `,` or `.` as decimal separator and
  rejects any thousands separator; the existing number parsing for the trade form and
  commission uses it, as do the other money inputs (ledger, account rules, P&L
  override). Exact-decimal rules (scale limits, minor units) are unchanged.
- **CSV:** import parsing and export headers and values are independent of the
  interface language.
- **Document language:** the root layout sets `<html lang>` from the resolved language;
  page metadata titles are translated.
- **Untouched:** user-entered text, econ event titles, prop firm, program and instrument
  names, and the prop firm data in `context/PropFirmsData.md`.
- **Rationale:** ADR 0008 (language per user, carried in the URL prefix, demo exception).

## Testing Decisions

- Test externally observable behaviour: inputs and outputs of functions, rows in the
  database, what a page shows. No assertions on component internals or dictionary
  structure beyond completeness.
- **Language resolution (Vitest, pure):** a table of prefix × stored language × cookie ×
  `Accept-Language` × signed-in → language or redirect, covering every rule above:
  valid prefix wins, invalid prefix, unprefixed signed-in, unprefixed signed-out with
  cookie, with header only (including `de-AT`, quality values, unsupported languages),
  nothing at all, redirect after sign-in. Prior art: `theme.test.ts`.
- **Dictionary completeness (Vitest):** German and English have the same key set and no
  empty value; every mistake, confluence and badge key from the seed data has an entry
  in both; every info popover still names existing `GLOSSARY.md` entries. Prior art:
  `terms.test.ts`.
- **Formatting (Vitest):** money and date formatters in both languages, including
  negative amounts, compact and thousands variants, month and day labels. Extend
  `money.test.ts` and `time.test.ts`.
- **Decimal input (Vitest):** comma and dot accepted, thousands separators rejected,
  scale limits unchanged, the same results in both languages. Extend the existing
  tests for the trade form parsing and commission parsing.
- **Queries (real Postgres, rolled-back transaction, two users):** setting the language
  writes only the current user's row; an invalid value is refused; the demo user's row
  is never written; registration stores the page language; the migration default is
  `en`; seeded tags have unique keys and re-seeding is idempotent. Prior art:
  `checklist.test.ts`, the setup guide query tests.
- **Browser:** the redirects through the proxy are checked in the browser (see
  Acceptance), in both themes and at phone width, with no new console errors.
- Follow the project's ordered verification gate. Relevant database tests must execute;
  skipped database cases are not passing evidence.

## Acceptance

1. Signed out, with the browser set to German, open `/`: redirected to `/de`, front page
   in German, `<html lang="de">`. With the browser set to French: `/en`, English.
2. On `/de/login` use the footer switch: `/en/login` in English. Reload `/login`: still
   English (cookie).
3. Register on `/de/register`: the dashboard opens under `/de/…` in German; in the
   database the new user has `language = 'de'`.
4. Sign in as an existing user: everything in English under `/en/…`; the database shows
   `en`.
5. In Settings switch to German: the page reloads under `/de/settings` in German. Sign
   out, sign in again: lands under `/de/…`.
6. As that German user open an `/en/journal` link: the journal in English; Settings
   still shows German as the stored choice.
7. Open `/journal` without prefix while signed in as the German user: redirected to
   `/de/journal`.
8. In German, log a trade with entry `21234,50` and exit `21240.25`: both saved
   correctly; the journal shows them in German format. Type `1.234,5` in a price field:
   refused with a German message.
9. In German, open the trade form: mistakes and confluences in German; Trade, Missed
   setup, Confluence stay English. Open the info popovers: German texts.
10. In German, the dashboard, analytics, progress, ledger, prop firms, econ calendar,
    strategies, import wizard and settings show no English interface text; money and
    dates in German format; econ event titles unchanged.
11. Export trades as CSV in German and in English: both files identical.
12. Import the same broker CSV in German and English: the same trades.
13. Sign in as the demo user, switch to German in Settings: German for this browser. In a
    second browser as the demo user: still English. The demo user's row still shows `en`.
14. Repeat steps 5 and 10 at phone width and in the light theme; no new console errors.

## Out of Scope

### Do not build

- Any language other than English and German.
- Translating user-entered text, econ event titles, prop firm, program or instrument
  names, or `context/PropFirmsData.md`.
- Automatic or machine translation at runtime.
- A language switch in the app shell or sidebar; inside the app it lives only in
  Settings.
- Language-dependent CSV import or export formats.
- Translating the project documentation under `context/`, `docs/` or `GLOSSARY.md`.
- Right-to-left support.
- Changing how chart-clock times or the user timezone work.

## Open Questions

None. Product behaviour, storage, routing, demo handling and test seams were confirmed
in clarification rounds Q1–Q19 and the seam check.

## Further Notes

- New glossary entries: **Interface language** and the section **German interface**
  (`GLOSSARY.md`).
- ADR 0008 records the per-user storage, the always-on URL prefix and the demo exception,
  and why it differs from the per-device theme (ADR 0007).
- The user guidance spec listed "Translations or an i18n setup" under Do not build; that
  applied to that feature only and is superseded by this spec.
- The German texts are written during implementation; the maintainer reviews them per
  area before the spec is marked done.
