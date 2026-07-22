import Link from "next/link"
import { Sparkles, CalendarCheck, Smartphone, Palette, MessageCircle, ChevronRight, Check } from "lucide-react"

const FEATURES = [
  { icon: Smartphone, title: "Sua página profissional", desc: "Um link só seu (signature.app/seu-nome) com seus serviços, fotos, depoimentos e mapa. Pronto para colocar na bio." },
  { icon: CalendarCheck, title: "Agenda inteligente", desc: "Clientes veem só horários realmente livres — o sistema considera a duração de cada serviço e seu expediente." },
  { icon: Palette, title: "Você no controle", desc: "Painel completo: preços, horários, fotos, perfil. Mudou, atualizou no site na hora. Sem depender de ninguém." },
  { icon: MessageCircle, title: "WhatsApp integrado", desc: "Mensagens prontas de confirmação, agradecimento e remarcação. Dois toques por cliente." },
]

const PASSOS = [
  "Crie sua conta grátis",
  "Cadastre serviços, horários e fotos",
  "Compartilhe seu link na bio",
  "Receba agendamentos até dormindo",
]

export default function Landing() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full gold-gradient flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-navy" />
          </div>
          <span className="font-serif text-xl font-bold">Signature Nails</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium hover:text-gold">Entrar</Link>
          <Link href="/cadastro" className="text-sm font-semibold px-4 py-2 rounded-full bg-navy text-white hover:bg-navy/90">
            Criar conta grátis
          </Link>
        </div>
      </header>

      {/* Hero com vídeo */}
      <section className="relative bg-navy text-white overflow-hidden">
        <video
          autoPlay muted loop playsInline preload="metadata"
          src="/demo-hero.mp4"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/70 via-navy/60 to-navy" />
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-goldlight/30 text-xs tracking-widest text-goldlight font-semibold mb-6 backdrop-blur">
            <Sparkles className="w-3.5 h-3.5" /> FEITO PARA NAIL DESIGNERS
          </div>
          <h1 className="font-serif text-4xl md:text-6xl font-semibold leading-[1.05]">
            Sua agenda cheia,<br />
            <span className="shimmer">sem novela no direct.</span>
          </h1>
          <p className="mt-6 text-white/75 max-w-xl mx-auto leading-relaxed">
            Página profissional + agendamento online em tempo real + painel completo.
            Suas clientes agendam em 30 segundos, você gerencia tudo do celular.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/cadastro" className="h-13 px-8 py-3.5 rounded-full gold-gradient text-navy font-bold text-sm tracking-wide shadow-[0_10px_30px_rgba(177,139,94,0.5)] inline-flex items-center gap-2 hover:scale-[1.02] transition-transform">
              COMEÇAR AGORA — É GRÁTIS <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="mt-3 text-xs text-white/50">Sem cartão de crédito • Pronto em 5 minutos</p>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-y border-gold/15">
        <div className="max-w-5xl mx-auto px-6 py-16 grid sm:grid-cols-2 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cream border border-gold/20 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-navy/60 mt-1 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="font-serif text-3xl font-semibold text-center">Como funciona</h2>
        <div className="mt-8 space-y-4">
          {PASSOS.map((p, i) => (
            <div key={i} className="flex items-center gap-4 bg-white rounded-2xl border border-gold/15 p-4">
              <div className="w-9 h-9 rounded-full bg-navy text-goldlight font-serif font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <p className="font-medium">{p}</p>
              <Check className="w-5 h-5 text-gold ml-auto shrink-0" />
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/cadastro" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-navy text-white font-bold text-sm tracking-wide hover:bg-navy/90">
            CRIAR MINHA PÁGINA <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-gold/15 py-8 text-center text-xs text-navy/50">
        Signature Nails © {new Date().getFullYear()} — Agendamento online para profissionais de unhas
      </footer>
    </main>
  )
}