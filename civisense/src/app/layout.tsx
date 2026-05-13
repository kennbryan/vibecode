import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { HeaderShell } from "@/components/layout/HeaderShell";
import { PwaStatus } from "@/components/pwa/PwaStatus";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "CiviSense",
  description: "Platform laporan banjir komunitas untuk Bojongsoang dan Telkom University.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CiviSense",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0c5b66",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={inter.variable}>
        <HeaderShell />
        {children}
        <PwaStatus />
        <Toaster />
      </body>
    </html>
  );
}
