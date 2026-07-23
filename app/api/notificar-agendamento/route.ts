import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ ok: false }, { status: 400 })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const { data: app } = await admin
      .from("appointments")
      .select("date, start_time, price_at_time, studio_id, clients(name, phone), services(name), professionals(name), studios(name, slug, owner_id)")
      .eq("id", id)
      .maybeSingle()
    if (!app) return NextResponse.json({ ok: false }, { status: 404 })

    const studio: any = app.studios
    const { data: userData } = await admin.auth.admin.getUserById(studio.owner_id)
    const emailDono = userData?.user?.email
    if (!emailDono) return NextResponse.json({ ok: false }, { status: 404 })

    const [ano, mes, dia] = String(app.date).split("-")
    const hora = String(app.start_time).slice(0, 5)
    const cliente: any = app.clients
    const servico: any = app.services
    const prof: any = app.professionals
    const valor = Number(app.price_at_time || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    const urlAgenda = "https://signaturebeauty.vercel.app/painel/agenda"

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e5d9c5;border-radius:16px;overflow:hidden">
        <div style="background:#121C2C;color:#E5CDA6;padding:20px 24px">
          <h2 style="margin:0;font-size:18px">✦ Novo agendamento — ${studio.name}</h2>
        </div>
        <div style="padding:20px 24px;color:#222;font-size:14px;line-height:1.7">
          <p style="margin:0 0 12px">Você recebeu um novo agendamento pela sua página:</p>
          <table style="width:100%;font-size:14px">
            <tr><td style="color:#888;padding:2px 0">Cliente</td><td style="font-weight:bold">${cliente?.name || "-"}</td></tr>
            <tr><td style="color:#888;padding:2px 0">WhatsApp</td><td>${cliente?.phone || "-"}</td></tr>
            <tr><td style="color:#888;padding:2px 0">Serviço</td><td>${servico?.name || "-"}</td></tr>
            ${prof?.name ? `<tr><td style="color:#888;padding:2px 0">Profissional</td><td>${prof.name}</td></tr>` : ""}
            <tr><td style="color:#888;padding:2px 0">Data</td><td>${dia}/${mes}/${ano} às ${hora}</td></tr>
            <tr><td style="color:#888;padding:2px 0">Valor</td><td style="font-weight:bold">${valor}</td></tr>
          </table>
          <a href="${urlAgenda}" style="display:inline-block;margin-top:18px;background:#B18B5E;color:#121C2C;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:13px">
            VER NA AGENDA
          </a>
        </div>
        <div style="background:#F8F0E4;color:#999;padding:12px 24px;font-size:11px">Signature — gestão e agendamento para beleza</div>
      </div>`

    // ---- PUSH para os aparelhos do dono ----
    try {
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          "mailto:" + (process.env.NOTIF_FROM_EMAIL || "contato@signature.app"),
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY,
        )
        const { data: subs } = await admin
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("studio_id", app.studio_id)
        const payload = JSON.stringify({
          title: "✦ Novo agendamento",
          body: `${cliente?.name || "Cliente"} • ${servico?.name || ""}${prof?.name ? " com " + prof.name.split(" ")[0] : ""} • ${dia}/${mes} às ${hora}`,
          url: "/painel/agenda",
        })
        await Promise.allSettled(
          (subs || []).map((s) =>
            webpush
              .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
              .catch(async (err: any) => {
                if (err?.statusCode === 404 || err?.statusCode === 410) {
                  await admin.from("push_subscriptions").delete().eq("id", s.id)
                }
              }),
          ),
        )
      }
    } catch {}

    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY!,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Signature", email: process.env.NOTIF_FROM_EMAIL! },
        to: [{ email: emailDono }],
        subject: `Novo agendamento — ${cliente?.name || "Cliente"} • ${dia}/${mes} às ${hora}`,
        htmlContent: html,
      }),
    })

    return NextResponse.json({ ok: resp.ok })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
