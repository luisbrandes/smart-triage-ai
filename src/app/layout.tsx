import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { appConfig } from "@/shared/config/app";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: appConfig.name,
  description: "Plataforma de apoio à coleta e revisão de informações de triagem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
