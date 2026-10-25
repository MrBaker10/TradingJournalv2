import type { StrategyContent } from "@/db/queries/strategies";

export type ChapterKey = Exclude<keyof StrategyContent, "name">;

/** The five optional chapters in reading order. */
export const STRATEGY_CHAPTERS: {
  key: ChapterKey;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "prerequisites",
    label: "Prerequisites",
    placeholder: "What must be true before you look for this setup.",
  },
  {
    key: "entry",
    label: "Entry",
    placeholder: "The trigger that gets you in.",
  },
  {
    key: "stopRisk",
    label: "Stop and risk",
    placeholder: "Where the idea is wrong and how much you risk.",
  },
  {
    key: "exit",
    label: "Exit",
    placeholder: "Targets and how you manage the trade.",
  },
  {
    key: "exclusions",
    label: "Exclusion criteria",
    placeholder: "When you stay out, even if the setup appears.",
  },
];
