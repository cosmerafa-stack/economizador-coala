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
  icons: {
    icon: "/coala-icon.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
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
