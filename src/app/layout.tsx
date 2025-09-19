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
  title: "Tastoria - Recipes Made Easy",
  description: "Clear away the clutter on any recipe site. Transform any recipe URL into a beautifully formatted, easy-to-follow recipe instantly.",
  keywords: ["recipes", "recipe parser", "cooking", "food", "ingredients", "instructions", "clean recipes"],
  authors: [{ name: "Tastoria" }],
  creator: "Tastoria",
  publisher: "Tastoria",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Tastoria - Recipes Made Easy",
    description: "Clear away the clutter on any recipe site. Transform any recipe URL into a beautifully formatted, easy-to-follow recipe.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tastoria - Recipes Made Easy",
    description: "Clear away the clutter on any recipe site. Transform any recipe URL into a beautifully formatted, easy-to-follow recipe.",
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32', type: 'image/x-icon' },
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
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
