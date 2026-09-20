import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { LocaleProvider } from "@/lib/i18n";
import "./globals.css";

const dmSans = localFont({
  src: "../public/fonts/DMSans-variable.ttf",
  variable: "--font-dm-sans",
  weight: "100 1000",
  display: "swap",
});

const spaceGrotesk = localFont({
  src: "../public/fonts/SpaceGrotesk-variable.ttf",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ship Game with Jev",
  description:
    "Play Battleship against Jev — a browser proof of concept.",
};

export const viewport: Viewport = {
  themeColor: "#0e1c18",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${spaceGrotesk.variable} h-full antialiased`}
      data-sink-theme="nightwatch"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-page">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
