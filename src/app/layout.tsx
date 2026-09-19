import type { Metadata } from "next";

import { appConfig } from "@/shared/config/app";

import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
