import { DeleteAccountCard } from "./delete-account-card";
import { PasswordCard } from "./password-card";
import { SettingsRow } from "./settings-row";
import { TwoFactorCard } from "./two-factor-card";

interface SecuritySectionProps {
  username: string;
  twoFactorEnabled: boolean;
  /** The shared demo account: the rows show, their actions do not. */
  demo: boolean;
}

// Username, password and two-factor as rows, then the danger zone set apart
// (Design.md §3.8). The username is text, not a disabled field — it cannot be
// changed, and a field would suggest it could.
export function SecuritySection({
  username,
  twoFactorEnabled,
  demo,
}: SecuritySectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col divide-y">
        <SettingsRow
          title="Username"
          hint={
            <>
              <span className="font-mono text-foreground">{username}</span> ·
              How you sign in. It can't be changed.
            </>
          }
        />
        <PasswordCard locked={demo} />
        <TwoFactorCard
          enabled={twoFactorEnabled}
          username={username}
          locked={demo}
        />
      </div>
      {demo && (
        <p className="text-muted-foreground text-sm">
          Password, two-factor and deleting the account are off on the demo
          account, so every visitor keeps the same way in.
        </p>
      )}
      <DeleteAccountCard locked={demo} />
    </div>
  );
}
