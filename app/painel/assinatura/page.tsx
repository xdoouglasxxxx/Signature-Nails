"use client"

import { useStudio } from "@/lib/useStudio"
import { statusPlano } from "@/lib/plan"
import { PLANO, PIX_KEY, WHATS_SUPORTE } from "@/lib/config"
import { useState } from "react"
import { Check, Copy, MessageCircle, Sparkles, Clock } from "lucide-react"
import { brl, cn } from "@/lib/utils"

const BENEFICIOS = [
  "Página profissional com seu link exclusivo",
  "Agendamentos online ilimitados, 24h por dia",
  "Agenda inteligente (durações, expediente, bloqueios)",
  "Galeria, depoimentos e perfil personalizados",
  "Mensagens prontas de WhatsApp para cada cliente",
  "Suporte direto pelo WhatsApp",
]

export default function AssinaturaPage() {
  const { studio, loading } = useStudio()
  const [copiado, setCopiado] = useState(false)

  if (loading)
    return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>

  const plano = statusPlano(studio)
  const copiarPix = () => {
    navigator.clipboard.writeText(PIX_KEY)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }
  const msgWhats = encodeURIComponent(
    `Olá! Quero assinar o Signature Nails 💅\nMeu studio: ${studio.name} (/${studio.slug})\nSegue o comprovante do Pix:`,
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl lg:text-3xl font-serif font-bold">Assinatura</h1>
        <p className="text-sm text-navy/60 mt-1">
          {plano.status === "ativo" && "Sua assinatura está ativa. Obrigada por fazer parte! 💛"}
          {plano.status === "trial" && `Você está no teste grátis — ${plano.diasRestantes} dia${plano.diasRestantes === 1 ? "" : "s"} restante${plano.diasRestantes === 1 ? "" : "s"}.`}
          {plano.status === "expirado" && (studio.plan === "trial"
            ? "Seu período de teste terminou. Assine para reativar sua página."
            : "Sua assinatura venceu. Renove para reativar sua página.")}
        </p>
      </div>

      {plano.status === "ativo" ? (
        <div className="bg-white rounded-3xl border border-emerald-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-serif text-lg font-semibold">Plano ativo ✨</p>
              <p className="text-sm text-navy/60">
                {plano.diasRestantes !== null
                  ? `Próxima renovação em ${plano.diasRestantes} dias.`
                  : "Sem data de expiração."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {plano.status === "expirado" && (
            <div className="rounded-2xl bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 shrink-0" />
              Sua página está temporariamente indisponível para as clientes até a assinatura ser ativada.
            </div>
          )}

          <div className="bg-navy rounded-3xl p-6 text-white relative overflow-hidden">
            <Sparkles className="absolute top-4 right-4 w-5 h-5 text-goldlight/60" />
            <p className="text-[10px] tracking-widest text-goldlight font-bold uppercase">Oferta de fundadora</p>
            <div className="mt-2 flex items-end gap-3">
              <p className="font-serif text-4xl font-bold">{brl(PLANO.precoFundadora)}</p>
              <p className="text-white/50 text-sm line-through mb-1.5">{brl(PLANO.precoMensal)}</p>
              <p className="text-white/70 text-sm mb-1.5">/mês</p>
            </div>
            <p className="text-xs text-goldlight mt-1">
              Preço garantido para sempre — só para as {PLANO.vagasFundadora} primeiras assinantes ✨
            </p>
            <ul className="mt-5 space-y-2">
              {BENEFICIOS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-white/85">
                  <Check className="w-4 h-4 text-gold shrink-0 mt-0.5" /> {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-3xl border border-gold/20 p-6 space-y-4">
            <p className="font-serif text-lg font-semibold">Como assinar (2 minutos)</p>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-navy text-goldlight font-serif font-bold flex items-center justify-center shrink-0">1</div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Faça o Pix de {brl(PLANO.precoFundadora)}</p>
                <div className="mt-2 flex items-center gap-2 bg-cream rounded-xl border border-gold/20 px-3 py-2.5">
                  <code className="text-xs text-navy/80 flex-1 truncate">{PIX_KEY}</code>
                  <button onClick={copiarPix} className="px-3 py-1.5 rounded-full gold-gradient text-navy text-[10px] font-bold inline-flex items-center gap-1 shrink-0">
                    {copiado ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiado ? "COPIADO" : "COPIAR PIX"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-navy text-goldlight font-serif font-bold flex items-center justify-center shrink-0">2</div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Envie o comprovante no WhatsApp</p>
                <a
                  href={`https://wa.me/${WHATS_SUPORTE}?text=${msgWhats}`}
                  target="_blank" rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#25D366] text-white text-xs font-bold"
                >
                  <MessageCircle className="w-4 h-4" /> ENVIAR COMPROVANTE
                </a>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-navy text-goldlight font-serif font-bold flex items-center justify-center shrink-0">3</div>
              <div>
                <p className="text-sm font-semibold">Liberação em poucos minutos</p>
                <p className="text-xs text-navy/60 mt-1">Confirmamos e sua conta é ativada. Depois é só recarregar o painel. 💛</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
