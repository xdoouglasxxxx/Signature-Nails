import Link from "next/link"
import {
  Sparkles, CalendarCheck, Users, Wallet, MessageCircle, Smartphone,
  Scissors, Building2, User, ChevronRight, Check, Star,
} from "lucide-react"

const FEATURES = [
  { icon: Smartphone, title: "Página premium com seu link", desc: "Um endereço exclusivo do seu espaço, com serviços, equipe, fotos e agendamento. Pronto para a bio e para o Google." },
  { icon: CalendarCheck, title: "Agenda inteligente 24h", desc: "Clientes veem apenas horários realmente livres — o sistema considera a duração de cada serviço e o expediente de cada profissional." },
  { icon: Users, title: "Equipe com agendas independentes", desc: "Cada profissional com horários, serviços e agenda próprios. O cliente escolhe com quem quer ser atendido." },
  { icon: Wallet, title: "Comissões calculadas", desc: "Defina o percentual de cada profissional e acompanhe o fechamento do mês pronto na tela, sem planilha." },
  { icon: MessageCircle, title: "WhatsApp integrado", desc: "Mensagens prontas de confirmação, agradecimento e remarcação para cada cliente. Dois toques e enviado." },
  { icon: Star, title: "Sua marca no controle", desc: "Preços, horários, fotos, equipe e perfil: mudou no painel, atualizou na página na hora. Sem depender de ninguém." },
]

const PUBLICOS = [
  { icon: Sparkles, title: "Salões femininos", desc: "Cabelo, unhas, estética e make com agenda organizada por profissional." },
  { icon: Scissors, title: "Barbearias", desc: "Corte e barba com hora marcada, sem fila e sem WhatsApp lotado." },
  { icon: Building2, title: "Espaços completos", desc: "Equipes grandes, múltiplos serviços e comissões sob controle." },
  { icon: User, title: "Autônomos(as)", desc: "Sua página profissional e sua agenda cheia — trabalhando sozinho(a)." },
]

const PASSOS = [
  "Crie sua conta grátis",
  "Cadastre serviços, equipe e horários",
  "Compartilhe seu link exclusivo",
  "Receba agendamentos até fora do expediente",
]

export default function Landing() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full gold-gradient flex items-center justify-center">
            <span className="font-serif text-lg font-bold text-navy leading-none">S</span>
          </div>
          <span className="font-serif text-xl font-bold tracking-wide">Signature</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium hover:text-gold">Entrar</Link>
          <Link href="/cadastro" className="text-sm font-semibold px-4 py-2 rounded-full bg-navy text-white hover:bg-navy/90">
            Começar grátis
          </Link>
        </div>
      </header>

      {/* Hero com vídeo */}
      <section className="relative bg-navy text-white overflow-hidden">
        <video
          autoPlay muted loop playsInline preload="metadata"
          src="/demo-hero.mp4"
          poster="/demo-hero-poster.jpg"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/85 to-navy" />
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-goldlight/30 text-[11px] tracking-[0.2em] text-goldlight font-semibold mb-6 backdrop-blur uppercase">
            Salões • Barbearias • Studios • Autônomos
          </div>
          <h1 className="font-serif text-4xl md:text-6xl font-semibold leading-[1.08]">
            Seu espaço. Suas regras.<br />
            <span className="shimmer">Sua assinatura.</span>
          </h1>
          <p className="mt-6 text-white/75 max-w-xl mx-auto leading-relaxed">
            Página profissional, agendamento online 24h, equipe com agendas independentes
            e comissões calculadas. A plataforma premium de gestão para o seu negócio de beleza.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/cadastro" className="px-8 py-3.5 rounded-full gold-gradient text-navy font-bold text-sm tracking-wide shadow-[0_10px_30px_rgba(177,139,94,0.5)] inline-flex items-center gap-2 hover:scale-[1.02] transition-transform">
              COMEÇAR AGORA — É GRÁTIS <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="mt-3 text-xs text-white/50">14 dias grátis • Sem cartão de crédito • Pronto em 5 minutos</p>
        </div>
      </section>

      {/* Para quem */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="font-serif text-3xl font-semibold text-center">Feito para todo espaço de beleza</h2>
        <p className="text-center text-sm text-navy/60 mt-2">Do atendimento solo à equipe completa.</p>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PUBLICOS.map((p) => (
            <div key={p.title} className="bg-white rounded-3xl border border-gold/15 p-6 text-center hover:border-gold/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-cream border border-gold/20 flex items-center justify-center mx-auto">
                <p.icon className="w-5 h-5 text-gold" />
              </div>
              <h3 className="font-serif text-lg font-semibold mt-3">{p.title}</h3>
              <p className="text-xs text-navy/60 mt-1.5 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-y border-gold/15">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="font-serif text-3xl font-semibold text-center mb-10">Tudo o que o seu negócio precisa</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cream border border-gold/20 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold leading-tight">{f.title}</h3>
                  <p className="text-sm text-navy/60 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
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
      </section>

      {/* CTA final */}
      <section className="relative bg-navy text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-bronze/30" />
        <div className="relative max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold">
            Menos que um corte por mês.
          </h2>
          <p className="mt-3 text-white/70 text-sm max-w-md mx-auto">
            E a sua agenda passa a trabalhar sozinha — de dia, de noite e no feriado.
          </p>
          <Link href="/cadastro" className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 rounded-full gold-gradient text-navy font-bold text-sm tracking-wide">
            CRIAR MINHA PÁGINA <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-navy/50">
        Signature © {new Date().getFullYear()} — Plataforma de gestão e agendamento para beleza
      </footer>
    </main>
  )
}
