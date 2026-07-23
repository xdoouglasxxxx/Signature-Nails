"use client"

import { createClient } from "@/lib/supabase"
import { useStudio } from "@/lib/useStudio"
import { useCallback, useEffect, useState } from "react"
import { format, startOfMonth } from "date-fns"
import { Plus, Pencil, Loader2, Check, X, Camera, Wallet, Crown } from "lucide-react"
import Link from "next/link"
import { statusPlano } from "@/lib/plan"
import { brl, cn, DEFAULT_WH } from "@/lib/utils"

const DIAS = [
  { key: "1", label: "Seg" }, { key: "2", label: "Ter" }, { key: "3", label: "Qua" },
  { key: "4", label: "Qui" }, { key: "5", label: "Sex" }, { key: "6", label: "Sáb" }, { key: "0", label: "Dom" },
]

const emptyForm = { name: "", role: "", commission_percent: "0", usaHorarioSalao: true, wh: DEFAULT_WH, servicos: [] as string[] }

export default function EquipePage() {
  const { studio, loading: loadingStudio } = useStudio()
  const supabase = createClient()
  const [profs, setProfs] = useState<any[]>([])
  const [servicos, setServicos] = useState<any[]>([])
  const [mapa, setMapa] = useState<Record<string, string[]>>({})
  const [ganhos, setGanhos] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<any>(emptyForm)
  const [erro, setErro] = useState("")
  const [uploadingFoto, setUploadingFoto] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!studio) return
    setLoading(true)
    const inicioMes = format(startOfMonth(new Date()), "yyyy-MM-dd")
    const [{ data: p }, { data: s }, { data: m }, { data: apps }] = await Promise.all([
      supabase.from("professionals")
        .select("id, name, role, avatar_url, working_hours, commission_percent, active, sort_order")
        .eq("studio_id", studio.id).order("sort_order").order("created_at"),
      supabase.from("services").select("id, name").eq("studio_id", studio.id).eq("active", true).order("sort_order"),
      supabase.from("professional_services").select("professional_id, service_id"),
      supabase.from("appointments").select("professional_id, price_at_time")
        .eq("studio_id", studio.id).eq("status", "pago").gte("date", inicioMes),
    ])
    setProfs(p || [])
    setServicos(s || [])
    const mm: Record<string, string[]> = {}
    ;(m || []).forEach((r: any) => { (mm[r.professional_id] ||= []).push(r.service_id) })
    setMapa(mm)
    const gg: Record<string, number> = {}
    ;(apps || []).forEach((a: any) => {
      const k = a.professional_id || "solo"
      gg[k] = (gg[k] || 0) + (a.price_at_time || 0)
    })
    setGanhos(gg)
    setLoading(false)
  }, [supabase, studio])

  useEffect(() => { fetchAll() }, [fetchAll])

  const startNew = () => { setErro(""); setEditingId("new"); setForm({ ...emptyForm, wh: studio.working_hours || DEFAULT_WH }) }
  const startEdit = (p: any) => {
    setErro(""); setEditingId(p.id)
    setForm({
      name: p.name, role: p.role || "",
      commission_percent: String(p.commission_percent || 0),
      usaHorarioSalao: !p.working_hours,
      wh: p.working_hours || studio.working_hours || DEFAULT_WH,
      servicos: mapa[p.id] || [],
    })
  }
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setErro("") }

  const toggleServico = (sid: string) => {
    setForm((f: any) => ({
      ...f,
      servicos: f.servicos.includes(sid) ? f.servicos.filter((x: string) => x !== sid) : [...f.servicos, sid],
    }))
  }
  const toggleDia = (key: string) => {
    setForm((f: any) => ({ ...f, wh: { ...f.wh, [key]: f.wh[key] ? null : { start: "09:00", end: "19:00" } } }))
  }
  const setHora = (key: string, campo: string, valor: string) => {
    setForm((f: any) => ({ ...f, wh: { ...f.wh, [key]: { ...f.wh[key], [campo]: valor } } }))
  }

  const save = async () => {
    setErro("")
    const pct = parseFloat(String(form.commission_percent).replace(",", "."))
    if (!form.name.trim()) { setErro("Digite o nome do profissional."); return }
    if (isNaN(pct) || pct < 0 || pct > 100) { setErro("Comissão deve ser entre 0 e 100."); return }
    setSaving(true)
    const payload: any = {
      name: form.name.trim(),
      role: form.role.trim() || null,
      commission_percent: pct,
      working_hours: form.usaHorarioSalao ? null : form.wh,
    }
    let profId = editingId
    let error
    if (editingId === "new") {
      const { data, error: e } = await supabase.from("professionals")
        .insert({ ...payload, studio_id: studio.id, sort_order: profs.length })
        .select("id").single()
      error = e
      profId = data?.id
    } else {
      ;({ error } = await supabase.from("professionals").update(payload).eq("id", editingId))
    }
    if (error || !profId) { setSaving(false); setErro("Não foi possível salvar."); return }

    // vínculo de serviços: apaga e regrava
    await supabase.from("professional_services").delete().eq("professional_id", profId)
    if (form.servicos.length > 0) {
      await supabase.from("professional_services")
        .insert(form.servicos.map((sid: string) => ({ professional_id: profId, service_id: sid })))
    }
    setSaving(false)
    cancelEdit()
    fetchAll()
  }

  const toggleActive = async (p: any) => {
    const { error } = await supabase.from("professionals").update({ active: !p.active }).eq("id", p.id)
    if (!error) setProfs((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)))
  }

  const uploadFoto = async (p: any, file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return
    if (file.size > 8 * 1024 * 1024) { setErro("Foto de até 8MB."); return }
    setUploadingFoto(p.id)
    const ext = file.name.split(".").pop() || "jpg"
    const path = `${studio.id}/equipe/${p.id}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from("media").upload(path, file, { cacheControl: "3600" })
    if (!upErr) {
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path)
      await supabase.from("professionals").update({ avatar_url: pub.publicUrl }).eq("id", p.id)
      setProfs((prev) => prev.map((x) => (x.id === p.id ? { ...x, avatar_url: pub.publicUrl } : x)))
    }
    setUploadingFoto(null)
  }

  if (loadingStudio || loading)
    return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>

  // Equipe é recurso do Signature Pro (liberado no teste grátis para experimentar)
  const acessoPro =
    studio.plan === "pro" ||
    (statusPlano(studio).status === "trial" && studio.chosen_plan !== "solo")
  if (!acessoPro)
    return (
      <div className="pt-10 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center mx-auto">
          <Crown className="w-8 h-8 text-navy" />
        </div>
        <h2 className="font-serif text-2xl font-semibold mt-5">Equipe é um recurso do Signature Pro</h2>
        <p className="text-sm text-navy/60 mt-2 leading-relaxed">
          Cadastre profissionais ilimitados, cada um com agenda e horários próprios,
          deixe seus clientes escolherem quem vai atender e tenha as comissões calculadas
          automaticamente no fim do mês.
        </p>
        <Link href="/painel/assinatura" className="mt-6 inline-flex items-center gap-2 px-8 py-3.5 rounded-full gold-gradient text-navy font-bold text-sm tracking-wide">
          <Crown className="w-4 h-4" /> CONHECER O SIGNATURE PRO
        </Link>
      </div>
    )

  const FormCard = (
    <div className="bg-white rounded-2xl p-5 border-2 border-gold/40 space-y-4">
      <p className="font-serif font-semibold">{editingId === "new" ? "Novo profissional" : "Editar profissional"}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" className="h-11 rounded-xl border border-navy/10 px-3 text-sm focus:outline-none focus:border-gold" />
        <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Função (ex: Barbeiro, Cabeleireira...)" className="h-11 rounded-xl border border-navy/10 px-3 text-sm focus:outline-none focus:border-gold" />
      </div>
      <div>
        <label className="text-xs font-semibold text-navy/70">Comissão (%)</label>
        <input value={form.commission_percent} onChange={(e) => setForm({ ...form, commission_percent: e.target.value })} inputMode="decimal" placeholder="Ex: 40" className="mt-1 w-32 h-11 rounded-xl border border-navy/10 px-3 text-sm focus:outline-none focus:border-gold" />
      </div>

      <div>
        <p className="text-xs font-semibold text-navy/70 mb-2">Serviços que realiza</p>
        <div className="flex flex-wrap gap-2">
          {servicos.map((s) => (
            <button key={s.id} onClick={() => toggleServico(s.id)}
              className={cn("text-xs px-3 py-1.5 rounded-full border font-medium",
                form.servicos.includes(s.id) ? "bg-navy text-white border-navy" : "bg-white border-navy/15 hover:border-gold")}>
              {s.name}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-navy/50 mt-1.5">Nenhum marcado = realiza todos os serviços.</p>
      </div>

      <div>
        <button onClick={() => setForm({ ...form, usaHorarioSalao: !form.usaHorarioSalao })} className="flex items-center gap-3 text-sm font-medium">
          <span className={cn("w-10 h-6 rounded-full relative transition-colors shrink-0", form.usaHorarioSalao ? "bg-emerald-500" : "bg-navy/15")}>
            <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", form.usaHorarioSalao ? "left-[18px]" : "left-0.5")} />
          </span>
          Usa os horários do salão
        </button>
        {!form.usaHorarioSalao && (
          <div className="mt-3 space-y-2 bg-cream rounded-xl p-3">
            {DIAS.map((d) => {
              const cfg = form.wh[d.key]
              return (
                <div key={d.key} className="flex items-center justify-between gap-2">
                  <button onClick={() => toggleDia(d.key)} className="flex items-center gap-2 text-xs font-medium min-w-[72px]">
                    <span className={cn("w-8 h-5 rounded-full relative shrink-0", cfg ? "bg-emerald-500" : "bg-navy/15")}>
                      <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", cfg ? "left-[14px]" : "left-0.5")} />
                    </span>
                    {d.label}
                  </button>
                  {cfg ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      <input type="time" value={cfg.start} onChange={(e) => setHora(d.key, "start", e.target.value)} className="h-8 rounded-lg border border-navy/10 px-1.5" />
                      <span className="text-navy/40">-</span>
                      <input type="time" value={cfg.end} onChange={(e) => setHora(d.key, "end", e.target.value)} className="h-8 rounded-lg border border-navy/10 px-1.5" />
                    </div>
                  ) : (
                    <span className="text-xs text-navy/40">Folga</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="text-xs font-semibold px-4 py-2 rounded-full bg-navy text-white inline-flex items-center gap-1 disabled:opacity-60">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Salvar
        </button>
        <button onClick={cancelEdit} className="text-xs font-semibold px-4 py-2 rounded-full bg-white border border-navy/10 inline-flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> Cancelar
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-serif font-bold">Equipe</h1>
          <p className="text-sm text-navy/60 mt-1">
            Cada profissional tem agenda própria. Seus clientes escolhem com quem agendar.
          </p>
        </div>
        {editingId === null && (
          <button onClick={startNew} className="text-xs font-semibold px-4 py-2.5 rounded-full gold-gradient text-navy inline-flex items-center gap-1">
            <Plus className="w-4 h-4" /> Adicionar profissional
          </button>
        )}
      </div>

      {editingId === "new" && FormCard}

      <div className="space-y-3">
        {profs.map((p) =>
          editingId === p.id ? (
            <div key={p.id}>{FormCard}</div>
          ) : (
            <div key={p.id} className={cn("bg-white rounded-2xl p-4 border border-gold/15", !p.active && "opacity-50")}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <label className="cursor-pointer relative shrink-0">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadFoto(p, e.target.files?.[0] || null)} />
                    <div className="w-12 h-12 rounded-full gold-gradient p-[2px]">
                      {p.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatar_url} alt={p.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-cream flex items-center justify-center">
                          {uploadingFoto === p.id ? <Loader2 className="w-4 h-4 animate-spin text-gold" /> : <Camera className="w-4 h-4 text-gold" />}
                        </div>
                      )}
                    </div>
                  </label>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-navy/60 truncate">
                      {p.role || "Profissional"} • comissão {Number(p.commission_percent)}%
                      {p.working_hours ? " • horário próprio" : ""}
                      {(mapa[p.id]?.length || 0) > 0 ? ` • ${mapa[p.id].length} serviço${mapa[p.id].length === 1 ? "" : "s"}` : " • todos os serviços"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-1">
                    <p className="text-[10px] tracking-wider text-navy/50 uppercase">Comissão no mês</p>
                    <p className="text-sm font-bold text-navy inline-flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-gold" />
                      {brl((ganhos[p.id] || 0) * Number(p.commission_percent) / 100)}
                      <span className="text-[10px] font-normal text-navy/50">de {brl(ganhos[p.id] || 0)}</span>
                    </p>
                  </div>
                  <button onClick={() => toggleActive(p)} className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border", p.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-navy/10 bg-white text-navy/60")}>
                    {p.active ? "Ativa" : "Inativa"}
                  </button>
                  <button onClick={() => startEdit(p)} className="p-2 rounded-full hover:bg-cream" aria-label="Editar"><Pencil className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ),
        )}
        {profs.length === 0 && editingId === null && (
          <div className="bg-white rounded-2xl p-8 border border-gold/15 text-center text-sm text-navy/50">
            Trabalha sozinho(a)? Não precisa cadastrar nada aqui — sua agenda já funciona. <br />
            Tem equipe? Cadastre os profissionais e cada um ganha agenda própria. ✨
          </div>
        )}
      </div>
    </div>
  )
}
