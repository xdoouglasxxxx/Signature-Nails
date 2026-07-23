"use client"

import { createClient } from "@/lib/supabase"
import { useStudio } from "@/lib/useStudio"
import { useCallback, useEffect, useState } from "react"
import { format, startOfMonth, endOfMonth, subMonths, subDays } from "date-fns"
import { Wallet, TrendingUp, HandCoins, Loader2, Check } from "lucide-react"
import { brl, cn } from "@/lib/utils"

const PERIODOS = [
  { key: "mes", label: "Este mês" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "mes-passado", label: "Mês passado" },
]

const STATUS_COMISSAO = [
  { key: "todos", label: "Todos" },
  { key: "a-pagar", label: "A pagar" },
  { key: "pago", label: "Comissão paga" },
]

export default function FinanceiroPage() {
  const { studio, loading: loadingStudio } = useStudio()
  const supabase = createClient()
  const [linhas, setLinhas] = useState<any[]>([])
  const [equipe, setEquipe] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState("mes")
  const [profFiltro, setProfFiltro] = useState("todos")
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [quitando, setQuitando] = useState(false)
  const [msg, setMsg] = useState("")

  const range = () => {
    const hoje = new Date()
    if (periodo === "7d") return { ini: format(subDays(hoje, 6), "yyyy-MM-dd"), fim: format(hoje, "yyyy-MM-dd") }
    if (periodo === "mes-passado") {
      const m = subMonths(hoje, 1)
      return { ini: format(startOfMonth(m), "yyyy-MM-dd"), fim: format(endOfMonth(m), "yyyy-MM-dd") }
    }
    return { ini: format(startOfMonth(hoje), "yyyy-MM-dd"), fim: format(endOfMonth(hoje), "yyyy-MM-dd") }
  }

  const fetchDados = useCallback(async () => {
    if (!studio) return
    setLoading(true)
    const { ini, fim } = range()
    const [{ data: apps }, { data: profs }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, date, price_at_time, commission_paid, professional_id, clients(name), services(name), professionals(name, commission_percent)")
        .eq("studio_id", studio.id)
        .eq("status", "pago")
        .gte("date", ini)
        .lte("date", fim)
        .order("date", { ascending: false })
        .order("start_time", { ascending: false }),
      supabase.from("professionals").select("id, name").eq("studio_id", studio.id).order("sort_order"),
    ])
    setLinhas(apps || [])
    setEquipe(profs || [])
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
  const comissoesAPagar = visiveis.filter((l) => !l.commission_paid).reduce((acc, l) => acc + comissaoDe(l), 0)
  const lucro = faturamento - comissoesTotal

  const quitarExibidas = async () => {
    const ids = visiveis.filter((l) => !l.commission_paid && comissaoDe(l) > 0).map((l) => l.id)
    if (ids.length === 0) return
    setQuitando(true)
    const { error } = await supabase.from("appointments").update({ commission_paid: true }).in("id", ids)
    setQuitando(false)
    if (error) { setMsg("Não foi possível quitar. Tente novamente."); return }
    setLinhas((prev) => prev.map((l) => (ids.includes(l.id) ? { ...l, commission_paid: true } : l)))
    setMsg(`${ids.length} comissão${ids.length === 1 ? "" : "s"} marcada${ids.length === 1 ? "" : "s"} como paga${ids.length === 1 ? "" : "s"}. ✓`)
    setTimeout(() => setMsg(""), 4000)
  }

  const toggleLinha = async (l: any) => {
    const { error } = await supabase.from("appointments").update({ commission_paid: !l.commission_paid }).eq("id", l.id)
    if (!error) setLinhas((prev) => prev.map((x) => (x.id === l.id ? { ...x, commission_paid: !l.commission_paid } : x)))
  }

  if (loadingStudio || loading)
    return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>

  const fmtData = (d: string) => { const [a, m, dia] = d.split("-"); return `${dia}/${m}` }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-serif font-bold">Financeiro</h1>
        <p className="text-sm text-navy/60 mt-1">Faturamento, comissões e lucro — só atendimentos marcados como pagos entram na conta.</p>
      </div>

      {/* cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-gold/15 p-5">
          <div className="flex items-center gap-2 text-navy/50 text-[10px] font-bold tracking-widest uppercase">
            <TrendingUp className="w-4 h-4 text-gold" /> Faturamento
          </div>
          <p className="font-serif text-2xl font-bold mt-2">{brl(faturamento)}</p>
        </div>
        <div className="bg-white rounded-3xl border border-gold/15 p-5">
          <div className="flex items-center gap-2 text-navy/50 text-[10px] font-bold tracking-widest uppercase">
            <HandCoins className="w-4 h-4 text-gold" /> Comissões a pagar
          </div>
          <p className="font-serif text-2xl font-bold mt-2">{brl(comissoesAPagar)}</p>
          <p className="text-[11px] text-navy/50">de {brl(comissoesTotal)} geradas no período</p>
        </div>
        <div className="bg-navy text-white rounded-3xl p-5">
          <div className="flex items-center gap-2 text-goldlight/70 text-[10px] font-bold tracking-widest uppercase">
            <Wallet className="w-4 h-4 text-gold" /> Lucro do espaço
          </div>
          <p className="font-serif text-2xl font-bold mt-2 text-goldlight">{brl(lucro)}</p>
          <p className="text-[11px] text-white/50">faturamento − comissões</p>
        </div>
      </div>

      {/* filtros */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((pp) => (
            <button key={pp.key} onClick={() => setPeriodo(pp.key)} className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border", periodo === pp.key ? "bg-navy text-white border-navy" : "bg-white border-navy/10")}>
              {pp.label}
            </button>
          ))}
          <span className="w-px bg-gold/20 mx-1" />
          {STATUS_COMISSAO.map((st) => (
            <button key={st.key} onClick={() => setStatusFiltro(st.key)} className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border", statusFiltro === st.key ? "bg-navy text-white border-navy" : "bg-white border-navy/10")}>
              {st.label}
            </button>
          ))}
        </div>
        {equipe.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setProfFiltro("todos")} className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border", profFiltro === "todos" ? "bg-gold/20 border-gold text-navy" : "bg-white border-navy/10")}>
              Toda a equipe
            </button>
            {equipe.map((pr) => (
              <button key={pr.id} onClick={() => setProfFiltro(pr.id)} className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border", profFiltro === pr.id ? "bg-gold/20 border-gold text-navy" : "bg-white border-navy/10")}>
                {pr.name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ação de quitação */}
      {comissoesAPagar > 0 && (
        <button
          onClick={quitarExibidas}
          disabled={quitando}
          className="text-xs font-bold px-5 py-2.5 rounded-full gold-gradient text-navy inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          {quitando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Marcar comissões exibidas como pagas ({brl(comissoesAPagar)})
        </button>
      )}
      {msg && <p className="text-xs font-medium text-emerald-700">{msg}</p>}

      {/* tabela */}
      {visiveis.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-gold/15 text-center text-sm text-navy/50">
          Nenhum atendimento pago no período/filtros escolhidos.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gold/15 overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="text-left text-navy/50 border-b border-gold/10">
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Serviço</th>
                <th className="px-4 py-3 font-semibold">Profissional</th>
                <th className="px-4 py-3 font-semibold text-right">Valor</th>
                <th className="px-4 py-3 font-semibold text-right">Comissão</th>
                <th className="px-4 py-3 font-semibold text-right">Lucro</th>
                <th className="px-4 py-3 font-semibold text-center">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((l) => {
                const com = comissaoDe(l)
                return (
                  <tr key={l.id} className="border-b border-gold/5 last:border-0">
                    <td className="px-4 py-3">{fmtData(l.date)}</td>
                    <td className="px-4 py-3 font-medium">{l.clients?.name || "-"}</td>
                    <td className="px-4 py-3">{l.services?.name || "-"}</td>
                    <td className="px-4 py-3">
                      {l.professionals?.name ? (
                        <>
                          {l.professionals.name.split(" ")[0]}
                          <span className="text-navy/40"> • {Number(l.professionals.commission_percent)}%</span>
                        </>
                      ) : (
                        <span className="text-navy/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{brl(l.price_at_time || 0)}</td>
                    <td className="px-4 py-3 text-right">{com > 0 ? brl(com) : <span className="text-navy/40">—</span>}</td>
                    <td className="px-4 py-3 text-right font-semibold text-navy">{brl((l.price_at_time || 0) - com)}</td>
                    <td className="px-4 py-3 text-center">
                      {com > 0 ? (
                        <button
                          onClick={() => toggleLinha(l)}
                          className={cn(
                            "text-[10px] font-bold px-2.5 py-1 rounded-full border",
                            l.commission_paid
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-amber-50 border-amber-300 text-amber-800",
                          )}
                        >
                          {l.commission_paid ? "PAGA ✓" : "A PAGAR"}
                        </button>
                      ) : (
                        <span className="text-navy/30 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-navy/40">
        Comissão = valor do atendimento × % do profissional no momento do fechamento. Toque no selo A PAGAR/PAGA para alternar um atendimento específico.
      </p>
    </div>
  )
}
