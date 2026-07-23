"use client"

import { createClient } from "@/lib/supabase"
import { useState } from "react"
import Link from "next/link"
import { Sparkles, Loader2, MailCheck } from "lucide-react"

export default function Recuperar() {
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState("")

  const enviar = async (e: any) => {
    e.preventDefault()
    setErro("")
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    })
    setLoading(false)
    if (error) { setErro("Não foi possível enviar. Confira o email e tente novamente."); return }
    setEnviado(true)
  }

  return (
    <main className="relative overflow-hidden min-h-screen flex items-center justify-center px-6 bg-navy">
      <video
        autoPlay muted loop playsInline preload="metadata"
        src="/demo-hero.mp4"
        poster="/demo-hero-poster.jpg"
        className="absolute inset-0 w-full h-full object-cover opacity-30"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-navy/60 via-navy/70 to-navy" />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full gold-gradient flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-navy" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-white">Recuperar senha</h1>
          <p className="text-sm text-white/60 mt-1">Enviamos um link para o seu email</p>
        </div>
        {enviado ? (
          <div className="bg-white rounded-3xl p-6 text-center space-y-3 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <MailCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="font-serif text-lg font-semibold">Verifique seu email 📩</p>
            <p className="text-sm text-navy/60">
              Se existir uma conta para <b>{email}</b>, você receberá um link para criar uma nova senha.
              Olhe também a caixa de spam.
            </p>
            <Link href="/login" className="inline-block text-sm font-semibold text-gold hover:underline">Voltar ao login</Link>
          </div>
        ) : (
          <form onSubmit={enviar} className="bg-white rounded-3xl p-6 space-y-4 shadow-2xl">
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email da sua conta"
              className="w-full h-12 rounded-xl border border-navy/10 px-4 text-sm focus:outline-none focus:border-gold"
            />
            {erro && <p className="text-xs text-red-600">{erro}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full h-12 rounded-full gold-gradient text-navy font-bold text-sm tracking-wide disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} ENVIAR LINK
            </button>
            <p className="text-center text-xs text-navy/60">
              Lembrou a senha?{" "}
              <Link href="/login" className="text-gold font-semibold hover:underline">Entrar</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
