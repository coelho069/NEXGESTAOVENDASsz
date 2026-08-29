import "@/app/globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { CmsProvider } from "@/lib/cms/provider";
import { ToastHost } from "@/components/ui/toast";
import { AuthProvider } from "@/lib/auth/provider";
import type { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FluxoGestão — Liberdade operacional, mesmo sem internet",
  description:
    "PDV ultra-rápido, estoque automatizado e financeiro em tempo real. Continue vendendo quando a rede cair.",
  openGraph: {
    title: "FluxoGestão — Liberdade operacional, mesmo sem internet",
    description:
      "A gestão comercial que não para. PDV offline, estoque via XML e catálogo com um clique.",
    locale: "pt-BR",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-screen bg-background text-foreground antialiased`}
      >
        <StoreProvider>
          <CmsProvider>
            <AuthProvider>
              <ToastHost>{children}</ToastHost>
            </AuthProvider>
          </CmsProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
