import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const siteUrl = getSiteUrl();
const siteName = "OFLIX";
const siteTitle = "OFLIX | Trabalho, serviços e voluntariado em Sergipe";
const siteDescription = "OFLIX é a plataforma territorial de Sergipe para encontrar trabalho formal, serviços autônomos e voluntariado em um só lugar.";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  applicationName: siteName,
  metadataBase: siteUrl,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName,
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
  icons: {
    icon: "/icon.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "I9xmSFKbaWtr8FXXTgJiDzRbW04z3f3MauvzMP7MUV4",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    alternateName: "OFLIX Sergipe",
    url: siteUrl.toString(),
    description: siteDescription,
    inLanguage: "pt-BR",
  };

  return (
    <html lang="pt-BR">
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </body>
    </html>
  );
}
