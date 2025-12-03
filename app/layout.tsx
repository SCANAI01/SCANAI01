// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProviders from "./client-providers";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://scanai.cc"),
  applicationName: "SCANAI",
  generator: "v0.app",
  category: "technology",
  title: {
    default:
      "SCANAI | AI token scanner for on-chain risk & technical analysis on BNB",
    template: "%s | SCANAI",
  },
  description:
    "SCANAI is an AI token scanner for BNB Chain. Paste any BNB token contract and get instant survival odds, risk score, liquidity depth, momentum and market health in one clear report.",
  keywords: [
    "SCANAI",
    "BNB Chain",
    "BNB token scanner",
    "AI token scanner",
    "on-chain risk",
    "technical analysis",
    "DEX metrics",
    "liquidity",
    "honeypot checks",
    "crypto risk engine",
  ],
  authors: [{ name: "SCANAI", url: "https://scanai.cc" }],
  alternates: {
    canonical: "/",
  },
  themeColor: "#050608",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: "SCANAI",
    locale: "en_US",
    url: "https://scanai.cc/",
    title:
      "SCANAI | AI token scanner for on-chain risk & technical analysis on BNB",
    description:
      "Let SCANAI’s AI engine sweep on-chain data, DEX flow and real indicators for any BNB token. Check honeypot risk, survival analysis, price impact, momentum and market health in seconds.",
    images: [
      {
        url: "https://scanai.cc/thumbnail.png",
        width: 1200,
        height: 630,
        alt: "SCANAI — AI token scanner for BNB tokens",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@Scanai01",
    creator: "@Scanai01",
    title:
      "SCANAI | AI token scanner for on-chain risk & technical analysis on BNB",
    description:
      "Drop a BNB token contract into SCANAI and get an AI-driven report: survival odds, risk score, liquidity, momentum, volatility and a clear trading scenario. Not financial advice.",
    images: ["https://scanai.cc/thumbnail.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
