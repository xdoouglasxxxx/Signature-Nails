"use client"

import { createClient } from "@/lib/supabase"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import {
  LayoutDashboard, Calendar, Clock, Images, Users, UserPlus, Scissors,
  User, MessageSquareQuote, LogOut, Menu, X, Sparkles, Crown, Bell, BellRing, Wallet,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { statusPlano, type StatusPlano } from "@/lib/plan"

const MENU = [
  { label: "Dashboard", href: "/painel", icon: LayoutDashboard },
  { label: "Agenda", href: "/painel/agenda", icon: Calendar },
  { label: "Serviços", href: "/painel/servicos", icon: Scissors },
  { label: "Equipe", href: "/painel/equipe", icon: UserPlus },
  { label: "Financeiro", href: "/painel/financeiro", icon: Wallet },
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
  const [studioNome, setStudioNome] = useState<string>("")
  const [push, setPush] = useState<"nao-suportado" | "off" | "on" | "pedindo">("nao-suportado")

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("studios").select("id, name, plan, plan_until, created_at")
        .eq("owner_id", user.id).maybeSingle()
      if (data) { setPlano(statusPlano(data)); setTipoPlano(data.plan); setStudioId(data.id); setStudioNome(data.name || "") }
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
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors w-full border-l-2 border-transparent",
          push === "on"
            ? "text-emerald-300 bg-emerald-500/10"
            : "text-[#8896A8] hover:text-[#F0EDE5] hover:bg-[#C9A96E]/5",
        )}
      >
        {push === "on" ? <BellRing className="w-[18px] h-[18px] text-emerald-400" /> : <Bell className="w-[18px] h-[18px]" />}
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
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors border-l-2",
              ativo
                ? "border-[#C9A96E] bg-[#C9A96E]/[0.07] text-[#F0EDE5]"
                : "border-transparent text-[#8896A8] hover:text-[#F0EDE5] hover:bg-[#C9A96E]/5",
            )}
          >
            <m.icon className={cn("w-[18px] h-[18px]", ativo && "text-[#C9A96E]")} />
            {m.label}
          </Link>
        )
      })}
    </>
  )

  const LogoBloco = ({ compacto = false }: { compacto?: boolean }) => (
    <div className="flex items-center gap-3">
      <div className={cn(
        "rounded-xl flex items-center justify-center border border-[#C9A96E]/20",
        compacto ? "w-8 h-8" : "w-10 h-10",
      )} style={{ background: "rgba(201,169,110,0.06)" }}>
        <span className={cn("font-serif font-bold text-[#C9A96E]", compacto ? "text-[15px]" : "text-[18px]")}>S</span>
      </div>
      <div className="leading-none">
        <div className="font-serif font-bold tracking-[0.12em] text-[15px] text-[#F0EDE5]">SIGNATURE</div>
        {!compacto && <div className="text-[9px] tracking-[0.2em] mt-1 font-semibold text-[#8896A8]">STUDIO OS</div>}
      </div>
    </div>
  )

  return (
    <div className="theme-dark min-h-screen flex bg-[#0A0F1A]">
      {/* sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 p-4 sticky top-0 h-screen border-r border-[#C9A96E]/10 bg-[#0A0F1A]">
        <div className="px-2 py-3 mb-4 border-b border-[#C9A96E]/10 pb-5">
          <LogoBloco />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto scrollbar-none"><NavLinks /></nav>
        <div className="my-3 h-px bg-[#C9A96E]/10" />
        <BotaoPush />
        <button onClick={sair} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[#8896A8] hover:bg-red-500/10 hover:text-red-400 transition-colors border-l-2 border-transparent">
          <LogOut className="w-[18px] h-[18px]" /> Sair
        </button>
        {studioNome && (
          <div className="mt-3 rounded-xl p-3 flex items-center gap-3 border border-[#C9A96E]/12" style={{ background: "rgba(19,30,46,0.4)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-[#F0EDE5] border border-[#C9A96E]/20" style={{ background: "rgba(201,169,110,0.06)" }}>
              {studioNome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate text-[#F0EDE5]">{studioNome}</div>
              <div className="text-[10px] truncate text-[#8896A8]">{tipoPlano === "trial" ? "Teste grátis" : `Plano ${tipoPlano}`}</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#C9A96E]" style={{ boxShadow: "0 0 12px rgba(201,169,110,0.4)" }} />
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* header mobile */}
        <header className="lg:hidden flex items-center justify-between px-4 py-4 sticky top-0 z-30 border-b border-[#C9A96E]/10 bg-[#0A0F1A]">
          <LogoBloco compacto />
          <button onClick={() => setAberto(!aberto)} className="p-2 rounded-xl border border-[#C9A96E]/15 text-[#F0EDE5]" style={{ background: "rgba(19,30,46,0.4)" }}>
            {aberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* menu mobile */}
        {aberto && (
          <div className="lg:hidden fixed inset-0 top-[65px] z-20 p-4 space-y-0.5 overflow-y-auto bg-[#0A0F1A]">
            <NavLinks onClick={() => setAberto(false)} />
            <div className="my-3 h-px bg-[#C9A96E]/10" />
            <BotaoPush />
            <button onClick={sair} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-red-400 border-l-2 border-transparent">
              <LogOut className="w-[18px] h-[18px]" /> Sair
            </button>
          </div>
        )}

        {/* banner do trial */}
        {plano?.status === "trial" && (
          <Link
            href="/painel/assinatura"
            className="block text-center text-xs font-semibold py-2.5 px-4 border-b border-[#C9A96E]/15 text-[#F0EDE5] hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(90deg, rgba(201,169,110,0.14) 0%, rgba(201,169,110,0.06) 50%, rgba(201,169,110,0.14) 100%)" }}
          >
            ✨ Teste grátis: {plano.diasRestantes} dia{plano.diasRestantes === 1 ? "" : "s"} restante{plano.diasRestantes === 1 ? "" : "s"} —{" "}
            <span className="text-[#C9A96E] underline underline-offset-2">garanta o preço de fundadora</span>
          </Link>
        )}

        <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto">
          {bloqueado ? (
            <div className="pt-10 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center mx-auto">
                <Crown className="w-8 h-8 text-navy" />
              </div>
              <h2 className="font-serif text-2xl font-semibold mt-5 text-[#F0EDE5]">
                {tipoPlano === "trial" ? "Seu teste grátis terminou" : "Sua assinatura venceu"}
              </h2>
              <p className="text-sm text-[#8896A8] mt-2 leading-relaxed">
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
