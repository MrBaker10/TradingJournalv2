# The interface language is stored per user and carried in the URL prefix

The app speaks English and German. Every page lives under a locale prefix (`/en/…`,
`/de/…`, both always present; `/api/*` has none), so a link names its language and
more languages fit later without moving routes again. The user's choice is a column on
`users`, set only in Settings, because it is an account preference like the timezone
and should follow the user to every device. The URL decides what one page shows;
`users.language` decides where an unprefixed path and the redirect after sign-in lead.
Signed-out pages fall back to a cookie, then `Accept-Language`, then English.

This deliberately differs from the theme (ADR 0007), which is per device. The shared
demo account is handled by exception: its visitors switch language through the URL and
cookie, and the demo user's column is never written, so one visitor cannot change the
language for the others.

## Considered Options

- **A cookie per device, like the theme:** rejected; the choice should follow the
  account, and the demo problem has a narrower fix than giving up the column.
- **No URL prefix:** rejected; links would not carry their language, and adding a
  third language later would mean moving every route under a segment then.
- **Prefix only for German (`/journal` stays English):** rejected; two route shapes
  make the proxy and every link builder handle a special case.

## Consequences

- Existing users are migrated to `en`; a new user gets the language of the page they
  registered on.
- Opening an `/en/…` link does not change the stored language.
- Display formats (numbers, money, dates) follow the language; CSV import and export
  do not.
