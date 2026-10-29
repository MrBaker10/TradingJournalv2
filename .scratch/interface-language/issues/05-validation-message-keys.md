# 05: Validation messages as dictionary keys

**What to build:** Validation and error messages from schemas and Server Actions are
dictionary keys, turned into text where the message is shown, so they read in the
interface language. English wording stays as it is today; German texts are added for
every message.

**Blocked by:** 01 (Routing under a language prefix and language resolution).

Status: done

## Acceptance

- [x] No schema or Server Action returns an English sentence to the interface; every
      message has an English and a German entry.
- [x] The demo refusal message and auth errors are translated too.
- [x] Existing schema tests assert the same rules, now by key; no assertion weakened.
- [x] Ordered verification gate passes; browser check: trigger a validation error on
      the trade form, a ledger entry and sign-in in both languages.

## Review

- Gate: lint, typecheck, test (107 files, 1649 tests, none skipped, DB tests on real
  Postgres), build — green.
- Schemas, Server Actions, queries, domain checks, the Better Auth hook (demo refusal
  included) and `/api/uploads` return keys from the `validation` and `errors` areas,
  checked at compile time by `messageKey` (`src/lib/i18n/message-keys.ts`). English
  wording unchanged; German for every key. `useMessage` (`src/hooks/use-message.ts`)
  resolves them where they are shown and fills fixed limits (username, rows, …).
- Agreed with the maintainer: the three ECB currency failures return `values` beside
  the key; the upload route is in scope; the missing-rate date is shown with
  `formatNumericDate` (ISO in English as before, `01.10.2026` in German); a Zod default
  without a message of its own (display name over 100, trade notes over 4000
  characters) reads as `errors.unexpected` instead of Zod's English.
- Tests assert the same rules by key; `"archived"` and `"Account not found"` substring
  checks became the exact `errors.accountNotFoundOrArchived`.
- Browser (production build on :3001, demo user, nothing saved, no console errors):
  empty username and empty password on sign-in, entry price `1.234,5` on the trade
  form (Next), ledger amount `1.234,5` with no category — each message in English under
  `/en` and in German under `/de`. Not exercised in the browser: the missing-ECB-rate
  import message (needs a foreign-currency account and a date without a rate).
- Code review (standards + spec): fixed — `useMessage` moved to `src/hooks/`. Not
  changed: action `error` stays `string` (Zod messages are strings); the demo refusal
  and auth hook keys are not displayed anywhere, since the security cards are locked on
  demo and show their own texts (ticket 10); component-own texts (security cards,
  screenshot hints) and the import preview reasons stay with tickets 08–10; the
  unprefixed `/journal/import` link is for ticket 09.
