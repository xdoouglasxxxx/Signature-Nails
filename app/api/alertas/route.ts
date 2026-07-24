import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"

/**
 * SIGNATURE • ALERTAS AUTOMÁTICOS (Fase 4b)
 * Chamada todo dia pelo Vercel Cron (vercel.json) — ou manualmente:
 *   https://SEU-DOMINIO/api/alertas?secret=SEU_CRON_SECRET
 *
 * Para cada estúdio, monta o digest matinal + alertas e envia por
 * PUSH (todas as inscrições do estúdio) e, se BREVO_API_KEY estiver
 * configurada, também por EMAIL para o dono.
 *
 * Variáveis de ambiente (Vercel → Settings → Environment Variables):
 *   CRON_SECRET                 → senha longa inventada por você (protege a rota)
 *   SUPABASE_SERVICE_ROLE_KEY   → Supabase → Settings → API → service_role
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY (já existe)
 *   VAPID_PRIVATE_KEY           → o par privado da chave acima (provavelmente já existe;
 *                                 se estiver com outro nome, ajuste a linha marcada abaixo)
 *   BREVO_API_KEY               → JÁ EXISTE no seu projeto ✓ (email ativo)
 *   NOTIF_FROM_EMAIL            → JÁ EXISTE ✓ (usada como remetente)
 */

