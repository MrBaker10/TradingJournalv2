import { MotionConfig } from "motion/react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { ToastViewport } from "@/components/ui/toast";
import { parseThemePick, THEME_COOKIE, themeBodyClass } from "@/lib/theme";
import "./globals.css";

const instrumentSans = localFont({
  src: "./fonts/InstrumentSans-Variable.woff2",
  variable: "--font-instrument-sans",
});

const plexMono = localFont({
  src: "./fonts/IBMPlexMono-Variable.woff2",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "Trade journal for prop-firm futures traders",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The pick is per device (docs/adr/0007). Reading it here renders every
  // route dynamically, the signed-out pages included, so none flashes Dark.
  const cookieStore = await cookies();
  const theme = parseThemePick(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html lang="en" className="h-full">
      {/* Theme and font classes on <body>: overlays portal into it
          (coding-standards.md → Styling). */}
      <body
        className={`${themeBodyClass(theme)} ${instrumentSans.variable} ${plexMono.variable} min-h-full flex flex-col antialiased`}
      >
        <MotionConfig reducedMotion="user">
          {children}
          <ToastViewport />
        </MotionConfig>
      </body>
    </html>
  );
}
