import { DeleteAccountCard } from "./delete-account-card";
import { PasswordCard } from "./password-card";
import { TwoFactorCard } from "./two-factor-card";

interface SecuritySectionProps {
  username: string;
  twoFactorEnabled: boolean;
}

// Design.md §4.19: profile, password, two-factor and deletion, in the card
// pattern of the export card. The username is text, not a disabled field —
// it cannot be changed, and a field would suggest it could.
export function SecuritySection({
  username,
  twoFactorEnabled,
}: SecuritySectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="cap">Security</span>
      <div className="card-surface edge flex flex-col gap-1 p-5">
        <span className="font-medium text-fg text-sm">Username</span>
        <span className="font-mono text-fg text-sm">{username}</span>
        <span className="text-fg-subtle text-xs">
          How you sign in. It can't be changed.
        </span>
      </div>
      <PasswordCard />
      <TwoFactorCard enabled={twoFactorEnabled} username={username} />
      <DeleteAccountCard />
    </div>
  );
}
