"use client"

import { createClient } from "@/lib/supabase"
import { useStudio } from "@/lib/useStudio"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Search, MessageCircle } from "lucide-react"
import { brl } from "@/lib/utils"

export default function ClientesPage() {
  const { studio, loading: loadingStudio } = useStudio()
  const supabase = createClient()
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")

  const fetchAll = useCallback(async () => {
    if (!studio) return
    setLoading(true)
    const { data } = await supabase
      .from("clients")
      .select("id, name, phone, created_at, appointments(id, status, price_at_time)")
      .eq("studio_id", studio.id)
      .order("created_at", { ascending: false })
    setClientes(data || [])
    setLoading(false)
  }, [supabase, studio])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter((c) => c.name?.toLowerCase().includes(q) || String(c.phone || "").includes(q))
  }, [clientes, busca])

  if (loadingStudio || loading)
    return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-serif font-bold">Clientes</h1>
        <p className="text-sm text-navy/60 mt-1">{clientes.length} cadastrados.</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-navy/40" />
        <input
          value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full h-12 rounded-2xl border border-gold/20 bg-white pl-11 pr-4 text-sm focus:outline-none focus:border-gold"
        />
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-gold/15 text-center text-sm text-navy/50">Nenhum cliente encontrado.</div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((c) => {
            const apps = c.appointments || []
            const pagos = apps.filter((a: any) => a.status === "pago")
            const total = pagos.reduce((s: number, a: any) => s + (a.price_at_time || 0), 0)
            return (
              <div key={c.id} className="bg-white rounded-2xl p-4 border border-gold/15 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center font-serif font-bold shrink-0">
                    {(c.name || "?").trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-navy/60">
                      {apps.length} agendamento{apps.length === 1 ? "" : "s"} • {pagos.length} pago{pagos.length === 1 ? "" : "s"} • {brl(total)}
                    </p>
                  </div>
                </div>
                {c.phone && (
                  <a href={`https://wa.me/${String(c.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-xs font-semibold px-3 py-2 rounded-full bg-[#25D366]/10 text-[#128C4A] inline-flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
