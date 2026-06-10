import type { Metadata } from "next";
import { Fraunces, Fragment_Mono, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import FeedbackWidget from "./components/FeedbackWidget";
import TopNav from "./components/TopNav";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});
const fragment = Fragment_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-fragment",
  display: "swap",
});

// metadataBase makes the file-based OG/Twitter images (app/opengraph-image.png,
// app/twitter-image.png — auto-detected by Next) resolve to absolute URLs.
export const metadata: Metadata = {
  metadataBase: new URL("https://kobio.to"),
  title: "Kobio — devis vocal",
  description: "La note vocale de chantier qui devient un devis pro, en 2 minutes.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://kobio.to",
    siteName: "Kobio",
    title: "Kobio — Parlez. On chiffre. Vous envoyez.",
    description: "La note vocale de chantier qui devient un devis pro, en 2 minutes.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kobio — Parlez. On chiffre. Vous envoyez.",
    description: "La note vocale de chantier qui devient un devis pro, en 2 minutes.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${jakarta.variable} ${fragment.variable}`}>
      <body>
        <Toaster richColors position="top-center" />
        <TopNav />
        {children}
        <FeedbackWidget />
      </body>
    </html>
  );
}
