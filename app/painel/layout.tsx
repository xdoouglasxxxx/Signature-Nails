"use client"

import { createClient } from "@/lib/supabase"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import {
  LayoutDashboard, Calendar, Clock, Images, Users, UserPlus, Scissors,
  User, MessageSquareQuote, LogOut, Menu, X, Sparkles, Crown, Bell, BellRing,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { statusPlano, type StatusPlano } from "@/lib/plan"

const MENU = [
  { label: "Dashboard", href: "/painel", icon: LayoutDashboard },
  { label: "Agenda", href: "/painel/agenda", icon: Calendar },
  { label: "Serviços", href: "/painel/servicos", icon: Scissors },
  { label: "Equipe", href: "/painel/equipe", icon: UserPlus },
  { label: "Horários", href: "/painel/horarios", icon: Clock },
  { label: "Galeria", href: "/painel/galeria", icon: Images },
  { label: "Depoimentos", href: "/painel/depoimentos", icon: MessageSquareQuote },
  { label: "Clientes", href: "/painel/clientes", icon: Users },
  { label: "Perfil", href: "/painel/perfil", icon: User },
  { label: "Assinatura", href: "/painel/assinatura", icon: Crown },
]

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const [plano, setPlano] = useState<StatusPlano | null>(null)
  const [tipoPlano, setTipoPlano] = useState<string>("trial")
  const [studioId, setStudioId] = useState<string | null>(null)
  const [push, setPush] = useState<"nao-suportado" | "off" | "on" | "pedindo">("nao-suportado")

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("studios").select("id, plan, plan_until, created_at")
        .eq("owner_id", user.id).maybeSingle()
      if (data) { setPlano(statusPlano(data)); setTipoPlano(data.plan); setStudioId(data.id) }
    })()
  }, [pathname])

  // estado do push (suporte + inscrição existente)
  useEffect(() => {
    ;(async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return
      setPush("off")
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) setPush("on")
      } catch {}
    })()
  }, [])

  const b64ToUint8 = (base64: string) => {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4)
    const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"))
    return Uint8Array.from(raw.split("").map((c) => c.charCodeAt(0)))
  }

  const ativarPush = async () => {
    if (!studioId || push === "on" || push === "pedindo") return
    setPush("pedindo")
    try {
      const perm = await Notification.requestPermission()
      if (perm !== "granted") { setPush("off"); return }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToUint8(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""),
      })
      const json = sub.toJSON() as any
      const supabase = createClient()
      await supabase.from("push_subscriptions").upsert(
        { studio_id: studioId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
        { onConflict: "endpoint" },
      )
      setPush("on")
    } catch {
      setPush("off")
    }
  }

  const BotaoPush = () => {
    if (push === "nao-suportado") return null
    return (
      <button
        onClick={ativarPush}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors w-full",
          push === "on" ? "text-emerald-700 bg-emerald-50" : "text-navy/60 hover:bg-cream hover:text-navy",
        )}
      >
        {push === "on" ? <BellRing className="w-5 h-5 text-emerald-600" /> : <Bell className="w-5 h-5" />}
        {push === "on" ? "Notificações ativas ✓" : push === "pedindo" ? "Ativando..." : "Ativar notificações"}
      </button>
    )
  }

  const sair = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const bloqueado = plano?.status === "expirado" && pathname !== "/painel/assinatura"

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {MENU.map((m) => {
        const ativo = pathname === m.href
        return (
          <Link
            key={m.href}
            href={m.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              ativo ? "bg-gold/15 text-navy" : "text-navy/60 hover:bg-cream hover:text-navy",
            )}
          >
            <m.icon className={cn("w-5 h-5", ativo && "text-gold")} />
            {m.label}
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="min-h-screen flex bg-cream">
      {/* sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gold/15 p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-2 py-3 mb-4">
          <div className="w-9 h-9 rounded-full gold-gradient flex items-center justify-center">
            <span className="font-serif text-base font-bold text-navy leading-none">S</span>
          </div>
          <span className="font-serif text-lg font-bold">Signature</span>
        </div>
        <nav className="flex-1 space-y-1"><NavLinks /></nav>
        <BotaoPush />
        <button onClick={sair} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-navy/60 hover:bg-red-50 hover:text-red-600">
          <LogOut className="w-5 h-5" /> Sair
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* header mobile */}
        <header className="lg:hidden flex items-center justify-between px-4 py-4 bg-white border-b border-gold/15 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-navy" />
            </div>
            <span className="font-serif text-lg font-semibold">Painel</span>
          </div>
          <button onClick={() => setAberto(!aberto)} className="p-2">
            {aberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* menu mobile */}
        {aberto && (
          <div className="lg:hidden fixed inset-0 top-[65px] bg-white z-20 p-4 space-y-1 overflow-y-auto">
            <NavLinks onClick={() => setAberto(false)} />
            <BotaoPush />
            <button onClick={sair} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-600">
              <LogOut className="w-5 h-5" /> Sair
            </button>
          </div>
        )}

        {/* banner do trial */}
        {plano?.status === "trial" && (
          <Link href="/painel/assinatura" className="block bg-navy text-white text-center text-xs font-semibold py-2.5 px-4 hover:bg-navy/90">
            ✨ Teste grátis: {plano.diasRestantes} dia{plano.diasRestantes === 1 ? "" : "s"} restante{plano.diasRestantes === 1 ? "" : "s"} —{" "}
            <span className="text-goldlight underline">garanta o preço de fundadora</span>
          </Link>
        )}

        <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto">
          {bloqueado ? (
            <div className="pt-10 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center mx-auto">
                <Crown className="w-8 h-8 text-navy" />
              </div>
              <h2 className="font-serif text-2xl font-semibold mt-5">
                {tipoPlano === "trial" ? "Seu teste grátis terminou" : "Sua assinatura venceu"}
              </h2>
              <p className="text-sm text-navy/60 mt-2 leading-relaxed">
                Sua página ficou temporariamente indisponível para as clientes.
                {tipoPlano === "trial" ? " Ative sua assinatura" : " Renove"} para voltar a receber
                agendamentos — leva 2 minutos.
              </p>
              <Link
                href="/painel/assinatura"
                className="mt-6 inline-flex items-center gap-2 px-8 py-3.5 rounded-full gold-gradient text-navy font-bold text-sm tracking-wide"
              >
                <Crown className="w-4 h-4" /> ATIVAR ASSINATURA
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}