"use client"

import { createClient } from "@/lib/supabase"
import { useStudio } from "@/lib/useStudio"
import { useCallback, useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Central de Notificações — Signature (Ouro Edition)
 *
 * Garante que nenhum agendamento passe despercebido, independente
 * do dia selecionado no calendário:
 *  • Badge persistente com a contagem de não lidos (some só quando
 *    o usuário marca como visto — estado salvo no BANCO, sincronizado
 *    entre todos os dispositivos do estúdio)
 *  • Histórico com filtros: Não lidas / Hoje / Próximos / Todas
 *  • Tempo real via Supabase Realtime (novo agendamento acende o
 *    sino na hora, sem recarregar)
 *  • Clique na notificação → navega para o dia + marca como lida
 *  • Data em destaque quando o agendamento é para outro dia
 *
 * Uso: <NovosAgendamentos onIrParaDia={(date) => setDay(...)} />
 */

const FILTROS = [
  { key: "nao-lidas", label: "Não lidas" },
  { key: "hoje", label: "Hoje" },
  { key: "proximos", label: "Próximos" },
  { key: "todas", label: "Todas" },
] as const

type FiltroKey = (typeof FILTROS)[number]["key"]

const DIAS_LONGO = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

export default function NovosAgendamentos({ onIrParaDia }: { onIrParaDia?: (date: string) => void }) {
  const { studio } = useStudio()
  const supabase = createClient()
  const [itens, setItens] = useState<any[]>([])
  const [aberto, setAberto] = useState(false)
  const [filtro, setFiltro] = useState<FiltroKey>("nao-lidas")
  const [marcando, setMarcando] = useState(false)
  const painelRef = useRef<HTMLDivElement>(null)

  const hoje = () => format(new Date(), "yyyy-MM-dd")

  const fetchItens = useCallback(async () => {
    if (!studio) return
    const { data } = await supabase
      .from("appointments")
      .select("id, date, start_time, created_at, notif_seen_at, status, clients(name), services(name), professionals(name)")
      .eq("studio_id", studio.id)
      .not("created_at", "is", null)
      .neq("status", "cancelado")
      .order("created_at", { ascending: false })
      .limit(50)
    setItens(data || [])
  }, [supabase, studio])

  useEffect(() => { fetchItens() }, [fetchItens])

  // tempo real: novo agendamento aparece na hora, sem recarregar
  useEffect(() => {
    if (!studio) return
    const canal = supabase
      .channel(`central-notif-${studio.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments", filter: `studio_id=eq.${studio.id}` },
        () => fetchItens(),
      )
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, studio, fetchItens])

  // fecha ao clicar fora
  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (painelRef.current && !painelRef.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener("mousedown", fora)
    return () => document.removeEventListener("mousedown", fora)
  }, [])

  const naoLidas = itens.filter((i) => !i.notif_seen_at)

  const visiveis = itens.filter((i) => {
    if (filtro === "nao-lidas") return !i.notif_seen_at
    if (filtro === "hoje") return i.date === hoje()
    if (filtro === "proximos") return i.date > hoje()
    return true
  })

  const marcarLida = async (item: any, navegar = false) => {
    if (navegar && onIrParaDia) { onIrParaDia(item.date); setAberto(false) }
    if (item.notif_seen_at) return
    const agora = new Date().toISOString()
    setItens((prev) => prev.map((x) => (x.id === item.id ? { ...x, notif_seen_at: agora } : x)))
    await supabase.from("appointments").update({ notif_seen_at: agora }).eq("id", item.id)
  }

  const marcarTodasLidas = async () => {
    if (naoLidas.length === 0 || marcando) return
    setMarcando(true)
    const agora = new Date().toISOString()
    const ids = naoLidas.map((i) => i.id)
    setItens((prev) => prev.map((x) => (ids.includes(x.id) ? { ...x, notif_seen_at: agora } : x)))
    await supabase.from("appointments").update({ notif_seen_at: agora }).in("id", ids)
    setMarcando(false)
  }

  // ----- helpers de exibição -----
  const fmtDia = (d: string) => { const [, m, dia] = d.split("-"); return `${dia}/${m}` }
  const fmtHora = (h?: string) => (h || "").slice(0, 5)
  const diaSemana = (d: string) => { const [a, m, dia] = d.split("-").map(Number); return DIAS_LONGO[new Date(a, m - 1, dia).getDay()] }
  const criadoHa = (c?: string) => {
    if (!c) return ""
    const min = Math.max(0, Math.floor((Date.now() - new Date(c).getTime()) / 60000))
    if (min < 1) return "agora"
    if (min < 60) return `há ${min} min`
    const h = Math.floor(min / 60)
    if (h < 24) return `há ${h}h`
    const d = Math.floor(h / 24)
    return `há ${d} dia${d === 1 ? "" : "s"}`
  }
  const rotuloData = (d: string) => {
    if (d === hoje()) return "Hoje"
    return `${diaSemana(d)}, ${fmtDia(d)}`
  }
  const ehOutroDia = (d: string) => d !== hoje()

  return (
    <div className="relative" ref={painelRef}>
      {/* sino */}
      <button
        onClick={() => setAberto((v) => !v)}
        aria-label="Central de notificações"
        className={cn(
          "relative w-11 h-11 rounded-full border flex items-center justify-center transition-all",
          naoLidas.length > 0
            ? "bg-[#C9A96E] text-[#0A0F1A] border-[#C9A96E] shadow-[0_4px_20px_rgba(201,169,110,0.35)]"
            : "bg-[#131E2E]/60 text-[#F0EDE5] border-[#C9A96E]/15 hover:border-[#C9A96E]/40",
        )}
      >
        <Bell className="w-[18px] h-[18px]" />
        {naoLidas.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[#0A0F1A] text-[#C9A96E] text-[11px] font-bold flex items-center justify-center border-2 border-[#C9A96E]">
            {naoLidas.length > 9 ? "9+" : naoLidas.length}
          </span>
        )}
      </button>

      {/* painel */}
      {aberto && (
        <div className="fixed sm:absolute left-3 right-3 top- sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w- sm:max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden z-[100] border border-[#C9A96E]/15 shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
          style={{ background: "rgba(19,30,46,0.97)", backdropFilter: "blur(16px)" }}>
          {/* topo */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#C9A96E]/10 bg-[#0E1622]/80">
            <p className="text-[13px] font-semibold text-[#F0EDE5]">
              Notificações
              {naoLidas.length > 0 && <span className="ml-2 text-[11px] font-bold text-[#C9A96E]">{naoLidas.length} nova{naoLidas.length === 1 ? "" : "s"}</span>}
            </p>
            {naoLidas.length > 0 && (
              <button onClick={marcarTodasLidas} disabled={marcando} className="flex items-center gap-1 text-[11px] font-medium text-[#8896A8] hover:text-[#C9A96E] transition-colors disabled:opacity-50">
                {marcando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                Marcar todas lidas
              </button>
            )}
          </div>

          {/* filtros */}
          <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-[#C9A96E]/[0.08] overflow-x-auto scrollbar-none">
            {FILTROS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all border",
                  filtro === f.key
                    ? "bg-[#C9A96E] text-[#0A0F1A] border-[#C9A96E] font-semibold"
                    : "bg-transparent text-[#8896A8] border-[#C9A96E]/12 hover:border-[#C9A96E]/30",
                )}
              >
                {f.label}
                {f.key === "nao-lidas" && naoLidas.length > 0 && ` (${naoLidas.length})`}
              </button>
            ))}
          </div>

          {/* lista */}
          {visiveis.length === 0 ? (
            <p className="px-4 py-8 text-[12px] text-[#64748B] text-center">
              {filtro === "nao-lidas" ? "Tudo lido por aqui ✓" : "Nenhum agendamento neste filtro."}
            </p>
          ) : (
            <div className="max-h-[340px] overflow-y-auto divide-y divide-[#C9A96E]/[0.06]">
              {visiveis.map((i) => {
                const nova = !i.notif_seen_at
                return (
                  <button
                    key={i.id}
                    onClick={() => marcarLida(i, true)}
                    className={cn(
                      "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors",
                      nova ? "bg-[#C9A96E]/[0.06] hover:bg-[#C9A96E]/[0.1]" : "hover:bg-white/[0.03]",
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex flex-col items-center justify-center leading-none shrink-0 border",
                      ehOutroDia(i.date)
                        ? "bg-[#C9A96E]/10 border-[#C9A96E]/30"
                        : "bg-[#0A0F1A] border-[#C9A96E]/12",
                    )}>
                      <span className={cn("text-[11px] font-bold", ehOutroDia(i.date) ? "text-[#E8C989]" : "text-[#F0EDE5]")}>
                        {i.date === hoje() ? "Hoje" : fmtDia(i.date)}
                      </span>
                      <span className="text-[9px] text-[#8896A8] mt-0.5">{fmtHora(i.start_time)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium truncate text-[#F0EDE5]">
                        {i.clients?.name || "Cliente"}
                        {nova && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-[#C9A96E] align-middle shadow-[0_0_8px_rgba(201,169,110,0.6)]" />}
                      </p>
                      <p className="text-[11px] text-[#8896A8] truncate">
                        {i.services?.name || "Serviço"}
                        {i.professionals?.name ? ` • ${i.professionals.name.split(" ")[0]}` : ""}
                      </p>
                      <p className={cn("text-[10px] mt-0.5 truncate", ehOutroDia(i.date) ? "text-[#E8C989] font-medium" : "text-[#64748B]")}>
                        {rotuloData(i.date)} às {fmtHora(i.start_time)}
                        {i.created_at ? ` • recebido ${criadoHa(i.created_at)}` : ""}
                      </p>
                    </div>
                    {onIrParaDia && (
                      <span className="text-[10px] font-semibold text-[#C9A96E] shrink-0">Ver dia →</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          <div className="px-4 py-2.5 bg-[#0E1622]/80 border-t border-[#C9A96E]/[0.08] text-[10px] text-[#64748B] text-center">
            Toque em uma notificação para abrir o dia na agenda • lida sincroniza em todos os aparelhos
          </div>
        </div>
      )}
    </div>
  )
}
