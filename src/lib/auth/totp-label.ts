// Better Auth 1.7.5 labels the otpauth:// URI with the user's email
// (two-factor plugin, `.url(issuer, user.email)`), and there is no option to
// change it. Here the email is the placeholder `<username>@users.invalid`,
// which would then show up in the user's authenticator app — the one place
// it would ever be seen.
//
// The label is display text only: the secret, issuer and algorithm live in
// the query string. So the label is swapped for the username before the QR
// code is drawn, and the code verifies exactly as before.

/** `uri` with its account label set to `issuer:accountName`. */
export function withAccountLabel(uri: string, accountName: string): string {
  const url = new URL(uri);
  const issuer = url.searchParams.get("issuer");
  const label = issuer ? `${issuer}:${accountName}` : accountName;
  return `${url.protocol}//${url.host}/${encodeURIComponent(label)}${url.search}`;
}
