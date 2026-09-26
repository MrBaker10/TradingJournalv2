"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { InlineMessage } from "@/components/ui/inline-message";
import { detectOrders, detectShape } from "@/domain/import/detect";
import { pairFills } from "@/domain/import/fills";
import { readFtmoRows } from "@/domain/import/ftmo";
import {
  type InstrumentRef,
  normalizeFills,
  normalizeTrades,
} from "@/domain/import/normalize";
import { applyOrderStops, readOrders } from "@/domain/import/tradovate-orders";
import { decodeByHeader, headerOf } from "@/lib/csv/decode";
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
  if (detectOrders(header) !== null) return true;
  try {
    detectShape(header);
    return true;
  } catch {
    return false;
  }
}

/** What a chosen file is, told by its header alone. */
type FileKind = "orders" | "trades" | "unknown";

/** A chosen file, decoded and classified once. */
interface ChosenFile {
  name: string;
  text: string;
  kind: FileKind;
}

function kindOf(text: string): FileKind {
  let header: string[];
  try {
    header = headerOf(text);
  } catch {
    return "unknown";
  }
  if (detectOrders(header) !== null) return "orders";
  try {
    detectShape(header);
    return "trades";
  } catch {
    return "unknown";
  }
}

const ONE_OR_TWO =
  "Choose one file, or a Tradovate fills export together with its Orders export.";

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

  function read(text: string, filename: string, ordersText: string | null) {
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

    if (ordersText !== null && detected.shape !== "fills") {
      setError(
        "An Orders export can only go with a Tradovate fills export, not with this file.",
      );
      return;
    }

    // A fill-level file is paired into round trips first; an FTMO row
    // already is one. Both then meet the same instrument resolution.
    const { trades: paired, invalid: unreadable } =
      detected.shape === "fills"
        ? (() => {
            const read = normalizeFills(data, detected.columns, timeZone);
            return { trades: pairFills(read.fills), invalid: read.invalid };
          })()
        : readFtmoRows(data, detected.columns, timeZone);

    // The Orders export adds stops and nothing else: every trade comes from
    // the fills file (tradovate-orders.ts).
    let trades = paired;
    if (ordersText !== null) {
      let orderRows: string[][];
      try {
        orderRows = parseDelimited(ordersText);
      } catch {
        setError("The Orders export could not be read as CSV or TSV.");
        return;
      }
      const [orderHeader, ...orderData] = orderRows;
      const columns =
        orderHeader === undefined ? null : detectOrders(orderHeader);
      if (columns === null) {
        setError("The Orders export was not recognised.");
        return;
      }
      if (orderData.length > MAX_IMPORT_ROWS) {
        setError(
          `The Orders export has ${orderData.length} rows. The limit is ${MAX_IMPORT_ROWS}.`,
        );
        return;
      }
      trades = applyOrderStops(paired, readOrders(orderData, columns));
    }

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

  /**
   * One file, or a Tradovate fills export together with its Orders export.
   * Which is which is told by the header, not by the order they were picked in.
   */
  function readChosen(files: ChosenFile[]) {
    const orders = files.filter((file) => file.kind === "orders");
    const others = files.filter((file) => file.kind !== "orders");

    if (others.length === 0) {
      setError(
        files.length === 1
          ? "An Orders export only adds stops to a Tradovate fills export. Choose both files together."
          : ONE_OR_TWO,
      );
      return;
    }

    if (others.length === 2) {
      // Two files and no Orders export among them. When one of them is a
      // known export, the other was meant to be its Orders export: say which
      // file that is, rather than rejecting the pair without a reason.
      const unknown = others.filter((file) => file.kind === "unknown");
      setError(
        unknown.length === 1
          ? `${unknown[0].name} was not recognised as a Tradovate Orders export.`
          : ONE_OR_TWO,
      );
      return;
    }

    read(others[0].text, others[0].name, orders[0]?.text ?? null);
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    // Cleared so picking the same file again still fires a change.
    event.target.value = "";
    if (files.length === 0) return;

    if (files.length > 2) {
      setError(ONE_OR_TWO);
      return;
    }

    // Checked on the size, before a single byte is read into memory.
    const tooLarge = files.find((file) => file.size > MAX_IMPORT_BYTES);
    if (tooLarge !== undefined) {
      setError(
        `${tooLarge.name} is ${(tooLarge.size / (1024 * 1024)).toFixed(1)} MB. The limit is ${MAX_MB} MB.`,
      );
      return;
    }

    Promise.all(
      files.map((file) =>
        file.arrayBuffer().then((bytes): ChosenFile => {
          const text = decodeByHeader(bytes, isKnownHeader);
          return { name: file.name, text, kind: kindOf(text) };
        }),
      ),
    ).then(readChosen, () => setError("That file could not be opened."));
  }

  function handlePaste() {
    if (pasted.trim() === "") return;
    read(pasted, "Pasted rows", null);
  }

  return (
    <section className="card-surface edge flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="cap cap-neon">Choose a file</h2>
        <p className="text-[11.5px] text-fg-subtle">
          A CSV or TSV export of your Tradovate fills or your FTMO account
          history, up to {MAX_IMPORT_ROWS} rows and {MAX_MB} MB. Select the
          Tradovate Orders export together with the fills to bring in stops.
          Everything is read in your browser and never uploaded.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
        multiple
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-28 flex-col items-center justify-center gap-2 rounded-ctl border border-white/12 border-dashed text-fg-subtle transition-colors duration-150 hover:border-cyan/35 hover:text-fg-muted"
      >
        <Upload className="h-5 w-5" aria-hidden="true" />
        <span className="text-sm">Select a file or two</span>
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
