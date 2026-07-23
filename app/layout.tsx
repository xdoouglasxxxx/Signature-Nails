import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Signature — Gestão e agendamento para salões, barbearias e studios",
  description:
    "Página premium com agendamento online 24h, equipe com agendas independentes e comissões. A plataforma de gestão para o seu negócio de beleza.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Signature",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Signature — Gestão e agendamento para salões, barbearias e studios",
    description: "Agendamento online 24h, equipe e comissões. A assinatura premium do seu negócio de beleza.",
    type: "website",
    locale: "pt_BR",
  },
}

export const viewport: Viewport = {
  themeColor: "#121C2C",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
