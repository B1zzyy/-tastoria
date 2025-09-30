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
      { url: '/logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo.png', sizes: '16x16', type: 'image/png' }
    ],
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#191919" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/logo.png" type="image/png" sizes="32x32" />
        <link rel="shortcut icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
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
