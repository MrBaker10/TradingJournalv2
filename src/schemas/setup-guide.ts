import * as z from "zod";

// The question card's two answers: "Yes, show me" and "No, I'll find my way".
export const answerSetupGuideSchema = z.object({
  answer: z.enum(["yes", "no"]),
});
export type SetupGuideAnswer = z.infer<typeof answerSetupGuideSchema>["answer"];

export const SETUP_GUIDE_SAVE_FAILED = "Couldn't save your answer. Try again.";
// A write the rules no longer allow, e.g. a second tab answering again.
export const SETUP_GUIDE_REFUSED =
  "The setup guide has changed. Reload the page.";
