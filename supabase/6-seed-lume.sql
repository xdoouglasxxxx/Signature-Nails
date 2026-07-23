-- ============================================================
-- SIGNATURE • ESTÚDIO MODELO "ESTÚDIO LUME" (6-seed-lume.sql)
--
-- ANTES: crie a conta pelo site (cadastro normal):
--   nome: Estúdio Lume | link: estudio-lume | plano: Signature Pro
-- Depois pegue o id:  select id from studios where slug = 'estudio-lume';
-- e troque COLE-O-ID-AQUI abaixo (3 ocorrências via find&replace).
-- Rode TUDO de uma vez no SQL Editor.
-- ============================================================

-- Perfil institucional
update studios set
  specialty = 'Salão & Barbearia',
  bio = 'No Estúdio Lume, cada detalhe é pensado para você sair renovado(a). Unimos técnica, produtos premium e um ambiente acolhedor para cuidar de cabelo, barba e unhas — do clássico ao contemporâneo. Agende online e chegue no seu horário: o resto é com a gente. ✦',
  specialties = array['Cortes', 'Coloração', 'Barba', 'Unhas'],
  city = 'Arapoti - PR',
  plan = 'pro',
  plan_until = null,
  chosen_plan = 'pro'
where id = 'COLE-O-ID-AQUI';

-- Serviços
insert into services (id, studio_id, name, price, duration_minutes, description, category, sort_order) values
  ('aaaa1111-0000-0000-0000-000000000001', 'COLE-O-ID-AQUI', 'Corte Masculino', 45.00, 30, 'Corte na tesoura ou máquina, com acabamento e finalização.', 'cabelo', 0),
  ('aaaa1111-0000-0000-0000-000000000002', 'COLE-O-ID-AQUI', 'Corte Feminino', 75.00, 60, 'Corte personalizado com lavagem e finalização.', 'cabelo', 1),
  ('aaaa1111-0000-0000-0000-000000000003', 'COLE-O-ID-AQUI', 'Barba Completa', 40.00, 30, 'Modelagem com toalha quente, navalha e balm.', 'barba', 2),
  ('aaaa1111-0000-0000-0000-000000000004', 'COLE-O-ID-AQUI', 'Escova Modelada', 60.00, 45, 'Escova com proteção térmica e brilho.', 'cabelo', 3),
  ('aaaa1111-0000-0000-0000-000000000005', 'COLE-O-ID-AQUI', 'Manicure Completa', 55.00, 60, 'Cutilagem, esmaltação em gel e hidratação.', 'unhas', 4)
on conflict do nothing;

-- Equipe
insert into professionals (id, studio_id, name, role, commission_percent, sort_order) values
  ('bbbb2222-0000-0000-0000-000000000001', 'COLE-O-ID-AQUI', 'Rafael Costa', 'Barbeiro', 50, 0),
  ('bbbb2222-0000-0000-0000-000000000002', 'COLE-O-ID-AQUI', 'Camila Duarte', 'Cabeleireira', 45, 1),
  ('bbbb2222-0000-0000-0000-000000000003', 'COLE-O-ID-AQUI', 'Patrícia Lima', 'Nail Designer', 40, 2)
on conflict do nothing;

-- Quem faz o quê
insert into professional_services (professional_id, service_id) values
  ('bbbb2222-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001'),
  ('bbbb2222-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000003'),
  ('bbbb2222-0000-0000-0000-000000000002', 'aaaa1111-0000-0000-0000-000000000001'),
  ('bbbb2222-0000-0000-0000-000000000002', 'aaaa1111-0000-0000-0000-000000000002'),
  ('bbbb2222-0000-0000-0000-000000000002', 'aaaa1111-0000-0000-0000-000000000004'),
  ('bbbb2222-0000-0000-0000-000000000003', 'aaaa1111-0000-0000-0000-000000000005')
on conflict do nothing;

-- Clientes e agenda de exemplo (hoje + amanhã, com histórico pago)
insert into clients (id, studio_id, name, phone) values
  ('cccc3333-0000-0000-0000-000000000001', 'COLE-O-ID-AQUI', 'João Almeida', '5543999110001'),
  ('cccc3333-0000-0000-0000-000000000002', 'COLE-O-ID-AQUI', 'Fernanda Souza', '5543999110002'),
  ('cccc3333-0000-0000-0000-000000000003', 'COLE-O-ID-AQUI', 'Marcos Pereira', '5543999110003')
on conflict do nothing;

insert into appointments (studio_id, client_id, service_id, professional_id, date, start_time, end_time, status, price_at_time) values
  ('COLE-O-ID-AQUI', 'cccc3333-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001', 'bbbb2222-0000-0000-0000-000000000001', current_date, '14:00', '14:30', 'confirmado', 45.00),
  ('COLE-O-ID-AQUI', 'cccc3333-0000-0000-0000-000000000002', 'aaaa1111-0000-0000-0000-000000000002', 'bbbb2222-0000-0000-0000-000000000002', current_date, '14:00', '15:00', 'confirmado', 75.00),
  ('COLE-O-ID-AQUI', 'cccc3333-0000-0000-0000-000000000003', 'aaaa1111-0000-0000-0000-000000000003', 'bbbb2222-0000-0000-0000-000000000001', current_date + 1, '10:00', '10:30', 'pendente', 40.00),
  ('COLE-O-ID-AQUI', 'cccc3333-0000-0000-0000-000000000002', 'aaaa1111-0000-0000-0000-000000000005', 'bbbb2222-0000-0000-0000-000000000003', current_date - 3, '15:00', '16:00', 'pago', 55.00),
  ('COLE-O-ID-AQUI', 'cccc3333-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001', 'bbbb2222-0000-0000-0000-000000000001', current_date - 5, '11:00', '11:30', 'pago', 45.00)
on conflict do nothing;
