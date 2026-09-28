// The econ calendar's whole state lives in the URL — tab, high-impact filter
// and currencies — so a reload lands on the same view. Same idea as
// src/lib/prop-firms/href.ts, own helper because the path and fields differ.

import { ECON_TABS, type EconTab } from "../../domain/econ.ts";
import { firstValue } from "../search-params.ts";

export interface EconState {
  tab: EconTab;
  highOnly: boolean;
  currencies: string[];
}

const CURRENCY = /^[A-Z]{3}$/;

function isTab(value: string | undefined): value is EconTab {
  return ECON_TABS.some((tab) => tab === value);
}

export function parseEconState(
  raw: Record<string, string | string[] | undefined>,
): EconState {
  const tab = firstValue(raw.tab);
  const currencies = (firstValue(raw.cur) ?? "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value) => CURRENCY.test(value));

  return {
    // Anything unknown falls back to the default rather than to an error: a
    // hand-edited URL still shows a calendar.
    tab: isTab(tab) ? tab : "today",
    highOnly: firstValue(raw.high) === "1",
    currencies: [...new Set(currencies)].sort(),
  };
}

export function buildEconHref(
  state: EconState,
  overrides: Partial<EconState> = {},
): string {
  const merged = { ...state, ...overrides };
  const params = new URLSearchParams();

  if (merged.tab !== "today") params.set("tab", merged.tab);
  if (merged.highOnly) params.set("high", "1");
  if (merged.currencies.length > 0) {
    params.set("cur", [...merged.currencies].sort().join(","));
  }

  const query = params.toString();
  return query === "" ? "/econ-calendar" : `/econ-calendar?${query}`;
}

export function toggleCurrency(
  currencies: string[],
  currency: string,
): string[] {
  return currencies.includes(currency)
    ? currencies.filter((value) => value !== currency)
    : [...currencies, currency].sort();
}
