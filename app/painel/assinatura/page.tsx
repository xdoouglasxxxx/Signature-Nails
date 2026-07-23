"use client"

import { useStudio } from "@/lib/useStudio"
import { statusPlano } from "@/lib/plan"
import { PLANO, PIX_KEY, WHATS_SUPORTE } from "@/lib/config"
import { useState } from "react"
import { Check, Copy, MessageCircle, Clock, Users, Crown } from "lucide-react"
import { brl, cn } from "@/lib/utils"

const PLANOS = [
  {
    key: "solo",
    cfg: PLANO.solo,
    destaque: false,
    para: "Profissional autônomo(a)",
    beneficios: [
      "Página premium com seu link exclusivo",
      "Agendamentos online ilimitados, 24h",
      "Agenda inteligente (durações e expediente)",
      "Galeria, depoimentos e perfil",
      "Mensagens prontas de WhatsApp",
    ],
  },
  {
    key: "pro",
    cfg: PLANO.pro,
    destaque: true,
    para: "Salões e barbearias com equipe",
    beneficios: [
      "Tudo do plano Signature",
      "Profissionais ilimitados na equipe",
      "Agenda independente por profissional",
      "Cliente escolhe quem vai atender",
      "Comissões calculadas automaticamente",
    ],
  },
]

export default function AssinaturaPage() {
  const { studio, loading } = useStudio()
  const [escolhido, setEscolhido] = useState<any>(null)
  const [copiado, setCopiado] = useState(false)

  if (loading)
    return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>

  const plano = statusPlano(studio)
  const copiarPix = () => {
    navigator.clipboard.writeText(PIX_KEY)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl lg:text-3xl font-serif font-bold">Assinatura</h1>
        <p className="text-sm text-navy/60 mt-1">
          {plano.status === "ativo" && "Sua assinatura está ativa. Obrigado por fazer parte! ✦"}
          {plano.status === "trial" && `Você está no teste grátis — ${plano.diasRestantes} dia${plano.diasRestantes === 1 ? "" : "s"} restante${plano.diasRestantes === 1 ? "" : "s"}. Escolha seu plano:`}
          {plano.status === "expirado" && (studio.plan === "trial"
            ? "Seu período de teste terminou. Escolha um plano para reativar sua página."
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
              <p className="font-serif text-lg font-semibold">
                Plano {studio.plan === "pro" ? "Signature Pro" : "Signature"} ativo ✦
              </p>
              <p className="text-sm text-navy/60">
                {plano.diasRestantes !== null ? `Próxima renovação em ${plano.diasRestantes} dias.` : "Sem data de expiração."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {plano.status === "expirado" && (
            <div className="rounded-2xl bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 shrink-0" />
              Sua página está temporariamente indisponível para os clientes até a assinatura ser ativada.
            </div>
          )}

          {/* planos lado a lado */}
          <div className="grid sm:grid-cols-2 gap-4">
            {PLANOS.map((p) => (
              <button
                key={p.key}
                onClick={() => setEscolhido(p)}
                className={cn(
                  "text-left rounded-3xl p-6 border-2 transition-all relative",
                  p.destaque ? "bg-navy text-white" : "bg-white",
                  escolhido?.key === p.key ? "border-gold shadow-[0_10px_30px_rgba(177,139,94,0.3)]" : p.destaque ? "border-navy" : "border-gold/20",
                )}
              >
                {p.destaque && (
                  <span className="absolute -top-3 left-6 text-[10px] font-bold tracking-widest gold-gradient text-navy px-3 py-1 rounded-full inline-flex items-center gap-1">
                    <Users className="w-3 h-3" /> PARA EQUIPES
                  </span>
                )}
                <p className={cn("font-serif text-xl font-bold", p.destaque ? "text-goldlight" : "")}>{p.cfg.nome}</p>
                <p className={cn("text-xs mt-0.5", p.destaque ? "text-white/60" : "text-navy/50")}>{p.para}</p>
                <div className="mt-4 flex items-end gap-2">
                  <p className="font-serif text-3xl font-bold">{brl(p.cfg.fundador)}</p>
                  <p className={cn("text-xs mb-1.5", p.destaque ? "text-white/60" : "text-navy/50")}>/mês</p>
                </div>
                <p className={cn("text-[11px] mt-1", p.destaque ? "text-goldlight" : "text-gold")}>
                  Fundador: {PLANO.fundadorMeses} primeiros meses • depois {brl(p.cfg.cheio)}/mês
                </p>
                <ul className="mt-4 space-y-1.5">
                  {p.beneficios.map((b) => (
                    <li key={b} className={cn("flex items-start gap-2 text-xs", p.destaque ? "text-white/85" : "text-navy/75")}>
                      <Check className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", "text-gold")} /> {b}
                    </li>
                  ))}
                </ul>
                <div className={cn(
                  "mt-4 text-center text-xs font-bold py-2.5 rounded-full",
                  escolhido?.key === p.key ? "gold-gradient text-navy" : p.destaque ? "border border-goldlight/40 text-goldlight" : "border border-navy/15",
                )}>
                  {escolhido?.key === p.key ? "✓ SELECIONADO" : "SELECIONAR"}
                </div>
              </button>
            ))}
          </div>

          {escolhido && (
            <div className="bg-white rounded-3xl border border-gold/20 p-6 space-y-4">
              <p className="font-serif text-lg font-semibold">
                Ativar {escolhido.cfg.nome} — {brl(escolhido.cfg.fundador)}/mês
              </p>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-navy text-goldlight font-serif font-bold flex items-center justify-center shrink-0">1</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Faça o Pix de {brl(escolhido.cfg.fundador)}</p>
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
                    href={`https://wa.me/${WHATS_SUPORTE}?text=${encodeURIComponent(
                      `Olá! Quero assinar o ${escolhido.cfg.nome} ✦\nMeu espaço: ${studio.name} (/${studio.slug})\nSegue o comprovante do Pix:`,
                    )}`}
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
                  <p className="text-xs text-navy/60 mt-1">
                    Confirmamos e sua conta é ativada. Após {PLANO.fundadorMeses} meses, a renovação vai para {brl(escolhido.cfg.cheio)}/mês.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
