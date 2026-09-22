"use client";

import { useMemo } from "react";
import { encode } from "uqr";

interface TotpQrProps {
  /** The otpauth:// URI Better Auth returns when 2FA is enabled. */
  uri: string;
}

// Design.md §4.19: dark modules on a white field. The app is dark, the code
// is not — not every authenticator app reads an inverted QR code.
//
// Drawn as one React <path> from uqr's module matrix rather than injected as
// an SVG string: no innerHTML, and the colour comes from a theme token.
export function TotpQr({ uri }: TotpQrProps) {
  const { size, path } = useMemo(() => {
    const qr = encode(uri);
    let d = "";
    qr.data.forEach((row, y) => {
      row.forEach((dark, x) => {
        if (dark) d += `M${x} ${y}h1v1h-1z`;
      });
    });
    return { size: qr.size, path: d };
  }, [uri]);

  return (
    <div className="w-fit rounded-ctl bg-fg p-3">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-44 w-44"
        role="img"
        aria-label="QR code for your authenticator app"
        shapeRendering="crispEdges"
      >
        <path d={path} className="fill-bg" />
      </svg>
    </div>
  );
}
