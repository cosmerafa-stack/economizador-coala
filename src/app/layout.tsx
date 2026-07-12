import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ThemeSync } from "@/components/ThemeSync";
import { SessionHeartbeat } from "@/components/SessionHeartbeat";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Economizador Coala",
  description: "Compare preços de NFCe na Bahia e revenda com lucro",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/coala-icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Coala",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#3483fa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#ededed]">
        <div className="app-shell">
          <ThemeSync />
          <SessionHeartbeat />
          <AnimatedBackground />
          {children}
        </div>
      </body>
    </html>
  );
}
