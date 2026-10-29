"use client";

import { useEffect, useState } from "react";

/**
 * A number that changes whenever the theme's colour values may have changed:
 * the theme class on <body> is swapped, or the device's colour-scheme
 * preference flips (it decides System). For drawings that read a token once,
 * like the streak orb, to redraw in the new colour.
 */
export function useThemeChange(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((current) => current + 1);
    const observer = new MutationObserver(bump);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    const scheme = window.matchMedia("(prefers-color-scheme: light)");
    scheme.addEventListener("change", bump);
    return () => {
      observer.disconnect();
      scheme.removeEventListener("change", bump);
    };
  }, []);

  return version;
}
