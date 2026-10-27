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

**Status:** ready-for-agent

- [ ] Five steps in the stated order; a quick entry with only steps one and two filled saves with "Log now" from step three; Enter advances, ⌘↵ saves, neither fires inside a textarea in a way that loses text.
- [ ] A pick springs the highlight, gives on press and pops a check; a second click on an optional choice clears it; a required choice cannot be cleared to empty by a second click without the step naming it on advance.
- [ ] Taken/missed and long/short are cards with hints; grade is round buttons; confluences, mistakes and accounts are chips with a check; confluence groups collapse and open by default.
- [ ] The practice account is unselected on a new trade and shows the amber stripe; selecting it is explicit; a trade still needs at least one account.
- [ ] Step rail echoes the answers so far and checks finished steps; the progress bar fills with the step; a blocked step shakes once and names the missing fields; errors from the server land at their field.
- [ ] Live P&L and R appear only while the execution fields are being typed, in sign colour, using the existing money helpers, never `number` arithmetic.
- [ ] Saving shows the drawn check with "Trade logged" or "Missed setup logged" and no figure; "Log another" resets the form, "View in journal" opens the journal; a missed setup saves with `taken = false` as today.
- [ ] ⌘V on the Evidence step attaches the pasted image into the next free slot; an http link is rejected at the field.
- [ ] Edit at the trade's edit URL shows the same steps prefilled, including accounts, confluences, mistakes, screenshots and links; saving confirms "Trade saved".
- [ ] With reduced motion emulated every pick still changes colour and shows its check; no spring, slide or shake runs.
- [ ] Old trade-form components without a remaining use are removed; the form primitives (input, textarea, toggle, badge, progress) come from the shadcn set.
- [ ] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: log a taken trade through all steps, log a missed setup with "Log now", block a step, paste a screenshot, edit a trade; reduced motion emulated once; no new console errors.

## Do not build

- New fields, validation rules or server-action changes beyond what the steps need.
- The ledger entry, weekly review and import forms; tickets 11 and 13 reuse the blocks.
- Logging inside the journal page or a sheet.
