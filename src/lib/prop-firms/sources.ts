// `context/prop-firm-sources.md` lists each prop firm's official source pages,
// so every data refresh checks the same pages (docs/adr/0005). One
// `## <Firm name>` heading per firm, named exactly as in PropFirmsData.md, then
// one `- <url>` line per page. Text before the first heading is free.
//
// Like the PropFirmsData.md parser, a line it cannot place is an error, not a
// skipped line: a silently dropped URL would be a page no refresh checks.

export interface FirmSources {
  firm: string;
  urls: string[];
}

export function parseSourceList(markdown: string): FirmSources[] {
  const firms: FirmSources[] = [];
  let current: (FirmSources & { line: number }) | null = null;

  const close = () => {
    if (current && current.urls.length === 0) {
      fail(current.line, `"${current.firm}" has no URL`);
    }
  };

  for (const [index, raw] of markdown.split(/\r?\n/).entries()) {
    const line = index + 1;
    const text = raw.trim();
    const heading = /^##\s+(.+)$/.exec(text);
    if (heading) {
      close();
      const firm = heading[1].trim();
      if (firms.some((entry) => entry.firm === firm)) {
        fail(line, `"${firm}" is listed twice`);
      }
      current = { firm, urls: [], line };
      firms.push(current);
      continue;
    }
    if (current === null || text === "") continue;
    if (!text.startsWith("- ")) fail(line, 'expected "- <url>"');
    current.urls.push(readUrl(text.slice(2).trim(), current.firm, line));
  }
  close();

  return firms.map(({ firm, urls }) => ({ firm, urls }));
}

// Only https, the same rule the PropFirmsData.md parser applies to a firm's
// website (coding-standards.md, External links on trades).
function readUrl(text: string, firm: string, line: number): string {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return fail(line, `a URL for "${firm}" is not a URL: "${text}"`);
  }
  if (url.protocol !== "https:") {
    return fail(
      line,
      `a URL for "${firm}" must be https, found "${url.protocol}"`,
    );
  }
  return text;
}

function fail(line: number, message: string): never {
  throw new Error(`prop-firm-sources.md line ${line}: ${message}`);
}
