// Better Auth 1.7 requires every user to have a unique email. This app has
// none: sign-in is by username, and nothing is ever mailed (no reset, no
// verification — current-feature.md, "Do not build").
//
// So the column holds a placeholder derived from the username. `.invalid` is
// reserved by RFC 2606 and can never resolve, so even a bug that tried to send
// to it would reach nobody. It is never shown in the UI.

const PLACEHOLDER_DOMAIN = "users.invalid";

/** The email Better Auth stores for `username`. Lowercased, like the username. */
export function placeholderEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${PLACEHOLDER_DOMAIN}`;
}
