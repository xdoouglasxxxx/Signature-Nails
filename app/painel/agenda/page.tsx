"use client"

import { createClient } from "@/lib/supabase"
import { useStudio } from "@/lib/useStudio"
import { useCallback, useEffect, useState } from "react"
import { format, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Check, X, DollarSign, Loader2, CalendarDays } from "lucide-react"
import { brl, cn } from "@/lib/utils"
import NovosAgendamentos from "@/components/NovosAgendamentos"

const statusColors: any = {
  pendente: "bg-amber-100 text-amber-700",
  confirmado: "bg-emerald-100 text-emerald-700",
  pago: "bg-blue-100 text-blue-700",
  cancelado: "bg-red-100 text-red-700",
  "no-show": "bg-gray-200 text-gray-600",
}

function mensagemWhats(app: any, dia: Date) {
  const nome = (app.clients?.name || "").split(" ")[0]
  const servico = app.services?.name || "seu horário"
  const data = format(dia, "dd/MM")
  const hora = app.start_time?.substring(0, 5)
  const msgs: any = {
    pendente: `Olá ${nome}! ✨ Recebemos seu agendamento de *${servico}* para ${data} às ${hora}. Em breve confirmamos seu horário, tudo bem?`,
    confirmado: `Olá ${nome}! Seu horário de *${servico}* está *CONFIRMADO* para ${data} às ${hora} ✅ Qualquer imprevisto é só avisar. Até lá!`,
    pago: `${nome}, obrigado(a) pela visita! ✦ Foi um prazer te atender. Quando quiser agendar novamente, é só chamar.`,
    cancelado: `Olá ${nome}, sobre seu horário de *${servico}* do dia ${data} às ${hora}: precisou ser cancelado. 🙏 Chama a gente para remarcar no melhor dia para você.`,
  }
  return msgs[app.status] || `Olá ${nome}!`
}

