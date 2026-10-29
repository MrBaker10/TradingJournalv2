import { describe, expect, it } from "vitest";
import {
  SETUP_GUIDE_STATES,
  type SetupGuideFacts,
  setupGuideView,
} from "../setup-guide.ts";

const newUser: SetupGuideFacts = {
  isDemo: false,
  hasAccount: false,
  hasEntry: false,
  hasLinkedAccount: false,
  hasStrategy: false,
  hasChecklist: false,
};

// Both required steps done, none of the optional ones.
const setUp: SetupGuideFacts = { ...newUser, hasAccount: true, hasEntry: true };

describe("setupGuideView", () => {
  it("asks a new user whether they want the guide", () => {
    expect(setupGuideView("undecided", newUser)).toEqual({ kind: "question" });
  });

  it.each([
    ["an account but no entry", { ...newUser, hasAccount: true }],
    ["an entry but no account", { ...newUser, hasEntry: true }],
  ])("asks a user with %s once, like a new user", (_, facts) => {
    expect(setupGuideView("undecided", facts)).toEqual({ kind: "question" });
  });

  it.each(SETUP_GUIDE_STATES)(
    "hides the guide and the switch from the demo user in state %s",
    (state) => {
      expect(setupGuideView(state, { ...newUser, isDemo: true })).toEqual({
        kind: "hidden",
        offerSwitch: false,
      });
    },
  );

  it.each(["undecided", "declined", "dismissed", "completed"] as const)(
    "never shows the guide or the switch to a user with an account and an entry in state %s",
    (state) => {
      expect(setupGuideView(state, setUp)).toEqual({
        kind: "hidden",
        offerSwitch: false,
      });
    },
  );

  describe.each(["declined", "dismissed"] as const)("in state %s", (state) => {
    it.each([
      ["no account and no entry", newUser],
      ["an account but no entry", { ...newUser, hasAccount: true }],
      ["an entry but no account", { ...newUser, hasEntry: true }],
    ])("hides the guide and offers the switch with %s", (_, facts) => {
      expect(setupGuideView(state, facts)).toEqual({
        kind: "hidden",
        offerSwitch: true,
      });
    });
  });

  describe("in state active", () => {
    it("lists the five steps in order, required first and last, none ticked", () => {
      expect(setupGuideView("active", newUser)).toEqual({
        kind: "steps",
        canHide: false,
        steps: [
          { key: "account", required: true, done: false },
          { key: "propFirm", required: false, done: false },
          { key: "strategy", required: false, done: false },
          { key: "checklist", required: false, done: false },
          { key: "entry", required: true, done: false },
        ],
      });
    });

    it("ticks each step from its own fact", () => {
      const ticks = (facts: Partial<SetupGuideFacts>) => {
        const view = setupGuideView("active", { ...newUser, ...facts });
        if (view.kind !== "steps") throw new Error(`got ${view.kind}`);
        return view.steps.filter((step) => step.done).map((step) => step.key);
      };
      expect(ticks({ hasAccount: true })).toEqual(["account"]);
      expect(ticks({ hasLinkedAccount: true })).toEqual(["propFirm"]);
      expect(ticks({ hasStrategy: true })).toEqual(["strategy"]);
      expect(ticks({ hasChecklist: true })).toEqual(["checklist"]);
      expect(ticks({ hasEntry: true })).toEqual(["entry"]);
    });

    it("offers the hide action only once an account exists", () => {
      expect(setupGuideView("active", { ...newUser, hasEntry: true })).toEqual(
        expect.objectContaining({ kind: "steps", canHide: false }),
      );
      expect(
        setupGuideView("active", { ...newUser, hasAccount: true }),
      ).toEqual(expect.objectContaining({ kind: "steps", canHide: true }));
    });

    it("shows the completion view once both required steps are done", () => {
      expect(setupGuideView("active", { ...setUp, hasStrategy: true })).toEqual(
        {
          kind: "completion",
          steps: [
            { key: "account", required: true, done: true },
            { key: "propFirm", required: false, done: false },
            { key: "strategy", required: false, done: true },
            { key: "checklist", required: false, done: false },
            { key: "entry", required: true, done: true },
          ],
        },
      );
    });
  });

  it("keeps a completed guide hidden without the switch, even if a required step reopens", () => {
    expect(setupGuideView("completed", newUser)).toEqual({
      kind: "hidden",
      offerSwitch: false,
    });
  });
});
