import type en from "./messages/en.json";

// Messages from schemas, Server Actions, queries and the auth hook travel as
// dictionary keys and become text only where they are shown
// (src/hooks/use-message.ts), so they read in the interface language. Pure, so
// schemas and the domain can name keys without pulling in next-intl.

export type MessageKey =
  | `validation.${keyof typeof en.validation}`
  | `errors.${keyof typeof en.errors}`;

/** Values a message names that only the server knows, such as a currency. */
export type MessageValues = Record<string, string>;

/** A message as its dictionary key; a key missing from en.json is a type error. */
export function messageKey<K extends MessageKey>(key: K): K {
  return key;
}
