"use client"

import { createClient } from "@/lib/supabase"
import { useStudio } from "@/lib/useStudio"
import { useEffect, useState } from "react"
import { Loader2, Check, Info } from "lucide-react"
import { cn, DEFAULT_WH } from "@/lib/utils"

const DIAS = [
  { key: "1", label: "Segunda" }, { key: "2", label: "Terça" }, { key: "3", label: "Quarta" },
  { key: "4", label: "Quinta" }, { key: "5", label: "Sexta" }, { key: "6", label: "Sábado" }, { key: "0", label: "Domingo" },
]

export default function HorariosPage() {
  const { studio, loading } = useStudio()
  const supabase = createClient()
  const [wh, setWh] = useState<any>(DEFAULT_WH)
  const [intervalo, setIntervalo] = useState(30)
  const [saving, setSaving] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState("")

  useEffect(() => {
    if (!studio) return
    if (studio.working_hours) setWh(studio.working_hours)
    if (studio.slot_interval_minutes) setIntervalo(studio.slot_interval_minutes)
  }, [studio])

  const toggleDia = (key: string) => {
    setSalvo(false)
    setWh((prev: any) => ({ ...prev, [key]: prev[key] ? null : { start: "09:00", end: "19:00" } }))
  }
  const setHora = (key: string, campo: "start" | "end", valor: string) => {
    setSalvo(false)
    setWh((prev: any) => ({ ...prev, [key]: { ...prev[key], [campo]: valor } }))
  }

  const salvar = async () => {
    setErro("")
    for (const d of DIAS) {
      const cfg = wh[d.key]
      if (cfg && cfg.start >= cfg.end) { setErro(`${d.label}: abertura precisa ser antes do fechamento.`); return }
    }
    setSaving(true)
    const { error } = await supabase.from("studios").update({ working_hours: wh, slot_interval_minutes: intervalo }).eq("id", studio.id)
    setSaving(false)
    if (error) { setErro("Não foi possível salvar."); return }
    setSalvo(true)
  }

  if (loading)
    return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl lg:text-3xl font-serif font-bold">Horários</h1>
        <p className="text-sm text-navy/60 mt-1">Configure seu expediente. Sua página recalcula os horários na hora.</p>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gold/15 space-y-3">
        {DIAS.map((d) => {
          const cfg = wh[d.key]
          const aberto = !!cfg
          return (
            <div key={d.key} className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-gold/10 last:border-0">
              <button onClick={() => toggleDia(d.key)} className="flex items-center gap-3 text-sm font-medium min-w-[140px]">
                <span className={cn("w-10 h-6 rounded-full relative transition-colors shrink-0", aberto ? "bg-emerald-500" : "bg-navy/15")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", aberto ? "left-[18px]" : "left-0.5")} />
                </span>
                {d.label}
              </button>
              {aberto ? (
                <div className="flex items-center gap-2 text-sm">
                  <input type="time" value={cfg.start} onChange={(e) => setHora(d.key, "start", e.target.value)} className="h-10 rounded-xl border border-navy/10 px-2 focus:outline-none focus:border-gold" />
                  <span className="text-navy/40">até</span>
                  <input type="time" value={cfg.end} onChange={(e) => setHora(d.key, "end", e.target.value)} className="h-10 rounded-xl border border-navy/10 px-2 focus:outline-none focus:border-gold" />
                </div>
              ) : (
                <span className="text-sm text-navy/40">Fechado</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gold/15">
        <p className="text-sm font-medium mb-2">Oferecer horários a cada</p>
        <div className="flex gap-2">
          {[15, 30, 60].map((m) => (
            <button key={m} onClick={() => { setIntervalo(m); setSalvo(false) }} className={cn("px-4 py-2 rounded-full text-sm font-semibold border", intervalo === m ? "bg-navy text-white border-navy" : "bg-white border-navy/10 hover:bg-cream")}>
              {m} min
            </button>
          ))}
        </div>
        <p className="text-xs text-navy/50 mt-3 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          A cada 30 min sua página oferece 09:00, 09:30, 10:00... Só aparecem horários onde o serviço cabe inteiro, sem conflito com outros atendimentos.
        </p>
      </div>

      {erro && <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{erro}</div>}

      <button onClick={salvar} disabled={saving} className="w-full sm:w-auto text-sm font-semibold px-8 py-3 rounded-full bg-navy text-white inline-flex items-center justify-center gap-2 disabled:opacity-60">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : salvo ? <Check className="w-4 h-4" /> : null}
        {saving ? "Salvando..." : salvo ? "Salvo!" : "Salvar horários"}
      </button>
    </div>
  )
}
