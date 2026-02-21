import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Tabeliao - Cartorio Digital Inteligente",
  description:
    "Plataforma de contratos inteligentes com IA juridica, assinatura digital, pagamentos automaticos e resolucao de disputas. Seu cartorio digital completo.",
  keywords: [
    "contrato digital",
    "cartorio online",
    "assinatura digital",
    "smart contract",
    "IA juridica",
    "tabeliao",
  ],
  authors: [{ name: "Tabeliao" }],
  openGraph: {
    title: "Tabeliao - Cartorio Digital Inteligente",
    description:
      "Contratos que se escrevem, se fiscalizam e se pagam sozinhos.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "hsl(var(--card))",
                color: "hsl(var(--card-foreground))",
                border: "1px solid hsl(var(--border))",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
