import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OFLIX · Trabalho que acontece no território",
  description: "Demo territorial para conectar trabalho formal, serviços autônomos e voluntariado em Sergipe.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
