import { describe, expect, it } from "vitest";
import { toCsv, UTF8_BOM } from "../serialize.ts";

/** The document without the BOM, which every assertion below would repeat. */
function body(rows: readonly (readonly string[])[]): string {
  return toCsv(rows).slice(UTF8_BOM.length);
}

describe("toCsv", () => {
  it("prefixes the byte order mark", () => {
    expect(toCsv([["a"]]).startsWith(UTF8_BOM)).toBe(true);
  });

  it("writes plain fields unquoted, separated by commas", () => {
    expect(body([["2026-09-13", "ES", "long"]])).toBe("2026-09-13,ES,long\r\n");
  });

  it("separates rows with CRLF and terminates the last one", () => {
    expect(body([["a"], ["b"]])).toBe("a\r\nb\r\n");
  });

  it("quotes a field containing the delimiter", () => {
    expect(body([["Levels, bias"]])).toBe('"Levels, bias"\r\n');
  });

  it("quotes a field containing a quote and doubles it", () => {
    expect(body([['He said "go"']])).toBe('"He said ""go"""\r\n');
  });

  it("quotes a field containing a newline and keeps it one field", () => {
    expect(body([["line one\nline two", "next"]])).toBe(
      '"line one\nline two",next\r\n',
    );
  });

  it("quotes a field containing a carriage return", () => {
    expect(body([["line one\r\nline two"]])).toBe('"line one\r\nline two"\r\n');
  });

  it("quotes a field with a leading or trailing space", () => {
    expect(body([[" Eval 1", "Eval 2 "]])).toBe('" Eval 1","Eval 2 "\r\n');
  });

  it("leaves an empty field empty", () => {
    expect(body([["a", "", "c"]])).toBe("a,,c\r\n");
  });

  it("does not quote a semicolon — it is not the delimiter", () => {
    expect(body([["Eval 1;Practice A"]])).toBe("Eval 1;Practice A\r\n");
  });

  it("returns just the BOM for no rows", () => {
    expect(toCsv([])).toBe(UTF8_BOM);
  });
});
