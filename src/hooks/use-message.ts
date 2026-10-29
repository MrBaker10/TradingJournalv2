import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { MAX_SCREENSHOTS_PER_TRADE } from "@/domain/trades";
import type { MessageKey, MessageValues } from "@/lib/i18n/message-keys";
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
} from "@/schemas/auth";
import { MAX_CHECKLIST_ITEMS_PER_PHASE } from "@/schemas/checklist";
import { MAX_IMPORT_ROWS } from "@/schemas/import";
import { MAX_LEDGER_NOTE_LENGTH } from "@/schemas/ledger";
import { MAX_STRATEGY_NAME_LENGTH } from "@/schemas/strategies";

/**
 * The fixed limits messages name. Strings, not numbers, so a limit reads the
 * same in every language (`2000`, never `2,000`).
 */
const LIMITS: MessageValues = {
  usernameMin: String(USERNAME_MIN),
  usernameMax: String(USERNAME_MAX),
  passwordMin: String(PASSWORD_MIN),
  passwordMax: String(PASSWORD_MAX),
  maxChecklistSteps: String(MAX_CHECKLIST_ITEMS_PER_PHASE),
  maxImportRows: String(MAX_IMPORT_ROWS),
  maxLedgerNote: String(MAX_LEDGER_NOTE_LENGTH),
  maxStrategyName: String(MAX_STRATEGY_NAME_LENGTH),
  maxScreenshots: String(MAX_SCREENSHOTS_PER_TRADE),
};

/**
 * Turns a message key from a schema, an action or a route into text in the
 * page's language (src/lib/i18n/message-keys.ts). Anything that is no key —
 * a Zod default for a check without a message of its own — reads as the
 * generic failure instead of an English sentence.
 */
export function useMessage() {
  const t = useTranslations();
  return useCallback(
    (key: string, values?: MessageValues) =>
      t.has(key as MessageKey)
        ? t(key as MessageKey, { ...LIMITS, ...values })
        : t("errors.unexpected"),
    [t],
  );
}
