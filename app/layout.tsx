import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import AuthGate from "@/components/AuthGate";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "finance. — Personal Finance Dashboard",
    template: "%s | finance.",
  },
  description:
    "Track spending. Build wealth. Stay in control. A personal finance dashboard with multi-currency support and AI reporting.",
  metadataBase: new URL("https://finance.henrypye.xyz"),
  openGraph: {
    title: "finance. — Personal Finance Dashboard",
    description:
      "Track spending. Build wealth. Stay in control. A personal finance dashboard with multi-currency support and AI reporting.",
    siteName: "finance.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "finance. — Personal Finance Dashboard",
    description:
      "Track spending. Build wealth. Stay in control. A personal finance dashboard with multi-currency support and AI reporting.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark">
          <AuthGate>{children}</AuthGate>
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
