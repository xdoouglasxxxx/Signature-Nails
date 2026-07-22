import { PLANO } from "./config"

export type StatusPlano = {
  status: "trial" | "ativo" | "expirado"
  diasRestantes: number | null
}

export function statusPlano(studio: any): StatusPlano {
  if (!studio) return { status: "expirado", diasRestantes: 0 }
  const hoje = new Date()

  if (studio.plan === "basico" || studio.plan === "pro") {
    if (!studio.plan_until) return { status: "ativo", diasRestantes: null }
    const fim = new Date(studio.plan_until + "T23:59:59")
    if (fim >= hoje) {
      return { status: "ativo", diasRestantes: Math.ceil((fim.getTime() - hoje.getTime()) / 86400000) }
    }
    return { status: "expirado", diasRestantes: 0 }
  }

  if (studio.plan === "trial") {
    const criado = new Date(studio.created_at)
    const fim = new Date(criado.getTime() + PLANO.trialDias * 86400000)
    if (fim > hoje) {
      return { status: "trial", diasRestantes: Math.ceil((fim.getTime() - hoje.getTime()) / 86400000) }
    }
  }
  return { status: "expirado", diasRestantes: 0 }
}
