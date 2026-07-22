# ✨ Signature Nails

Plataforma SaaS de agendamento para nail designers. Cada profissional cria sua conta,
monta sua página (`seudominio.com/nome-do-studio`) e recebe agendamentos online.

## O que a Fase 1 entrega

- **Landing** (`/`): apresenta a plataforma e converte profissionais para o cadastro
- **Cadastro + Onboarding**: cria conta, escolhe o link exclusivo (com verificação de
  disponibilidade em tempo real) e o studio nasce
- **Página pública** (`/[slug]`): hero com foto/capa, sobre, serviços, galeria,
  depoimentos, agendamento com horários inteligentes, mapa, contato e expediente
- **Painel** (`/painel`): Dashboard (com link copiável da página), Agenda (confirmar /
  pagar / cancelar / encerrar antecipado + mensagens prontas de WhatsApp), Serviços
  (com ordenação), Horários (expediente), Galeria (upload), Depoimentos (moderação),
  Clientes e Perfil (fotos, bio, redes sociais)
- **Isolamento total por profissional** (RLS): cada uma só vê e edita o que é dela

## PASSO 1 — Supabase (projeto novo)

1. https://supabase.com/dashboard → **New project** (região São Paulo)
2. **SQL Editor** → cole `supabase/schema.sql` inteiro → **Run**
3. **Authentication → Providers → Email** → desative **"Confirm email"**
   (para a profissional entrar direto após o cadastro; reative depois se quiser)
4. Anote em **Project Settings → API**: `Project URL` e `publishable key`

## PASSO 2 — GitHub

Crie um repositório novo (ex: `signature-nails`) e suba TODO o conteúdo desta pasta
na raiz (Add file → Upload files, arrastando tudo).

## PASSO 3 — Vercel

1. **Add New → Project** → importe o repositório `signature-nails`
2. Root Directory: **a raiz mesmo** (não precisa mudar)
3. Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = publishable key
4. **Deploy**

## PASSO 4 — Teste de ponta a ponta

1. Abra o link da Vercel → **Criar conta grátis** → cadastre um studio de teste
2. No painel: cadastre 2 serviços, configure horários, suba fotos, preencha o perfil
3. Copie o link no Dashboard → abra em aba anônima → faça um agendamento
4. Volte ao painel → Agenda → o agendamento deve estar lá → Confirmar
5. Envie um depoimento pela página pública → aprove em Depoimentos → veja publicado

## Rodando localmente (opcional)

```bash
npm install
cp .env.example .env   # preencha com URL e key
npm run dev            # http://localhost:3000
```

## Próximas fases

- **Fase 2**: vídeo no hero, lightbox na galeria, compressão de imagens, fotos demo
- **Fase 3**: animações (Framer Motion), gráficos no dashboard, temas de cor por studio
- **Fase 4**: assinatura paga (Stripe/Mercado Pago), domínio próprio, WhatsApp automático
