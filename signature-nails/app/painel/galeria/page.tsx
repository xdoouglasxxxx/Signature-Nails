"use client"

import { createClient } from "@/lib/supabase"
import { useStudio } from "@/lib/useStudio"
import { useCallback, useEffect, useState } from "react"
import { Upload, Trash2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function GaleriaPage() {
  const { studio, loading: loadingStudio } = useStudio()
  const supabase = createClient()
  const [fotos, setFotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState("")

  const fetchAll = useCallback(async () => {
    if (!studio) return
    setLoading(true)
    const { data } = await supabase
      .from("gallery").select("id, image_url, description")
      .eq("studio_id", studio.id).order("created_at", { ascending: false })
    setFotos(data || [])
    setLoading(false)
  }, [supabase, studio])

  useEffect(() => { fetchAll() }, [fetchAll])

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setErro(""); setEnviando(true)
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue
      if (file.size > 8 * 1024 * 1024) { setErro("Cada foto deve ter no máximo 8MB."); continue }
      const ext = file.name.split(".").pop() || "jpg"
      const path = `${studio.id}/gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, { cacheControl: "3600" })
      if (upErr) { setErro("Falha no upload de uma das fotos."); continue }
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path)
      if (pub?.publicUrl) await supabase.from("gallery").insert({ studio_id: studio.id, image_url: pub.publicUrl })
    }
    setEnviando(false)
    fetchAll()
  }

  const remover = async (foto: any) => {
    const { error } = await supabase.from("gallery").delete().eq("id", foto.id)
    if (!error) setFotos((prev) => prev.filter((f) => f.id !== foto.id))
    const marker = "/object/public/media/"
    const idx = String(foto.image_url).indexOf(marker)
    if (idx !== -1) await supabase.storage.from("media").remove([String(foto.image_url).slice(idx + marker.length)])
  }

  if (loadingStudio || loading)
    return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-serif font-bold">Galeria</h1>
        <p className="text-sm text-navy/60 mt-1">{fotos.length} foto{fotos.length === 1 ? "" : "s"} — aparecem na sua página.</p>
      </div>

      <label
        className={cn("block bg-white rounded-2xl border-2 border-dashed border-gold/40 p-8 text-center cursor-pointer hover:bg-cream transition-colors", enviando && "opacity-60 pointer-events-none")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files) }}
      >
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
        <div className="w-12 h-12 rounded-full bg-gold/15 flex items-center justify-center mx-auto mb-3">
          {enviando ? <Loader2 className="w-5 h-5 text-gold animate-spin" /> : <Upload className="w-5 h-5 text-gold" />}
        </div>
        <p className="font-medium text-sm">{enviando ? "Enviando fotos..." : "Toque para escolher fotos ou arraste aqui"}</p>
        <p className="text-xs text-navy/50 mt-1">JPG, PNG ou WebP • até 8MB cada</p>
      </label>

      {erro && <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {fotos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {fotos.map((f) => (
            <div key={f.id} className="relative group rounded-2xl overflow-hidden border border-gold/15 bg-white aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.image_url} alt={f.description || "Foto"} className="w-full h-full object-cover" loading="lazy" />
              <button onClick={() => remover(f)} className="absolute top-2 right-2 p-2 rounded-full bg-white/90 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow" aria-label="Remover">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
