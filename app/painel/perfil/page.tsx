"use client"

import { createClient } from "@/lib/supabase"
import { useStudio } from "@/lib/useStudio"
import { useEffect, useState } from "react"
import { Loader2, Check, Camera, Image as ImageIcon } from "lucide-react"

export default function PerfilPage() {
  const { studio, loading, refresh } = useStudio()
  const supabase = createClient()
  const [form, setForm] = useState<any>({
    name: "", specialty: "", bio: "", city: "", address: "",
    phone: "", instagram: "", tiktok: "", website: "", specialties: "",
  })
  const [saving, setSaving] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState("")
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null)

  useEffect(() => {
    if (!studio) return
    setForm({
      name: studio.name || "",
      specialty: studio.specialty || "",
      bio: studio.bio || "",
      city: studio.city || "",
      address: studio.address || "",
      phone: studio.phone || "",
      instagram: studio.instagram || "",
      tiktok: studio.tiktok || "",
      website: studio.website || "",
      specialties: (studio.specialties || []).join(", "),
    })
  }, [studio])

  const set = (k: string, v: string) => { setSalvo(false); setForm((p: any) => ({ ...p, [k]: v })) }

  const uploadImagem = async (tipo: "avatar" | "cover", file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return
    if (file.size > 8 * 1024 * 1024) { setErro("A imagem deve ter no máximo 8MB."); return }
    setErro(""); setUploading(tipo)
    const ext = file.name.split(".").pop() || "jpg"
    const path = `${studio.id}/perfil/${tipo}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from("media").upload(path, file, { cacheControl: "3600" })
    if (upErr) { setErro("Falha no upload da imagem."); setUploading(null); return }
    const { data: pub } = supabase.storage.from("media").getPublicUrl(path)
    await supabase.from("studios").update({ [`${tipo}_url`]: pub.publicUrl }).eq("id", studio.id)
    setUploading(null)
    refresh()
  }

  const uploadVideo = async (file: File | null) => {
    if (!file || !file.type.startsWith("video/")) return
    if (file.size > 40 * 1024 * 1024) { setErro("O vídeo deve ter no máximo 40MB. Dica: vídeos de 10-20s são ideais."); return }
    setErro(""); setUploading("video" as any)
    const ext = file.name.split(".").pop() || "mp4"
    const path = `${studio.id}/perfil/hero-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from("media").upload(path, file, { cacheControl: "3600" })
    if (upErr) { setErro("Falha no upload do vídeo."); setUploading(null); return }
    const { data: pub } = supabase.storage.from("media").getPublicUrl(path)
    await supabase.from("studios").update({ hero_video_url: pub.publicUrl }).eq("id", studio.id)
    setUploading(null)
    refresh()
  }

  const removerVideo = async () => {
    await supabase.from("studios").update({ hero_video_url: null }).eq("id", studio.id)
    refresh()
  }

  const salvar = async () => {
    setErro("")
    const phone = form.phone.replace(/\D/g, "")
    if (!form.name.trim()) { setErro("Digite o nome do studio."); return }
    if (phone.length < 12) { setErro("WhatsApp: DDI + DDD + número (ex: 5541999998888)."); return }
    setSaving(true)
    const { error } = await supabase.from("studios").update({
      name: form.name.trim(),
      specialty: form.specialty.trim() || null,
      bio: form.bio.trim() || null,
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      phone,
      instagram: form.instagram.replace("@", "").trim() || null,
      tiktok: form.tiktok.replace("@", "").trim() || null,
      website: form.website.trim() || null,
      specialties: form.specialties.split(",").map((s: string) => s.trim()).filter(Boolean),
    }).eq("id", studio.id)
    setSaving(false)
    if (error) { setErro("Não foi possível salvar."); return }
    setSalvo(true)
    refresh()
  }

  if (loading)
    return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>

  const CAMPOS = [
    { key: "name", label: "Nome do studio", ph: "Maria Silva Nails" },
    { key: "specialty", label: "Especialidade (título)", ph: "Nail Designer • Alongamentos" },
    { key: "city", label: "Cidade", ph: "Curitiba - PR" },
    { key: "address", label: "Endereço (para o mapa)", ph: "Rua das Flores, 100 - Centro, Curitiba" },
    { key: "phone", label: "WhatsApp (DDI+DDD+número)", ph: "5541999998888" },
    { key: "instagram", label: "Instagram (sem @)", ph: "marianails" },
    { key: "tiktok", label: "TikTok (sem @, opcional)", ph: "marianails" },
    { key: "website", label: "Site (opcional)", ph: "https://..." },
    { key: "specialties", label: "Especialidades (separadas por vírgula)", ph: "Alongamento em gel, Nail art, Blindagem" },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl lg:text-3xl font-serif font-bold">Perfil</h1>
        <p className="text-sm text-navy/60 mt-1">Tudo aqui aparece na sua página pública.</p>
      </div>

      {/* fotos */}
      <div className="bg-white rounded-2xl p-5 border border-gold/15">
        <p className="text-sm font-bold mb-3">Fotos</p>
        <div className="flex flex-wrap gap-4">
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImagem("avatar", e.target.files?.[0] || null)} />
            <div className="w-24 h-24 rounded-full gold-gradient p-[3px]">
              {studio.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={studio.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-cream flex items-center justify-center">
                  {uploading === "avatar" ? <Loader2 className="w-5 h-5 animate-spin text-gold" /> : <Camera className="w-5 h-5 text-gold" />}
                </div>
              )}
            </div>
            <p className="text-xs text-center text-navy/60 mt-1.5">Perfil</p>
          </label>
          <label className="cursor-pointer flex-1 min-w-[200px]">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImagem("cover", e.target.files?.[0] || null)} />
            <div className="h-24 rounded-2xl border-2 border-dashed border-gold/40 overflow-hidden bg-cream flex items-center justify-center">
              {studio.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={studio.cover_url} alt="" className="w-full h-full object-cover" />
              ) : uploading === "cover" ? (
                <Loader2 className="w-5 h-5 animate-spin text-gold" />
              ) : (
                <span className="text-xs text-navy/50 flex items-center gap-1.5"><ImageIcon className="w-4 h-4 text-gold" /> Foto de capa (fundo do topo)</span>
              )}
            </div>
            <p className="text-xs text-center text-navy/60 mt-1.5">Capa</p>
          </label>
        </div>
        <div className="mt-4 pt-4 border-t border-gold/10">
          <p className="text-sm font-bold mb-2">Vídeo de abertura (opcional)</p>
          {studio.hero_video_url ? (
            <div className="flex flex-wrap items-center gap-3">
              <video src={studio.hero_video_url} muted loop autoPlay playsInline className="w-28 h-40 object-cover rounded-2xl border border-gold/20" />
              <div className="space-y-2">
                <p className="text-xs text-navy/60 max-w-[220px]">Este vídeo toca no topo da sua página.</p>
                <button onClick={removerVideo} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-red-200 text-red-600">
                  Remover vídeo
                </button>
              </div>
            </div>
          ) : (
            <label className="cursor-pointer block">
              <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => uploadVideo(e.target.files?.[0] || null)} />
              <div className="h-20 rounded-2xl border-2 border-dashed border-gold/40 bg-cream flex items-center justify-center">
                {(uploading as any) === "video" ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gold" />
                ) : (
                  <span className="text-xs text-navy/60 text-center px-4">
                    🎬 Enviar vídeo de apresentação (MP4, até 40MB)<br />
                    <span className="text-navy/40">Sem vídeo, sua página usa o vídeo padrão da plataforma</span>
                  </span>
                )}
              </div>
            </label>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gold/15 space-y-4">
        {CAMPOS.map((c) => (
          <div key={c.key}>
            <label className="text-xs font-semibold text-navy/70">{c.label}</label>
            <input
              value={form[c.key]} onChange={(e) => set(c.key, e.target.value)} placeholder={c.ph}
              className="mt-1 w-full h-11 rounded-xl border border-navy/10 px-3 text-sm focus:outline-none focus:border-gold"
            />
          </div>
        ))}
        <div>
          <label className="text-xs font-semibold text-navy/70">Sobre você (bio)</label>
          <textarea
            value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={4}
            placeholder="Conte sua história, experiência, certificações e o que torna seu trabalho especial..."
            className="mt-1 w-full rounded-xl border border-navy/10 px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </div>
      </div>

      {erro && <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{erro}</div>}

      <button onClick={salvar} disabled={saving} className="w-full sm:w-auto text-sm font-semibold px-8 py-3 rounded-full bg-navy text-white inline-flex items-center justify-center gap-2 disabled:opacity-60">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : salvo ? <Check className="w-4 h-4" /> : null}
        {saving ? "Salvando..." : salvo ? "Salvo!" : "Salvar perfil"}
      </button>
    </div>
  )
}