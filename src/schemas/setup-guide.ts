import * as z from "zod";

// The question card's two answers, "Yes, show me" and "No, I'll find my way",
// named as the guide actions they are (src/domain/setup-guide.ts).
export const answerSetupGuideSchema = z.object({
  answer: z.enum(["accept", "decline"]),
});
export type SetupGuideAnswer = z.infer<typeof answerSetupGuideSchema>["answer"];

export const SETUP_GUIDE_SAVE_FAILED =
  "Couldn't save the setup guide. Try again.";
// A write the rules no longer allow, e.g. a second tab answering again.
export const SETUP_GUIDE_REFUSED =
  "The setup guide has changed. Reload the page.";
