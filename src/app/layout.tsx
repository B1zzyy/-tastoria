import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tastoria - Recipe Parser",
  description: "Transform any recipe URL into a beautifully formatted, easy-to-follow recipe. Parse recipes from popular cooking websites instantly.",
  keywords: ["recipe parser", "cooking", "recipes", "food", "ingredients", "instructions"],
  authors: [{ name: "Tastoria" }],
  creator: "Tastoria",
  publisher: "Tastoria",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Tastoria - Recipe Parser",
    description: "Transform any recipe URL into a beautifully formatted, easy-to-follow recipe.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tastoria - Recipe Parser",
    description: "Transform any recipe URL into a beautifully formatted, easy-to-follow recipe.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
