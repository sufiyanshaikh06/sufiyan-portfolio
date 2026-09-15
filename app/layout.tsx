import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { Header } from "@/components/shell/Header";
import { Footer } from "@/components/shell/Footer";
import { SkipToContent } from "@/components/shell/SkipToContent";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://sufiyan-shaikh-dev.vercel.app"),
  title: {
    default: "Sufiyan Shaikh | Computer Science Student",
    template: "%s | Sufiyan Shaikh",
  },
  description: "Computer Science student focused on artificial intelligence, machine learning and software engineering.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Sufiyan Shaikh | Computer Science Student",
    description: "Computer Science student focused on artificial intelligence, machine learning and software engineering.",
    url: "https://sufiyan-shaikh-dev.vercel.app",
    siteName: "Sufiyan Shaikh Portfolio",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark overflow-x-hidden">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable} font-sans antialiased bg-void-black text-gray-200 min-h-screen flex flex-col overflow-x-hidden w-full max-w-full`}
      >
        <SkipToContent />
        <Header />
        <div className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
