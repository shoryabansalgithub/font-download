import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// Self-hosted (OFL, from Fontsource) rather than next/font/google: the build
// must not depend on reaching Google, and its loader breaks on the
// `/l/font?kit=...&skey=...` URLs Google now serves.
const manrope = localFont({
  src: "./fonts/manrope-latin-wght-normal.woff2",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
});

const newsreader = localFont({
  src: "./fonts/newsreader-latin-wght-normal.woff2",
  variable: "--font-newsreader",
  weight: "200 800",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Analyze Any Font - Extract Fonts from Any Website",
  description: "Discover and analyze fonts from any website. Just enter a URL and get instant access to all the fonts used.",
  openGraph: {
    title: "Analyze Any Font",
    description: "Extract and analyze fonts from any website instantly.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Analyze Any Font OG Image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Analyze Any Font",
    description: "Extract and analyze fonts from any website instantly.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${newsreader.variable} ${jetbrainsMono.variable}`}>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
