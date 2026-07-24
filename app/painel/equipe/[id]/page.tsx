"use client"

import { createClient } from "@/lib/supabase"
import { useStudio } from "@/lib/useStudio"
import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { format, startOfMonth, endOfMonth } from "date-fns"
import {
  ArrowLeft, CalendarDays, Wallet, Scissors, Sparkles, Users, Clock,
  TrendingUp, ChevronRight, Loader2, Check, Trash2, Star, Settings2, CalendarOff, Camera,
} from "lucide-react"
import { brl, cn, DEFAULT_WH } from "@/lib/utils"

const CARD = "bg-[#131E2E]/70 border border-[#C9A96E]/10"
const INPUT = "w-full rounded-xl px-3.5 py-2.5 text-[13px] bg-[#0A0F1A] border border-[#C9A96E]/15 text-[#F0EDE5] placeholder-[#64748B] focus:outline-none focus:border-[#C9A96E]/50"
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const DIAS_SEMANA = [
  { key: "1", label: "Seg" }, { key: "2", label: "Ter" }, { key: "3", label: "Qua" },
  { key: "4", label: "Qui" }, { key: "5", label: "Sex" }, { key: "6", label: "Sáb" }, { key: "0", label: "Dom" },
]

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
  const [folgas, setFolgas] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // configurações
  const [nome, setNome] = useState("")
  const [cargo, setCargo] = useState("")
  const [comissao, setComissao] = useState("")
  const [usaHorarioSalao, setUsaHorarioSalao] = useState(true)
  const [wh, setWh] = useState<any>(DEFAULT_WH)
  const [salvando, setSalvando] = useState(false)
  const [uploadFoto, setUploadFoto] = useState(false)
  const [novaFolga, setNovaFolga] = useState("")
  const [addFolga, setAddFolga] = useState(false)
  const [msg, setMsg] = useState("")

  const hoje = format(new Date(), "yyyy-MM-dd")
  const iniMes = format(startOfMonth(new Date()), "yyyy-MM-dd")
  const fimMes = format(endOfMonth(new Date()), "yyyy-MM-dd")

  const notificar = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 3500) }

  const fetchTudo = useCallback(async () => {
    if (!studio || !params?.id) return
    setLoading(true)
    const [{ data: pr }, { data: ags }, { data: ps }, { data: fs }, { data: rv }] = await Promise.all([
      supabase.from("professionals")
        .select("id, name, role, avatar_url, working_hours, commission_percent, active")
        .eq("studio_id", studio.id).eq("id", params.id).maybeSingle(),
      supabase.from("appointments")
        .select("id, date, start_time, end_time, status, price_at_time, commission_paid, clients(name, phone), services(name)")
        .eq("studio_id", studio.id).eq("professional_id", params.id)
        .order("date", { ascending: false }).order("start_time", { ascending: false })
        .limit(300),
      supabase.from("professional_services").select("services(name)").eq("professional_id", params.id),
      supabase.from("professional_days_off").select("id, date, reason")
        .eq("professional_id", params.id).gte("date", hoje).order("date"),
      supabase.from("professional_reviews").select("id, client_name, rating, comment, created_at")
        .eq("professional_id", params.id).eq("approved", true)
        .order("created_at", { ascending: false }).limit(6),
    ])
    setProf(pr || null)
    setApps(ags || [])
    setServicos((ps || []).map((x: any) => x.services?.name).filter(Boolean))
    setFolgas(fs || [])
    setReviews(rv || [])
    if (pr) {
      setNome(pr.name || "")
      setCargo(pr.role || "")
      setComissao(String(pr.commission_percent ?? ""))
      setUsaHorarioSalao(!pr.working_hours)
      setWh(pr.working_hours || studio.working_hours || DEFAULT_WH)
    }
    setLoading(false)
  }, [supabase, studio, params?.id]) // eslint-disable-line

  useEffect(() => { fetchTudo() }, [fetchTudo])

  const salvarConfig = async () => {
    if (!prof) return
    const pct = parseFloat(String(comissao).replace(",", "."))
    if (!nome.trim()) { notificar("Digite o nome."); return }
    if (isNaN(pct) || pct < 0 || pct > 100) { notificar("Comissão deve ser entre 0 e 100."); return }
    setSalvando(true)
    const payload = {
      name: nome.trim(),
      role: cargo.trim() || null,
      commission_percent: pct,
      working_hours: usaHorarioSalao ? null : wh,
    }
    const { error } = await supabase.from("professionals").update(payload).eq("id", prof.id)
    setSalvando(false)
    if (error) { notificar("Não foi possível salvar. Tente novamente."); return }
    setProf((p: any) => ({ ...p, ...payload }))
    notificar("Configurações salvas ✓")
  }

  const trocarFoto = async (file: File | null) => {
    if (!file || !prof || !studio || !file.type.startsWith("image/")) return
    if (file.size > 8 * 1024 * 1024) { notificar("Foto de até 8MB."); return }
    setUploadFoto(true)
    const ext = file.name.split(".").pop() || "jpg"
    const path = `${studio.id}/equipe/${prof.id}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from("media").upload(path, file, { cacheControl: "3600" })
    if (!upErr) {
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path)
      await supabase.from("professionals").update({ avatar_url: pub.publicUrl }).eq("id", prof.id)
      setProf((p: any) => ({ ...p, avatar_url: pub.publicUrl }))
      notificar("Foto atualizada ✓")
    } else {
      notificar("Não foi possível enviar a foto.")
    }
    setUploadFoto(false)
  }

  const toggleDia = (key: string) =>
    setWh((f: any) => ({ ...f, [key]: f[key] ? null : { start: "09:00", end: "19:00" } }))
  const setHora = (key: string, campo: string, valor: string) =>
    setWh((f: any) => ({ ...f, [key]: { ...f[key], [campo]: valor } }))

  const adicionarFolga = async () => {
    if (!novaFolga || !prof || !studio) return
    setAddFolga(true)
    const { data, error } = await supabase.from("professional_days_off")
      .insert({ studio_id: studio.id, professional_id: prof.id, date: novaFolga })
      .select("id, date, reason").single()
    setAddFolga(false)
    if (error) { notificar(error.code === "23505" ? "Essa data já está registrada." : "Não foi possível adicionar."); return }
    setFolgas((prev) => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)))
    setNovaFolga("")
    notificar("Folga registrada ✓")
  }

  const removerFolga = async (id: string) => {
    const { error } = await supabase.from("professional_days_off").delete().eq("id", id)
    if (!error) setFolgas((prev) => prev.filter((f) => f.id !== id))
  }

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

  const minutos = (h?: string) => { if (!h) return null; const [hh, mm] = h.split(":").map(Number); return hh * 60 + mm }
  const duracoes = validos
    .map((a) => { const i = minutos(a.start_time), f = minutos(a.end_time); return i !== null && f !== null && f > i ? f - i : null })
    .filter((d): d is number => d !== null)
  const duracaoMedia = duracoes.length ? Math.round(duracoes.reduce((x, y) => x + y, 0) / duracoes.length) : null

  const proximos = validos.filter((a) => a.date >= hoje).sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time)).slice(0, 8)
  const historico = validos.filter((a) => a.date < hoje).slice(0, 10)

  const mapaClientes = new Map<string, { nome: string; qtd: number; total: number }>()
  for (const a of validos) {
    const n = a.clients?.name || "Cliente"
    const atual = mapaClientes.get(n) || { nome: n, qtd: 0, total: 0 }
    atual.qtd += 1
    if (a.status === "pago") atual.total += a.price_at_time || 0
    mapaClientes.set(n, atual)
  }
  const clientes = Array.from(mapaClientes.values()).sort((a, b) => b.qtd - a.qtd).slice(0, 12)

  const mediaAvaliacao = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null

  const iniciais = (n?: string) => (n || "—").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase()
  const fmtData = (d: string) => { const [, m, dia] = d.split("-"); return `${dia}/${m}` }
  const diaSemana = (d: string) => { const [a, m, dia] = d.split("-").map(Number); return DIAS[new Date(a, m - 1, dia).getDay()] }
  const fmtHora = (h?: string) => (h || "").slice(0, 5)
  const iconeServico = (n?: string) => {
    const s = (n || "").toLowerCase()
    if (s.includes("corte") || s.includes("barba")) return <Scissors className="w-3 h-3 text-[#C9A96E]" />
    return <Sparkles className="w-3 h-3 text-[#C9A96E]" />
  }
  const Estrelas = ({ nota }: { nota: number }) => (
    <span className="text-[#C9A96E] tracking-tight">
      {"★".repeat(Math.round(nota))}<span className="text-[#3D4A5C]">{"★".repeat(5 - Math.round(nota))}</span>
    </span>
  )

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
          {/* foto com troca por clique */}
          <label className="cursor-pointer relative shrink-0 group" title="Trocar foto">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => trocarFoto(e.target.files?.[0] || null)} />
            {prof.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prof.avatar_url} alt={prof.name} className="w-16 h-16 rounded-full object-cover border-2 border-[#C9A96E]/40 shadow-[0_4px_20px_rgba(201,169,110,0.3)]" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#C9A96E] text-[#0A0F1A] flex items-center justify-center font-bold text-[20px] shadow-[0_4px_20px_rgba(201,169,110,0.3)]">
                {iniciais(prof.name)}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#131E2E] border border-[#C9A96E]/40 flex items-center justify-center">
              {uploadFoto ? <Loader2 className="w-3 h-3 animate-spin text-[#C9A96E]" /> : <Camera className="w-3 h-3 text-[#C9A96E]" />}
            </span>
          </label>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-[30px] md:text-[36px] font-semibold leading-[1.05] text-[#F0EDE5]">{prof.name}</h1>
            <p className="text-[13px] text-[#8896A8] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              {prof.role && <span className="text-[#B9C2CF]">{prof.role}</span>}
              <span>Comissão <strong className="text-[#E8C989]">{pct}%</strong></span>
              {mediaAvaliacao !== null && (
                <span className="flex items-center gap-1.5"><Estrelas nota={mediaAvaliacao} /> {mediaAvaliacao.toFixed(1)} ({reviews.length})</span>
              )}
              <span className="text-[#64748B]">{prof.working_hours ? "horário próprio" : "horários do salão"}</span>
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
            <span className="text-[11px] text-[#64748B] flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {mapaClientes.size}</span>
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

        {/* configurações */}
        <div className={cn("rounded-2xl p-5", CARD)}>
          <h2 className="font-serif text-[18px] font-semibold text-[#F0EDE5] flex items-center gap-2 mb-4">
            <Settings2 className="w-4 h-4 text-[#C9A96E]" /> Configurações do profissional
          </h2>
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#8896A8] font-medium block mb-1.5">Nome</label>
                <input className={INPUT} value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] text-[#8896A8] font-medium block mb-1.5">Cargo / Função</label>
                <input className={INPUT} placeholder="Ex: Barbeiro, Colorista" value={cargo} onChange={(e) => setCargo(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-[#8896A8] font-medium block mb-1.5">Comissão (%)</label>
              <input className={cn(INPUT, "w-32")} inputMode="decimal" value={comissao} onChange={(e) => setComissao(e.target.value)} />
            </div>

            <div>
              <button onClick={() => setUsaHorarioSalao(!usaHorarioSalao)} className="flex items-center gap-3 text-[13px] font-medium text-[#F0EDE5]">
                <span className={cn("w-10 h-6 rounded-full relative transition-colors shrink-0", usaHorarioSalao ? "bg-emerald-500" : "bg-white/10")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", usaHorarioSalao ? "left-[18px]" : "left-0.5")} />
                </span>
                Usa os horários do salão
              </button>
              {!usaHorarioSalao && (
                <div className="mt-3 space-y-2 bg-[#0A0F1A] rounded-xl p-3 border border-[#C9A96E]/10">
                  {DIAS_SEMANA.map((d) => {
                    const cfg = wh[d.key]
                    return (
                      <div key={d.key} className="flex items-center justify-between gap-2">
                        <button onClick={() => toggleDia(d.key)} className="flex items-center gap-2 text-[12px] font-medium min-w-[72px] text-[#F0EDE5]">
                          <span className={cn("w-8 h-5 rounded-full relative shrink-0", cfg ? "bg-emerald-500" : "bg-white/10")}>
                            <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", cfg ? "left-[14px]" : "left-0.5")} />
                          </span>
                          {d.label}
                        </button>
                        {cfg ? (
                          <div className="flex items-center gap-1.5 text-[12px]">
                            <input type="time" value={cfg.start} onChange={(e) => setHora(d.key, "start", e.target.value)} className={cn(INPUT, "h-9 px-1.5 py-0 w-auto")} />
                            <span className="text-[#64748B]">-</span>
                            <input type="time" value={cfg.end} onChange={(e) => setHora(d.key, "end", e.target.value)} className={cn(INPUT, "h-9 px-1.5 py-0 w-auto")} />
                          </div>
                        ) : (
                          <span className="text-[12px] text-[#64748B]">Folga semanal</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              onClick={salvarConfig}
              disabled={salvando}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-[#C9A96E] text-[#0A0F1A] rounded-full py-3 text-[13px] font-semibold hover:bg-[#D4B87A] transition-colors disabled:opacity-60"
            >
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Salvar configurações
            </button>
            <p className="text-[10px] text-[#64748B] leading-relaxed">
              A foto troca clicando nela lá em cima. Jornada usa o mesmo formato da agenda pública (horário próprio já é respeitado nos agendamentos). Serviços que realiza são editados na tela Equipe.
            </p>
          </div>
        </div>

        {/* folgas */}
        <div className={cn("rounded-2xl p-5", CARD)}>
          <h2 className="font-serif text-[18px] font-semibold text-[#F0EDE5] flex items-center gap-2 mb-4">
            <CalendarOff className="w-4 h-4 text-[#C9A96E]" /> Folgas (datas específicas)
          </h2>
          <div className="flex gap-2 mb-4">
            <input className={cn(INPUT, "flex-1")} type="date" min={hoje} value={novaFolga} onChange={(e) => setNovaFolga(e.target.value)} />
            <button
              onClick={adicionarFolga}
              disabled={!novaFolga || addFolga}
              className="inline-flex items-center gap-1.5 bg-[#C9A96E] text-[#0A0F1A] rounded-xl px-4 text-[12px] font-semibold hover:bg-[#D4B87A] transition-colors disabled:opacity-50"
            >
              {addFolga ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Adicionar
            </button>
          </div>
          {folgas.length === 0 ? (
            <p className="text-[12px] text-[#64748B] text-center py-6">Nenhuma folga futura registrada.</p>
          ) : (
            <div className="space-y-2">
              {folgas.map((f) => (
                <div key={f.id} className="flex items-center gap-3 bg-[#0A0F1A] border border-[#C9A96E]/10 rounded-xl px-3.5 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#F0EDE5]">{diaSemana(f.date)}, {fmtData(f.date)}</p>
                    {f.reason && <p className="text-[11px] text-[#8896A8] truncate">{f.reason}</p>}
                  </div>
                  <button onClick={() => removerFolga(f.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#64748B] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-[#64748B] mt-3 leading-relaxed">
            As folgas ainda não bloqueiam a página pública de agendamento — essa integração entra na próxima etapa.
          </p>
        </div>
      </div>

      {/* avaliações */}
      <div className={cn("rounded-2xl overflow-hidden", CARD)}>
        <div className="px-5 py-4 border-b border-[#C9A96E]/[0.08] flex items-center justify-between">
          <h2 className="font-serif text-[18px] font-semibold text-[#F0EDE5] flex items-center gap-2">
            <Star className="w-4 h-4 text-[#C9A96E]" /> Avaliações
          </h2>
          {mediaAvaliacao !== null && (
            <span className="text-[13px] font-semibold text-[#E8C989] flex items-center gap-1.5">
              <Estrelas nota={mediaAvaliacao} /> {mediaAvaliacao.toFixed(1)}
            </span>
          )}
        </div>
        {reviews.length === 0 ? (
          <p className="px-5 py-8 text-[12px] text-[#64748B] text-center">
            Ainda sem avaliações. A coleta automática (cliente avalia após o atendimento) entra na página pública em breve.
          </p>
        ) : (
          <div className="divide-y divide-[#C9A96E]/[0.06]">
            {reviews.map((r) => (
              <div key={r.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-[#F0EDE5]">{r.client_name || "Cliente"}</p>
                  <Estrelas nota={r.rating} />
                </div>
                {r.comment && <p className="text-[12px] text-[#8896A8] mt-1 leading-relaxed">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
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
        Estatísticas do mês atual ({fmtData(iniMes)} — {fmtData(fimMes)}).
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
