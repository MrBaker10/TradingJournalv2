import { describe, expect, it } from "vitest";
import de from "../messages/de.json";
import en from "../messages/en.json";

/** Every leaf as `dotted.key → value`, so two dictionaries compare as sets. */
function leaves(node: unknown, prefix = ""): Map<string, unknown> {
  const out = new Map<string, unknown>();
  if (node !== null && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      for (const [leafKey, leaf] of leaves(
        value,
        prefix ? `${prefix}.${key}` : key,
      )) {
        out.set(leafKey, leaf);
      }
    }
  } else {
    out.set(prefix, node);
  }
  return out;
}

describe("dictionaries, spec → Dictionaries", () => {
  const english = leaves(en);
  const german = leaves(de);

  it("German has exactly the English keys", () => {
    expect([...german.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it("no value is empty or anything but text", () => {
    for (const [key, value] of [...english, ...german]) {
      expect(typeof value, key).toBe("string");
      expect(String(value).trim(), key).not.toBe("");
    }
  });
});
