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

// paleta Ouro Edition
const CARD = "bg-[#131E2E]/70 border border-[#C9A96E]/10"
const CHIP_OFF = "bg-[#131E2E]/60 text-[#8896A8] border-[#C9A96E]/12 hover:border-[#C9A96E]/30"

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
  const [quitando, setQuitando] = useState<string | null>(null)
  const [msg, setMsg] = useState("")

  const range = (p = periodo) => {
    const hoje = new Date()
    if (p === "7d") return { ini: format(subDays(hoje, 6), "yyyy-MM-dd"), fim: format(hoje, "yyyy-MM-dd") }
    if (p === "mes-passado") {
      const m = subMonths(hoje, 1)
      return { ini: format(startOfMonth(m), "yyyy-MM-dd"), fim: format(endOfMonth(m), "yyyy-MM-dd") }
    }
    return { ini: format(startOfMonth(hoje), "yyyy-MM-dd"), fim: format(endOfMonth(hoje), "yyyy-MM-dd") }
  }

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

  const fatPeriodoCheio = linhas.reduce((acc, l) => acc + (l.price_at_time || 0), 0)
  const delta = fatAnterior && fatAnterior > 0 ? ((fatPeriodoCheio - fatAnterior) / fatAnterior) * 100 : null

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

  const fmtData = (d: string) => { const [, m, dia] = d.split("-"); return `${dia}/${m}` }
  const diaSemana = (d: string) => { const [a, m, dia] = d.split("-").map(Number); return DIAS[new Date(a, m - 1, dia).getDay()] }
  const iniciais = (nome?: string) => (nome || "—").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
  const primeiroNome = (nome?: string) => (nome || "—").split(" ")[0]
  const iconeServico = (nome?: string) => {
    const s = (nome || "").toLowerCase()
    if (s.includes("corte") || s.includes("barba")) return <Scissors className="w-3 h-3 text-[#C9A96E]" />
    return <Sparkles className="w-3 h-3 text-[#C9A96E]" />
  }
  const rotuloPeriodo = PERIODOS.find((pp) => pp.key === periodo)?.label

  if (loadingStudio || loading)
    return (
      <div className="flex justify-center pt-24">
        <div className="w-8 h-8 border-4 border-[#C9A96E] border-t-transparent rounded-full animate-spin" />
      </div>
    )

  return (
    <div className="text-[#F0EDE5]">
      {/* cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-[38px] md:text-[46px] font-semibold leading-[1] tracking-[-0.01em] text-[#F0EDE5]">Financeiro</h1>
          <p className="mt-2.5 text-[14px] text-[#8896A8]">Controle de comissões e faturamento — só atendimentos pagos entram na conta.</p>
        </div>
        <div className={cn("hidden md:flex items-center gap-2 text-[13px] text-[#8896A8] rounded-full px-4 py-2", CARD)}>
          <CalendarDays className="w-4 h-4 text-[#C9A96E]" />
          <span>{fmtData(range().ini)} — {fmtData(range().fim)}</span>
          <span className="w-1 h-1 rounded-full bg-[#C9A96E]/40 mx-1" />
          <span className="text-[#F0EDE5] font-medium">{studio?.name}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-8">
        {/* faturamento */}
        <div className={cn("rounded-2xl p-6", CARD)}>
          <div className="flex items-start justify-between mb-7">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-[#C9A96E]/15 bg-[#C9A96E]/[0.07]">
              <Wallet className="w-[18px] h-[18px] text-[#C9A96E]" />
            </div>
            {delta !== null && (
              <div className={cn(
                "flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border",
                delta >= 0
                  ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/20"
                  : "bg-orange-400/10 text-orange-300 border-orange-400/20",
              )}>
                {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {delta >= 0 ? "+" : ""}{delta.toFixed(0)}% vs anterior
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#8896A8] font-semibold">Faturamento no período</p>
            <p className="font-serif text-[32px] font-semibold leading-none text-[#F0EDE5]">{brl(faturamento)}</p>
            <p className="text-[13px] text-[#8896A8] pt-1">{visiveis.length} serviço{visiveis.length === 1 ? "" : "s"} realizado{visiveis.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        {/* comissões a pagar */}
        <div className={cn("rounded-2xl p-6 relative overflow-hidden", CARD)}>
          <div className="absolute -top-8 -right-8 w-[110px] h-[110px] bg-[#C9A96E]/[0.06] rounded-full" />
          <div className="flex items-start justify-between mb-7 relative">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-[#C9A96E]/15 bg-[#C9A96E]/[0.07]">
              <div className={cn(
                "w-2 h-2 rounded-full",
                pendentes.length > 0 ? "bg-[#C9A96E] shadow-[0_0_12px_rgba(201,169,110,0.5)]" : "bg-emerald-400",
              )} />
            </div>
            {pendentes.length > 0 && (
              <span className="text-[11px] font-medium bg-[#C9A96E]/12 text-[#C9A96E] border border-[#C9A96E]/20 px-2.5 py-1 rounded-full">
                {pendentes.length} pendente{pendentes.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="space-y-1 relative">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#8896A8] font-semibold">Comissões a pagar</p>
            <p className="font-serif text-[32px] font-semibold leading-none text-[#F0EDE5]">{brl(comissoesAPagar)}</p>
            <p className={cn("text-[13px] pt-1 font-medium", pendentes.length > 0 ? "text-[#E8C989]" : "text-emerald-300")}>
              {pendentes.length > 0 ? `de ${brl(comissoesTotal)} geradas no período` : "Tudo quitado ✓"}
            </p>
          </div>
        </div>

        {/* lucro */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden border border-[#C9A96E]/15"
          style={{ background: "linear-gradient(145deg, rgba(19,30,46,0.9) 0%, rgba(10,15,26,0.95) 100%)" }}
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[40px] opacity-10 bg-[#C9A96E]" />
          <div className="flex items-start justify-between mb-7 relative">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-[#C9A96E]/15 bg-[#C9A96E]/[0.07]">
              <PiggyBank className="w-[18px] h-[18px] text-[#A7F3D0]" />
            </div>
            <span className="text-[11px] font-medium bg-[#C9A96E]/10 text-[#E8C989] px-2.5 py-1 rounded-full border border-[#C9A96E]/20">Lucro líquido</span>
          </div>
          <div className="space-y-1 relative">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#8896A8] font-semibold">Lucro do espaço</p>
            <p className="font-serif text-[32px] font-semibold leading-none text-[#F0EDE5]">{brl(lucro)}</p>
            <p className="text-[13px] text-[#7FBF9D] pt-1">{margem.toFixed(1).replace(".", ",")}% do faturamento</p>
          </div>
        </div>
      </div>

      {/* filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 max-w-full scrollbar-none">
          {PERIODOS.map((pp) => (
            <button
              key={pp.key}
              onClick={() => setPeriodo(pp.key)}
              className={cn(
                "whitespace-nowrap px-5 py-2.5 rounded-full text-[13px] font-medium transition-all border shrink-0",
                periodo === pp.key
                  ? "bg-[#C9A96E] text-[#0A0F1A] border-[#C9A96E] font-semibold shadow-[0_4px_20px_rgba(201,169,110,0.25)]"
                  : CHIP_OFF,
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
                  ? "bg-[#C9A96E] text-[#0A0F1A] border-[#C9A96E] font-semibold"
                  : CHIP_OFF,
              )}
            >
              {st.label}
            </button>
          ))}
          <button
            onClick={exportarCSV}
            disabled={visiveis.length === 0}
            className={cn("flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium border transition-all disabled:opacity-40", CHIP_OFF, "text-[#F0EDE5]")}
          >
            <Download className="w-3.5 h-3.5 text-[#C9A96E]" /> CSV
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
              profFiltro === "todos"
                ? "bg-[#C9A96E]/15 border-[#C9A96E]/40 text-[#E8C989]"
                : CHIP_OFF,
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
                profFiltro === pr.id
                  ? "bg-[#C9A96E]/15 border-[#C9A96E]/40 text-[#E8C989]"
                  : CHIP_OFF,
              )}
            >
              <span className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border",
                profFiltro === pr.id
                  ? "bg-[#C9A96E] text-[#0A0F1A] border-[#C9A96E]"
                  : "bg-[#0A0F1A] text-[#F0EDE5] border-[#C9A96E]/20",
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
        <p className="flex items-center gap-2 text-[12px] text-[#8896A8]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A96E] inline-block" />
          Mostrando: <strong className="text-[#F0EDE5] font-medium">{rotuloPeriodo}</strong>
          {profFiltro !== "todos" && <span className="text-[#F0EDE5]"> • {primeiroNome(equipe.find((e) => e.id === profFiltro)?.name)}</span>}
          {statusFiltro !== "todos" && <span className="text-[#F0EDE5]"> • {STATUS_COMISSAO.find((s) => s.key === statusFiltro)?.label}</span>}
        </p>
        {comissoesAPagar > 0 && (
          <button
            onClick={quitarExibidas}
            disabled={quitando !== null}
            className="inline-flex items-center justify-center gap-1.5 bg-[#C9A96E] text-[#0A0F1A] rounded-full px-5 py-2.5 text-[12px] font-semibold hover:bg-[#D4B87A] transition-colors shadow-[0_4px_20px_rgba(201,169,110,0.25)] disabled:opacity-60"
          >
            {quitando === "todas" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Quitar comissões exibidas ({brl(comissoesAPagar)})
          </button>
        )}
      </div>

      {/* tabela / cards */}
      {visiveis.length === 0 ? (
        <div className={cn("rounded-2xl p-10 text-center", CARD)}>
          <p className="font-serif text-[22px] font-semibold text-[#F0EDE5]">Nada por aqui ainda</p>
          <p className="text-[13px] text-[#8896A8] mt-1">Nenhum atendimento pago no período e filtros escolhidos.</p>
        </div>
      ) : (
        <div className={cn("rounded-2xl overflow-hidden", CARD)}>
          {/* cabeçalho desktop */}
          <div className="hidden lg:grid grid-cols-[64px_1fr_1fr_150px_90px_100px_100px_150px] gap-2 px-6 py-4 border-b border-[#C9A96E]/[0.08] bg-[#0E1622]/80">
            {["Data", "Cliente", "Serviço", "Profissional", "Valor", "Comissão", "Lucro", "Status"].map((h, i) => (
              <span key={h} className={cn("text-[10px] uppercase tracking-[0.14em] text-[#64748B] font-semibold", i >= 4 && i <= 6 && "text-right", i === 7 && "text-right pr-2")}>{h}</span>
            ))}
          </div>

          <div className="divide-y divide-[#C9A96E]/[0.06]">
            {visiveis.map((l) => {
              const com = comissaoDe(l)
              return (
                <div key={l.id} className="group px-4 md:px-6 py-4 lg:py-[14px] hover:bg-white/[0.03] transition-colors">
                  {/* mobile */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#0A0F1A] border border-[#C9A96E]/15 flex flex-col items-center justify-center leading-none">
                          <span className="text-[13px] font-semibold text-[#F0EDE5]">{fmtData(l.date).split("/")[0]}</span>
                          <span className="text-[9px] text-[#8896A8] uppercase mt-0.5">{diaSemana(l.date)}</span>
                        </div>
                        <div>
                          <p className="text-[14px] font-medium leading-tight text-[#F0EDE5]">{l.clients?.name || "—"}</p>
                          <p className="text-[12px] text-[#8896A8] flex items-center gap-1 mt-0.5">
                            {iconeServico(l.services?.name)} {l.services?.name || "—"}
                          </p>
                        </div>
                      </div>
                      {com > 0 && (
                        <span className={cn(
                          "text-[11px] font-medium px-2.5 py-1 rounded-full border",
                          l.commission_paid
                            ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/25"
                            : "bg-amber-400/10 text-amber-300 border-amber-400/25",
                        )}>
                          {l.commission_paid ? "Paga" : "A pagar"}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[12px]">
                      {[
                        ["Valor", brl(l.price_at_time || 0), "text-[#F0EDE5]"],
                        ["Comissão", com > 0 ? brl(com) : "—", "text-[#E8C989]"],
                        ["Lucro", brl((l.price_at_time || 0) - com), "text-[#7FBF9D]"],
                      ].map(([rot, val, cor]) => (
                        <div key={rot as string} className="bg-[#0A0F1A] border border-[#C9A96E]/10 rounded-xl px-3 py-2.5">
                          <p className="text-[9px] uppercase tracking-widest text-[#64748B]">{rot}</p>
                          <p className={cn("font-semibold mt-0.5", cor as string)}>{val}</p>
                        </div>
                      ))}
                    </div>

                    {l.professionals?.name && (
                      <div className="flex items-center justify-between bg-[#0A0F1A] rounded-xl px-4 py-2.5 border border-[#C9A96E]/10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#C9A96E] text-[#0A0F1A] flex items-center justify-center text-[10px] font-bold">{iniciais(l.professionals.name)}</div>
                          <p className="text-[13px] font-medium text-[#F0EDE5]">{primeiroNome(l.professionals.name)} <span className="text-[#8896A8]">• {Number(l.professionals.commission_percent)}%</span></p>
                        </div>
                        {com > 0 && (
                          <button onClick={() => toggleLinha(l)} className="text-[12px] font-medium text-[#C9A96E] underline underline-offset-2">
                            {l.commission_paid ? "Desfazer" : "Marcar paga"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* desktop */}
                  <div className="hidden lg:grid grid-cols-[64px_1fr_1fr_150px_90px_100px_100px_150px] gap-2 items-center">
                    <div className="w-9 h-9 rounded-[10px] bg-[#0A0F1A] border border-[#C9A96E]/15 flex flex-col items-center justify-center leading-[1]">
                      <span className="text-[11px] font-semibold text-[#F0EDE5]">{fmtData(l.date)}</span>
                      <span className="text-[8px] text-[#8896A8] mt-0.5">{diaSemana(l.date)}</span>
                    </div>
                    <div className="text-[13px] font-medium truncate text-[#F0EDE5]">{l.clients?.name || "—"}</div>
                    <div className="flex items-center gap-2 text-[13px] text-[#B9C2CF] truncate">
                      <span className="w-6 h-6 rounded-full bg-[#0A0F1A] border border-[#C9A96E]/15 flex items-center justify-center shrink-0">{iconeServico(l.services?.name)}</span>
                      <span className="truncate">{l.services?.name || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {l.professionals?.name ? (
                        <>
                          <div className="w-7 h-7 rounded-full bg-[#C9A96E] text-[#0A0F1A] flex items-center justify-center text-[10px] font-bold shrink-0">{iniciais(l.professionals.name)}</div>
                          <div className="leading-tight min-w-0">
                            <p className="text-[13px] font-medium truncate text-[#F0EDE5]">{primeiroNome(l.professionals.name)}</p>
                            <p className="text-[11px] text-[#8896A8]">{Number(l.professionals.commission_percent)}% com.</p>
                          </div>
                        </>
                      ) : (
                        <span className="text-[#64748B] text-[13px]">—</span>
                      )}
                    </div>
                    <div className="text-[13px] font-semibold text-right text-[#F0EDE5]">{brl(l.price_at_time || 0)}</div>
                    <div className="text-[13px] font-medium text-right text-[#E8C989]">{com > 0 ? brl(com) : <span className="text-[#3D4A5C]">—</span>}</div>
                    <div className="text-[13px] font-semibold text-right text-[#7FBF9D]">{brl((l.price_at_time || 0) - com)}</div>
                    <div className="flex justify-end pr-2">
                      {com > 0 ? (
                        <button
                          onClick={() => toggleLinha(l)}
                          title="Toque para alternar"
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full border transition-colors",
                            l.commission_paid
                              ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/25 hover:bg-emerald-400/20"
                              : "bg-amber-400/10 text-amber-300 border-amber-400/25 hover:bg-amber-400/20",
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", l.commission_paid ? "bg-emerald-400" : "bg-amber-400")} />
                          {l.commission_paid ? "Paga ✓" : "A pagar"}
                        </button>
                      ) : (
                        <span className="text-[#3D4A5C] text-[11px]">sem comissão</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="px-5 md:px-6 py-3.5 bg-[#0E1622]/80 border-t border-[#C9A96E]/[0.08] text-[12px] text-[#64748B]">
            {visiveis.length} atendimento{visiveis.length === 1 ? "" : "s"} • toque no selo de status para alternar um atendimento específico
          </div>
        </div>
      )}

      {/* comissões por profissional */}
      {porProf.length > 0 && (
        <div className="mt-10">
          <div className="flex items-baseline gap-3 mb-5">
            <h2 className="font-serif text-[26px] md:text-[30px] font-semibold text-[#F0EDE5]">Comissões por profissional</h2>
            <span className={cn("text-[12px] text-[#8896A8] px-2.5 py-1 rounded-full", CARD)}>{rotuloPeriodo}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {porProf.map((pr) => {
              const pctQuitado = pr.comissao > 0 ? ((pr.comissao - pr.aPagar) / pr.comissao) * 100 : 100
              return (
                <div key={pr.id} className={cn("rounded-2xl p-6", CARD)}>
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-[#C9A96E] text-[#0A0F1A] flex items-center justify-center font-bold text-[14px]">{iniciais(pr.name)}</div>
                      <div>
                        <p className="font-semibold text-[15px] leading-tight text-[#F0EDE5]">{pr.name}</p>
                        <p className="text-[12px] text-[#8896A8] mt-0.5">Comissão {Number(pr.commission_percent)}%</p>
                      </div>
                    </div>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full border",
                      pr.aPagar > 0
                        ? "bg-amber-400/10 text-amber-300 border-amber-400/25"
                        : "bg-emerald-400/10 text-emerald-300 border-emerald-400/25",
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", pr.aPagar > 0 ? "bg-amber-400" : "bg-emerald-400")} />
                      {pr.aPagar > 0 ? `${brl(pr.aPagar)} a pagar` : "Em dia"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-[#0A0F1A] rounded-xl p-3.5 border border-[#C9A96E]/10">
                      <p className="text-[9px] uppercase tracking-widest text-[#64748B]">Serviços</p>
                      <p className="font-serif text-[20px] font-semibold leading-none mt-1.5 text-[#F0EDE5]">{pr.servicos}</p>
                      <p className="text-[11px] text-[#8896A8] mt-1">no período</p>
                    </div>
                    <div className="bg-[#0A0F1A] rounded-xl p-3.5 border border-[#C9A96E]/10">
                      <p className="text-[9px] uppercase tracking-widest text-[#64748B]">Comissão</p>
                      <p className="font-serif text-[20px] font-semibold leading-none mt-1.5 text-[#E8C989]">{brl(pr.comissao)}</p>
                      <p className="text-[11px] text-[#8896A8] mt-1">de {brl(pr.faturamento)}</p>
                    </div>
                    <div className="rounded-xl p-3.5 border border-[#C9A96E]/25 bg-[#C9A96E]/[0.09]">
                      <p className="text-[9px] uppercase tracking-widest text-[#C9A96E]/70">Ticket médio</p>
                      <p className="font-serif text-[20px] font-semibold leading-none mt-1.5 text-[#E8C989]">{brl(pr.ticket)}</p>
                      <p className="text-[11px] text-[#8896A8] mt-1">por serviço</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[#8896A8]">Comissões quitadas</span>
                      <span className="font-medium text-[#F0EDE5]">{brl(pr.comissao - pr.aPagar)} / {brl(pr.comissao)}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(pctQuitado, 100)}%`,
                          background: pctQuitado >= 100
                            ? "linear-gradient(90deg, #34D399, #6EE7B7)"
                            : "linear-gradient(90deg, #C9A96E, #E8D5A3)",
                        }}
                      />
                    </div>
                    {pr.aPagar > 0 ? (
                      <button
                        onClick={() => quitarDoProf(pr)}
                        disabled={quitando !== null}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-[#C9A96E] text-[#0A0F1A] rounded-full py-3 text-[13px] font-semibold hover:bg-[#D4B87A] transition-colors shadow-[0_4px_20px_rgba(201,169,110,0.2)] disabled:opacity-60"
                      >
                        {quitando === pr.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Pagar tudo de {primeiroNome(pr.name)} ({brl(pr.aPagar)})
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-[12px] text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 rounded-full py-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
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

      <p className="text-[11px] text-[#64748B] mt-8">
        Comissão = valor do atendimento × % do profissional no momento do fechamento.
      </p>

      {/* toast */}
      {msg && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#C9A96E] text-[#0A0F1A] text-[13px] font-semibold px-5 py-2.5 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-50">
          {msg}
        </div>
      )}
    </div>
  )
}
