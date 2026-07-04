import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { productName } from "@/lib/brand";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: `${productName} — AI Security Officer for GitHub repos`,
  description:
    "Scan GitHub repositories for security risks, architecture weaknesses, production-readiness issues, and AI-ready fix prompts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.variable} font-sans min-h-screen bg-background text-foreground antialiased`}>
        {children}
      </body>
    </html>
  );
}
