"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { InlineMessage } from "@/components/ui/inline-message";
import { detectShape } from "@/domain/import/detect";
import { pairFills } from "@/domain/import/fills";
import { readFtmoRows } from "@/domain/import/ftmo";
import {
  type InstrumentRef,
  normalizeFills,
  normalizeTrades,
} from "@/domain/import/normalize";
import { decodeByHeader } from "@/lib/csv/decode";
import { parseDelimited } from "@/lib/csv/parse";
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS } from "@/schemas/import";
import type { ParsedFile } from "./import-wizard";

interface FileStepProps {
  instruments: InstrumentRef[];
  timeZone: string;
  onParsed: (file: ParsedFile) => void;
}

const MAX_MB = Math.round(MAX_IMPORT_BYTES / (1024 * 1024));

/**
 * Whether a header belongs to a known export. Used to pick the encoding: an
 * FTMO file comes as UTF-8, Windows-1252 or Mac Roman, and only its header
 * tells which (src/lib/csv/decode.ts).
 */
function isKnownHeader(header: string[]): boolean {
  try {
    detectShape(header);
    return true;
  } catch {
    return false;
  }
}

/**
 * Step one: get the rows out of a file, in the browser.
 *
 * The whole pipeline runs here — parse, detect, normalise, pair, normalise
 * again — so that the file itself never travels. Every stage is a pure module
 * with its own tests; this component only sequences them and turns a thrown
 * detection error into a line the user can read.
 */
export function FileStep({ instruments, timeZone, onParsed }: FileStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);

  function read(text: string, filename: string) {
    setError(null);

    let rows: string[][];
    try {
      rows = parseDelimited(text);
    } catch {
      setError("That file could not be read as CSV or TSV.");
      return;
    }

    const [header, ...data] = rows;
    if (header === undefined || data.length === 0) {
      setError("That file has a header but no rows.");
      return;
    }

    // Counted before anything is built, and never silently truncated.
    if (data.length > MAX_IMPORT_ROWS) {
      setError(
        `That file has ${data.length} rows. The limit is ${MAX_IMPORT_ROWS}.`,
      );
      return;
    }

    let detected: ReturnType<typeof detectShape>;
    try {
      detected = detectShape(header);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Unrecognised file.");
      return;
    }

    // A fill-level file is paired into round trips first; an FTMO row
    // already is one. Both then meet the same instrument resolution.
    const { trades, invalid: unreadable } =
      detected.shape === "fills"
        ? (() => {
            const read = normalizeFills(data, detected.columns, timeZone);
            return { trades: pairFills(read.fills), invalid: read.invalid };
          })()
        : readFtmoRows(data, detected.columns, timeZone);
    const { rows: normalized, invalid: unknown } = normalizeTrades(
      trades,
      instruments,
    );

    if (normalized.length === 0) {
      setError("No row in that file could be read as a trade.");
      return;
    }

    onParsed({
      filename,
      shape: detected.shape,
      sourceRows: data.length,
      rows: normalized,
      invalid: [...unreadable, ...unknown].sort(
        (a, b) => a.sourceRow - b.sourceRow,
      ),
    });
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared so picking the same file again still fires a change.
    event.target.value = "";
    if (!file) return;

    // Checked on the size, before a single byte is read into memory.
    if (file.size > MAX_IMPORT_BYTES) {
      setError(
        `That file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The limit is ${MAX_MB} MB.`,
      );
      return;
    }

    file.arrayBuffer().then(
      (bytes) => read(decodeByHeader(bytes, isKnownHeader), file.name),
      () => setError("That file could not be opened."),
    );
  }

  function handlePaste() {
    if (pasted.trim() === "") return;
    read(pasted, "Pasted rows");
  }

  return (
    <section className="card-surface edge flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="cap cap-neon">Choose a file</h2>
        <p className="text-[11.5px] text-fg-subtle">
          A CSV or TSV export of your Tradovate fills or your FTMO account
          history, up to {MAX_IMPORT_ROWS} rows and {MAX_MB} MB. It is read in
          your browser and never uploaded.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-28 flex-col items-center justify-center gap-2 rounded-ctl border border-white/12 border-dashed text-fg-subtle transition-colors duration-150 hover:border-cyan/35 hover:text-fg-muted"
      >
        <Upload className="h-5 w-5" aria-hidden="true" />
        <span className="text-sm">Select a file</span>
      </button>

      <div className="flex flex-col gap-2">
        <label className="cap" htmlFor="import-paste">
          Or paste the rows
        </label>
        <textarea
          id="import-paste"
          rows={4}
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
          placeholder="Paste the header row and the rows below it"
          className="rounded-ctl bg-well px-3 py-2 font-mono text-[13px] text-fg placeholder:text-fg-placeholder focus:shadow-[var(--shadow-focus)] focus:outline-none"
        />
        <button
          type="button"
          disabled={pasted.trim() === ""}
          onClick={handlePaste}
          className="self-start rounded-ctl bg-[image:var(--gradient-info-soft)] px-4 py-2 text-fg text-sm shadow-[var(--shadow-info-soft)] transition-opacity duration-150 disabled:opacity-40"
        >
          Read pasted rows
        </button>
      </div>

      <InlineMessage message={error} />
    </section>
  );
}
