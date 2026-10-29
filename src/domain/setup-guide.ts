// The setup guide on the dashboard (.scratch/user-guidance/spec.md): what it
// shows follows from the stored state and from facts about the user's data,
// never from a stored "step done". Ticks are always derived.

export const SETUP_GUIDE_STATES = [
  "undecided",
  "declined",
  "active",
  "dismissed",
  "completed",
] as const;

export type SetupGuideState = (typeof SETUP_GUIDE_STATES)[number];

/** What the user's data says right now, all for one user. */
export interface SetupGuideFacts {
  isDemo: boolean;
  /** At least one active account; a practice account counts. */
  hasAccount: boolean;
  /** At least one trade, taken or missed, manual or imported. */
  hasEntry: boolean;
  hasLinkedAccount: boolean;
  hasStrategy: boolean;
  /** A checklist template with at least one step. */
  hasChecklist: boolean;
}

export type SetupStepKey =
  | "account"
  | "propFirm"
  | "strategy"
  | "checklist"
  | "entry";

export interface SetupStep {
  key: SetupStepKey;
  required: boolean;
  done: boolean;
}

export type SetupGuideView =
  | { kind: "question" }
  /** `canHide`: the hide action is offered, which needs an account. */
  | { kind: "steps"; steps: SetupStep[]; canHide: boolean }
  /** Both required steps done: shown once, then the state is `completed`. */
  | { kind: "completion"; steps: SetupStep[] }
  /** `offerSwitch`: Settings may turn the guide back on. */
  | { kind: "hidden"; offerSwitch: boolean };

const HIDDEN: SetupGuideView = { kind: "hidden", offerSwitch: false };

// Each step builds on the one before; adding an account and logging an entry
// are required, the other three optional, with no stored "skipped".
function stepsOf(facts: SetupGuideFacts): SetupStep[] {
  return [
    { key: "account", required: true, done: facts.hasAccount },
    { key: "propFirm", required: false, done: facts.hasLinkedAccount },
    { key: "strategy", required: false, done: facts.hasStrategy },
    { key: "checklist", required: false, done: facts.hasChecklist },
    { key: "entry", required: true, done: facts.hasEntry },
  ];
}

export function setupGuideView(
  state: SetupGuideState,
  facts: SetupGuideFacts,
): SetupGuideView {
  if (facts.isDemo || state === "completed") return HIDDEN;
  const requiredDone = facts.hasAccount && facts.hasEntry;
  // Existing users stay `undecided` and are never asked (no backfill).
  if (requiredDone && state !== "active") return HIDDEN;
  if (state === "declined" || state === "dismissed")
    return { kind: "hidden", offerSwitch: true };
  if (state === "undecided") return { kind: "question" };
  // Only `active` is left.
  if (requiredDone) return { kind: "completion", steps: stepsOf(facts) };
  return { kind: "steps", steps: stepsOf(facts), canHide: facts.hasAccount };
}

/**
 * What can happen to the guide: the user answers the question, hides it or
 * brings it back; the dashboard completes it once its completion was shown.
 */
export type SetupGuideAction =
  | "accept"
  | "decline"
  | "hide"
  | "show"
  | "complete";

/**
 * The state an action leads to from what is shown now, or null when the rules
 * do not offer it: no write for the demo user, no second answer, no hiding
 * without an account, no switch once both required steps are done. The server asks this before every write, so a stale tab or
 * a hand-made request cannot do what the card or Settings would not show.
 */
export function nextSetupGuideState(
  view: SetupGuideView,
  action: SetupGuideAction,
): SetupGuideState | null {
  switch (action) {
    case "accept":
      return view.kind === "question" ? "active" : null;
    case "decline":
      return view.kind === "question" ? "declined" : null;
    case "hide":
      return view.kind === "steps" && view.canHide ? "dismissed" : null;
    case "show":
      return view.kind === "hidden" && view.offerSwitch ? "active" : null;
    case "complete":
      return view.kind === "completion" ? "completed" : null;
  }
}
