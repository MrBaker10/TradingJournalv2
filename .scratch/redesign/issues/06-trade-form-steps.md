# 06: Trade form in five steps (new and edit)

**What to build:** Logging a trade is a walk through five steps: What (taken or missed,
instrument, date, direction, accounts), Execution (times, prices, contracts, MFE and
MAE, live P&L and R), Why (session, setup type, entry model, strategy, confluences),
Reflect (grade, felt, result, by the book, mistakes, notes), Evidence (screenshots,
links). Required fields live in the first two steps; "Log now" appears from step three;
Enter moves on and ⌘↵ logs. Every choice is a loose button: a shared highlight springs
to the pick, the button gives under the press, a check pops in, and a second click
clears an optional choice. Two-way answers are two large cards with a hint; the grade is
round buttons A to F; confluences, mistakes and accounts are chips that bounce when
toggled and show a check; confluence groups are collapsible and open by default. The
practice account is never preselected and carries the amber stripe. The step rail echoes
the answers under each step and checks a finished step; steps slide in the direction of
travel and a progress bar fills; a blocked step shakes once and names the missing
fields. Live P&L and R show only while typing, in sign colour. Saving draws a check and
says "Trade logged" or "Missed setup logged", never the result, then offers "Log
another" and "View in journal". ⌘V on the Evidence step adds a pasted screenshot; links
are accepted with https only. Entry stays its own page, also from the journal. Edit is
the same steps with every answer prefilled. Reduced motion keeps the colours and drops
springs, slides and shakes. The form logs the same fields as today through the same
server action.

Spec: `.scratch/redesign/spec.md` → Trade form, Form pattern, Feedback. Design:
`context/Design.md`. Source: the winning view on `prototype/redesign-trade-form` and
the verdict in its commit body; rewrite, do not copy.

**Blocked by:** 02 (Shell and tokens)

**Status:** done

- [x] Five steps in the stated order; a quick entry with only steps one and two filled saves with "Log now" from step three; Enter advances, ⌘↵ saves, neither fires inside a textarea in a way that loses text.
- [x] A pick springs the highlight, gives on press and pops a check; a second click on an optional choice clears it; a required choice cannot be cleared to empty by a second click without the step naming it on advance.
- [x] Taken/missed and long/short are cards with hints; grade is round buttons; confluences, mistakes and accounts are chips with a check; confluence groups collapse and open by default.
- [x] The practice account is unselected on a new trade and shows the amber stripe; selecting it is explicit; a trade still needs at least one account.
- [x] Step rail echoes the answers so far and checks finished steps; the progress bar fills with the step; a blocked step shakes once and names the missing fields; errors from the server land at their field.
- [x] Live P&L and R appear only while the execution fields are being typed, in sign colour, using the existing money helpers, never `number` arithmetic.
- [x] Saving shows the drawn check with "Trade logged" or "Missed setup logged" and no figure; "Log another" resets the form, "View in journal" opens the journal; a missed setup saves with `taken = false` as today.
- [x] ⌘V on the Evidence step attaches the pasted image into the next free slot; an http link is rejected at the field.
- [x] Edit at the trade's edit URL shows the same steps prefilled, including accounts, confluences, mistakes, screenshots and links; saving confirms "Trade saved".
- [x] With reduced motion emulated every pick still changes colour and shows its check; no spring, slide or shake runs.
- [x] Old trade-form components without a remaining use are removed; the form primitives (input, textarea, toggle, badge, progress) come from the shadcn set.
- [x] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: log a taken trade through all steps, log a missed setup with "Log now", block a step, paste a screenshot, edit a trade; reduced motion emulated once; no new console errors.

## Do not build

- New fields, validation rules or server-action changes beyond what the steps need.
- The ledger entry, weekly review and import forms; tickets 11 and 13 reuse the blocks.
- Logging inside the journal page or a sheet.

## Review

Gates on the final tree: `pnpm lint`, `pnpm typecheck`, `pnpm test` (84 files, 1350
tests, none skipped) and `pnpm build` pass. Browser click path with Playwright against
the demo user at 1440 px, 390 px and once with reduced motion: 105 checks pass (blocked
step names "Date, Instrument, Direction, Accounts" and shakes; practice account
unselected with the amber stripe; a second click on Long keeps it, on London clears it;
Enter in a field advances, Enter in the notes adds a line; live P&L `+$2,000.00` and
`+2.00R` in `positive` only while the execution fields hold the focus; confluence group
open, collapses, reopens; grade and chips show their check; ⌘V attaches a pasted image
(1/3); `http://` rejected at the link field; ⌘↵ with a typed link adds it first, a
second ⌘↵ logs; "Trade logged" without a figure, "View in journal"; a missed setup with
entry price `-5` blocked by ⌘↵ at step 3, the error at its field and named, then "Log
now" saves "Missed setup logged"; "Log another" resets; edit prefilled with accounts,
session, confluence, grade, notes, screenshot and link, "Trade saved"; no horizontal
scroll at 390 px; under reduced motion no shake, no slide, checks shown at once). The
only console entries are `motion`'s reduced-motion notice and headless Chromium's GPU
notice. A hydration warning seen once at 390 px was Playwright's screenshot caret
style (`caret-color`) injected during hydration; gone with `caret: "initial"`.

- Agreed before implementation: test seam `src/lib/trades/form-steps.ts` only (required
  fields per step, missing names, step of a field error, rail echo, step done); the
  live price band stays, inside the live panel; after an edit save the saved screen
  offers "Back to trade" and "View in journal" with no redirect.
- `form-blocks.tsx` holds the blocks tickets 11 and 13 reuse (Choice, CardChoice,
  Chips, ChipGroup, TextField, PopCheck, DrawnCheck); `evidence-fields.tsx` replaces
  `screenshot-slots.tsx` and `trade-links-input.tsx`; chips replace
  `account-multi-select.tsx` and `tag-multi-select.tsx` (all four removed). shadcn
  `toggle`, `badge` and `progress` added. Form state and payload moved unchanged to
  `src/lib/trades/form-steps.ts`.
- Selected choices use the `muted` highlight from Design §3.5 (the prototype used
  `process`); confluences select in `process`, accounts and mistakes stay neutral.
- An action failure (a string, no field) is a toast via `notifyError`; schema errors
  land at their field and open its step. Live screenshot/link failures on an existing
  trade stay inline at the Evidence fields, as before.
- Fixed from review: 40 px targets below `lg`; the check keeps its slot so it never
  shifts a label (no `width` animation) and is neutral on neutral chips; grade shows a
  check; chips bounce on and off; the live panel sits at the end of the step so focus
  changes move nothing; post-exit MFE stays visible while it holds a value; a
  schema-blocked step says "Check the marked field" and shakes; ⌘↵ never drops a typed
  link; `Kbd` for ⌘V; `useEffectEvent` in the paste hook; a failed upload request no
  longer leaves the drop zone pending; step positions as named constants.
- Left as is: the echo shows from `md` (at 390 px the rail shows numbers, titles and
  checks); edit says "Save now" where new says "Log now"; the required asterisk keeps
  the `process` colour from the prototype; `TradeForm` and `trade-form-steps.tsx` are
  long.
