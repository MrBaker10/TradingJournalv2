import { Loader2 } from "lucide-react";

interface PendingIndicatorProps {
  /** Shown instead of the spinner when the user asked for reduced motion. */
  label: string;
}

// Design.md §5: under prefers-reduced-motion every animation is off and each
// state still has to be recognisable without movement — "the spinner becomes
// the static text 'Saving…'". The block in globals.css stops the rotation but
// on its own would leave a frozen icon, which reads as a stuck button rather
// than a busy one.
//
// Both states are rendered and CSS picks one. That keeps it out of JS: the
// server cannot know what the browser prefers, so a media query in React
// would mean a hydration mismatch on exactly the machines this is for.
export function PendingIndicator({ label }: PendingIndicatorProps) {
  return (
    <>
      <Loader2
        className="h-4 w-4 animate-spin motion-reduce:hidden"
        aria-hidden="true"
      />
      <span className="hidden motion-reduce:inline">{label}</span>
    </>
  );
}
