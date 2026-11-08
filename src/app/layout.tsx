import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SmartStay — Digital Guest Guidebook",
  description: "Create personalized digital guidebooks for your guests",
};

// maximumScale stops iOS from auto-zooming into focused fields (pinch-zoom still works on iOS)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-inter">{children}</body>
    </html>
  );
}
