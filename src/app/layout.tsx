import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SmartStay — Digital Guest Guidebook",
  description: "Create personalized digital guidebooks for your guests",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-inter">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
