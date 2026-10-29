import { INTL_LOCALES, type Language } from "./i18n/languages.ts";

// Numbers that are not money (prices, R, shares, scores) in the format of the
// interface language, and decimals as a user types them. The CSV export keeps
// the dot; a typed decimal is read the same way in either language (spec →
// CSV, Decimal input).

/** The decimal separator of a language: `.` in English, `,` in German. */
export function decimalSeparator(language: Language): string {
  return language === "de" ? "," : ".";
}

/**
 * A price or size as it is stored or read, with the language's decimal
 * separator: `21234.5` or `21234,5`. Pure string work on the value's own
 * digits; no rounding, no thousands separator.
 */
export function formatDecimalString(
  value: string | number,
  language: Language,
): string {
  return String(value).replace(".", decimalSeparator(language));
}

/**
 * A number with exactly `digits` decimals and no grouping, like `toFixed`, in
 * the language's format: `1.25` or `1,25`. For R multiples, factors and
 * scores, never for money (`formatCents`).
 */
export function formatFixed(
  value: number,
  digits: number,
  language: Language,
): string {
  return new Intl.NumberFormat(INTL_LOCALES[language], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: false,
  }).format(value);
}

/** A 0–1 share as a whole percent: `46%`, German `46 %`. */
export function formatPercent(share: number, language: Language): string {
  return new Intl.NumberFormat(INTL_LOCALES[language], {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(share);
}

// A decimal as a user types it: an optional sign, digits, and at most one
// separator, a comma or a dot. Nothing else — no thousands separator, no
// space, no exponent.
const DECIMAL_INPUT = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/;

/**
 * A number typed into a price or money field, in either language: `21234,50`
 * and `21234.50` are the same value. A thousands separator is refused, so
 * `1.234` is always one point two three four and never a thousand times more.
 * Undefined for an empty field; NaN for text that is not such a decimal, so
 * the schema answers with the field's own message.
 */
export function parseDecimalInput(raw: string): number | undefined {
  const value = raw.trim();
  if (value === "") return undefined;
  if (!DECIMAL_INPUT.test(value)) return Number.NaN;
  return Number(value.replace(",", "."));
}
