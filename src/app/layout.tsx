import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { CursorGlow } from "@/components/CursorGlow";
import { PageTracker } from "@/components/PageTracker";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Sua Próxima Corrida";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    siteName,
    locale: "pt_BR",
  },
  twitter: { card: "summary_large_image" },
  title: {
    default: `${siteName} — Encontre corridas de rua perto de você`,
    template: `%s · ${siteName}`,
  },
  description:
    "Agregador de corridas de rua: reunimos provas de vários sites de inscrição em um só lugar, com data, local, distâncias, preço e link oficial.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="overflow-x-hidden">
        <CursorGlow />
        <PageTracker />
        <Header />
        <main className="relative z-10 min-h-[70vh] py-10">{children}</main>
        <footer className="relative z-10 border-t border-ink-800 py-8 text-sm text-neutral-500">
          <div className="container-page flex flex-col gap-1">
            <p className="font-medium text-neutral-300">{siteName}</p>
            <p>
              Corridas de rua do Paraná reunidas em um só lugar. Os links levam
              sempre à inscrição oficial no site de origem.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
