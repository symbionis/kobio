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

export const metadata: Metadata = {
  title: "Kobio — devis vocal",
  description: "Note vocale → devis.",
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
