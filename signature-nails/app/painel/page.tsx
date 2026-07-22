"use client"

import { createClient } from "@/lib/supabase"
import { useStudio } from "@/lib/useStudio"
import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { CalendarCheck, Hourglass, Users, Wallet, Copy, Check, ExternalLink } from "lucide-react"
import { brl, cn } from "@/lib/utils"

const statusColors: any = {
  pendente: "bg-amber-100 text-amber-700",
  confirmado: "bg-emerald-100 text-emerald-700",
  pago: "bg-blue-100 text-blue-700",
  cancelado: "bg-red-100 text-red-700",
}

export default function Dashboard() {
  const { studio, loading } = useStudio()
  const supabase = createClient()
  const [hoje, setHoje] = useState<any[]>([])
  const [stats, setStats] = useState({ receita: 0, pendentes: 0, clientes: 0 })
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (!studio) return
    ;(async () => {
      const dia = format(new Date(), "yyyy-MM-dd")
      const [{ data: apps }, { count: pend }, { count: cli }] = await Promise.all([
        supabase.from("appointments")
          .select("id, start_time, status, price_at_time, clients(name), services(name)")
          .eq("studio_id", studio.id).eq("date", dia).order("start_time"),
        supabase.from("appointments").select("id", { count: "exact", head: true })
          .eq("studio_id", studio.id).eq("status", "pendente").gte("date", dia),
        supabase.from("clients").select("id", { count: "exact", head: true })
          .eq("studio_id", studio.id),
      ])
      setHoje(apps || [])
      setStats({
        receita: (apps || []).filter((a: any) => a.status === "pago").reduce((s: number, a: any) => s + (a.price_at_time || 0), 0),
        pendentes: pend || 0,
        clientes: cli || 0,
      })
    })()
  }, [studio]) // eslint-disable-line

  if (loading || !studio)
    return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>

  const link = typeof window !== "undefined" ? `${window.location.origin}/${studio.slug}` : `/${studio.slug}`
  const copiar = () => { navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }

  const CARDS = [
    { icon: Wallet, label: "Recebido hoje", valor: brl(stats.receita) },
    { icon: CalendarCheck, label: "Atendimentos hoje", valor: String(hoje.filter((a) => a.status !== "cancelado").length) },
    { icon: Hourglass, label: "Pendentes", valor: String(stats.pendentes) },
    { icon: Users, label: "Clientes", valor: String(stats.clientes) },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-serif font-bold">Olá, {studio.name.split(" ")[0]}! 👋</h1>
        <p className="text-sm text-navy/60 mt-1">Resumo do seu dia.</p>
      </div>

      {/* link público */}
      <div className="bg-navy rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] tracking-widest text-gold font-bold uppercase">Sua página</p>
          <p className="text-sm text-white/90 truncate">{link}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={copiar} className="px-4 py-2 rounded-full gold-gradient text-navy text-xs font-bold inline-flex items-center gap-1.5">
            {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copiado ? "Copiado!" : "Copiar link"}
          </button>
          <Link href={`/${studio.slug}`} target="_blank" className="px-4 py-2 rounded-full border border-white/20 text-white text-xs font-bold inline-flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> Ver
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {CARDS.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-4 border border-gold/15">
            <c.icon className="w-5 h-5 text-gold mb-2" />
            <p className="text-xl font-bold font-serif">{c.valor}</p>
            <p className="text-xs text-navy/50">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gold/15 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-semibold">Hoje</h2>
          <Link href="/painel/agenda" className="text-xs font-semibold text-gold">VER AGENDA →</Link>
        </div>
        {hoje.length === 0 ? (
          <p className="text-sm text-navy/50 text-center py-6">Nenhum atendimento hoje.</p>
        ) : (
          <div className="space-y-2">
            {hoje.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-2 border-b border-gold/10 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-bold w-12">{a.start_time?.substring(0, 5)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.clients?.name}</p>
                    <p className="text-xs text-navy/50 truncate">{a.services?.name}</p>
                  </div>
                </div>
                <span className={cn("text-[10px] px-2 py-1 rounded-full font-semibold", statusColors[a.status] || "bg-gray-100")}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
