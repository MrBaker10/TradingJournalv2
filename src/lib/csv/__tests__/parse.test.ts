import { describe, expect, it } from "vitest";
import { detectDelimiter, parseDelimited } from "../parse.ts";
import { UTF8_BOM } from "../serialize.ts";

describe("detectDelimiter", () => {
  it("reads a comma, a semicolon and a tab", () => {
    expect(detectDelimiter("a,b,c")).toBe(",");
    expect(detectDelimiter("a;b;c")).toBe(";");
    expect(detectDelimiter("a\tb\tc")).toBe("\t");
  });

  it("picks the candidate that splits the header into the most fields", () => {
    // A comma inside a quoted name must not beat the real tab delimiter.
    expect(detectDelimiter('"Smith, John"\tage\tcity')).toBe("\t");
  });

  it("falls back to a comma when nothing splits", () => {
    expect(detectDelimiter("single")).toBe(",");
    expect(detectDelimiter("")).toBe(",");
  });
});

describe("parseDelimited", () => {
  it("reads plain rows", () => {
    expect(parseDelimited("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("reads CRLF the same as LF", () => {
    expect(parseDelimited("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("strips the byte order mark", () => {
    const [header] = parseDelimited(`${UTF8_BOM}symbol,qty\nMNQ,2`);
    expect(header[0]).toBe("symbol");
  });

  it("unwraps a quoted field", () => {
    expect(parseDelimited('"a","b"')).toEqual([["a", "b"]]);
  });

  it("keeps a delimiter inside quotes", () => {
    expect(parseDelimited('"Smith, John",42')).toEqual([["Smith, John", "42"]]);
  });

  it("reads a doubled quote as one quote", () => {
    expect(parseDelimited('"say ""hi""",2')).toEqual([['say "hi"', "2"]]);
  });

  it("keeps a line break inside quotes in the same field", () => {
    expect(parseDelimited('"line one\nline two",2')).toEqual([
      ["line one\nline two", "2"],
    ]);
  });

  it("normalises a CRLF inside a quoted field", () => {
    expect(parseDelimited('"line one\r\nline two",2')).toEqual([
      ["line one\nline two", "2"],
    ]);
  });

  it("keeps empty fields, including trailing ones", () => {
    expect(parseDelimited("a,,c,")).toEqual([["a", "", "c", ""]]);
  });

  it("drops a blank line rather than reading it as an empty row", () => {
    expect(parseDelimited("a,b\n\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps a row whose fields are all empty but which has delimiters", () => {
    // ",," is three empty fields, not a blank line.
    expect(parseDelimited("a,b,c\n,,")).toEqual([
      ["a", "b", "c"],
      ["", "", ""],
    ]);
  });

  it("uses the delimiter it was given", () => {
    expect(parseDelimited("a;b\n1;2", { delimiter: ";" })).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("detects the delimiter when it is not told one", () => {
    expect(parseDelimited("a\tb\n1\t2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("trims whitespace around an unquoted field but not inside a quoted one", () => {
    expect(parseDelimited('a , b ," c "')).toEqual([["a", "b", " c "]]);
  });

  it("has nothing to read in an empty string", () => {
    expect(parseDelimited("")).toEqual([]);
    expect(parseDelimited("   \n  ")).toEqual([]);
  });

  it("closes an unterminated quote at the end of the file", () => {
    // Malformed, but a truncated download should still yield its rows rather
    // than throwing away the whole import.
    expect(parseDelimited('a,"unterminated')).toEqual([["a", "unterminated"]]);
  });

  it("round-trips what serialize.ts writes", () => {
    const rows = [
      ["symbol", "note"],
      ["MNQ", 'he said "go", then left'],
      ["MES", "line one\nline two"],
      ["M2K", " padded "],
    ];
    const csv = rows
      .map((row) =>
        row
          .map((field) =>
            /[",\r\n]/.test(field) || field !== field.trim()
              ? `"${field.replaceAll('"', '""')}"`
              : field,
          )
          .join(","),
      )
      .join("\r\n");

    expect(parseDelimited(csv)).toEqual(rows);
  });
});
