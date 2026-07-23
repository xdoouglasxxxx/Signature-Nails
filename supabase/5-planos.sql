-- ============================================================
-- SIGNATURE • ESCOLHA DE PLANO NO ONBOARDING (5-planos.sql)
-- chosen_plan = intenção do usuário (solo|pro); plan continua
-- sendo o estado de cobrança (trial|basico|pro|cancelado)
-- ============================================================
alter table studios add column if not exists chosen_plan text not null default 'pro'
  check (chosen_plan in ('solo', 'pro'));
-- contas existentes ficam como 'pro' (acesso total no trial)
