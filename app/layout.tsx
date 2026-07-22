import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Signature Nails — Agendamento online para nail designers",
  description:
    "Sua página profissional com agendamento online: serviços, horários em tempo real, galeria e painel completo. Feito para nail designers.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}