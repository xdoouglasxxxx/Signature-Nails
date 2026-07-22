"use client"

import { createClient } from "@/lib/supabase"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sparkles, Loader2 } from "lucide-react"

export default function Cadastro() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [confirmarEmail, setConfirmarEmail] = useState(false)

  const cadastrar = async (e: any) => {
    e.preventDefault()
    setErro("")
    if (senha.length < 8) { setErro("A senha precisa de pelo menos 8 caracteres."); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password: senha })
    setLoading(false)
    if (error) {
      setErro(error.message.includes("registered") ? "Este email já tem conta. Faça login." : "Não foi possível criar a conta. Tente novamente.")
      return
    }
    if (!data.session) { setConfirmarEmail(true); return }
    router.push("/onboarding")
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-navy">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full gold-gradient flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-navy" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-white">Criar conta grátis</h1>
          <p className="text-sm text-white/60 mt-1">Sua página fica pronta em 5 minutos</p>
        </div>
        {confirmarEmail ? (
          <div className="bg-white rounded-3xl p-6 text-center space-y-3 shadow-2xl">
            <p className="font-serif text-lg font-semibold">Confirme seu email 📩</p>
            <p className="text-sm text-navy/60">
              Enviamos um link de confirmação para <b>{email}</b>. Clique nele e depois faça login.
            </p>
            <Link href="/login" className="inline-block text-sm font-semibold text-gold hover:underline">Ir para o login</Link>
          </div>
        ) : (
          <form onSubmit={cadastrar} className="bg-white rounded-3xl p-6 space-y-4 shadow-2xl">
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu melhor email"
              className="w-full h-12 rounded-xl border border-navy/10 px-4 text-sm focus:outline-none focus:border-gold"
            />
            <input
              type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
              placeholder="Crie uma senha (mín. 8 caracteres)"
              className="w-full h-12 rounded-xl border border-navy/10 px-4 text-sm focus:outline-none focus:border-gold"
            />
            {erro && <p className="text-xs text-red-600">{erro}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full h-12 rounded-full gold-gradient text-navy font-bold text-sm tracking-wide disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} CRIAR CONTA
            </button>
            <p className="text-center text-xs text-navy/60">
              Já tem conta?{" "}
              <Link href="/login" className="text-gold font-semibold hover:underline">Entrar</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
