"use client"

import { createClient } from "@/lib/supabase"
import { useStudio } from "@/lib/useStudio"
import { useCallback, useEffect, useState } from "react"
import { format, startOfMonth, endOfMonth, subMonths, subDays } from "date-fns"
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, Loader2, Check,
  CalendarDays, Download, Scissors, Sparkles,
} from "lucide-react"
import { brl, cn } from "@/lib/utils"

const PERIODOS = [
  { key: "mes", label: "Este mês" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "mes-passado", label: "Mês passado" },
]

const STATUS_COMISSAO = [
  { key: "todos", label: "Todos" },
  { key: "a-pagar", label: "A pagar" },
  { key: "pago", label: "Pagas" },
]

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export default function FinanceiroPage() {
  const { studio, loading: loadingStudio } = useStudio()
  const supabase = createClient()
  const [linhas, setLinhas] = useState<any[]>([])
  const [equipe, setEquipe] = useState<any[]>([])
  const [fatAnterior, setFatAnterior] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState("mes")
  const [profFiltro, setProfFiltro] = useState("todos")
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [quitando, setQuitando] = useState<string | null>(null) // "todas" | id do profissional
  const [msg, setMsg] = useState("")

  // ----- períodos -----
  const range = (p = periodo) => {
    const hoje = new Date()
    if (p === "7d") return { ini: format(subDays(hoje, 6), "yyyy-MM-dd"), fim: format(hoje, "yyyy-MM-dd") }
    if (p === "mes-passado") {
      const m = subMonths(hoje, 1)
      return { ini: format(startOfMonth(m), "yyyy-MM-dd"), fim: format(endOfMonth(m), "yyyy-MM-dd") }
    }
    return { ini: format(startOfMonth(hoje), "yyyy-MM-dd"), fim: format(endOfMonth(hoje), "yyyy-MM-dd") }
  }

  // período equivalente anterior, para o comparativo do faturamento
  const rangeAnterior = () => {
    const hoje = new Date()
    if (periodo === "7d") return { ini: format(subDays(hoje, 13), "yyyy-MM-dd"), fim: format(subDays(hoje, 7), "yyyy-MM-dd") }
    const m = subMonths(hoje, periodo === "mes-passado" ? 2 : 1)
    return { ini: format(startOfMonth(m), "yyyy-MM-dd"), fim: format(endOfMonth(m), "yyyy-MM-dd") }
  }

  const fetchDados = useCallback(async () => {
    if (!studio) return
    setLoading(true)
    const { ini, fim } = range()
    const ant = rangeAnterior()
    const [{ data: apps }, { data: profs }, { data: appsAnt }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, date, price_at_time, commission_paid, professional_id, clients(name), services(name), professionals(name, commission_percent)")
        .eq("studio_id", studio.id)
        .eq("status", "pago")
        .gte("date", ini)
        .lte("date", fim)
        .order("date", { ascending: false })
        .order("start_time", { ascending: false }),
      supabase.from("professionals").select("id, name, commission_percent").eq("studio_id", studio.id).order("sort_order"),
      supabase
        .from("appointments")
        .select("price_at_time")
        .eq("studio_id", studio.id)
        .eq("status", "pago")
        .gte("date", ant.ini)
        .lte("date", ant.fim),
    ])
    setLinhas(apps || [])
    setEquipe(profs || [])
    setFatAnterior((appsAnt || []).reduce((acc, a) => acc + (a.price_at_time || 0), 0))
    setLoading(false)
  }, [supabase, studio, periodo]) // eslint-disable-line

  useEffect(() => { fetchDados() }, [fetchDados])

  // ----- cálculos -----
  const comissaoDe = (l: any) => {
    const pct = Number(l.professionals?.commission_percent || 0)
    return (l.price_at_time || 0) * pct / 100
  }

  const visiveis = linhas.filter((l) => {
    if (profFiltro !== "todos" && l.professional_id !== profFiltro) return false
    if (statusFiltro === "a-pagar" && (l.commission_paid || comissaoDe(l) === 0)) return false
    if (statusFiltro === "pago" && !l.commission_paid) return false
    return true
  })

  const faturamento = visiveis.reduce((acc, l) => acc + (l.price_at_time || 0), 0)
  const comissoesTotal = visiveis.reduce((acc, l) => acc + comissaoDe(l), 0)
  const pendentes = visiveis.filter((l) => !l.commission_paid && comissaoDe(l) > 0)
  const comissoesAPagar = pendentes.reduce((acc, l) => acc + comissaoDe(l), 0)
  const lucro = faturamento - comissoesTotal
  const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0

  // comparativo: período inteiro (sem filtros de prof/status) vs período anterior equivalente
  const fatPeriodoCheio = linhas.reduce((acc, l) => acc + (l.price_at_time || 0), 0)
  const delta = fatAnterior && fatAnterior > 0 ? ((fatPeriodoCheio - fatAnterior) / fatAnterior) * 100 : null

  // resumo por profissional (respeita só o período, não os filtros)
  const porProf = equipe
    .map((pr) => {
      const doProf = linhas.filter((l) => l.professional_id === pr.id)
      const fat = doProf.reduce((acc, l) => acc + (l.price_at_time || 0), 0)
      const com = doProf.reduce((acc, l) => acc + comissaoDe(l), 0)
      const aPagar = doProf.filter((l) => !l.commission_paid).reduce((acc, l) => acc + comissaoDe(l), 0)
      return {
        ...pr,
        servicos: doProf.length,
        faturamento: fat,
        comissao: com,
        aPagar,
        ticket: doProf.length > 0 ? fat / doProf.length : 0,
        idsPendentes: doProf.filter((l) => !l.commission_paid && comissaoDe(l) > 0).map((l) => l.id),
      }
    })
    .filter((pr) => pr.servicos > 0)

  // ----- ações -----
  const notificar = (texto: string) => { setMsg(texto); setTimeout(() => setMsg(""), 4000) }

  const quitarIds = async (ids: string[], chave: string, rotulo: string) => {
    if (ids.length === 0) return
    setQuitando(chave)
    const { error } = await supabase.from("appointments").update({ commission_paid: true }).in("id", ids)
    setQuitando(null)
    if (error) { notificar("Não foi possível quitar. Tente novamente."); return }
    setLinhas((prev) => prev.map((l) => (ids.includes(l.id) ? { ...l, commission_paid: true } : l)))
    notificar(rotulo)
  }

  const quitarExibidas = () =>
    quitarIds(pendentes.map((l) => l.id), "todas", `${pendentes.length} comissão${pendentes.length === 1 ? "" : "s"} marcada${pendentes.length === 1 ? "" : "s"} como paga${pendentes.length === 1 ? "" : "s"} ✓`)

  const quitarDoProf = (pr: any) =>
    quitarIds(pr.idsPendentes, pr.id, `Comissões de ${pr.name.split(" ")[0]} quitadas • ${brl(pr.aPagar)} ✓`)

  const toggleLinha = async (l: any) => {
    const { error } = await supabase.from("appointments").update({ commission_paid: !l.commission_paid }).eq("id", l.id)
    if (!error) setLinhas((prev) => prev.map((x) => (x.id === l.id ? { ...x, commission_paid: !l.commission_paid } : x)))
  }

  const exportarCSV = () => {
    const cab = ["Data", "Cliente", "Serviço", "Profissional", "Valor", "% Comissão", "Comissão", "Lucro", "Status comissão"]
    const num = (v: number) => v.toFixed(2).replace(".", ",")
    const rows = visiveis.map((l) => {
      const com = comissaoDe(l)
      return [
        l.date, l.clients?.name || "-", l.services?.name || "-", l.professionals?.name || "-",
        num(l.price_at_time || 0), Number(l.professionals?.commission_percent || 0), num(com),
        num((l.price_at_time || 0) - com), com > 0 ? (l.commission_paid ? "Paga" : "A pagar") : "-",
      ].join(";")
    })
    const blob = new Blob(["\uFEFF" + [cab.join(";"), ...rows].join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `financeiro-${range().ini}-a-${range().fim}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ----- helpers de exibição -----
  const fmtData = (d: string) => { const [, m, dia] = d.split("-"); return `${dia}/${m}` }
  const diaSemana = (d: string) => { const [a, m, dia] = d.split("-").map(Number); return DIAS[new Date(a, m - 1, dia).getDay()] }
  const iniciais = (nome?: string) => (nome || "—").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
  const primeiroNome = (nome?: string) => (nome || "—").split(" ")[0]
  const iconeServico = (nome?: string) => {
    const s = (nome || "").toLowerCase()
    if (s.includes("corte") || s.includes("barba")) return <Scissors className="w-3 h-3" />
    return <Sparkles className="w-3 h-3" />
  }
  const rotuloPeriodo = PERIODOS.find((pp) => pp.key === periodo)?.label

  if (loadingStudio || loading)
    return (
      <div className="flex justify-center pt-24">
        <div className="w-8 h-8 border-4 border-[#1A2530] border-t-transparent rounded-full animate-spin" />
      </div>
    )

  return (
    <div className="text-[#1A2530]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
        .font-serif-display { font-family: "Instrument Serif", Georgia, serif; }
      `}</style>

      {/* cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif-display text-[42px] md:text-[54px] leading-[0.9] tracking-[-0.02em]">Financeiro</h1>
          <p className="mt-3 text-[15px] text-[#8A8A8A]">Controle de comissões e faturamento — só atendimentos pagos entram na conta.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[13px] text-[#8A8A8A] bg-white rounded-full px-4 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-[#F2E8D8]">
          <CalendarDays className="w-4 h-4" />
          <span>{fmtData(range().ini)} — {fmtData(range().fim)}</span>
          <span className="w-1 h-1 rounded-full bg-[#D9CFC1] mx-1" />
          <span className="text-[#1A2530] font-medium">{studio?.name}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-8">
        {/* faturamento */}
        <div className="bg-white rounded-[22px] p-6 md:p-7 shadow-[0_10px_30px_rgba(26,37,48,0.05)] border border-white">
          <div className="flex items-start justify-between mb-8">
            <div className="w-10 h-10 rounded-full bg-[#FDF6EE] flex items-center justify-center border border-[#F3E8D6]">
              <Wallet className="w-[18px] h-[18px]" />
            </div>
            {delta !== null && (
              <div className={cn(
                "flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full",
                delta >= 0 ? "bg-[#ECFDF5] text-[#065F46]" : "bg-[#FFF1E0] text-[#C76A15]",
              )}>
                {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {delta >= 0 ? "+" : ""}{delta.toFixed(0)}% vs anterior
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#A8A29E] font-medium">Faturamento no período</p>
            <p className="font-serif-display text-[36px] leading-none tracking-[-0.02em]">{brl(faturamento)}</p>
            <p className="text-[13px] text-[#9A9590] pt-1">{visiveis.length} serviço{visiveis.length === 1 ? "" : "s"} realizado{visiveis.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        {/* comissões a pagar */}
        <div className="bg-white rounded-[22px] p-6 md:p-7 shadow-[0_10px_30px_rgba(26,37,48,0.05)] border border-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-[#FFF1E0] rounded-full -translate-y-8 translate-x-8 opacity-80" />
          <div className="flex items-start justify-between mb-8 relative">
            <div className="w-10 h-10 rounded-full bg-[#FFF4E6] flex items-center justify-center border border-[#FFE6C7]">
              <div className={cn("w-2 h-2 rounded-full", pendentes.length > 0 ? "bg-[#FF8A2B] shadow-[0_0_0_4px_rgba(255,138,43,0.15)]" : "bg-[#10B981]")} />
            </div>
            {pendentes.length > 0 && (
              <span className="text-[11px] font-medium bg-[#FFF1E0] text-[#C76A15] px-2.5 py-1 rounded-full">
                {pendentes.length} pendente{pendentes.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="space-y-1 relative">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#A8A29E] font-medium">Comissões a pagar</p>
            <p className="font-serif-display text-[36px] leading-none tracking-[-0.02em]">{brl(comissoesAPagar)}</p>
            <p className={cn("text-[13px] pt-1 font-medium", pendentes.length > 0 ? "text-[#E08A3A]" : "text-[#6B9F82]")}>
              {pendentes.length > 0 ? `de ${brl(comissoesTotal)} geradas no período` : "Tudo quitado ✓"}
            </p>
          </div>
        </div>

        {/* lucro */}
        <div className="bg-[#1A2530] rounded-[22px] p-6 md:p-7 shadow-[0_12px_32px_rgba(26,37,48,0.18)] relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-[160px] h-[160px] bg-[#223242] rounded-full opacity-60" />
          <div className="flex items-start justify-between mb-8 relative">
            <div className="w-10 h-10 rounded-full bg-[#233140] flex items-center justify-center border border-[#2A3B4F]">
              <PiggyBank className="w-[18px] h-[18px] text-[#A7F3D0]" />
            </div>
            <span className="text-[11px] font-medium bg-[#233140] text-[#A7F3D0] px-2.5 py-1 rounded-full border border-[#2A3B4F]">Lucro líquido</span>
          </div>
          <div className="space-y-1 relative">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8CA0B3] font-medium">Lucro do espaço</p>
            <p className="font-serif-display text-[36px] leading-none tracking-[-0.02em] text-white">{brl(lucro)}</p>
            <p className="text-[13px] text-[#7FBF9D] pt-1">{margem.toFixed(1).replace(".", ",")}% do faturamento</p>
          </div>
        </div>
      </div>

      {/* filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 max-w-full">
          {PERIODOS.map((pp) => (
            <button
              key={pp.key}
              onClick={() => setPeriodo(pp.key)}
              className={cn(
                "whitespace-nowrap px-5 py-2.5 rounded-full text-[13px] font-medium transition-all border shrink-0",
                periodo === pp.key
                  ? "bg-[#1A2530] text-white border-[#1A2530] shadow-[0_6px_18px_rgba(26,37,48,0.18)]"
                  : "bg-white text-[#6B7280] border-[#F0E6D8] hover:border-[#1A2530]/20",
              )}
            >
              {pp.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_COMISSAO.map((st) => (
            <button
              key={st.key}
              onClick={() => setStatusFiltro(st.key)}
              className={cn(
                "px-4 py-2 rounded-full text-[12px] font-medium transition-all border",
                statusFiltro === st.key
                  ? "bg-[#1A2530] text-white border-[#1A2530]"
                  : "bg-white text-[#6B7280] border-[#F0E6D8] hover:border-[#1A2530]/20",
              )}
            >
              {st.label}
            </button>
          ))}
          <button
            onClick={exportarCSV}
            disabled={visiveis.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium border bg-white text-[#1A2530] border-[#F0E6D8] hover:border-[#1A2530]/30 disabled:opacity-40 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* filtro por profissional */}
      {equipe.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <button
            onClick={() => setProfFiltro("todos")}
            className={cn(
              "px-4 py-2 rounded-full text-[12px] font-medium border transition-all",
              profFiltro === "todos" ? "bg-[#FFF4E6] border-[#FFE6C7] text-[#C76A15]" : "bg-white text-[#6B7280] border-[#F0E6D8]",
            )}
          >
            Toda a equipe
          </button>
          {equipe.map((pr) => (
            <button
              key={pr.id}
              onClick={() => setProfFiltro(pr.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-all",
                profFiltro === pr.id ? "bg-[#FFF4E6] border-[#FFE6C7] text-[#C76A15]" : "bg-white text-[#6B7280] border-[#F0E6D8]",
              )}
            >
              <span className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold",
                profFiltro === pr.id ? "bg-[#1A2530] text-white" : "bg-[#FDF6EE] text-[#1A2530] border border-[#F3E8D6]",
              )}>
                {iniciais(pr.name)}
              </span>
              {primeiroNome(pr.name)}
            </button>
          ))}
        </div>
      )}

      {/* linha de contexto + quitação em lote */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <p className="flex items-center gap-2 text-[12px] text-[#A8A29E]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1A2530] inline-block" />
          Mostrando: <strong className="text-[#1A2530] font-medium">{rotuloPeriodo}</strong>
          {profFiltro !== "todos" && <> • {primeiroNome(equipe.find((e) => e.id === profFiltro)?.name)}</>}
          {statusFiltro !== "todos" && <> • {STATUS_COMISSAO.find((s) => s.key === statusFiltro)?.label}</>}
        </p>
        {comissoesAPagar > 0 && (
          <button
            onClick={quitarExibidas}
            disabled={quitando !== null}
            className="inline-flex items-center justify-center gap-1.5 bg-[#1A2530] text-white rounded-full px-5 py-2.5 text-[12px] font-medium hover:bg-black transition-colors shadow-[0_6px_18px_rgba(26,37,48,0.18)] disabled:opacity-60"
          >
            {quitando === "todas" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Quitar comissões exibidas ({brl(comissoesAPagar)})
          </button>
        )}
      </div>

      {/* tabela / cards */}
      {visiveis.length === 0 ? (
        <div className="bg-white rounded-[22px] p-10 border border-white shadow-[0_10px_30px_rgba(26,37,48,0.05)] text-center">
          <p className="font-serif-display text-[22px]">Nada por aqui ainda</p>
          <p className="text-[13px] text-[#9A9590] mt-1">Nenhum atendimento pago no período e filtros escolhidos.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[22px] shadow-[0_10px_40px_rgba(26,37,48,0.06)] border border-white overflow-hidden">
          {/* cabeçalho desktop */}
          <div className="hidden lg:grid grid-cols-[64px_1fr_1fr_150px_90px_100px_100px_150px] gap-2 px-7 py-4 border-b border-[#F6EFE6] bg-[#FFFEFB]">
            {["Data", "Cliente", "Serviço", "Profissional", "Valor", "Comissão", "Lucro", "Status"].map((h, i) => (
              <span key={h} className={cn("text-[11px] uppercase tracking-[0.12em] text-[#B8B0A6] font-medium", i >= 4 && i <= 6 && "text-right", i === 7 && "text-right pr-2")}>{h}</span>
            ))}
          </div>

          <div className="divide-y divide-[#F7F0E7]">
            {visiveis.map((l) => {
              const com = comissaoDe(l)
              return (
                <div key={l.id} className="group px-4 md:px-7 py-4 lg:py-[14px] hover:bg-[#FFFEFB] transition-colors">
                  {/* mobile */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-[12px] bg-[#FDF6EE] border border-[#F3E8D6] flex flex-col items-center justify-center leading-none">
                          <span className="text-[13px] font-semibold">{fmtData(l.date).split("/")[0]}</span>
                          <span className="text-[9px] text-[#A8A29E] uppercase mt-0.5">{diaSemana(l.date)}</span>
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold leading-tight">{l.clients?.name || "—"}</p>
                          <p className="text-[12px] text-[#8A8A8A] flex items-center gap-1 mt-0.5">
                            {iconeServico(l.services?.name)} {l.services?.name || "—"}
                          </p>
                        </div>
                      </div>
                      {com > 0 && (
                        <span className={cn(
                          "text-[11px] font-medium px-2.5 py-1 rounded-full border",
                          l.commission_paid ? "bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]" : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]",
                        )}>
                          {l.commission_paid ? "Paga" : "A pagar"}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[12px]">
                      {[
                        ["Valor", brl(l.price_at_time || 0)],
                        ["Comissão", com > 0 ? brl(com) : "—"],
                        ["Lucro", brl((l.price_at_time || 0) - com)],
                      ].map(([rot, val]) => (
                        <div key={rot as string} className="bg-[#FDF8F2] border border-[#F6EFE6] rounded-[12px] px-3 py-2.5">
                          <p className="text-[10px] uppercase tracking-widest text-[#B8B0A6]">{rot}</p>
                          <p className="font-semibold mt-0.5">{val}</p>
                        </div>
                      ))}
                    </div>

                    {l.professionals?.name && (
                      <div className="flex items-center justify-between bg-[#FDF8F2] rounded-[14px] px-4 py-2.5 border border-[#F6EFE6]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#1A2530] text-white flex items-center justify-center text-[10px] font-medium">{iniciais(l.professionals.name)}</div>
                          <p className="text-[13px] font-medium">{primeiroNome(l.professionals.name)} <span className="text-[#8A8A8A]">• {Number(l.professionals.commission_percent)}%</span></p>
                        </div>
                        {com > 0 && (
                          <button onClick={() => toggleLinha(l)} className="text-[12px] font-medium text-[#1A2530] underline underline-offset-2">
                            {l.commission_paid ? "Desfazer" : "Marcar paga"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* desktop */}
                  <div className="hidden lg:grid grid-cols-[64px_1fr_1fr_150px_90px_100px_100px_150px] gap-2 items-center">
                    <div className="w-9 h-9 rounded-[10px] bg-[#FDF6EE] border border-[#F3E8D6] flex flex-col items-center justify-center leading-[1]">
                      <span className="text-[12px] font-semibold">{fmtData(l.date)}</span>
                      <span className="text-[9px] text-[#A8A29E] mt-0.5">{diaSemana(l.date)}</span>
                    </div>
                    <div className="text-[13px] font-medium truncate">{l.clients?.name || "—"}</div>
                    <div className="flex items-center gap-2 text-[13px] text-[#4B5563] truncate">
                      <span className="w-6 h-6 rounded-full bg-[#FDF6EE] border border-[#F3E8D6] flex items-center justify-center shrink-0">{iconeServico(l.services?.name)}</span>
                      <span className="truncate">{l.services?.name || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {l.professionals?.name ? (
                        <>
                          <div className="w-7 h-7 rounded-full bg-[#1A2530] text-white flex items-center justify-center text-[10px] font-medium shrink-0">{iniciais(l.professionals.name)}</div>
                          <div className="leading-tight min-w-0">
                            <p className="text-[13px] font-medium truncate">{primeiroNome(l.professionals.name)}</p>
                            <p className="text-[11px] text-[#9CA3AF]">{Number(l.professionals.commission_percent)}% com.</p>
                          </div>
                        </>
                      ) : (
                        <span className="text-[#9CA3AF] text-[13px]">—</span>
                      )}
                    </div>
                    <div className="text-[13px] font-semibold text-right">{brl(l.price_at_time || 0)}</div>
                    <div className="text-[13px] font-medium text-right text-[#92400E]">{com > 0 ? brl(com) : <span className="text-[#D9CFC1]">—</span>}</div>
                    <div className="text-[13px] font-semibold text-right text-[#065F46]">{brl((l.price_at_time || 0) - com)}</div>
                    <div className="flex justify-end pr-2">
                      {com > 0 ? (
                        <button
                          onClick={() => toggleLinha(l)}
                          title="Toque para alternar"
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full border transition-colors",
                            l.commission_paid
                              ? "bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0] hover:bg-[#A7F3D0]/50"
                              : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] hover:bg-[#FDE68A]/60",
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", l.commission_paid ? "bg-[#10B981]" : "bg-[#F59E0B]")} />
                          {l.commission_paid ? "Paga ✓" : "A pagar"}
                        </button>
                      ) : (
                        <span className="text-[#D9CFC1] text-[11px]">sem comissão</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="px-5 md:px-7 py-3.5 bg-[#FFFEFB] border-t border-[#F6EFE6] text-[12px] text-[#9CA3AF]">
            {visiveis.length} atendimento{visiveis.length === 1 ? "" : "s"} • toque no selo de status para alternar um atendimento específico
          </div>
        </div>
      )}

      {/* comissões por profissional */}
      {porProf.length > 0 && (
        <div className="mt-10">
          <div className="flex items-baseline gap-3 mb-5">
            <h2 className="font-serif-display text-[26px] md:text-[30px] tracking-[-0.01em]">Comissões por profissional</h2>
            <span className="text-[12px] text-[#A8A29E] bg-white border border-[#F0E6D8] px-2.5 py-1 rounded-full">{rotuloPeriodo}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {porProf.map((pr) => {
              const pctQuitado = pr.comissao > 0 ? ((pr.comissao - pr.aPagar) / pr.comissao) * 100 : 100
              return (
                <div key={pr.id} className="bg-white rounded-[22px] p-6 md:p-7 shadow-[0_8px_24px_rgba(26,37,48,0.06)] border border-white">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-[#1A2530] text-white flex items-center justify-center font-medium text-[14px]">{iniciais(pr.name)}</div>
                      <div>
                        <p className="font-semibold text-[15px] leading-tight">{pr.name}</p>
                        <p className="text-[12px] text-[#8A8A8A] mt-0.5">Comissão {Number(pr.commission_percent)}%</p>
                      </div>
                    </div>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full border",
                      pr.aPagar > 0 ? "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]" : "bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]",
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", pr.aPagar > 0 ? "bg-[#F59E0B]" : "bg-[#10B981]")} />
                      {pr.aPagar > 0 ? `${brl(pr.aPagar)} a pagar` : "Em dia"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-[#FDF8F2] rounded-[14px] p-3.5 border border-[#F6EFE6]">
                      <p className="text-[10px] uppercase tracking-widest text-[#B8B0A6]">Serviços</p>
                      <p className="font-serif-display text-[20px] leading-none mt-1.5">{pr.servicos}</p>
                      <p className="text-[11px] text-[#8A8A8A] mt-1">no período</p>
                    </div>
                    <div className="bg-[#FDF8F2] rounded-[14px] p-3.5 border border-[#F6EFE6]">
                      <p className="text-[10px] uppercase tracking-widest text-[#B8B0A6]">Comissão</p>
                      <p className="font-serif-display text-[20px] leading-none mt-1.5">{brl(pr.comissao)}</p>
                      <p className="text-[11px] text-[#8A8A8A] mt-1">de {brl(pr.faturamento)}</p>
                    </div>
                    <div className="bg-[#1A2530] rounded-[14px] p-3.5 text-white">
                      <p className="text-[10px] uppercase tracking-widest text-[#8CA0B3]">Ticket médio</p>
                      <p className="font-serif-display text-[20px] leading-none mt-1.5">{brl(pr.ticket)}</p>
                      <p className="text-[11px] text-[#7FBF9D] mt-1">por serviço</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[#8A8A8A]">Comissões quitadas</span>
                      <span className="font-medium">{brl(pr.comissao - pr.aPagar)} / {brl(pr.comissao)}</span>
                    </div>
                    <div className="h-2 bg-[#F6EFE6] rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", pctQuitado >= 100 ? "bg-[#10B981]" : "bg-[#FF8A2B]")}
                        style={{ width: `${Math.min(pctQuitado, 100)}%` }}
                      />
                    </div>
                    {pr.aPagar > 0 ? (
                      <button
                        onClick={() => quitarDoProf(pr)}
                        disabled={quitando !== null}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-[#1A2530] text-white rounded-full py-3 text-[13px] font-medium hover:bg-black transition-colors shadow-[0_6px_18px_rgba(26,37,48,0.18)] disabled:opacity-60"
                      >
                        {quitando === pr.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Pagar tudo de {primeiroNome(pr.name)} ({brl(pr.aPagar)})
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-[12px] text-[#6B9F82] bg-[#ECFDF5] border border-[#D1FAE5] rounded-full py-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                        Comissões quitadas no período
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="text-[11px] text-[#B8B0A6] mt-8">
        Comissão = valor do atendimento × % do profissional no momento do fechamento.
      </p>

      {/* toast */}
      {msg && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#1A2530] text-white text-[13px] px-5 py-2.5 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.2)] z-50">
          {msg}
        </div>
      )}
    </div>
  )
}
