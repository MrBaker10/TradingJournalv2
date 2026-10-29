import * as z from "zod";
import { messageKey } from "../lib/i18n/message-keys.ts";

/** Also the textareas' `maxLength`, so the form cannot exceed it. */
export const MAX_STRATEGY_CHAPTER_LENGTH = 4000;
export const MAX_STRATEGY_NAME_LENGTH = 100;

/** Shown by the form and returned by the action when a save fails. */
export const STRATEGY_SAVE_FAILED = messageKey("errors.strategySaveFailed");

/** Shown and returned when archiving or reactivating fails. */
export const STRATEGY_ARCHIVE_FAILED = messageKey(
  "errors.strategyArchiveFailed",
);

// An empty chapter is stored as NULL, not as "".
const chapter = z
  .string()
  .trim()
  .max(
    MAX_STRATEGY_CHAPTER_LENGTH,
    messageKey("validation.strategyChapterTooLong"),
  )
  .transform((value) => (value === "" ? null : value));

/** A strategy's name and rules as the form sends them. */
export const strategyContentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, messageKey("validation.strategyNameRequired"))
    .max(
      MAX_STRATEGY_NAME_LENGTH,
      messageKey("validation.strategyNameTooLong"),
    ),
  prerequisites: chapter,
  entry: chapter,
  stopRisk: chapter,
  exit: chapter,
  exclusions: chapter,
});

/** An edit sends the whole rule set again, with the id of its strategy. */
export const updateStrategySchema = strategyContentSchema.extend({
  strategyId: z.number().int().positive(),
});

/** Archiving or reactivating names the strategy and the state it should be in. */
export const setStrategyArchivedSchema = z.object({
  strategyId: z.number().int().positive(),
  archived: z.boolean(),
});

export type StrategyContentInput = z.input<typeof strategyContentSchema>;
