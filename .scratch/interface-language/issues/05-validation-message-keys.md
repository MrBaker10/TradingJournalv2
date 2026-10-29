# 05: Validation messages as dictionary keys

**What to build:** Validation and error messages from schemas and Server Actions are
dictionary keys, turned into text where the message is shown, so they read in the
interface language. English wording stays as it is today; German texts are added for
every message.

**Blocked by:** 01 (Routing under a language prefix and language resolution).

Status: ready-for-agent

## Acceptance

- [ ] No schema or Server Action returns an English sentence to the interface; every
      message has an English and a German entry.
- [ ] The demo refusal message and auth errors are translated too.
- [ ] Existing schema tests assert the same rules, now by key; no assertion weakened.
- [ ] Ordered verification gate passes; browser check: trigger a validation error on
      the trade form, a ledger entry and sign-in in both languages.
