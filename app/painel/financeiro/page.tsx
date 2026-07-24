"use client"

import { createClient } from "@/lib/supabase"
import { useStudio } from "@/lib/useStudio"
import { useCallback, useEffect, useState } from "react"
import { format, startOfMonth, endOfMonth, subMonths, subDays } from "date-fns"
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, Loader2, Check,
  CalendarDays, Download, Scissors, Sparkles, Trophy, Lightbulb,
  Percent, HandCoins, UserPlus, Landmark, Target, Receipt,
  Trash2, FileText, FileSpreadsheet, AlertTriangle,
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
const DIAS_LONGO = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]

const CATEGORIAS = ["Aluguel", "Energia", "Água", "Internet", "Produtos", "Equipamentos", "Marketing", "Funcionários", "Impostos", "Outros"]
const FORMAS_LABEL: Record<string, string> = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro", outro: "Outro", "sem-registro": "Sem registro" }
const FORMAS_COR: Record<string, string> = { pix: "#7FBF9D", cartao: "#93C5FD", dinheiro: "#E8C989", outro: "#B9A0D4", "sem-registro": "#64748B" }

const CARD = "bg-[#131E2E]/70 border border-[#C9A96E]/10"
const CHIP_OFF = "bg-[#131E2E]/60 text-[#8896A8] border-[#C9A96E]/12 hover:border-[#C9A96E]/30"

