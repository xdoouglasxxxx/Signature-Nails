"use client"

import { createClient } from "@/lib/supabase"
import { useEffect, useMemo, useState } from "react"
import {
  Sparkles, Star, ChevronRight, Clock3, Check, Loader2, MessageCircle,
  Instagram, MapPin, Scissors, ShieldCheck, Globe, Send,
} from "lucide-react"
import { brl, toMin, minToHHMM, toISO, DEFAULT_WH, cn } from "@/lib/utils"

export default function StudioPage({ params }: { params: { slug: string } }) {
  const supabase = createClient()
  const [studio, setStudio] = useState<any>(null)
  const [naoEncontrado, setNaoEncontrado] = useState(false)
  const [servicos, setServicos] = useState<any[]>([])
  const [fotos, setFotos] = useState<any[]>([])
  const [verTudo, setVerTudo] = useState(false)
  const [depoimentos, setDepoimentos] = useState<any[]>([])

  // agendamento
  const [servico, setServico] = useState<any>(null)
  const [diaIdx, setDiaIdx] = useState(0)
  const [horario, setHorario] = useState<string | null>(null)
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [ocupados, setOcupados] = useState<{ ini: number; fim: number }[]>([])
  const [carregandoSlots, setCarregandoSlots] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState("")
  const [confirmado, setConfirmado] = useState(false)

  // depoimento
  const [depNome, setDepNome] = useState("")
  const [depTexto, setDepTexto] = useState("")
  const [depEnviado, setDepEnviado] = useState(false)

  const dias = useMemo(() => {
    const hoje = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(hoje.getDate() + i)
      return {
        date: d,
        iso: toISO(d),
        day: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        num: d.getDate(),
      }
    })
  }, [])
  const diaSel = dias[diaIdx]

  // carrega tudo do studio
  useEffect(() => {
    ;(async () => {
      const { data: s } = await supabase
        .from("studios")
        .select("id, slug, name, specialty, bio, specialties, city, address, phone, instagram, tiktok, website, avatar_url, cover_url, working_hours, slot_interval_minutes")
        .eq("slug", params.slug)
        .maybeSingle()
      if (!s) { setNaoEncontrado(true); return }
      setStudio(s)
      const [{ data: svs }, { data: gal }, { data: deps }] = await Promise.all([
        supabase.from("services").select("id, name, price, duration_minutes, description, category")
          .eq("studio_id", s.id).eq("active", true).order("sort_order").order("created_at"),
        supabase.from("gallery").select("id, image_url, description, category")
          .eq("studio_id", s.id).order("sort_order").order("created_at", { ascending: false }).limit(30),
        supabase.from("testimonials").select("id, client_name, text, rating")
          .eq("studio_id", s.id).eq("approved", true).order("created_at", { ascending: false }).limit(6),
      ])
      setServicos(svs || [])
      if (svs && svs.length > 0) setServico(svs[0])
      setFotos(gal || [])
      setDepoimentos(deps || [])
    })()
  }, [params.slug]) // eslint-disable-line

  // horários ocupados do dia
  useEffect(() => {
    if (!studio) return
    let ativo = true
    setHorario(null)
    setCarregandoSlots(true)
    supabase
      .from("horarios_ocupados")
      .select("start_time, end_time")
      .eq("studio_id", studio.id)
      .eq("date", diaSel.iso)
      .then(({ data }) => {
        if (!ativo) return
        setOcupados((data || []).map((r: any) => ({ ini: toMin(r.start_time.slice(0, 5)), fim: toMin(r.end_time.slice(0, 5)) })))
        setCarregandoSlots(false)
      })
    return () => { ativo = false }
  }, [studio, diaSel.iso]) // eslint-disable-line

  const wh = studio?.working_hours || DEFAULT_WH
  const expediente = wh[String(diaSel.date.getDay())] || null
  const intervalo = studio?.slot_interval_minutes || 30
  const duracao = servico?.duration_minutes || 60

  const slots = useMemo(() => {
    if (!expediente) return []
    const abre = toMin(expediente.start)
    const fecha = toMin(expediente.end)
    const agora = new Date()
    const ehHoje = diaSel.iso === toISO(agora)
    const agoraMin = agora.getHours() * 60 + agora.getMinutes()
    const out: { h: string; ocupado: boolean }[] = []
    for (let t = abre; t + duracao <= fecha; t += intervalo) {
      if (ehHoje && t <= agoraMin) continue
      const conflito = ocupados.some((o) => t < o.fim && t + duracao > o.ini)
      out.push({ h: minToHHMM(t), ocupado: conflito })
    }
    return out
  }, [expediente, intervalo, duracao, ocupados, diaSel.iso])

  const waNumber = (studio?.phone || "").replace(/\D/g, "")
  const linkWhats = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    `Olá! Quero agendar ${servico?.name || "um horário"} no dia ${diaSel.num}${horario ? ` às ${horario}` : ""}. Pode confirmar? 💅✨`,
  )}`

  async function confirmar() {
    setErro("")
    if (!nome.trim()) { setErro("Digite seu nome para confirmar."); return }
    if (telefone.replace(/\D/g, "").length < 10) { setErro("Digite um WhatsApp válido com DDD."); return }
    if (!horario || !servico) { setErro("Escolha um serviço e um horário."); return }

    setEnviando(true)
    const { error } = await supabase.rpc("criar_agendamento", {
      p_slug: params.slug,
      p_nome: nome.trim(),
      p_telefone: telefone.trim(),
      p_service_id: servico.id,
      p_data: diaSel.iso,
      p_horario: horario,
    })
    setEnviando(false)
    if (error) {
      const m = error.message || ""
      if (m.includes("horario_ocupado")) {
        setErro("Ops! Esse horário acabou de ser reservado. Escolha outro.")
        setOcupados((prev) => [...prev, { ini: toMin(horario), fim: toMin(horario) + duracao }])
        setHorario(null)
      } else if (m.includes("horario_passado") || m.includes("data_passada")) {
        setErro("Esse horário já passou. Escolha um horário futuro.")
      } else if (m.includes("dia_fechado") || m.includes("fora_do_horario")) {
        setErro("O studio não atende nesse dia/horário.")
      } else {
        setErro("Não foi possível enviar. Tente pelo WhatsApp.")
      }
      return
    }
    setConfirmado(true)
  }

  async function enviarDepoimento(e: any) {
    e.preventDefault()
    if (!depNome.trim() || depTexto.trim().length < 5) return
    await supabase.from("testimonials").insert({
      studio_id: studio.id,
      client_name: depNome.trim(),
      text: depTexto.trim(),
      rating: 5,
      approved: false,
    })
    setDepEnviado(true)
  }

  if (naoEncontrado)
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Sparkles className="w-8 h-8 text-gold" />
        <h1 className="font-serif text-2xl font-semibold">Studio não encontrado</h1>
        <p className="text-sm text-navy/60">Confira o link ou fale com a profissional.</p>
      </main>
    )

  if (!studio)
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </main>
    )

  const iniciais = studio.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase()

  return (
    <main className="min-h-screen pb-24">
      {/* HERO */}
      <section className="relative bg-navy text-white overflow-hidden">
        {studio.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={studio.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-navy/60 via-navy/80 to-navy" />
        <div className="relative max-w-2xl mx-auto px-6 pt-14 pb-16 text-center">
          <div className="w-24 h-24 rounded-full p-[3px] gold-gradient mx-auto shadow-[0_10px_30px_rgba(201,168,108,0.4)]">
            {studio.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={studio.avatar_url} alt={studio.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-navy flex items-center justify-center font-serif text-2xl font-bold text-goldlight">
                {iniciais}
              </div>
            )}
          </div>
          <h1 className="mt-5 font-serif text-3xl md:text-4xl font-semibold">{studio.name}</h1>
          <p className="mt-1 text-xs tracking-[0.25em] text-gold font-semibold uppercase">
            {studio.specialty || "Nail Designer"}
          </p>
          {studio.city && (
            <p className="mt-3 text-sm text-white/60 flex items-center justify-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gold" /> {studio.city}
            </p>
          )}
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#agendar" className="px-8 py-3.5 rounded-full gold-gradient text-navy font-bold text-sm tracking-wide shadow-[0_10px_30px_rgba(201,168,108,0.4)] inline-flex items-center gap-2">
              AGENDAR AGORA <ChevronRight className="w-4 h-4" />
            </a>
            {waNumber && (
              <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="px-6 py-3 rounded-full border border-white/20 text-sm font-semibold inline-flex items-center gap-2 hover:bg-white/10">
                <MessageCircle className="w-4 h-4 text-gold" /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {/* SOBRE */}
      {(studio.bio || (studio.specialties && studio.specialties.length > 0)) && (
        <section className="max-w-2xl mx-auto px-6 py-12">
          <h2 className="font-serif text-2xl font-semibold text-center">Sobre</h2>
          {studio.bio && <p className="mt-4 text-sm text-navy/70 leading-relaxed text-center whitespace-pre-line">{studio.bio}</p>}
          {studio.specialties && studio.specialties.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {studio.specialties.map((e: string) => (
                <span key={e} className="text-xs px-3 py-1.5 rounded-full bg-white border border-gold/25 text-navy/80 font-medium">
                  ✨ {e}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SERVIÇOS */}
      <section className="max-w-2xl mx-auto px-4 py-10" id="servicos">
        <h2 className="font-serif text-2xl font-semibold text-center mb-6">Serviços</h2>
        <div className="space-y-3">
          {servicos.length === 0 && (
            <p className="text-center text-sm text-navy/50">Os serviços serão publicados em breve.</p>
          )}
          {servicos.map((s) => (
            <div key={s.id} className="bg-white rounded-3xl border border-gold/15 p-5 shadow-[0_10px_30px_rgba(10,31,68,0.06)]">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl gold-gradient flex items-center justify-center shrink-0">
                  <Scissors className="w-5 h-5 text-navy" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-lg font-semibold leading-tight">{s.name}</p>
                  {s.description && <p className="text-sm text-navy/60 mt-1">{s.description}</p>}
                  <p className="text-xs text-navy/50 mt-2 flex items-center gap-1.5">
                    <Clock3 className="w-3.5 h-3.5 text-gold" /> {s.duration_minutes} min
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="font-serif text-xl font-bold">{brl(s.price)}</p>
                <a
                  href="#agendar"
                  onClick={() => setServico(s)}
                  className="px-5 py-2.5 rounded-full bg-navy text-white text-xs font-bold tracking-wide inline-flex items-center gap-1.5"
                >
                  AGENDAR <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GALERIA */}
      {fotos.length > 0 && (
        <section className="max-w-2xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between px-2 mb-4">
            <h2 className="font-serif text-2xl font-semibold">Galeria</h2>
            {fotos.length > 6 && (
              <button onClick={() => setVerTudo((v) => !v)} className="text-xs tracking-widest text-gold font-semibold">
                {verTudo ? "VER MENOS" : `VER TUDO (${fotos.length})`}
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {(verTudo ? fotos : fotos.slice(0, 6)).map((f) => (
              <div key={f.id} className="aspect-[3/4] rounded-2xl overflow-hidden bg-white border border-gold/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.image_url} alt={f.description || "Trabalho"} loading="lazy" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AGENDAR */}
      <section className="max-w-2xl mx-auto px-4 py-10" id="agendar">
        <h2 className="font-serif text-2xl font-semibold text-center mb-6">Agende seu horário</h2>
        {confirmado ? (
          <div className="bg-white rounded-3xl border border-gold/20 p-8 text-center shadow-[0_10px_30px_rgba(10,31,68,0.06)]">
            <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-navy" />
            </div>
            <h3 className="font-serif text-2xl font-semibold mt-4">Agendamento enviado!</h3>
            <p className="text-sm text-navy/60 mt-2">
              {servico?.name} • dia {diaSel.num} às {horario}. A confirmação chega no seu WhatsApp.
            </p>
            <div className="mt-6 space-y-2">
              {waNumber && (
                <a href={linkWhats} target="_blank" rel="noreferrer" className="block w-full py-3 rounded-full bg-navy text-white text-sm font-bold">
                  FALAR NO WHATSAPP
                </a>
              )}
              <button onClick={() => { setConfirmado(false); setHorario(null) }} className="block w-full py-3 rounded-full border border-navy/10 text-sm font-semibold">
                Fazer outro agendamento
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gold/15 p-5 shadow-[0_10px_30px_rgba(10,31,68,0.06)] space-y-6">
            {/* serviço escolhido */}
            {servico && (
              <div className="rounded-2xl bg-navy text-white px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{servico.name}</p>
                  <p className="text-xs text-white/60">{brl(servico.price)} • {servico.duration_minutes} min</p>
                </div>
                <a href="#servicos" className="text-xs text-gold font-semibold">TROCAR</a>
              </div>
            )}

            {/* dias */}
            <div>
              <p className="text-sm font-bold mb-2">Escolha o dia</p>
              <div className="grid grid-cols-7 gap-1.5">
                {dias.map((d, i) => {
                  const fechado = !wh[String(d.date.getDay())]
                  return (
                    <button
                      key={i}
                      onClick={() => setDiaIdx(i)}
                      className={cn(
                        "aspect-[0.85] rounded-xl flex flex-col items-center justify-center gap-0.5 border text-navy transition-all",
                        diaIdx === i
                          ? "bg-navy border-navy text-white"
                          : fechado
                            ? "bg-black/5 border-transparent text-navy/30"
                            : "bg-white border-gold/20 hover:border-gold",
                      )}
                    >
                      <span className="text-[10px] uppercase opacity-60">{d.day}</span>
                      <span className="text-sm font-bold">{d.num}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* horários */}
            <div>
              <p className="text-sm font-bold mb-2">Horários disponíveis</p>
              {carregandoSlots ? (
                <div className="flex items-center gap-2 text-sm text-navy/60 h-10">
                  <Loader2 className="w-4 h-4 animate-spin text-gold" /> Verificando agenda...
                </div>
              ) : !expediente ? (
                <p className="text-sm text-navy/60 bg-cream rounded-xl px-4 py-3 text-center">Fechado neste dia 💤</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-navy/60 bg-cream rounded-xl px-4 py-3 text-center">Sem horários restantes — escolha outra data.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map(({ h, ocupado }) => (
                    <button
                      key={h}
                      disabled={ocupado}
                      onClick={() => setHorario(h)}
                      className={cn(
                        "h-11 rounded-xl border text-sm font-semibold transition-all",
                        ocupado
                          ? "bg-black/5 border-transparent text-navy/25 line-through cursor-not-allowed"
                          : horario === h
                            ? "bg-navy border-navy text-white"
                            : "bg-white border-gold/20 hover:border-gold",
                      )}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* dados */}
            <div className="space-y-3">
              <p className="text-sm font-bold">Seus dados</p>
              <input
                value={nome} onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                className="w-full h-12 rounded-xl border border-navy/10 px-4 text-sm focus:outline-none focus:border-gold"
              />
              <input
                value={telefone} onChange={(e) => setTelefone(e.target.value)} type="tel"
                placeholder="Seu WhatsApp com DDD"
                className="w-full h-12 rounded-xl border border-navy/10 px-4 text-sm focus:outline-none focus:border-gold"
              />
            </div>

            {erro && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{erro}</div>}

            <button
              onClick={confirmar}
              disabled={enviando || !servico}
              className="w-full h-13 py-3.5 rounded-full gold-gradient text-navy font-bold text-sm tracking-wide shadow-[0_10px_24px_rgba(201,168,108,0.35)] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
              {enviando ? "ENVIANDO..." : "CONFIRMAR AGENDAMENTO"}
            </button>
            {waNumber && (
              <a href={linkWhats} target="_blank" rel="noreferrer" className="w-full py-3 rounded-full bg-[#25D366] text-white text-sm font-bold flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" /> AGENDAR PELO WHATSAPP
              </a>
            )}
          </div>
        )}
      </section>

      {/* DEPOIMENTOS */}
      <section className="max-w-2xl mx-auto px-4 py-10">
        <h2 className="font-serif text-2xl font-semibold text-center mb-6">Depoimentos</h2>
        {depoimentos.length > 0 && (
          <div className="space-y-3 mb-6">
            {depoimentos.map((d) => (
              <div key={d.id} className="bg-white rounded-3xl border border-gold/15 p-5">
                <div className="flex gap-0.5 mb-2">
                  {[...Array(d.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                  ))}
                </div>
                <p className="text-sm text-navy/80 leading-relaxed">"{d.text}"</p>
                <p className="text-xs text-navy/50 mt-2 font-semibold">— {d.client_name}</p>
              </div>
            ))}
          </div>
        )}
        {depEnviado ? (
          <p className="text-center text-sm text-navy/60 bg-white rounded-2xl border border-gold/15 py-4">
            Obrigada! Seu depoimento será publicado após aprovação. 💛
          </p>
        ) : (
          <form onSubmit={enviarDepoimento} className="bg-white rounded-3xl border border-gold/15 p-5 space-y-3">
            <p className="text-sm font-bold">Deixe seu depoimento</p>
            <input
              value={depNome} onChange={(e) => setDepNome(e.target.value)}
              placeholder="Seu nome"
              className="w-full h-11 rounded-xl border border-navy/10 px-4 text-sm focus:outline-none focus:border-gold"
            />
            <textarea
              value={depTexto} onChange={(e) => setDepTexto(e.target.value)} rows={3}
              placeholder="Conte como foi sua experiência..."
              className="w-full rounded-xl border border-navy/10 px-4 py-3 text-sm focus:outline-none focus:border-gold"
            />
            <button type="submit" className="px-6 py-2.5 rounded-full bg-navy text-white text-xs font-bold inline-flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> ENVIAR
            </button>
          </form>
        )}
      </section>

      {/* CONTATO */}
      <section className="max-w-2xl mx-auto px-4 py-10 space-y-3">
        <h2 className="font-serif text-2xl font-semibold text-center mb-4">Contato & Localização</h2>
        {studio.address && (
          <div className="bg-white rounded-3xl border border-gold/15 overflow-hidden">
            <iframe
              title="Localização"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(studio.address)}&z=16&output=embed`}
              className="w-full h-[180px] border-0"
              loading="lazy"
            />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.address)}`}
              target="_blank" rel="noreferrer"
              className="h-12 flex items-center justify-center gap-2 text-xs font-bold tracking-wide"
            >
              <MapPin className="w-4 h-4 text-gold" /> ABRIR NO GOOGLE MAPS
            </a>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {waNumber && (
            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="bg-white rounded-2xl border border-gold/15 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center"><MessageCircle className="w-5 h-5 text-white" /></div>
              <div><p className="text-sm font-semibold">WhatsApp</p><p className="text-xs text-navy/50">Resposta rápida</p></div>
            </a>
          )}
          {studio.instagram && (
            <a href={`https://instagram.com/${studio.instagram}`} target="_blank" rel="noreferrer" className="bg-white rounded-2xl border border-gold/15 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center"><Instagram className="w-5 h-5 text-navy" /></div>
              <div><p className="text-sm font-semibold">@{studio.instagram}</p><p className="text-xs text-navy/50">Instagram</p></div>
            </a>
          )}
          {studio.website && (
            <a href={studio.website} target="_blank" rel="noreferrer" className="bg-white rounded-2xl border border-gold/15 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center"><Globe className="w-5 h-5 text-goldlight" /></div>
              <div><p className="text-sm font-semibold">Site</p><p className="text-xs text-navy/50">{studio.website.replace(/https?:\/\//, "")}</p></div>
            </a>
          )}
        </div>
        {/* expediente */}
        <div className="bg-white rounded-3xl border border-gold/15 p-5">
          <p className="text-xs font-bold tracking-widest mb-3">HORÁRIO DE ATENDIMENTO</p>
          <div className="space-y-1.5 text-sm">
            {["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((n, i) => {
              const cfg = wh[String(i)]
              return (
                <div key={i} className="flex justify-between">
                  <span className="text-navy/60">{n}</span>
                  {cfg ? <span className="font-semibold">{cfg.start} - {cfg.end}</span> : <span className="font-semibold text-gold">Fechado</span>}
                </div>
              )
            })}
          </div>
        </div>
        <div className="bg-cream rounded-2xl border border-gold/20 p-4 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-navy shrink-0 mt-0.5" />
          <p className="text-xs text-navy/70 leading-relaxed">
            Materiais esterilizados, descartáveis individuais e protocolo de higiene premium.
          </p>
        </div>
      </section>

      {/* rodapé com loop viral */}
      <footer className="py-8 text-center">
        <a href="/" className="text-xs text-navy/40 hover:text-gold">
          ✨ Página criada com <b>Signature Nails</b> — crie a sua grátis
        </a>
      </footer>

      {/* CTA fixo */}
      {!confirmado && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-2xl mx-auto">
          <a
            href="#agendar"
            className="block w-full py-3.5 rounded-full bg-navy text-white text-center text-sm font-bold tracking-widest shadow-[0_15px_40px_rgba(10,31,68,0.4)] border border-gold/40"
          >
            <Sparkles className="w-4 h-4 inline mr-2 text-gold" />
            AGENDAR AGORA
          </a>
        </div>
      )}
    </main>
  )
}