export const dynamic = "force-dynamic"
export const maxDuration = 60

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const ymd = (dt: Date) => {
  // data no fuso de Brasília (o cron roda em UTC)
  const sp = new Date(dt.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
  const p = (n: number) => String(n).padStart(2, "0")
  return `${sp.getFullYear()}-${p(sp.getMonth() + 1)}-${p(sp.getDate())}`
}
const diasAtras = (n: number) => {
  const dt = new Date()
  dt.setDate(dt.getDate() - n)
  return ymd(dt)
}

export async function GET(req: Request) {
  // ---- segurança: só o Cron da Vercel (Bearer) ou você (?secret=) ----
  const url = new URL(req.url)
  const auth = req.headers.get("authorization")
  const secret = process.env.CRON_SECRET
  const autorizado =
    !secret ||
    auth === `Bearer ${secret}` ||
    url.searchParams.get("secret") === secret
  if (!autorizado) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )

  // ---- web-push (mesma infra do push de agendamento) ----
  const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  // >>> se sua chave privada tem outro nome na Vercel, troque aqui <<<
  const vapidPriv = process.env.VAPID_PRIVATE_KEY || process.env.WEB_PUSH_PRIVATE_KEY
  const pushHabilitado = Boolean(vapidPub && vapidPriv)
  if (pushHabilitado) webpush.setVapidDetails("mailto:alertas@signature.app", vapidPub!, vapidPriv!)

  const hoje = ymd(new Date())
  const sete = diasAtras(7)
  const quatorze = diasAtras(14)
  const iniMes = hoje.slice(0, 8) + "01"

  const { data: studios } = await supabase.from("studios").select("id, name, owner_id")
  const resumo: any[] = []

  for (const st of studios || []) {
    try {
      const [
        { data: pend },      // comissões pendentes há 7+ dias
        { data: pag7 },      // pagos últimos 7 dias
        { data: pagAnt7 },   // pagos 7 dias anteriores
        { data: pagMes },    // pagos no mês
        { data: metaRow },   // meta mensal
        { data: deHoje },    // agendamentos de hoje
        { data: todos7 },    // todos os status últimos 7 dias (p/ cancelamento)
      ] = await Promise.all([
        supabase.from("appointments")
          .select("price_at_time, professionals(commission_percent)")
          .eq("studio_id", st.id).eq("status", "pago").eq("commission_paid", false)
          .lte("date", sete).limit(500),
        supabase.from("appointments").select("price_at_time")
          .eq("studio_id", st.id).eq("status", "pago").gt("date", sete).lte("date", hoje).limit(500),
        supabase.from("appointments").select("price_at_time")
          .eq("studio_id", st.id).eq("status", "pago").gt("date", quatorze).lte("date", sete).limit(500),
        supabase.from("appointments").select("price_at_time")
          .eq("studio_id", st.id).eq("status", "pago").gte("date", iniMes).lte("date", hoje).limit(1000),
        supabase.from("goals").select("amount")
          .eq("studio_id", st.id).eq("period", "mensal").maybeSingle(),
        supabase.from("appointments").select("start_time, status, clients(name)")
          .eq("studio_id", st.id).eq("date", hoje)
          .in("status", ["pendente", "confirmado", "pago"])
          .order("start_time").limit(50),
        supabase.from("appointments").select("status")
          .eq("studio_id", st.id).gt("date", sete).lte("date", hoje).limit(500),
      ])

      const linhas: string[] = []

      // digest do dia
      if ((deHoje || []).length > 0) {
        const primeiro = deHoje![0]
        linhas.push(`Hoje: ${deHoje!.length} atendimento${deHoje!.length === 1 ? "" : "s"}, o primeiro às ${(primeiro.start_time || "").slice(0, 5)}${primeiro.clients?.name ? ` (${primeiro.clients.name.split(" ")[0]})` : ""}.`)
      }

      // comissões paradas
      const comPend = (pend || []).reduce((a: number, l: any) => a + (l.price_at_time || 0) * Number(l.professionals?.commission_percent || 0) / 100, 0)
      if (comPend > 0) linhas.push(`Comissões pendentes há 7+ dias: ${brl(comPend)}.`)

      // queda de faturamento
      const soma = (arr: any[] | null) => (arr || []).reduce((a: number, l: any) => a + (l.price_at_time || 0), 0)
      const f7 = soma(pag7), fAnt = soma(pagAnt7)
      if (fAnt > 0) {
        const varia = ((f7 - fAnt) / fAnt) * 100
        if (varia <= -20) linhas.push(`Faturamento dos últimos 7 dias caiu ${Math.abs(varia).toFixed(0)}% vs a semana anterior (${brl(f7)} vs ${brl(fAnt)}).`)
      }

      // meta mensal
      const meta = Number(metaRow?.amount || 0)
      const fMes = soma(pagMes)
      if (meta > 0 && fMes >= meta) linhas.push(`Meta mensal ATINGIDA: ${brl(fMes)} de ${brl(meta)} 🎉`)
      else if (meta > 0 && fMes / meta >= 0.9) linhas.push(`Meta mensal a ${((fMes / meta) * 100).toFixed(0)}% — faltam ${brl(meta - fMes)}.`)

      // cancelamentos
      const tot7 = (todos7 || []).length
      const canc7 = (todos7 || []).filter((t: any) => t.status === "cancelado").length
      if (tot7 >= 5 && canc7 / tot7 >= 0.2) linhas.push(`Cancelamentos altos na semana: ${((canc7 / tot7) * 100).toFixed(0)}% (${canc7} de ${tot7}).`)

      if (linhas.length === 0) { resumo.push({ studio: st.name, enviado: false, motivo: "sem novidades" }); continue }

      const titulo = `Bom dia, ${st.name} ✨`
      const corpo = linhas.join("\n")

      // ---- PUSH ----
      let pushEnviados = 0
      if (pushHabilitado) {
        const { data: subs } = await supabase.from("push_subscriptions")
          .select("id, endpoint, p256dh, auth").eq("studio_id", st.id)
        for (const s of subs || []) {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any,
              JSON.stringify({ title: titulo, body: corpo, url: "/painel/financeiro" }),
            )
            pushEnviados++
          } catch (e: any) {
            if (e?.statusCode === 404 || e?.statusCode === 410) {
              await supabase.from("push_subscriptions").delete().eq("id", s.id)
            }
          }
        }
      }

      // ---- EMAIL (opcional, via Brevo) ----
      let emailEnviado = false
      if (process.env.BREVO_API_KEY) {
        try {
          const { data: dono } = await supabase.auth.admin.getUserById(st.owner_id)
          const emailDono = dono?.user?.email
          if (emailDono) {
            const htmlLinhas = linhas.map((l) => `<li style="margin:6px 0">${l}</li>`).join("")
            await fetch("https://api.brevo.com/v3/smtp/email", {
              method: "POST",
              headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json" },
              body: JSON.stringify({
                sender: { name: "Signature", email: process.env.ALERTAS_EMAIL_FROM || process.env.NOTIF_FROM_EMAIL || "no-reply@signature.app" },
                to: [{ email: emailDono }],
                subject: `☀️ ${st.name} — seu resumo do dia`,
                htmlContent: `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;color:#1a2530">
                  <h2 style="margin:0 0 4px">${titulo}</h2>
                  <p style="color:#8a8a8a;font-size:13px;margin:0 0 16px">Resumo automático do Signature Studio OS</p>
                  <ul style="font-size:14px;line-height:1.5;padding-left:18px">${htmlLinhas}</ul>
                  <a href="https://signaturebeauty.vercel.app/painel/financeiro" style="display:inline-block;margin-top:14px;background:#C9A96E;color:#0A0F1A;text-decoration:none;font-weight:bold;padding:10px 22px;border-radius:999px;font-family:Arial;font-size:13px">Abrir o Financeiro</a>
                </div>`,
              }),
            })
            emailEnviado = true
          }
        } catch {}
      }

      resumo.push({ studio: st.name, enviado: true, alertas: linhas.length, push: pushEnviados, email: emailEnviado })
    } catch (e: any) {
      resumo.push({ studio: st.name, erro: String(e?.message || e) })
    }
  }

  return NextResponse.json({ ok: true, quando: new Date().toISOString(), push: pushHabilitado, resumo })
}
