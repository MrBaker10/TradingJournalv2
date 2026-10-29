# 03: Setup guide — hide and re-enable

**What to build:** A user who said yes can hide the guide once an account exists; before
that the card offers no hide action. A "Show setup guide" switch in Settings brings the
guide back for a user who declined or hid it, but only while a required step (account
or first entry) is still open. Transitions the rules do not allow are refused on the
server.

**Blocked by:** 02 (Setup guide — question and step list).

Status: done

## Acceptance

- [x] In state `active` without an active account, the card has no hide action.
- [x] After adding an account, the hide action appears; using it writes `dismissed`
      and the card is gone.
- [x] Settings shows "Show setup guide" in states `declined` and `dismissed` while a
      required step is open; turning it on writes `active` and the step list returns.
- [x] Settings shows no switch when both required steps are done, in state
      `completed`, or for the demo user.
- [x] The server refuses hide without an account, re-enable with both required steps
      done, and any write for the demo user.
- [x] Domain and real Postgres tests cover these transitions and refusals; none skipped.
- [x] Browser check of the click path in both themes, at phone width and with the
      keyboard; no new console errors.

## Review

Baseline: HEAD `2944ba1`. Two independent axes via the code-review skill.

- Placement decided by the user: "Show setup guide" is a row at the end of Accounts in
  Settings. After the first browser check the user asked for both controls to stand
  out more: "Hide guide" is an outline button with an icon, and the Settings row sits
  in a bordered box on a faint `muted` surface with an icon. The user confirmed the
  wording "Hide guide" and "Five steps on the dashboard, each linking to where it is
  done."
- Transitions: a new pure `nextSetupGuideState(view, action)` decides every write;
  `applySetupGuideAction` replaces `saveSetupGuideAnswer` and refuses whatever it
  returns null for. Card and Settings ask the same function, so UI and server cannot
  drift.
- Standards: no hard violations. Fixed: the failure toast no longer says "your
  answer"; the answer schema carries `accept`/`decline` directly; the refusal list
  lives only on the domain function; the test imports `SetupGuideAction`; a comment
  explains why the switch is off at rest.
- Spec: added the Postgres case that refuses the switch from `dismissed` once both
  required steps are done.
- Verification: lint, typecheck, full test suite (1551 passed, none skipped) and build
  pass. Browser: no hide action in `active` without an account; with an account, Tab +
  Enter on "Hide guide" removes the card; Settings then offers the switch, Tab + Space
  turns it on and the steps return with the hide action; a user who answered No sees
  the switch with or without an account and not after adding an account and importing
  trades; the demo user sees no switch. Dark at 1280 px and Light at 390 px without
  horizontal scroll; no console errors.
