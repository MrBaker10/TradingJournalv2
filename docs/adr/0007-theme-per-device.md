# The theme is chosen per device, not per account

The app gets a light theme beside the dark one; the user picks Dark, Light or System,
and Dark stays the default. Every other preference (timezone, selected account) is
stored on the user, but the theme is stored in a cookie on the device. The shared demo
account is the reason: its visitors all sign in as the same user, so a theme stored on
the user would let one visitor switch it for everyone. A cookie also reaches the
signed-out pages (front page, sign-in, registration), and the root layout reads it
while rendering on the server, so the page never flashes the wrong theme.

## Considered Options

- **A column on `users`:** rejected; it follows the user across devices, but needs a
  migration and lets one demo visitor change the theme of all others.
- **`localStorage` (e.g. `next-themes`):** rejected; the server cannot read it, so the
  first paint can show the wrong theme, and it is a new dependency.

## Consequences

- A user who wants Light on every device picks it once per device and browser.
- System follows the operating system through a CSS media query, so it needs no
  server-side knowledge of the device's setting.