export default function AgendaPage() {
  const { studio, loading: loadingStudio } = useStudio()
  const supabase = createClient()
  const [day, setDay] = useState(new Date())
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [pagandoId, setPagandoId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<{ id: number; tipo: "ok" | "erro" | "aviso"; msg: string }[]>([])

  const toast = (tipo: "ok" | "erro" | "aviso", msg: string) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, tipo, msg }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }
  const [equipe, setEquipe] = useState<any[]>([])
  const [filtroProf, setFiltroProf] = useState<string>("todas")

  const dateStr = format(day, "yyyy-MM-dd")

  // navegação vinda do sino de novos agendamentos ("yyyy-MM-dd" → Date local)
  const irParaDia = (data: string) => {
    const [a, m, d] = data.split("-").map(Number)
    setDay(new Date(a, m - 1, d))
  }

  const fetchDay = useCallback(async () => {
    if (!studio) return
    setLoading(true)
    const { data } = await supabase
      .from("appointments")
      .select("id, start_time, end_time, status, price_at_time, professional_id, clients(name, phone), services(name), professionals(name)")
      .eq("studio_id", studio.id).eq("date", dateStr).order("start_time")
    setApps(data || [])
    setLoading(false)
  }, [supabase, dateStr, studio])

  useEffect(() => { fetchDay() }, [fetchDay])

  useEffect(() => {
    if (!studio) return
    supabase.from("professionals").select("id, name").eq("studio_id", studio.id).order("sort_order")
      .then(({ data }) => setEquipe(data || []))
  }, [studio]) // eslint-disable-line

  const MSG_STATUS: Record<string, string> = {
    confirmado: "Agendamento confirmado com sucesso! ✨",
    pago: "Status alterado para Pago. 💰",
    cancelado: "Agendamento cancelado — o horário já está livre na sua página.",
  }

  const setStatus = async (id: string, status: string) => {
    setUpdating(id)
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id)
    setUpdating(null)
    if (error) { toast("erro", "Erro ao processar sua ação. Tente novamente."); return }
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    toast(status === "cancelado" ? "aviso" : "ok", MSG_STATUS[status] || "Atualizado.")
  }

  const FORMAS_PG = [
    { key: "pix", label: "Pix" },
    { key: "cartao", label: "Cartão" },
    { key: "dinheiro", label: "Dinheiro" },
    { key: "outro", label: "Outro" },
  ]

  const marcarPago = async (id: string, metodo: string) => {
    setPagandoId(null)
    setUpdating(id)
    const { error } = await supabase.from("appointments").update({ status: "pago", payment_method: metodo }).eq("id", id)
    setUpdating(null)
    if (error) { toast("erro", "Erro ao processar sua ação. Tente novamente."); return }
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: "pago", payment_method: metodo } : a)))
    toast("ok", `Recebido: ${FORMAS_PG.find((f) => f.key === metodo)?.label} 💰`)
  }

  const liberarAgora = async (app: any) => {
    setUpdating(app.id)
    const n = new Date()
    const hhmmss = `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}:00`
    const { error } = await supabase.from("appointments").update({ end_time: hhmmss }).eq("id", app.id)
    setUpdating(null)
    if (error) { toast("erro", "Erro ao processar sua ação. Tente novamente."); return }
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, end_time: hhmmss } : a)))
    toast("ok", "Atendimento encerrado — horário liberado na agenda! ✂️")
  }

  const agoraHHMM = () => {
    const n = new Date()
    return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`
  }
  const emAndamento = (app: any) => {
    if (dateStr !== format(new Date(), "yyyy-MM-dd")) return false
    if (!["pendente", "confirmado", "pago"].includes(app.status)) return false
    const n = agoraHHMM()
    return app.start_time?.substring(0, 5) <= n && n < app.end_time?.substring(0, 5)
  }

  const appsVisiveis = filtroProf === "todas" ? apps : apps.filter((a) => a.professional_id === filtroProf)
  const receitaDia = appsVisiveis.filter((a) => a.status === "pago").reduce((acc, a) => acc + (a.price_at_time || 0), 0)

  if (loadingStudio)
    return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      {/* toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-2xl px-4 py-3 text-sm font-medium shadow-xl border flex items-start gap-2 animate-[slidein_.25s_ease]",
              t.tipo === "ok" && "bg-emerald-600 border-emerald-700 text-white",
              t.tipo === "erro" && "bg-red-600 border-red-700 text-white",
              t.tipo === "aviso" && "bg-amber-100 border-amber-300 text-amber-900",
            )}
          >
            <span className="mt-0.5">{t.tipo === "ok" ? "✓" : t.tipo === "erro" ? "✕" : "!"}</span>
            <span className="flex-1">{t.msg}</span>
            <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} className="opacity-60 hover:opacity-100">✕</button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-serif font-bold">Agenda</h1>
          <p className="text-sm text-navy/60 mt-1">Gerencie os agendamentos do dia.</p>
        </div>
        <div className="flex items-center gap-3 ml-auto relative">
          <NovosAgendamentos onIrParaDia={irParaDia} />
          <div className="bg-white rounded-2xl px-4 py-2 border border-gold/15 text-right">
            <p className="text-[10px] font-medium text-navy/60 tracking-wider uppercase">Recebido no dia</p>
            <p className="text-lg font-bold">{brl(receitaDia)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gold/15 flex items-center justify-between">
        <button onClick={() => setDay((d) => addDays(d, -1))} className="p-2 rounded-full hover:bg-cream" aria-label="Dia anterior">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="font-serif text-lg font-semibold capitalize">{format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
          <button onClick={() => setDay(new Date())} className="text-xs font-medium text-gold hover:underline inline-flex items-center gap-1">
            <CalendarDays className="w-3 h-3" /> Ir para hoje
          </button>
        </div>
        <button onClick={() => setDay((d) => addDays(d, 1))} className="p-2 rounded-full hover:bg-cream" aria-label="Próximo dia">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {equipe.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFiltroProf("todas")} className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border", filtroProf === "todas" ? "bg-navy text-white border-navy" : "bg-white border-navy/10")}>
            Todas
          </button>
          {equipe.map((pr) => (
            <button key={pr.id} onClick={() => setFiltroProf(pr.id)} className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border", filtroProf === pr.id ? "bg-navy text-white border-navy" : "bg-white border-navy/10")}>
              {pr.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center h-32 items-center"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>
      ) : appsVisiveis.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-gold/15 text-center text-navy/50">Nenhum agendamento neste dia.</div>
      ) : (
        <div className="space-y-3">
          {appsVisiveis.map((app) => (
            <div key={app.id} className="bg-white rounded-2xl p-4 border border-gold/15">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="text-center min-w-[64px] bg-cream rounded-xl px-2 py-2">
                    <p className="text-sm font-bold">{app.start_time?.substring(0, 5)}</p>
                    <p className="text-[10px] text-navy/50">{app.end_time?.substring(0, 5)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{app.clients?.name || "Cliente"}</p>
                    <p className="text-xs text-navy/60 truncate">
                      {app.services?.name}
                      {app.professionals?.name && <span className="text-gold font-semibold"> • {app.professionals.name.split(" ")[0]}</span>}
                    </p>
                    {app.clients?.phone && (
                      <a
                        href={`https://wa.me/${String(app.clients.phone).replace(/\D/g, "")}?text=${encodeURIComponent(mensagemWhats(app, day))}`}
                        target="_blank" rel="noreferrer"
                        className="text-xs text-[#128C4A] font-semibold hover:underline"
                      >
                        💬 Mensagem de {app.status === "pendente" ? "recebido" : app.status === "confirmado" ? "confirmação" : app.status === "pago" ? "agradecimento" : "cancelamento"}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{brl(app.price_at_time)}</span>
                  <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", statusColors[app.status])}>{app.status}</span>
                </div>
              </div>

              {app.status !== "cancelado" && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gold/10">
                  {updating === app.id ? (
                    <span className="text-xs text-navy/60 inline-flex items-center gap-1 py-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Atualizando...
                    </span>
                  ) : (
                    <>
                      {app.status === "pendente" && (
                        <button onClick={() => setStatus(app.id, "confirmado")} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-600 text-white inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Confirmar
                        </button>
                      )}
                      {(app.status === "pendente" || app.status === "confirmado") && (
                        pagandoId === app.id ? (
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-navy/60 font-semibold">Recebido no:</span>
                            {FORMAS_PG.map((f) => (
                              <button key={f.key} onClick={() => marcarPago(app.id, f.key)} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-navy text-white">
                                {f.label}
                              </button>
                            ))}
                            <button onClick={() => setPagandoId(null)} aria-label="Fechar" className="text-xs px-2.5 py-1.5 rounded-full border border-navy/10 text-navy/60">✕</button>
                          </span>
                        ) : (
                          <button onClick={() => setPagandoId(app.id)} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-navy text-white inline-flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" /> Marcar pago
                          </button>
                        )
                      )}
                      <button onClick={() => setStatus(app.id, "cancelado")} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-red-200 text-red-600 inline-flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> Cancelar
                      </button>
                      {emAndamento(app) && (
                        <button onClick={() => liberarAgora(app)} className="text-xs font-semibold px-3 py-1.5 rounded-full gold-gradient text-navy inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Encerrar agora (libera a agenda)
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-navy/50 text-center">Cancelar um agendamento libera o horário automaticamente na sua página.</p>
    </div>
  )
}
