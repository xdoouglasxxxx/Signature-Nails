"use client"

import { createClient } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sparkles, Loader2, Check } from "lucide-react"

export default function NovaSenha() {
  const supabase = createClient()
  const router = useRouter()
  const [pronto, setPronto] = useState<"carregando" | "ok" | "invalido">("carregando")
  const [senha, setSenha] = useState("")
  const [senha2, setSenha2] = useState("")
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState(false)

  // Fluxo token_hash: funciona mesmo abrindo o link em outro aparelho.
  // Fallback: sessão criada automaticamente pelo link no mesmo navegador.
  useEffect(() => {
    const iniciar = async () => {
      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get("token_hash")
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
        setPronto(error ? "invalido" : "ok")
        return
      }
      let tentativas = 0
      const checar = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) { setPronto("ok"); return }
        tentativas++
        if (tentativas < 10) setTimeout(checar, 500)
        else setPronto("invalido")
      }
      checar()
    }
    iniciar()
  }, []) // eslint-disable-line

  const salvar = async (e: any) => {
    e.preventDefault()
    setErro("")
    if (senha.length < 8) { setErro("A senha precisa de pelo menos 8 caracteres."); return }
    if (senha !== senha2) { setErro("As senhas não conferem."); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setLoading(false)
    if (error) { setErro("Não foi possível alterar. Tente novamente ou peça um novo link."); return }
    setSucesso(true)
    setTimeout(() => { router.push("/painel"); router.refresh() }, 1500)
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
          <h1 className="font-serif text-2xl font-bold text-white">Nova senha</h1>
          <p className="text-sm text-white/60 mt-1">Crie sua nova senha de acesso</p>
        </div>

        {pronto === "carregando" && (
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
            <Loader2 className="w-6 h-6 animate-spin text-gold mx-auto" />
            <p className="text-sm text-navy/60 mt-3">Validando seu link...</p>
          </div>
        )}

        {pronto === "invalido" && (
          <div className="bg-white rounded-3xl p-6 text-center space-y-3 shadow-2xl">
            <p className="font-serif text-lg font-semibold">Link inválido ou expirado</p>
            <p className="text-sm text-navy/60">Peça um novo link de recuperação.</p>
            <Link href="/recuperar" className="inline-block text-sm font-semibold text-gold hover:underline">Pedir novo link</Link>
          </div>
        )}

        {pronto === "ok" && (
          sucesso ? (
            <div className="bg-white rounded-3xl p-6 text-center space-y-3 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="font-serif text-lg font-semibold">Senha alterada! ✦</p>
              <p className="text-sm text-navy/60">Entrando no seu painel...</p>
            </div>
          ) : (
            <form onSubmit={salvar} className="bg-white rounded-3xl p-6 space-y-4 shadow-2xl">
              <input
                type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
                placeholder="Nova senha (mín. 8 caracteres)"
                className="w-full h-12 rounded-xl border border-navy/10 px-4 text-sm focus:outline-none focus:border-gold"
              />
              <input
                type="password" required value={senha2} onChange={(e) => setSenha2(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full h-12 rounded-xl border border-navy/10 px-4 text-sm focus:outline-none focus:border-gold"
              />
              {erro && <p className="text-xs text-red-600">{erro}</p>}
              <button
                type="submit" disabled={loading}
                className="w-full h-12 rounded-full gold-gradient text-navy font-bold text-sm tracking-wide disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />} SALVAR NOVA SENHA
              </button>
            </form>
          )
        )}
      </div>
    </main>
  )
}
