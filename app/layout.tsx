import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Signature Nails — Agendamento online para nail designers",
  description:
    "Sua página profissional com agendamento online: serviços, horários em tempo real, galeria e painel completo. Feito para nail designers.",
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
    title: "Signature Nails",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Signature Nails — Agendamento online para nail designers",
    description: "Suas clientes agendam sozinhas, sem novela no direct. Página premium + agenda inteligente.",
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
