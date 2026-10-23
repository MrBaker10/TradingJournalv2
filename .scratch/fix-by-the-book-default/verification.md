# Verification: By-the-book default

## Regression loop

Run the app with `pnpm dev`, use an authenticated browser tab on localhost, and
choose an untouched imported trade with no by-the-book answer. Record the batch's
removable count before saving. Do not click the batch's Remove button.

1. Open Import → Past imports and record the batch's count.
2. Open the imported trade → Edit and leave every field unchanged.
3. Click Save changes and wait for the trade detail page.
4. Reopen Import → Past imports and assert the removable count is unchanged.

On the original code, the observed count changed from **59/59 to 58/59**. This
reproduced the reported symptom before the form fix. With the fix, the same save
preserves **59/59**. Clearing the answer saved by the reproduction also restored
**59/59**. The browser check never removed a batch or a trade.

The relevant browser assertion, after navigation has finished:

```javascript
if (await journalTab.playwright.getByRole("button", {
  name: "Remove 59 of 59", exact: true,
}).count() !== 1) {
  throw new Error("Unchanged save must preserve all 59 removable trades");
}
```

The count is specific to the local batch used in this session; record a fresh
baseline when replaying against another batch.

## Additional browser checks

- Edit → Yes → Save → Edit: Yes persists.
- Edit → No → Save → Edit: No persists.
- Edit → `—` → Save: the original unanswered value is restored.
- New trade → Review: `—` is selected by default. The control uses the existing
  optional-select styling, has an associated label and works with keyboard focus.
- Browser console: no warnings or errors from the affected flow.
- New-trade persistence is covered through the real `saveTrade` database boundary;
  the new form was inspected without creating an additional journal entry.

## Automated checks

- `pnpm test src/lib/trades/__tests__/save.test.ts`: **29 passed**, none skipped.
  Ten new cases cover unanswered/Yes/No on create, preserving each answer on edit,
  answering a previously unanswered review, and clearing Yes or No.
- These database tests already pass against the existing save implementation;
  the browser regression above is the red/green check for the form-state defect.
- `pnpm lint`: **passed**, 366 files checked.
- `pnpm typecheck`: **passed**.
- `pnpm test`: **75 files, 1257 tests passed**, none skipped. Database tests ran
  against the local Postgres outside the sandbox, with rolled-back fixtures.
- `pnpm build`: **passed**, including compilation, TypeScript and static page
  generation. The initial sandbox run failed to bind a local port; Turbopack's
  persistent build cache then repeated that failure even outside the sandbox.
  After the user requested commit and merge, the generated cache for the installed
  Next.js version was archived under `/private/tmp/trading-journal-build-cache.BGzFzy/`.
  A fresh build outside the sandbox completed successfully; no source or build
  configuration change was needed.
- `git diff --check`: **passed**.

## Cause and scope

The create state defaulted to false and edit state replaced null with false before
building the action input. The save implementation already stores an omitted
answer as null and preserves an explicit false. The undo check correctly regards
an explicit answer as work. Only the form needed a production-code correction.
