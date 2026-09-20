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

const siteUrl = "https://sinkjev.com";
const title = "Sink Jev — Jev predicts. You surprise.";
const description =
  "Play Battleship against Jev, an LLM. Deploy your fleet, choose a target and put your instincts to the test.";
const ogImageAlt = "Sink Jev — Jev predicts. You surprise.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    type: "website",
    siteName: "Sink Jev",
    title,
    description,
    url: siteUrl,
    locale: "en_US",
    images: [
      {
        url: "/og-image-en.jpg",
        width: 1200,
        height: 630,
        alt: ogImageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [
      {
        url: "/og-image-en.jpg",
        width: 1200,
        height: 630,
        alt: ogImageAlt,
      },
    ],
  },
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
