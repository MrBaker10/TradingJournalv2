import { MotionConfig } from "motion/react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ToastViewport } from "@/components/ui/toast";
import { routing } from "@/lib/i18n/routing";
import { parseThemePick, THEME_COOKIE, themeBodyClass } from "@/lib/theme";
import "../globals.css";

const instrumentSans = localFont({
  src: "../fonts/InstrumentSans-Variable.woff2",
  variable: "--font-instrument-sans",
});

const plexMono = localFont({
  src: "../fonts/IBMPlexMono-Variable.woff2",
  variable: "--font-plex-mono",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return { title: t("title"), description: t("description") };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  // The language is the first path segment (docs/adr/0008); src/proxy.ts has
  // already redirected every path without a valid one.
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // The pick is per device (docs/adr/0007). Reading it here renders every
  // route dynamically, the signed-out pages included, so none flashes Dark.
  const cookieStore = await cookies();
  const theme = parseThemePick(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html lang={locale} className="h-full">
      {/* Theme and font classes on <body>: overlays portal into it
          (coding-standards.md → Styling). */}
      <body
        className={`${themeBodyClass(theme)} ${instrumentSans.variable} ${plexMono.variable} min-h-full flex flex-col antialiased`}
      >
        <NextIntlClientProvider>
          <MotionConfig reducedMotion="user">
            {children}
            <ToastViewport />
          </MotionConfig>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
