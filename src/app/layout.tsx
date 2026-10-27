import { MotionConfig } from "motion/react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { ToastViewport } from "@/components/ui/toast";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      {/* Theme and font classes on <body>: overlays portal into it
          (coding-standards.md → Styling). */}
      <body
        className={`dark ${instrumentSans.variable} ${plexMono.variable} min-h-full flex flex-col antialiased`}
      >
        <MotionConfig reducedMotion="user">
          {children}
          <ToastViewport />
        </MotionConfig>
      </body>
    </html>
  );
}
