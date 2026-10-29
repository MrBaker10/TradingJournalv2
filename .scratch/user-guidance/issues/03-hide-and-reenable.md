# 03: Setup guide — hide and re-enable

**What to build:** A user who said yes can hide the guide once an account exists; before
that the card offers no hide action. A "Show setup guide" switch in Settings brings the
guide back for a user who declined or hid it, but only while a required step (account
or first entry) is still open. Transitions the rules do not allow are refused on the
server.

**Blocked by:** 02 (Setup guide — question and step list).

Status: ready-for-agent

## Acceptance

- [ ] In state `active` without an active account, the card has no hide action.
- [ ] After adding an account, the hide action appears; using it writes `dismissed`
      and the card is gone.
- [ ] Settings shows "Show setup guide" in states `declined` and `dismissed` while a
      required step is open; turning it on writes `active` and the step list returns.
- [ ] Settings shows no switch when both required steps are done, in state
      `completed`, or for the demo user.
- [ ] The server refuses hide without an account, re-enable with both required steps
      done, and any write for the demo user.
- [ ] Domain and real Postgres tests cover these transitions and refusals; none skipped.
- [ ] Browser check of the click path in both themes, at phone width and with the
      keyboard; no new console errors.
