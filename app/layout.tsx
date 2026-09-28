import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "OFLIX · Trabalho que acontece no território",
  description: "Demo territorial para conectar trabalho formal, serviços autônomos e voluntariado em Sergipe.",
  metadataBase: siteUrl,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "OFLIX",
    title: "OFLIX · Trabalho que acontece no território",
    description: "Uma plataforma territorial para aproximar trabalho formal, serviços autônomos e voluntariado em Sergipe.",
    url: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
