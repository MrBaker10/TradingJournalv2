import { INTL_LOCALES, type Language } from "./i18n/languages.ts";

// Numbers that are not money (prices, R, shares, scores) in the format of the
// interface language. Display only: the CSV export and every form value keep
// the dot (spec → CSV, Decimal input).

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
