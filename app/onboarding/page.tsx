"use client"

import { createClient } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2, Check, X } from "lucide-react"
import { slugify } from "@/lib/utils"

export default function Onboarding() {
  const supabase = createClient()
  const router = useRouter()
  const [nome, setNome] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEditado, setSlugEditado] = useState(false)
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "livre" | "ocupado">("idle")
  const [whatsapp, setWhatsapp] = useState("")
  const [cidade, setCidade] = useState("")
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")

  // já tem studio? vai direto pro painel
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/login"); return }
      const { data } = await supabase.from("studios").select("id").eq("owner_id", user.id).maybeSingle()
      if (data) router.replace("/painel")
    })()
  }, []) // eslint-disable-line

  useEffect(() => {
    if (!slugEditado) setSlug(slugify(nome))
  }, [nome, slugEditado])

  useEffect(() => {
    if (slug.length < 3) { setSlugStatus("idle"); return }
    setSlugStatus("checking")
    const t = setTimeout(async () => {
      const { data } = await supabase.from("studios").select("id").eq("slug", slug).maybeSingle()
      setSlugStatus(data ? "ocupado" : "livre")
    }, 400)
    return () => clearTimeout(t)
  }, [slug]) // eslint-disable-line

  const criar = async (e: any) => {
    e.preventDefault()
    setErro("")
    const phone = whatsapp.replace(/\D/g, "")
    if (nome.trim().length < 3) { setErro("Digite o nome do seu studio."); return }
    if (slug.length < 3 || slugStatus === "ocupado") { setErro("Escolha um link válido e disponível."); return }
    if (phone.length < 12) { setErro("WhatsApp: DDI + DDD + número (ex: 5541999998888)."); return }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("studios").insert({
      owner_id: user!.id,
      name: nome.trim(),
      slug,
      phone,
      city: cidade.trim() || null,
      specialty: "Nail Designer",
    })
    setLoading(false)
    if (error) {
      setErro(error.message.includes("slug") ? "Esse link acabou de ser usado. Escolha outro." : "Não foi possível criar. Tente novamente.")
      return
    }
    router.push("/painel")
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-navy py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full gold-gradient flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-navy" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-white">Vamos criar seu studio ✨</h1>
          <p className="text-sm text-white/60 mt-1">Você pode mudar tudo depois no painel</p>
        </div>
        <form onSubmit={criar} className="bg-white rounded-3xl p-6 space-y-4 shadow-2xl">
          <div>
            <label className="text-xs font-semibold text-navy/70">Nome do studio</label>
            <input
              value={nome} onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Maria Silva Nails"
              className="mt-1 w-full h-12 rounded-xl border border-navy/10 px-4 text-sm focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-navy/70">Seu link exclusivo</label>
            <div className="mt-1 flex items-center h-12 rounded-xl border border-navy/10 overflow-hidden focus-within:border-gold">
              <span className="px-3 text-xs text-navy/40 bg-cream h-full flex items-center border-r border-navy/10">/</span>
              <input
                value={slug}
                onChange={(e) => { setSlugEditado(true); setSlug(slugify(e.target.value)) }}
                placeholder="maria-silva-nails"
                className="flex-1 h-full px-3 text-sm focus:outline-none"
              />
              <span className="px-3">
                {slugStatus === "checking" && <Loader2 className="w-4 h-4 animate-spin text-navy/40" />}
                {slugStatus === "livre" && <Check className="w-4 h-4 text-emerald-600" />}
                {slugStatus === "ocupado" && <X className="w-4 h-4 text-red-500" />}
              </span>
            </div>
            {slugStatus === "ocupado" && <p className="text-xs text-red-600 mt-1">Esse link já está em uso.</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-navy/70">WhatsApp (com DDI e DDD)</label>
            <input
              value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="5541999998888" inputMode="numeric"
              className="mt-1 w-full h-12 rounded-xl border border-navy/10 px-4 text-sm focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-navy/70">Cidade (opcional)</label>
            <input
              value={cidade} onChange={(e) => setCidade(e.target.value)}
              placeholder="Curitiba - PR"
              className="mt-1 w-full h-12 rounded-xl border border-navy/10 px-4 text-sm focus:outline-none focus:border-gold"
            />
          </div>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full h-12 rounded-full gold-gradient text-navy font-bold text-sm tracking-wide disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} CRIAR MEU STUDIO
          </button>
        </form>
      </div>
    </main>
  )
}
