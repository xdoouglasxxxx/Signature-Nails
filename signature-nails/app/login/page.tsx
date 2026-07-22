"use client"

import { createClient } from "@/lib/supabase"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sparkles, Loader2 } from "lucide-react"

export default function Login() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")

  const entrar = async (e: any) => {
    e.preventDefault()
    setErro("")
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setLoading(false)
    if (error) { setErro("Email ou senha incorretos."); return }
    router.push("/painel")
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-navy">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full gold-gradient flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-navy" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-white">Signature Nails</h1>
          <p className="text-sm text-white/60 mt-1">Entre no seu painel</p>
        </div>
        <form onSubmit={entrar} className="bg-white rounded-3xl p-6 space-y-4 shadow-2xl">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu email"
            className="w-full h-12 rounded-xl border border-navy/10 px-4 text-sm focus:outline-none focus:border-gold"
          />
          <input
            type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
            placeholder="Sua senha"
            className="w-full h-12 rounded-xl border border-navy/10 px-4 text-sm focus:outline-none focus:border-gold"
          />
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full h-12 rounded-full gold-gradient text-navy font-bold text-sm tracking-wide disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} ENTRAR
          </button>
          <p className="text-center text-xs text-navy/60">
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="text-gold font-semibold hover:underline">Criar grátis</Link>
          </p>
        </form>
      </div>
    </main>
  )
}
