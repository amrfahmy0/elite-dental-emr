import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Elite Dental Studio — EMR",
  description: "Premium Electronic Medical Records system for Elite Dental Studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-[#0B1220] text-[#E8E8F0] min-h-screen">
        {children}
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
