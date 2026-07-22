"use client"

import { createClient } from "@/lib/supabase"
import { useStudio } from "@/lib/useStudio"
import { useCallback, useEffect, useState } from "react"
import { Plus, Pencil, Loader2, Check, X, ArrowUp, ArrowDown } from "lucide-react"
import { brl, cn } from "@/lib/utils"

const emptyForm = { name: "", price: "", duration_minutes: "60", category: "", description: "" }

export default function ServicosPage() {
  const { studio, loading: loadingStudio } = useStudio()
  const supabase = createClient()
  const [servicos, setServicos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<any>(emptyForm)
  const [erro, setErro] = useState("")

  const fetchAll = useCallback(async () => {
    if (!studio) return
    setLoading(true)
    const { data } = await supabase
      .from("services")
      .select("id, name, price, duration_minutes, category, description, active, sort_order")
      .eq("studio_id", studio.id)
      .order("sort_order").order("created_at")
    setServicos(data || [])
    setLoading(false)
  }, [supabase, studio])

  useEffect(() => { fetchAll() }, [fetchAll])

  const startEdit = (s: any) => {
    setErro(""); setEditingId(s.id)
    setForm({ name: s.name, price: String(s.price), duration_minutes: String(s.duration_minutes), category: s.category || "", description: s.description || "" })
  }
  const startNew = () => { setErro(""); setEditingId("new"); setForm(emptyForm) }
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setErro("") }

  const save = async () => {
    setErro("")
    const price = parseFloat(String(form.price).replace(",", "."))
    const dur = parseInt(form.duration_minutes, 10)
    if (!form.name.trim()) { setErro("Digite o nome do serviço."); return }
    if (isNaN(price) || price <= 0) { setErro("Preço inválido (ex: 89,90)."); return }
    if (isNaN(dur) || dur <= 0) { setErro("Duração inválida (minutos)."); return }
    setSaving(true)
    const payload = { name: form.name.trim(), price, duration_minutes: dur, category: form.category.trim() || null, description: form.description.trim() || null }
    let error
    if (editingId === "new") {
      ;({ error } = await supabase.from("services").insert({ ...payload, studio_id: studio.id, active: true, sort_order: servicos.length }))
    } else {
      ;({ error } = await supabase.from("services").update(payload).eq("id", editingId))
    }
    setSaving(false)
    if (error) { setErro("Não foi possível salvar."); return }
    cancelEdit(); fetchAll()
  }

  const toggleActive = async (s: any) => {
    const { error } = await supabase.from("services").update({ active: !s.active }).eq("id", s.id)
    if (!error) setServicos((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)))
  }

  const mover = async (idx: number, dir: -1 | 1) => {
    const alvo = idx + dir
    if (alvo < 0 || alvo >= servicos.length) return
    const novo = [...servicos]
    ;[novo[idx], novo[alvo]] = [novo[alvo], novo[idx]]
    setServicos(novo)
    await Promise.all(novo.map((s, i) => supabase.from("services").update({ sort_order: i }).eq("id", s.id)))
  }

  const FormCard = (
    <div className="bg-white rounded-2xl p-5 border-2 border-gold/40 space-y-3">
      <p className="font-serif font-semibold">{editingId === "new" ? "Novo serviço" : "Editar serviço"}</p>
      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome (ex: Alongamento em Gel)" className="w-full h-11 rounded-xl border border-navy/10 px-3 text-sm focus:outline-none focus:border-gold" />
      <div className="grid grid-cols-2 gap-3">
        <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Preço (89,90)" inputMode="decimal" className="h-11 rounded-xl border border-navy/10 px-3 text-sm focus:outline-none focus:border-gold" />
        <input value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} placeholder="Duração (min)" inputMode="numeric" className="h-11 rounded-xl border border-navy/10 px-3 text-sm focus:outline-none focus:border-gold" />
      </div>
      <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Categoria (ex: alongamento)" className="w-full h-11 rounded-xl border border-navy/10 px-3 text-sm focus:outline-none focus:border-gold" />
      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição curta que aparece na sua página" rows={2} className="w-full rounded-xl border border-navy/10 px-3 py-2 text-sm focus:outline-none focus:border-gold" />
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

  if (loadingStudio || loading)
    return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-serif font-bold">Serviços</h1>
          <p className="text-sm text-navy/60 mt-1">Alterações aparecem na sua página na hora.</p>
        </div>
        {editingId === null && (
          <button onClick={startNew} className="text-xs font-semibold px-4 py-2.5 rounded-full gold-gradient text-navy inline-flex items-center gap-1">
            <Plus className="w-4 h-4" /> Novo serviço
          </button>
        )}
      </div>

      {editingId === "new" && FormCard}

      <div className="space-y-3">
        {servicos.map((s, i) =>
          editingId === s.id ? (
            <div key={s.id}>{FormCard}</div>
          ) : (
            <div key={s.id} className={cn("bg-white rounded-2xl p-4 border border-gold/15 flex flex-wrap items-center justify-between gap-3", !s.active && "opacity-50")}>
              <div className="min-w-0 flex items-center gap-2">
                <div className="flex flex-col">
                  <button onClick={() => mover(i, -1)} disabled={i === 0} className="p-0.5 disabled:opacity-20"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => mover(i, 1)} disabled={i === servicos.length - 1} className="p-0.5 disabled:opacity-20"><ArrowDown className="w-3.5 h-3.5" /></button>
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-xs text-navy/60 truncate">{brl(s.price)} • {s.duration_minutes} min{s.category ? ` • ${s.category}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(s)} className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border", s.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-navy/10 bg-white text-navy/60")}>
                  {s.active ? "Visível" : "Oculto"}
                </button>
                <button onClick={() => startEdit(s)} className="p-2 rounded-full hover:bg-cream" aria-label="Editar"><Pencil className="w-4 h-4" /></button>
              </div>
            </div>
          ),
        )}
        {servicos.length === 0 && editingId === null && (
          <div className="bg-white rounded-2xl p-8 border border-gold/15 text-center text-sm text-navy/50">
            Cadastre seu primeiro serviço para ele aparecer na sua página ✨
          </div>
        )}
      </div>
    </div>
  )
}
