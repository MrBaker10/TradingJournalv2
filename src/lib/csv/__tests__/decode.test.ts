import { describe, expect, it } from "vitest";
import { detectShape } from "../../../domain/import/detect.ts";
import { decodeByHeader } from "../decode.ts";

const HEADER =
  "Ticket;Öffnen;Typ;Lots;Symbol;Preis;SL;TP;Schließung;Preis;Swap;Kommission;Gewinn";
const ROW =
  "56216539;2026-09-24 11:20:09;sell;15,00000000;US100.cash;30191,72000000;30205,96000000;30184,01000000;2026-09-24 11:20:48;30187,38000000;0,00000000;0,00000000;56,76000000";

/** Encodes ASCII plus Ö and ß with the given byte for each. */
function bytesOf(text: string, bytes: { Ö: number; ß: number }): ArrayBuffer {
  const out = [...text].map((char) => {
    if (char === "Ö") return bytes.Ö;
    if (char === "ß") return bytes.ß;
    const code = char.charCodeAt(0);
    if (code > 0x7f) throw new Error(`not ASCII: ${char}`);
    return code;
  });
  return new Uint8Array(out).buffer;
}

function isKnownHeader(header: string[]): boolean {
  try {
    detectShape(header);
    return true;
  } catch {
    return false;
  }
}

const FILE = `${HEADER}\r\n${ROW}\r\n`;

describe("decodeByHeader", () => {
  it("reads a UTF-8 file", () => {
    const bytes = new TextEncoder().encode(FILE).buffer as ArrayBuffer;
    expect(decodeByHeader(bytes, isKnownHeader)).toBe(FILE);
  });

  it("reads the Mac Roman header of the FTMO sample file", () => {
    // The bytes tmp/import-samples/ftmo.csv actually carries: 0x85 and 0xA7.
    const bytes = bytesOf(FILE, { Ö: 0x85, ß: 0xa7 });
    expect(decodeByHeader(bytes, isKnownHeader)).toBe(FILE);
  });

  it("reads the same header written in Windows-1252", () => {
    const bytes = bytesOf(FILE, { Ö: 0xd6, ß: 0xdf });
    expect(decodeByHeader(bytes, isKnownHeader)).toBe(FILE);
  });

  it("falls back to Windows-1252 when no header is recognised", () => {
    const bytes = bytesOf("Öffnen;Symbol\r\nx;y", { Ö: 0x85, ß: 0xa7 });
    expect(decodeByHeader(bytes, () => false)).toBe("…ffnen;Symbol\r\nx;y");
  });

  it("falls back to UTF-8 for valid UTF-8 that is not recognised", () => {
    const bytes = new TextEncoder().encode("Öffnen;Symbol")
      .buffer as ArrayBuffer;
    expect(decodeByHeader(bytes, () => false)).toBe("Öffnen;Symbol");
  });
});
