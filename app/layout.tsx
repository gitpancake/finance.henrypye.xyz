import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import Shell from "@/components/Shell";
import AuthGate from "@/components/AuthGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance Dashboard",
  description: "Personal finance management dashboard",
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
        <AuthGate>
          <FinanceProvider>
            <CurrencyProvider>
              <Shell>{children}</Shell>
            </CurrencyProvider>
          </FinanceProvider>
        </AuthGate>
      </body>
    </html>
  );
}