export default function FinanceiroPage() {
  const { studio, loading: loadingStudio } = useStudio()
  const supabase = createClient()
  const [linhas, setLinhas] = useState<any[]>([])          // pagos do período
  const [todosPeriodo, setTodosPeriodo] = useState<any[]>([]) // todos os status do período
  const [historico, setHistorico] = useState<any[]>([])    // 180 dias (não cancelados)
  const [equipe, setEquipe] = useState<any[]>([])
  const [fatAnterior, setFatAnterior] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState("mes")
  const [profFiltro, setProfFiltro] = useState("todos")
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [quitando, setQuitando] = useState<string | null>(null)
  const [msg, setMsg] = useState("")
  const [despesas, setDespesas] = useState<any[]>([])
  const [metas, setMetas] = useState<Record<string, number>>({})
  const [recebiveis, setRecebiveis] = useState<any[]>([])
  const [novaDespesa, setNovaDespesa] = useState({ category: "Produtos", description: "", amount: "", date: format(new Date(), "yyyy-MM-dd"), recurring: false })
  const [salvandoDespesa, setSalvandoDespesa] = useState(false)
  const [metaEdit, setMetaEdit] = useState<Record<string, string>>({})
  const [salvandoMeta, setSalvandoMeta] = useState(false)

  const hojeStr = format(new Date(), "yyyy-MM-dd")

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
    const ini180 = format(subDays(new Date(), 180), "yyyy-MM-dd")
    const [{ data: apps }, { data: profs }, { data: appsAnt }, { data: tds }, { data: hist }, { data: exps }, { data: gls }, { data: rcb }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, date, start_time, price_at_time, commission_paid, payment_method, professional_id, clients(name), services(name), professionals(name, commission_percent)")
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
      supabase
        .from("appointments")
        .select("id, date, status, price_at_time, clients(name)")
        .eq("studio_id", studio.id)
        .gte("date", ini)
        .lte("date", fim),
      supabase
        .from("appointments")
        .select("date, status, price_at_time, clients(name)")
        .eq("studio_id", studio.id)
        .neq("status", "cancelado")
        .gte("date", ini180)
        .lte("date", hojeStr)
        .limit(2000),
      supabase.from("expenses")
        .select("id, category, description, amount, date, recurring")
        .eq("studio_id", studio.id).gte("date", ini).lte("date", fim)
        .order("date", { ascending: false }),
      supabase.from("goals").select("period, amount").eq("studio_id", studio.id),
      supabase.from("appointments")
        .select("date, price_at_time, status")
        .eq("studio_id", studio.id)
        .in("status", ["pendente", "confirmado"])
        .gt("date", hojeStr)
        .order("date")
        .limit(200),
    ])
    setLinhas(apps || [])
    setEquipe(profs || [])
    setFatAnterior((appsAnt || []).reduce((acc, a) => acc + (a.price_at_time || 0), 0))
    setTodosPeriodo(tds || [])
    setHistorico(hist || [])
    setDespesas(exps || [])
    const gg: Record<string, number> = {}
    ;(gls || []).forEach((g: any) => { gg[g.period] = Number(g.amount || 0) })
    setMetas(gg)
    setRecebiveis(rcb || [])
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
  const totalDespesas = despesas.reduce((a, d) => a + Number(d.amount || 0), 0)
  const lucroReal = faturamento - comissoesTotal - totalDespesas
  const margemReal = faturamento > 0 ? (lucroReal / faturamento) * 100 : 0

  const fatPeriodoCheio = linhas.reduce((acc, l) => acc + (l.price_at_time || 0), 0)
  const delta = fatAnterior && fatAnterior > 0 ? ((fatPeriodoCheio - fatAnterior) / fatAnterior) * 100 : null

  // ---------- PULSO (independente do filtro de período) ----------
  const pagosHist = historico.filter((h) => h.status === "pago")
  const fatDia = pagosHist.filter((h) => h.date === hojeStr).reduce((a, h) => a + (h.price_at_time || 0), 0)
  const ini7 = format(subDays(new Date(), 6), "yyyy-MM-dd")
  const fatSemana = pagosHist.filter((h) => h.date >= ini7).reduce((a, h) => a + (h.price_at_time || 0), 0)
  const iniMesAtual = format(startOfMonth(new Date()), "yyyy-MM-dd")
  const fatMesAtual = pagosHist.filter((h) => h.date >= iniMesAtual).reduce((a, h) => a + (h.price_at_time || 0), 0)

  // ---------- KPIs de inteligência (do período filtrado) ----------
  const naoCancelados = todosPeriodo.filter((t) => t.status !== "cancelado")
  const cancelados = todosPeriodo.filter((t) => t.status === "cancelado")
  const taxaCancel = todosPeriodo.length > 0 ? (cancelados.length / todosPeriodo.length) * 100 : 0
  const aReceber = todosPeriodo.filter((t) => (t.status === "pendente" || t.status === "confirmado") && t.date <= hojeStr)
  const aReceberValor = aReceber.reduce((a, t) => a + (t.price_at_time || 0), 0)
  const ticketPeriodo = visiveis.length > 0 ? faturamento / visiveis.length : 0

  // clientes novos vs recorrentes (primeiro atendimento dentro do período?)
  const { ini: iniP } = range()
  const primeiraVisita = new Map<string, string>()
  for (const h of historico) {
    const n = h.clients?.name
    if (!n) continue
    const atual = primeiraVisita.get(n)
    if (!atual || h.date < atual) primeiraVisita.set(n, h.date)
  }
  const clientesDoPeriodo = new Set(naoCancelados.map((t) => t.clients?.name).filter(Boolean))
  let novos = 0, recorrentes = 0
  clientesDoPeriodo.forEach((n) => {
    const pv = primeiraVisita.get(n as string)
    if (pv && pv >= iniP) novos += 1
    else recorrentes += 1
  })

  // ---------- fluxo de caixa ----------
  const comissoesQuitadasPeriodo = linhas.filter((l) => l.commission_paid).reduce((a, l) => a + comissaoDe(l), 0)
  const saidasCaixa = comissoesQuitadasPeriodo + totalDespesas
  const saldoCaixa = fatPeriodoCheio - saidasCaixa
  const totalRecebiveis = recebiveis.reduce((a, r) => a + (r.price_at_time || 0), 0)

  // ---------- metas ----------
  const diaDoMes = new Date().getDate()
  const metaMensal = metas["mensal"] || 0
  const metaSemanal = metas["semanal"] || 0
  const metaDiaria = metas["diaria"] || 0
  const ritmoDiario = diaDoMes > 0 ? fatMesAtual / diaDoMes : 0
  const diasParaMeta = metaMensal > 0 && ritmoDiario > 0 && fatMesAtual < metaMensal
    ? Math.ceil((metaMensal - fatMesAtual) / ritmoDiario) : null

  // ---------- formas de pagamento ----------
  const porForma = new Map<string, number>()
  for (const l of linhas) {
    const k = l.payment_method || "sem-registro"
    porForma.set(k, (porForma.get(k) || 0) + (l.price_at_time || 0))
  }
  const formasArr = Array.from(porForma.entries()).sort((a, b) => b[1] - a[1])
  const totalFormas = formasArr.reduce((a, [, v]) => a + v, 0)
  let anguloAcum = 0
  const fatiasConic = formasArr.map(([k, v]) => {
    const ini = anguloAcum
    const fim = anguloAcum + (totalFormas > 0 ? (v / totalFormas) * 360 : 0)
    anguloAcum = fim
    return `${FORMAS_COR[k] || "#64748B"} ${ini.toFixed(1)}deg ${fim.toFixed(1)}deg`
  }).join(", ")

  // ---------- sparkline (faturamento por dia do período) ----------
  const porDia = new Map<string, number>()
  for (const l of linhas) porDia.set(l.date, (porDia.get(l.date) || 0) + (l.price_at_time || 0))
  const diasOrdenados = Array.from(porDia.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  const maxDia = Math.max(1, ...diasOrdenados.map(([, v]) => v))

  // ---------- rankings ----------
  const porProf = equipe
    .map((pr) => {
      const doProf = linhas.filter((l) => l.professional_id === pr.id)
      const fat = doProf.reduce((acc, l) => acc + (l.price_at_time || 0), 0)
      const com = doProf.reduce((acc, l) => acc + comissaoDe(l), 0)
      const aPagar = doProf.filter((l) => !l.commission_paid).reduce((acc, l) => acc + comissaoDe(l), 0)
      const cli = new Set(doProf.map((l) => l.clients?.name).filter(Boolean)).size
      return {
        ...pr,
        servicos: doProf.length,
        faturamento: fat,
        comissao: com,
        aPagar,
        clientes: cli,
        ticket: doProf.length > 0 ? fat / doProf.length : 0,
        idsPendentes: doProf.filter((l) => !l.commission_paid && comissaoDe(l) > 0).map((l) => l.id),
      }
    })
    .filter((pr) => pr.servicos > 0)

  const rankProfs = [...porProf].sort((a, b) => b.faturamento - a.faturamento).slice(0, 5)

  const porServico = new Map<string, { nome: string; qtd: number; fat: number }>()
  for (const l of linhas) {
    const n = l.services?.name || "—"
    const s = porServico.get(n) || { nome: n, qtd: 0, fat: 0 }
    s.qtd += 1
    s.fat += l.price_at_time || 0
    porServico.set(n, s)
  }
  const rankServicos = Array.from(porServico.values()).sort((a, b) => b.fat - a.fat).slice(0, 5)

  // ---------- insights automáticos ----------
  const insights: string[] = []
  if (delta !== null && Math.abs(delta) >= 5)
    insights.push(`O faturamento ${delta >= 0 ? "cresceu" : "caiu"} ${Math.abs(delta).toFixed(0)}% em relação ao período anterior.`)
  if (rankProfs.length > 1 && fatPeriodoCheio > 0) {
    const share = (rankProfs[0].faturamento / fatPeriodoCheio) * 100
    if (share >= 25) insights.push(`${rankProfs[0].name.split(" ")[0]} representa ${share.toFixed(0)}% da receita do período.`)
  }
  if (rankServicos.length > 0 && rankServicos[0].fat > 0)
    insights.push(`"${rankServicos[0].nome}" é o serviço que mais fatura: ${brl(rankServicos[0].fat)} (${rankServicos[0].qtd}x).`)
  {
    const fatPorDiaSemana = new Map<number, number>()
    for (const l of linhas) {
      const [a, m, d] = l.date.split("-").map(Number)
      const ds = new Date(a, m - 1, d).getDay()
      fatPorDiaSemana.set(ds, (fatPorDiaSemana.get(ds) || 0) + (l.price_at_time || 0))
    }
    const topDia = Array.from(fatPorDiaSemana.entries()).sort((a, b) => b[1] - a[1])[0]
    if (topDia && fatPeriodoCheio > 0 && topDia[1] / fatPeriodoCheio >= 0.25)
      insights.push(`${DIAS_LONGO[topDia[0]].charAt(0).toUpperCase() + DIAS_LONGO[topDia[0]].slice(1)}s concentram ${((topDia[1] / fatPeriodoCheio) * 100).toFixed(0)}% do faturamento.`)
  }
  if (aReceber.length > 0)
    insights.push(`Você tem ${brl(aReceberValor)} a receber de ${aReceber.length} atendimento${aReceber.length === 1 ? "" : "s"} já realizado${aReceber.length === 1 ? "" : "s"} e não pago${aReceber.length === 1 ? "" : "s"}.`)
  if (taxaCancel >= 15)
    insights.push(`Atenção: a taxa de cancelamento está em ${taxaCancel.toFixed(0)}% no período.`)
  if (novos > 0 && recorrentes > 0)
    insights.push(`${novos} cliente${novos === 1 ? " novo" : "s novos"} e ${recorrentes} recorrente${recorrentes === 1 ? "" : "s"} no período.`)
  if (totalDespesas > 0 && faturamento > 0)
    insights.push(`Despesas do período somam ${brl(totalDespesas)} (${((totalDespesas / faturamento) * 100).toFixed(0)}% da receita).`)

  // ---------- alertas inteligentes ----------
  const alertas: string[] = []
  if (delta !== null && delta <= -20)
    alertas.push(`Queda de ${Math.abs(delta).toFixed(0)}% no faturamento em relação ao período anterior.`)
  {
    const seteAtras = format(subDays(new Date(), 7), "yyyy-MM-dd")
    const antigas = pendentes.filter((l) => l.date <= seteAtras)
    if (antigas.length > 0)
      alertas.push(`Comissões pendentes há mais de 7 dias: ${brl(antigas.reduce((a, l) => a + comissaoDe(l), 0))}.`)
  }
  if (taxaCancel >= 20) alertas.push(`Taxa de cancelamento alta no período: ${taxaCancel.toFixed(0)}%.`)
  if (metaMensal > 0 && fatMesAtual >= metaMensal)
    alertas.push(`Meta mensal atingida: ${brl(fatMesAtual)} de ${brl(metaMensal)} 🎉`)
  else if (metaMensal > 0 && fatMesAtual / metaMensal >= 0.9)
    alertas.push(`Meta mensal quase lá: ${((fatMesAtual / metaMensal) * 100).toFixed(0)}% — faltam ${brl(metaMensal - fatMesAtual)}.`)
  {
    const comAtendimento = new Set(porProf.map((p) => p.id))
    const parados = equipe.filter((e) => !comAtendimento.has(e.id))
    if (parados.length > 0 && linhas.length > 0)
      alertas.push(`Sem atendimentos pagos no período: ${parados.map((p) => p.name.split(" ")[0]).join(", ")}.`)
  }

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

  const addDespesa = async () => {
    const valor = parseFloat(String(novaDespesa.amount).replace(",", "."))
    if (!novaDespesa.category || isNaN(valor) || valor <= 0 || !novaDespesa.date) { notificar("Preencha categoria, valor e data."); return }
    setSalvandoDespesa(true)
    const { data, error } = await supabase.from("expenses").insert({
      studio_id: studio.id,
      category: novaDespesa.category,
      description: novaDespesa.description.trim() || null,
      amount: valor,
      date: novaDespesa.date,
      recurring: novaDespesa.recurring,
    }).select("id, category, description, amount, date, recurring").single()
    setSalvandoDespesa(false)
    if (error || !data) { notificar("Não foi possível salvar. Já rodou o SQL 12-erp?"); return }
    setDespesas((prev) => [data, ...prev])
    setNovaDespesa((f) => ({ ...f, description: "", amount: "" }))
    notificar("Despesa registrada ✓")
  }

  const delDespesa = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id)
    if (!error) setDespesas((prev) => prev.filter((d) => d.id !== id))
  }

  const salvarMetas = async () => {
    setSalvandoMeta(true)
    for (const p of ["diaria", "semanal", "mensal"]) {
      const raw = metaEdit[p]
      if (raw === undefined || raw === "") continue
      const v = parseFloat(String(raw).replace(",", "."))
      if (isNaN(v) || v < 0) continue
      await supabase.from("goals").upsert({ studio_id: studio.id, period: p, amount: v }, { onConflict: "studio_id,period" })
    }
    setSalvandoMeta(false)
    setMetas((prev) => {
      const nx = { ...prev }
      for (const p of ["diaria", "semanal", "mensal"]) {
        const raw = metaEdit[p]
        if (raw !== undefined && raw !== "") {
          const v = parseFloat(String(raw).replace(",", "."))
          if (!isNaN(v)) nx[p] = v
        }
      }
      return nx
    })
    notificar("Metas salvas ✓")
  }

  const exportarExcel = () => {
    const linhasTabela = visiveis.map((l) => {
      const com = comissaoDe(l)
      return `<tr><td>${l.date}</td><td>${l.clients?.name || "-"}</td><td>${l.services?.name || "-"}</td><td>${l.professionals?.name || "-"}</td><td>${(l.price_at_time || 0).toFixed(2).replace(".", ",")}</td><td>${com.toFixed(2).replace(".", ",")}</td><td>${((l.price_at_time || 0) - com).toFixed(2).replace(".", ",")}</td><td>${FORMAS_LABEL[l.payment_method || "sem-registro"]}</td><td>${com > 0 ? (l.commission_paid ? "Paga" : "A pagar") : "-"}</td></tr>`
    }).join("")
    const html = `<html><head><meta charset="utf-8" /></head><body><table border="1"><tr><th>Data</th><th>Cliente</th><th>Serviço</th><th>Profissional</th><th>Valor</th><th>Comissão</th><th>Lucro</th><th>Pagamento</th><th>Status comissão</th></tr>${linhasTabela}</table></body></html>`
    const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `financeiro-${range().ini}-a-${range().fim}.xls`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportarPDF = () => {
    const w = window.open("", "_blank")
    if (!w) { notificar("Libere pop-ups para gerar o PDF."); return }
    const linhasTabela = visiveis.map((l) => {
      const com = comissaoDe(l)
      return `<tr><td>${fmtData(l.date)}</td><td>${l.clients?.name || "-"}</td><td>${l.services?.name || "-"}</td><td>${l.professionals?.name || "-"}</td><td style="text-align:right">${brl(l.price_at_time || 0)}</td><td style="text-align:right">${brl(com)}</td><td style="text-align:right">${brl((l.price_at_time || 0) - com)}</td></tr>`
    }).join("")
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório Financeiro — ${studio?.name || ""}</title>
<style>body{font-family:Georgia,serif;color:#1a2530;padding:32px;max-width:900px;margin:0 auto}h1{margin:0;font-size:26px}p.sub{color:#777;margin:4px 0 20px;font-size:13px}
.kpis{display:flex;gap:14px;margin-bottom:22px}.kpi{flex:1;border:1px solid #ddd;border-radius:10px;padding:12px;font-size:12px}.kpi b{display:block;font-size:19px;margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:12px;font-family:Arial,sans-serif}th,td{border-bottom:1px solid #e5e5e5;padding:7px 6px;text-align:left}th{background:#f7f3ec;text-transform:uppercase;font-size:10px;letter-spacing:.06em}
.rodape{margin-top:18px;font-size:11px;color:#999}</style></head><body>
<h1>Relatório Financeiro — ${studio?.name || ""}</h1>
<p class="sub">Período ${fmtData(range().ini)} a ${fmtData(range().fim)} • gerado em ${format(new Date(), "dd/MM/yyyy")}</p>
<div class="kpis">
<div class="kpi">Faturamento<b>${brl(faturamento)}</b></div>
<div class="kpi">Comissões<b>${brl(comissoesTotal)}</b></div>
<div class="kpi">Despesas<b>${brl(totalDespesas)}</b></div>
<div class="kpi">Lucro líquido<b>${brl(lucroReal)}</b></div>
</div>
<table><tr><th>Data</th><th>Cliente</th><th>Serviço</th><th>Profissional</th><th>Valor</th><th>Comissão</th><th>Lucro</th></tr>${linhasTabela}</table>
<p class="rodape">Signature Studio OS • Comissão = valor do atendimento × % do profissional. Lucro líquido considera despesas do período.</p>
<script>window.onload = function(){ window.print() }</script></body></html>`)
    w.document.close()
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
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
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

      {/* alertas inteligentes */}
      {alertas.length > 0 && (
        <div className="mb-4 rounded-2xl border border-[#E8C989]/30 p-4" style={{ background: "linear-gradient(90deg, rgba(232,201,137,0.08) 0%, rgba(19,30,46,0.6) 60%)" }}>
          <div className="space-y-1.5">
            {alertas.map((a, i) => (
              <p key={i} className="text-[13px] text-[#E8C989] flex items-start gap-2 leading-relaxed">
                <AlertTriangle className="w-3.5 h-3.5 mt-[3px] shrink-0" /> {a}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* PULSO: hoje / semana / mês (independe do filtro) */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-4">
        {[
          { rot: "Hoje", val: fatDia },
          { rot: "Últimos 7 dias", val: fatSemana },
          { rot: "Este mês", val: fatMesAtual },
        ].map((p) => (
          <div key={p.rot} className={cn("rounded-2xl px-4 py-3.5 flex items-center justify-between", CARD)}>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#8896A8] font-semibold">{p.rot}</p>
              <p className="font-serif text-[20px] md:text-[22px] font-semibold leading-none mt-1 text-[#F0EDE5]">{brl(p.val)}</p>
            </div>
            <span className="w-1.5 h-8 rounded-full bg-gradient-to-b from-[#C9A96E] to-[#C9A96E]/20 hidden sm:block" />
          </div>
        ))}
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-4">
        {/* faturamento + sparkline */}
        <div className={cn("rounded-2xl p-6", CARD)}>
          <div className="flex items-start justify-between mb-5">
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
          {/* sparkline */}
          {diasOrdenados.length > 1 && (
            <div className="mt-4 flex items-end gap-[3px] h-10">
              {diasOrdenados.map(([d, v]) => (
                <div
                  key={d}
                  title={`${fmtData(d)}: ${brl(v)}`}
                  className="flex-1 rounded-t-sm bg-gradient-to-t from-[#C9A96E]/30 to-[#C9A96E] min-w-[3px]"
                  style={{ height: `${Math.max(12, (v / maxDia) * 100)}%` }}
                />
              ))}
            </div>
          )}
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
            <p className={cn("font-serif text-[32px] font-semibold leading-none", lucroReal < 0 ? "text-[#F0A0A0]" : "text-[#F0EDE5]")}>{brl(lucroReal)}</p>
            <p className="text-[13px] text-[#7FBF9D] pt-1">{margemReal.toFixed(1).replace(".", ",")}% do faturamento</p>
            <p className="text-[11px] text-[#64748B] pt-0.5">receita − {brl(comissoesTotal)} comissões − {brl(totalDespesas)} despesas</p>
          </div>
        </div>
      </div>

      {/* KPIs de inteligência */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-8">
        {[
          { icone: HandCoins, rot: "Ticket médio", val: brl(ticketPeriodo), extra: "por serviço pago" },
          { icone: CalendarDays, rot: "Atendimentos", val: String(naoCancelados.length), extra: `${visiveis.length} pago${visiveis.length === 1 ? "" : "s"}` },
          { icone: UserPlus, rot: "Clientes novos", val: String(novos), extra: `${recorrentes} recorrente${recorrentes === 1 ? "" : "s"}` },
          { icone: Percent, rot: "Cancelamento", val: `${taxaCancel.toFixed(0)}%`, extra: `${cancelados.length} no período`, alerta: taxaCancel >= 15 },
          { icone: Wallet, rot: "A receber", val: brl(aReceberValor), extra: `${aReceber.length} não pago${aReceber.length === 1 ? "" : "s"}`, alerta: aReceber.length > 0 },
        ].map((k: any) => (
          <div key={k.rot} className={cn("rounded-2xl p-4", CARD)}>
            <k.icone className={cn("w-4 h-4 mb-3", k.alerta ? "text-[#E8C989]" : "text-[#C9A96E]")} />
            <p className="text-[9px] uppercase tracking-[0.12em] text-[#8896A8] font-semibold">{k.rot}</p>
            <p className={cn("font-serif text-[19px] font-semibold leading-none mt-1", k.alerta ? "text-[#E8C989]" : "text-[#F0EDE5]")}>{k.val}</p>
            <p className="text-[10px] text-[#64748B] mt-1">{k.extra}</p>
          </div>
        ))}
      </div>

      {/* fluxo de caixa • metas • formas de pagamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 mb-4">
        {/* fluxo de caixa */}
        <div className={cn("rounded-2xl p-5", CARD)}>
          <h2 className="font-serif text-[18px] font-semibold text-[#F0EDE5] flex items-center gap-2 mb-4">
            <Landmark className="w-4 h-4 text-[#C9A96E]" /> Fluxo de caixa
          </h2>
          <div className="space-y-2.5 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-[#8896A8]">Entradas (recebido)</span>
              <span className="font-semibold text-[#7FBF9D]">+ {brl(fatPeriodoCheio)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8896A8]">Comissões quitadas</span>
              <span className="font-semibold text-[#E8C989]">− {brl(comissoesQuitadasPeriodo)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8896A8]">Despesas</span>
              <span className="font-semibold text-[#F0A0A0]">− {brl(totalDespesas)}</span>
            </div>
            <div className="h-px bg-[#C9A96E]/15 my-2" />
            <div className="flex items-center justify-between">
              <span className="text-[#F0EDE5] font-medium">Saldo do período</span>
              <span className={cn("font-serif text-[20px] font-semibold", saldoCaixa < 0 ? "text-[#F0A0A0]" : "text-[#F0EDE5]")}>{brl(saldoCaixa)}</span>
            </div>
          </div>
          <div className="mt-4 bg-[#0A0F1A] border border-[#C9A96E]/10 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-[#64748B]">Próximos recebimentos</p>
              <p className="text-[13px] font-semibold text-[#F0EDE5] mt-0.5">{brl(totalRecebiveis)}</p>
            </div>
            <span className="text-[11px] text-[#8896A8]">{recebiveis.length} agendamento{recebiveis.length === 1 ? "" : "s"} futuro{recebiveis.length === 1 ? "" : "s"}</span>
          </div>
        </div>

        {/* metas */}
        <div className={cn("rounded-2xl p-5", CARD)}>
          <h2 className="font-serif text-[18px] font-semibold text-[#F0EDE5] flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-[#C9A96E]" /> Metas de faturamento
          </h2>
          {[
            { p: "diaria", rot: "Diária", atual: fatDia, meta: metaDiaria },
            { p: "semanal", rot: "Semanal", atual: fatSemana, meta: metaSemanal },
            { p: "mensal", rot: "Mensal", atual: fatMesAtual, meta: metaMensal },
          ].map((m) => {
            const prog = m.meta > 0 ? Math.min((m.atual / m.meta) * 100, 100) : 0
            return (
              <div key={m.p} className="mb-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[12px] text-[#8896A8] w-16">{m.rot}</span>
                  <input
                    className="w-24 rounded-lg px-2 py-1 text-[12px] text-right bg-[#0A0F1A] border border-[#C9A96E]/15 text-[#F0EDE5] placeholder-[#64748B] focus:outline-none focus:border-[#C9A96E]/50"
                    placeholder={m.meta > 0 ? String(m.meta) : "Meta R$"}
                    value={metaEdit[m.p] ?? ""}
                    onChange={(e) => setMetaEdit((prev) => ({ ...prev, [m.p]: e.target.value }))}
                    inputMode="decimal"
                  />
                  <span className={cn("text-[11px] font-semibold w-12 text-right", m.meta > 0 && m.atual >= m.meta ? "text-[#7FBF9D]" : "text-[#E8C989]")}>
                    {m.meta > 0 ? `${((m.atual / m.meta) * 100).toFixed(0)}%` : "—"}
                  </span>
                </div>
                <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${prog}%`, background: prog >= 100 ? "linear-gradient(90deg,#34D399,#6EE7B7)" : "linear-gradient(90deg,#C9A96E,#E8D5A3)" }}
                  />
                </div>
              </div>
            )
          })}
          <button
            onClick={salvarMetas}
            disabled={salvandoMeta}
            className="w-full mt-1 inline-flex items-center justify-center gap-1.5 bg-[#C9A96E] text-[#0A0F1A] rounded-full py-2.5 text-[12px] font-semibold hover:bg-[#D4B87A] transition-colors disabled:opacity-60"
          >
            {salvandoMeta ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Salvar metas
          </button>
          {metaMensal > 0 && fatMesAtual < metaMensal && diasParaMeta !== null && (
            <p className="text-[11px] text-[#64748B] mt-2.5 leading-relaxed">
              Faltam <strong className="text-[#E8C989]">{brl(metaMensal - fatMesAtual)}</strong> para a meta do mês.
              No ritmo atual (~{brl(ritmoDiario)}/dia), você chega lá em ~{diasParaMeta} dia{diasParaMeta === 1 ? "" : "s"}.
            </p>
          )}
        </div>

        {/* formas de pagamento */}
        <div className={cn("rounded-2xl p-5", CARD)}>
          <h2 className="font-serif text-[18px] font-semibold text-[#F0EDE5] flex items-center gap-2 mb-4">
            <HandCoins className="w-4 h-4 text-[#C9A96E]" /> Formas de pagamento
          </h2>
          {totalFormas === 0 ? (
            <p className="text-[12px] text-[#64748B] py-6 text-center">Sem atendimentos pagos no período.</p>
          ) : (
            <div className="flex items-center gap-5">
              <div className="relative w-28 h-28 shrink-0 rounded-full" style={{ background: `conic-gradient(${fatiasConic})` }}>
                <div className="absolute inset-[14px] rounded-full bg-[#0E1622] flex flex-col items-center justify-center">
                  <span className="text-[9px] uppercase tracking-widest text-[#64748B]">Total</span>
                  <span className="text-[13px] font-semibold text-[#F0EDE5]">{brl(totalFormas)}</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {formasArr.map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-[12px]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: FORMAS_COR[k] || "#64748B" }} />
                    <span className="text-[#8896A8] flex-1">{FORMAS_LABEL[k] || k}</span>
                    <span className="font-semibold text-[#F0EDE5]">{brl(v)}</span>
                    <span className="text-[#64748B] w-9 text-right">{((v / totalFormas) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-[10px] text-[#64748B] mt-4 leading-relaxed">
            A forma é registrada na Agenda ao marcar um atendimento como pago. Atendimentos antigos aparecem como "Sem registro".
          </p>
        </div>
      </div>

      {/* despesas */}
      <div className={cn("rounded-2xl p-5 mb-8", CARD)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-[18px] font-semibold text-[#F0EDE5] flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#C9A96E]" /> Despesas do período
          </h2>
          {totalDespesas > 0 && <span className="text-[13px] font-semibold text-[#F0A0A0]">{brl(totalDespesas)}</span>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-[150px_1fr_120px_140px_auto_auto] gap-2 mb-4">
          <select
            value={novaDespesa.category}
            onChange={(e) => setNovaDespesa({ ...novaDespesa, category: e.target.value })}
            className="rounded-xl px-3 py-2.5 text-[13px] bg-[#0A0F1A] border border-[#C9A96E]/15 text-[#F0EDE5] focus:outline-none focus:border-[#C9A96E]/50"
          >
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            className="rounded-xl px-3 py-2.5 text-[13px] bg-[#0A0F1A] border border-[#C9A96E]/15 text-[#F0EDE5] placeholder-[#64748B] focus:outline-none focus:border-[#C9A96E]/50 col-span-2 md:col-span-1"
            placeholder="Descrição (opcional)"
            value={novaDespesa.description}
            onChange={(e) => setNovaDespesa({ ...novaDespesa, description: e.target.value })}
          />
          <input
            className="rounded-xl px-3 py-2.5 text-[13px] bg-[#0A0F1A] border border-[#C9A96E]/15 text-[#F0EDE5] placeholder-[#64748B] focus:outline-none focus:border-[#C9A96E]/50"
            placeholder="Valor (R$)"
            inputMode="decimal"
            value={novaDespesa.amount}
            onChange={(e) => setNovaDespesa({ ...novaDespesa, amount: e.target.value })}
          />
          <input
            type="date"
            className="rounded-xl px-3 py-2.5 text-[13px] bg-[#0A0F1A] border border-[#C9A96E]/15 text-[#F0EDE5] focus:outline-none focus:border-[#C9A96E]/50"
            value={novaDespesa.date}
            onChange={(e) => setNovaDespesa({ ...novaDespesa, date: e.target.value })}
          />
          <label className="flex items-center gap-1.5 text-[11px] text-[#8896A8] px-1 cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={novaDespesa.recurring} onChange={(e) => setNovaDespesa({ ...novaDespesa, recurring: e.target.checked })} className="accent-[#C9A96E]" />
            Fixa mensal
          </label>
          <button
            onClick={addDespesa}
            disabled={salvandoDespesa}
            className="inline-flex items-center justify-center gap-1.5 bg-[#C9A96E] text-[#0A0F1A] rounded-xl px-4 py-2.5 text-[12px] font-semibold hover:bg-[#D4B87A] transition-colors disabled:opacity-60"
          >
            {salvandoDespesa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Adicionar
          </button>
        </div>

        {despesas.length === 0 ? (
          <p className="text-[12px] text-[#64748B] text-center py-4">Nenhuma despesa registrada no período. Cadastre aluguel, produtos, marketing... e o lucro passa a ser o lucro REAL.</p>
        ) : (
          <div className="divide-y divide-[#C9A96E]/[0.06]">
            {despesas.map((d) => (
              <div key={d.id} className="py-2.5 flex items-center gap-3">
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#C9A96E]/10 text-[#E8C989] border border-[#C9A96E]/20 shrink-0">{d.category}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#F0EDE5] truncate">{d.description || d.category}{d.recurring && <span className="text-[10px] text-[#64748B] ml-2">fixa mensal</span>}</p>
                </div>
                <span className="text-[12px] text-[#8896A8] shrink-0">{fmtData(d.date)}</span>
                <span className="text-[13px] font-semibold text-[#F0A0A0] shrink-0">{brl(Number(d.amount))}</span>
                <button onClick={() => delDespesa(d.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#64748B] hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* filtros — duas linhas: períodos em cima, status + export embaixo */}
      <div className="space-y-2.5 mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
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
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#64748B] font-semibold mr-1">Comissões</span>
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
          <span className="hidden sm:block w-px h-5 bg-[#C9A96E]/15 mx-1.5" />
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#64748B] font-semibold mr-1">Exportar</span>
          <button
            onClick={exportarCSV}
            disabled={visiveis.length === 0}
            className={cn("flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium border transition-all disabled:opacity-40", CHIP_OFF, "text-[#F0EDE5]")}
          >
            <Download className="w-3.5 h-3.5 text-[#C9A96E]" /> CSV
          </button>
          <button
            onClick={exportarExcel}
            disabled={visiveis.length === 0}
            className={cn("flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium border transition-all disabled:opacity-40", CHIP_OFF, "text-[#F0EDE5]")}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#C9A96E]" /> Excel
          </button>
          <button
            onClick={exportarPDF}
            disabled={visiveis.length === 0}
            className={cn("flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium border transition-all disabled:opacity-40", CHIP_OFF, "text-[#F0EDE5]")}
          >
            <FileText className="w-3.5 h-3.5 text-[#C9A96E]" /> PDF
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

      {/* rankings */}
      {(rankProfs.length > 0 || rankServicos.length > 0) && (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <div className={cn("rounded-2xl overflow-hidden", CARD)}>
            <div className="px-5 py-4 border-b border-[#C9A96E]/[0.08] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#C9A96E]" />
              <h2 className="font-serif text-[18px] font-semibold text-[#F0EDE5]">Ranking de profissionais</h2>
            </div>
            <div className="divide-y divide-[#C9A96E]/[0.06]">
              {rankProfs.map((pr, i) => (
                <div key={pr.id} className="px-5 py-3 flex items-center gap-3">
                  <span className={cn("w-6 text-center font-serif text-[16px] font-semibold", i === 0 ? "text-[#E8C989]" : "text-[#64748B]")}>{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-[#C9A96E] text-[#0A0F1A] flex items-center justify-center text-[10px] font-bold shrink-0">{iniciais(pr.name)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate text-[#F0EDE5]">{pr.name}</p>
                    <p className="text-[11px] text-[#8896A8]">{pr.servicos} serviço{pr.servicos === 1 ? "" : "s"} • {pr.clientes} cliente{pr.clientes === 1 ? "" : "s"} • ticket {brl(pr.ticket)}</p>
                  </div>
                  <span className="text-[13px] font-semibold text-[#F0EDE5] shrink-0">{brl(pr.faturamento)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={cn("rounded-2xl overflow-hidden", CARD)}>
            <div className="px-5 py-4 border-b border-[#C9A96E]/[0.08] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#C9A96E]" />
              <h2 className="font-serif text-[18px] font-semibold text-[#F0EDE5]">Ranking de serviços</h2>
            </div>
            <div className="divide-y divide-[#C9A96E]/[0.06]">
              {rankServicos.map((sv, i) => (
                <div key={sv.nome} className="px-5 py-3 flex items-center gap-3">
                  <span className={cn("w-6 text-center font-serif text-[16px] font-semibold", i === 0 ? "text-[#E8C989]" : "text-[#64748B]")}>{i + 1}</span>
                  <span className="w-8 h-8 rounded-full bg-[#0A0F1A] border border-[#C9A96E]/15 flex items-center justify-center shrink-0">{iconeServico(sv.nome)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate text-[#F0EDE5]">{sv.nome}</p>
                    <p className="text-[11px] text-[#8896A8]">{sv.qtd} realizado{sv.qtd === 1 ? "" : "s"} • ticket {brl(sv.qtd ? sv.fat / sv.qtd : 0)}</p>
                  </div>
                  <span className="text-[13px] font-semibold text-[#F0EDE5] shrink-0">{brl(sv.fat)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* insights */}
      {insights.length > 0 && (
        <div className={cn("mt-5 rounded-2xl p-5 border border-[#C9A96E]/20", CARD)} style={{ background: "linear-gradient(145deg, rgba(201,169,110,0.06) 0%, rgba(19,30,46,0.7) 40%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-[#E8C989]" />
            <h2 className="font-serif text-[18px] font-semibold text-[#F0EDE5]">Insights do período</h2>
          </div>
          <div className="space-y-2">
            {insights.map((frase, i) => (
              <p key={i} className="text-[13px] text-[#B9C2CF] flex items-start gap-2 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9A96E] inline-block mt-[7px] shrink-0" />
                {frase}
              </p>
            ))}
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
        Comissão = valor do atendimento × % do profissional no momento do fechamento. Clientes novos = primeira visita dentro do período (base: últimos 180 dias).
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
