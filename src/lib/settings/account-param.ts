// The settings sheet's open account lives in the `account` search parameter
// (Design.md §3.8): an account's id, or `new` for the empty editor. The page
// resolves it against the user's own accounts only, so an id from someone
// else — or one that does not exist — opens nothing.

/** What the sheet can open: an account by id, the empty editor, or nothing. */
export type AccountTarget = number | "new" | null;

interface WithId {
  id: number;
}

export type OpenAccount<A extends WithId, R extends WithId> =
  | {
      kind: "active";
      account: A;
      /** 1-based, for the sheet header's "n / total". */
      position: number;
      total: number;
      /** Neighbours for previous and next; the list wraps around. */
      previous: A;
      next: A;
    }
  | { kind: "archived"; account: R }
  | { kind: "new" };

export function resolveAccountParam<A extends WithId, R extends WithId>(
  value: string | null | undefined,
  active: A[],
  archived: R[],
): OpenAccount<A, R> | null {
  if (value === "new") return { kind: "new" };
  const index = active.findIndex((account) => String(account.id) === value);
  if (index < 0) {
    const account = archived.find((other) => String(other.id) === value);
    return account ? { kind: "archived", account } : null;
  }
  return {
    kind: "active",
    account: active[index],
    position: index + 1,
    total: active.length,
    previous: active[(index - 1 + active.length) % active.length],
    next: active[(index + 1) % active.length],
  };
}

/**
 * `search` (as `location.search` gives it) with the open account set, or
 * removed when `target` is null. Every other parameter is kept.
 */
export function accountSearch(search: string, target: AccountTarget): string {
  const params = new URLSearchParams(search);
  if (target === null) params.delete("account");
  else params.set("account", String(target));
  const query = params.toString();
  return query ? `?${query}` : "";
}
