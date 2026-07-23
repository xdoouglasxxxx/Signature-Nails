"use client"

import { createClient } from "@/lib/supabase"
import { useStudio } from "@/lib/useStudio"
import { useCallback, useEffect, useState } from "react"
import { Check, Trash2, Star } from "lucide-react"
import { cn } from "@/lib/utils"

export default function DepoimentosPage() {
  const { studio, loading: loadingStudio } = useStudio()
  const supabase = createClient()
  const [deps, setDeps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!studio) return
    setLoading(true)
    const { data } = await supabase
      .from("testimonials").select("id, client_name, text, rating, approved, created_at")
      .eq("studio_id", studio.id).order("created_at", { ascending: false })
    setDeps(data || [])
    setLoading(false)
  }, [supabase, studio])

  useEffect(() => { fetchAll() }, [fetchAll])

  const aprovar = async (d: any) => {
    const { error } = await supabase.from("testimonials").update({ approved: !d.approved }).eq("id", d.id)
    if (!error) setDeps((prev) => prev.map((x) => (x.id === d.id ? { ...x, approved: !x.approved } : x)))
  }
  const remover = async (d: any) => {
    const { error } = await supabase.from("testimonials").delete().eq("id", d.id)
    if (!error) setDeps((prev) => prev.filter((x) => x.id !== d.id))
  }

  if (loadingStudio || loading)
    return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>

  const pendentes = deps.filter((d) => !d.approved)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-serif font-bold">Depoimentos</h1>
        <p className="text-sm text-navy/60 mt-1">
          {pendentes.length > 0 ? `${pendentes.length} aguardando sua aprovação.` : "Aprove para aparecerem na sua página."}
        </p>
      </div>

      {deps.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-gold/15 text-center text-sm text-navy/50">
          Ainda não há depoimentos. Seus clientes podem deixar um direto na sua página. 💛
        </div>
      ) : (
        <div className="space-y-3">
          {deps.map((d) => (
            <div key={d.id} className={cn("bg-white rounded-2xl p-4 border", d.approved ? "border-emerald-200" : "border-amber-300")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{d.client_name}</p>
                    <div className="flex">{[...Array(d.rating)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-gold text-gold" />)}</div>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold", d.approved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                      {d.approved ? "publicado" : "aguardando"}
                    </span>
                  </div>
                  <p className="text-sm text-navy/70 mt-1.5">"{d.text}"</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gold/10">
                <button onClick={() => aprovar(d)} className={cn("text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1", d.approved ? "bg-white border border-navy/10" : "bg-emerald-600 text-white")}>
                  <Check className="w-3.5 h-3.5" /> {d.approved ? "Despublicar" : "Aprovar e publicar"}
                </button>
                <button onClick={() => remover(d)} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-red-200 text-red-600 inline-flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
