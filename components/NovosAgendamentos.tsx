"use client"

import { createClient } from "@/lib/supabase"
import { useStudio } from "@/lib/useStudio"
import { useCallback, useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { Bell, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Sino de novos agendamentos — rede de segurança do painel.
 * Mostra tudo que foi agendado desde a última vez que você "marcou como visto",
 * independente do dia selecionado na Agenda. Atualiza em tempo real.
 *
 * Uso: <NovosAgendamentos onIrParaDia={(date) => setDiaSelecionado(date)} />
 * (a prop onIrParaDia é opcional — sem ela, o botão "Ver dia" não aparece)
 */
export default function NovosAgendamentos({ onIrParaDia }: { onIrParaDia?: (date: string) => void }) {
  const { studio } = useStudio()
  const supabase = createClient()
  const [itens, setItens] = useState<any[]>([])
  const [aberto, setAberto] = useState(false)
  const [ultimaVisita, setUltimaVisita] = useState<string | null>(null)
  const painelRef = useRef<HTMLDivElement>(null)

  const chave = studio ? `sig-agenda-visto:${studio.id}` : null

  useEffect(() => {
    if (chave) setUltimaVisita(localStorage.getItem(chave))
  }, [chave])

  const fetchItens = useCallback(async () => {
    if (!studio) return
    const hoje = format(new Date(), "yyyy-MM-dd")
    const { data } = await supabase
      .from("appointments")
      .select("id, date, start_time, created_at, status, clients(name), services(name), professionals(name)")
      .eq("studio_id", studio.id)
      .gte("date", hoje)
      .neq("status", "cancelado")
      .order("created_at", { ascending: false })
      .limit(30)
    setItens(data || [])
  }, [supabase, studio])

  useEffect(() => { fetchItens() }, [fetchItens])

  // tempo real: agendamento novo aparece na hora, sem recarregar a página
  useEffect(() => {
    if (!studio) return
    const canal = supabase
      .channel(`novos-agendamentos-${studio.id}`)
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

  // "novo" = criado depois da última visita (registros antigos sem created_at contam como já vistos)
  const novos = itens.filter((i) => i.created_at && (!ultimaVisita || i.created_at > ultimaVisita))

  const marcarVisto = () => {
    if (!chave) return
    const agora = new Date().toISOString()
    localStorage.setItem(chave, agora)
    setUltimaVisita(agora)
  }

  const fmtDia = (d: string) => { const [, m, dia] = d.split("-"); return `${dia}/${m}` }
  const fmtHora = (h?: string) => (h || "").slice(0, 5)
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
  const ehHoje = (d: string) => d === format(new Date(), "yyyy-MM-dd")

  const lista = novos.length > 0 ? novos : itens.slice(0, 5)

  return (
    <div className="relative" ref={painelRef}>
      {/* sino */}
      <button
        onClick={() => setAberto((v) => !v)}
        aria-label="Novos agendamentos"
        className={cn(
          "relative w-11 h-11 rounded-full border flex items-center justify-center transition-all",
          novos.length > 0
            ? "bg-[#1A2530] text-white border-[#1A2530] shadow-[0_6px_18px_rgba(26,37,48,0.25)]"
            : "bg-white text-[#1A2530] border-[#F0E6D8] hover:border-[#1A2530]/25",
        )}
      >
        <Bell className="w-[18px] h-[18px]" />
        {novos.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[#FF8A2B] text-white text-[11px] font-semibold flex items-center justify-center border-2 border-[#FDF6EE]">
            {novos.length > 9 ? "9+" : novos.length}
          </span>
        )}
      </button>

      {/* painel */}
      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-[18px] shadow-[0_16px_48px_rgba(26,37,48,0.16)] border border-[#F0E6D8] overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F6EFE6] bg-[#FFFEFB]">
            <p className="text-[13px] font-semibold">
              {novos.length > 0
                ? `${novos.length} novo${novos.length === 1 ? "" : "s"} agendamento${novos.length === 1 ? "" : "s"}`
                : "Próximos agendamentos"}
            </p>
            {novos.length > 0 && (
              <button onClick={marcarVisto} className="flex items-center gap-1 text-[11px] font-medium text-[#6B7280] hover:text-[#1A2530]">
                <CheckCheck className="w-3.5 h-3.5" /> Marcar visto
              </button>
            )}
          </div>

          {lista.length === 0 ? (
            <p className="px-4 py-6 text-[12px] text-[#9A9590] text-center">Nenhum agendamento futuro por enquanto.</p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto divide-y divide-[#F7F0E7]">
              {lista.map((i) => {
                const eNovo = novos.some((n) => n.id === i.id)
                return (
                  <div key={i.id} className={cn("px-4 py-3 flex items-center gap-3", eNovo && "bg-[#FFF9F0]")}>
                    <div className="w-10 h-10 rounded-[10px] bg-[#FDF6EE] border border-[#F3E8D6] flex flex-col items-center justify-center leading-none shrink-0">
                      <span className="text-[12px] font-semibold">{ehHoje(i.date) ? "Hoje" : fmtDia(i.date)}</span>
                      <span className="text-[9px] text-[#A8A29E] mt-0.5">{fmtHora(i.start_time)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium truncate">
                        {i.clients?.name || "Cliente"}
                        {eNovo && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-[#FF8A2B] align-middle" />}
                      </p>
                      <p className="text-[11px] text-[#8A8A8A] truncate">
                        {i.services?.name || "Serviço"}
                        {i.professionals?.name ? ` • ${i.professionals.name.split(" ")[0]}` : ""}
                        {i.created_at ? ` • ${criadoHa(i.created_at)}` : ""}
                      </p>
                    </div>
                    {onIrParaDia && (
                      <button
                        onClick={() => { onIrParaDia(i.date); setAberto(false) }}
                        className="text-[11px] font-medium bg-[#1A2530] text-white rounded-full px-3 py-1.5 shrink-0 hover:bg-black transition-colors"
                      >
                        Ver dia
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
