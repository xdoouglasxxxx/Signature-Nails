"use client"

import { createClient } from "@/lib/supabase"
import { useStudio } from "@/lib/useStudio"
import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { format, startOfMonth, endOfMonth } from "date-fns"
import {
  ArrowLeft, CalendarDays, Wallet, Scissors, Sparkles,
  Users, Clock, TrendingUp, ChevronRight,
} from "lucide-react"
import { brl, cn } from "@/lib/utils"

const CARD = "bg-[#131E2E]/70 border border-[#C9A96E]/10"
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

const statusChip: Record<string, string> = {
  pendente: "bg-amber-400/10 text-amber-300 border-amber-400/25",
  confirmado: "bg-emerald-400/10 text-emerald-300 border-emerald-400/25",
  pago: "bg-blue-400/10 text-blue-300 border-blue-400/25",
  cancelado: "bg-red-400/10 text-red-300 border-red-400/25",
  "no-show": "bg-slate-400/10 text-slate-300 border-slate-400/25",
}

export default function PerfilProfissionalPage() {
  const { studio, loading: loadingStudio } = useStudio()
  const params = useParams<{ id: string }>()
  const supabase = createClient()
  const [prof, setProf] = useState<any | null>(null)
  const [apps, setApps] = useState<any[]>([])
  const [servicos, setServicos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const hoje = format(new Date(), "yyyy-MM-dd")
  const iniMes = format(startOfMonth(new Date()), "yyyy-MM-dd")
  const fimMes = format(endOfMonth(new Date()), "yyyy-MM-dd")

  const fetchTudo = useCallback(async () => {
    if (!studio || !params?.id) return
    setLoading(true)
    const [{ data: pr }, { data: ags }] = await Promise.all([
      supabase.from("professionals")
        .select("id, name, commission_percent")
        .eq("studio_id", studio.id).eq("id", params.id).maybeSingle(),
      supabase.from("appointments")
        .select("id, date, start_time, end_time, status, price_at_time, commission_paid, clients(name, phone), services(name)")
        .eq("studio_id", studio.id).eq("professional_id", params.id)
        .order("date", { ascending: false }).order("start_time", { ascending: false })
        .limit(300),
    ])
    setProf(pr || null)
    setApps(ags || [])
    // serviços que o profissional realiza (se a tabela de vínculo existir)
    try {
      const { data: ps } = await supabase
        .from("professional_services")
        .select("services(name)")
        .eq("professional_id", params.id)
      setServicos((ps || []).map((x: any) => x.services?.name).filter(Boolean))
    } catch { setServicos([]) }
    setLoading(false)
  }, [supabase, studio, params?.id])

  useEffect(() => { fetchTudo() }, [fetchTudo])

  if (loadingStudio || loading)
    return (
      <div className="flex justify-center pt-24">
        <div className="w-8 h-8 border-4 border-[#C9A96E] border-t-transparent rounded-full animate-spin" />
      </div>
    )

  if (!prof)
    return (
      <div className={cn("rounded-2xl p-10 text-center", CARD)}>
        <p className="font-serif text-[22px] font-semibold text-[#F0EDE5]">Profissional não encontrado</p>
        <Link href="/painel/equipe" className="inline-flex items-center gap-1.5 mt-4 text-[13px] text-[#C9A96E] font-medium">
          <ArrowLeft className="w-4 h-4" /> Voltar para a Equipe
        </Link>
      </div>
    )

  // ---- cálculos ----
  const validos = apps.filter((a) => a.status !== "cancelado")
  const doMes = validos.filter((a) => a.date >= iniMes && a.date <= fimMes)
  const pagosMes = doMes.filter((a) => a.status === "pago")
  const fatMes = pagosMes.reduce((acc, a) => acc + (a.price_at_time || 0), 0)
  const pct = Number(prof.commission_percent || 0)
  const comissaoMes = fatMes * pct / 100
  const comissaoAPagar = pagosMes.filter((a) => !a.commission_paid).reduce((acc, a) => acc + (a.price_at_time || 0) * pct / 100, 0)
  const ticket = pagosMes.length > 0 ? fatMes / pagosMes.length : 0

  // duração média (min) dos atendimentos com horários válidos
  const minutos = (h?: string) => { if (!h) return null; const [hh, mm] = h.split(":").map(Number); return hh * 60 + mm }
  const duracoes = validos
    .map((a) => { const i = minutos(a.start_time), f = minutos(a.end_time); return i !== null && f !== null && f > i ? f - i : null })
    .filter((d): d is number => d !== null)
  const duracaoMedia = duracoes.length ? Math.round(duracoes.reduce((x, y) => x + y, 0) / duracoes.length) : null

  const proximos = validos.filter((a) => a.date >= hoje).sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time)).slice(0, 8)
  const historico = validos.filter((a) => a.date < hoje).slice(0, 10)

  // clientes atendidos (distintos, com contagem)
  const mapa = new Map<string, { nome: string; qtd: number; total: number }>()
  for (const a of validos) {
    const nome = a.clients?.name || "Cliente"
    const atual = mapa.get(nome) || { nome, qtd: 0, total: 0 }
    atual.qtd += 1
    if (a.status === "pago") atual.total += a.price_at_time || 0
    mapa.set(nome, atual)
  }
  const clientes = Array.from(mapa.values()).sort((a, b) => b.qtd - a.qtd).slice(0, 12)

  const iniciais = (nome?: string) => (nome || "—").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
  const fmtData = (d: string) => { const [, m, dia] = d.split("-"); return `${dia}/${m}` }
  const diaSemana = (d: string) => { const [a, m, dia] = d.split("-").map(Number); return DIAS[new Date(a, m - 1, dia).getDay()] }
  const fmtHora = (h?: string) => (h || "").slice(0, 5)
  const iconeServico = (nome?: string) => {
    const s = (nome || "").toLowerCase()
    if (s.includes("corte") || s.includes("barba")) return <Scissors className="w-3 h-3 text-[#C9A96E]" />
    return <Sparkles className="w-3 h-3 text-[#C9A96E]" />
  }

  const KPIS = [
    { icone: CalendarDays, rotulo: "Atendimentos no mês", valor: String(doMes.length), extra: `${pagosMes.length} pago${pagosMes.length === 1 ? "" : "s"}` },
    { icone: Wallet, rotulo: "Faturamento no mês", valor: brl(fatMes), extra: "só atendimentos pagos" },
    { icone: TrendingUp, rotulo: "Comissão no mês", valor: brl(comissaoMes), extra: comissaoAPagar > 0 ? `${brl(comissaoAPagar)} a pagar` : "tudo quitado ✓", destaque: comissaoAPagar > 0 },
    { icone: Clock, rotulo: "Ticket médio", valor: brl(ticket), extra: duracaoMedia ? `~${duracaoMedia} min por atendimento` : "por serviço" },
  ]

  return (
    <div className="text-[#F0EDE5] space-y-6">
      {/* voltar + cabeçalho */}
      <div>
        <Link href="/painel/equipe" className="inline-flex items-center gap-1.5 text-[12px] text-[#8896A8] hover:text-[#C9A96E] transition-colors font-medium mb-4">
          <ArrowLeft className="w-4 h-4" /> Equipe
        </Link>
        <div className={cn("rounded-2xl p-6 flex flex-col md:flex-row md:items-center gap-5", CARD)}>
          <div className="w-16 h-16 rounded-full bg-[#C9A96E] text-[#0A0F1A] flex items-center justify-center font-bold text-[20px] shrink-0 shadow-[0_4px_20px_rgba(201,169,110,0.3)]">
            {iniciais(prof.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-[30px] md:text-[36px] font-semibold leading-[1.05] text-[#F0EDE5]">{prof.name}</h1>
            <p className="text-[13px] text-[#8896A8] mt-1">
              Comissão de <strong className="text-[#E8C989]">{pct}%</strong> sobre cada atendimento
            </p>
            {servicos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {servicos.map((s) => (
                  <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-[#C9A96E]/10 text-[#E8C989] border border-[#C9A96E]/20">{s}</span>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/painel/financeiro"
            className="inline-flex items-center justify-center gap-1.5 bg-[#C9A96E] text-[#0A0F1A] rounded-full px-5 py-2.5 text-[12px] font-semibold hover:bg-[#D4B87A] transition-colors shrink-0"
          >
            Comissões e repasses <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPIs do mês */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {KPIS.map((k) => (
          <div key={k.rotulo} className={cn("rounded-2xl p-4 md:p-5", CARD)}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-[#C9A96E]/15 bg-[#C9A96E]/[0.07] mb-4">
              <k.icone className="w-4 h-4 text-[#C9A96E]" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#8896A8] font-semibold">{k.rotulo}</p>
            <p className="font-serif text-[24px] font-semibold leading-none mt-1.5 text-[#F0EDE5]">{k.valor}</p>
            <p className={cn("text-[11px] mt-1.5", k.destaque ? "text-[#E8C989] font-medium" : "text-[#64748B]")}>{k.extra}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* próximos agendamentos */}
        <div className={cn("rounded-2xl overflow-hidden", CARD)}>
          <div className="px-5 py-4 border-b border-[#C9A96E]/[0.08] flex items-center justify-between">
            <h2 className="font-serif text-[18px] font-semibold text-[#F0EDE5]">Próximos agendamentos</h2>
            <span className="text-[11px] text-[#64748B]">{proximos.length} agendado{proximos.length === 1 ? "" : "s"}</span>
          </div>
          {proximos.length === 0 ? (
            <p className="px-5 py-8 text-[12px] text-[#64748B] text-center">Nenhum agendamento futuro.</p>
          ) : (
            <div className="divide-y divide-[#C9A96E]/[0.06]">
              {proximos.map((a) => (
                <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0A0F1A] border border-[#C9A96E]/12 flex flex-col items-center justify-center leading-none shrink-0">
                    <span className="text-[11px] font-bold text-[#F0EDE5]">{a.date === hoje ? "Hoje" : fmtData(a.date)}</span>
                    <span className="text-[9px] text-[#8896A8] mt-0.5">{diaSemana(a.date)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate text-[#F0EDE5]">{a.clients?.name || "Cliente"}</p>
                    <p className="text-[11px] text-[#8896A8] truncate flex items-center gap-1">
                      {iconeServico(a.services?.name)} {a.services?.name} • {fmtHora(a.start_time)}
                    </p>
                  </div>
                  <span className={cn("text-[10px] font-medium px-2.5 py-1 rounded-full border shrink-0", statusChip[a.status] || statusChip.pendente)}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* clientes atendidos */}
        <div className={cn("rounded-2xl overflow-hidden", CARD)}>
          <div className="px-5 py-4 border-b border-[#C9A96E]/[0.08] flex items-center justify-between">
            <h2 className="font-serif text-[18px] font-semibold text-[#F0EDE5]">Clientes atendidos</h2>
            <span className="text-[11px] text-[#64748B] flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {mapa.size}</span>
          </div>
          {clientes.length === 0 ? (
            <p className="px-5 py-8 text-[12px] text-[#64748B] text-center">Ainda sem clientes atendidos.</p>
          ) : (
            <div className="divide-y divide-[#C9A96E]/[0.06]">
              {clientes.map((c) => (
                <div key={c.nome} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0A0F1A] border border-[#C9A96E]/20 flex items-center justify-center text-[10px] font-bold text-[#F0EDE5] shrink-0">
                    {iniciais(c.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate text-[#F0EDE5]">{c.nome}</p>
                    <p className="text-[11px] text-[#8896A8]">{c.qtd} atendimento{c.qtd === 1 ? "" : "s"}</p>
                  </div>
                  {c.total > 0 && <span className="text-[12px] font-semibold text-[#7FBF9D] shrink-0">{brl(c.total)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* histórico */}
      <div className={cn("rounded-2xl overflow-hidden", CARD)}>
        <div className="px-5 py-4 border-b border-[#C9A96E]/[0.08]">
          <h2 className="font-serif text-[18px] font-semibold text-[#F0EDE5]">Histórico recente</h2>
        </div>
        {historico.length === 0 ? (
          <p className="px-5 py-8 text-[12px] text-[#64748B] text-center">Sem atendimentos anteriores.</p>
        ) : (
          <div className="divide-y divide-[#C9A96E]/[0.06]">
            {historico.map((a) => {
              const com = (a.price_at_time || 0) * pct / 100
              return (
                <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0A0F1A] border border-[#C9A96E]/12 flex flex-col items-center justify-center leading-none shrink-0">
                    <span className="text-[11px] font-bold text-[#F0EDE5]">{fmtData(a.date)}</span>
                    <span className="text-[9px] text-[#8896A8] mt-0.5">{diaSemana(a.date)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate text-[#F0EDE5]">{a.clients?.name || "Cliente"}</p>
                    <p className="text-[11px] text-[#8896A8] truncate flex items-center gap-1">
                      {iconeServico(a.services?.name)} {a.services?.name} • {fmtHora(a.start_time)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-semibold text-[#F0EDE5]">{brl(a.price_at_time || 0)}</p>
                    {a.status === "pago" && <p className="text-[10px] text-[#E8C989]">comissão {brl(com)}</p>}
                  </div>
                  <span className={cn("text-[10px] font-medium px-2.5 py-1 rounded-full border shrink-0", statusChip[a.status] || statusChip.pendente)}>
                    {a.status}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#64748B]">
        Estatísticas do mês atual ({fmtData(iniMes)} — {fmtData(fimMes)}). Avaliações, horários de trabalho e folgas individuais entram na próxima fase.
      </p>
    </div>
  )
}
