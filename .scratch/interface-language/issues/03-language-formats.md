# 03: Numbers, money and dates formatted by language

**What to build:** Under `/de` money reads `1.234,56 $`, dates `29.10.2026`, and month
and day names are German; under `/en` nothing changes. The existing money and time
formatters take the interface language, English by default so no caller breaks, and
every caller passes the resolved language. Chart-clock times are never shifted.

**Blocked by:** 01 (Routing under a language prefix and language resolution).

Status: ready-for-agent

## Acceptance

- [ ] Every money, number and date shown in the interface follows the language.
- [ ] CSV export values are unchanged in both languages.
- [ ] No new `number` arithmetic on money; only the formatting locale changes.
- [ ] `money.test.ts` and `time.test.ts` cover both languages: negative, compact and
      thousands variants, day, month and event labels.
- [ ] Ordered verification gate passes; browser check of dashboard, journal, analytics
      and ledger in both languages, no new console errors.
