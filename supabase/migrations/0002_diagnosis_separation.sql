-- Separação de diagnóstico vs. lead
--
-- Nova regra: lead = formulário "Vamos conversar" OU Cal.com. Diagnóstico
-- sozinho NÃO é lead; vira snapshot que pode ser matchado depois quando
-- a pessoa virar lead via formulário/calcom.

-- =============================================================================
-- SNAPSHOTS DE DIAGNÓSTICO (órfãos até virarem lead)
-- =============================================================================

create table crm_diagnosis_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_diagnosis_id uuid unique, -- referencia diagnoses.id no banco do site
  email text,
  phone text,
  name text,
  score int,
  answers jsonb not null,
  ai_analysis jsonb,
  completed_at timestamptz not null,
  converted_to_lead_id uuid references crm_leads(id) on delete set null,
  converted_at timestamptz,
  created_at timestamptz not null default now()
);

create index crm_diagnosis_snapshots_email_idx on crm_diagnosis_snapshots (email);
create index crm_diagnosis_snapshots_phone_idx on crm_diagnosis_snapshots (phone);
create index crm_diagnosis_snapshots_converted_idx on crm_diagnosis_snapshots (converted_to_lead_id);
create index crm_diagnosis_snapshots_completed_idx on crm_diagnosis_snapshots (completed_at desc);

-- =============================================================================
-- AJUSTAR ENUM DE source EM crm_leads
-- =============================================================================
--
-- Antes: 'diagnosis' | 'calcom' | 'manual' | 'telegram' | 'referral'
-- Depois: 'whatsapp_form' | 'calcom' | 'manual' | 'referral'
--
-- Removidos: 'diagnosis' (virou snapshot) e 'telegram' (inbound do bot é v2).
-- Renomeado: novos leads ganham 'whatsapp_form' (o gatilho real).

-- BACKFILL (descomentar se houver leads de teste em prod):
-- delete from crm_leads where source = 'diagnosis';
-- update crm_leads set source = 'manual' where source = 'telegram';

alter table crm_leads
  drop constraint if exists crm_leads_source_check;

alter table crm_leads
  add constraint crm_leads_source_check
  check (source in ('whatsapp_form', 'calcom', 'manual', 'referral'));

-- Vínculo opcional pro diagnóstico prévio (se houve match no momento do lead)
alter table crm_leads
  add column if not exists matched_diagnosis_id uuid
  references crm_diagnosis_snapshots(id) on delete set null;

create index if not exists crm_leads_matched_diagnosis_idx
  on crm_leads (matched_diagnosis_id);

-- Unique parcial pra idempotência: mesmo source + mesmo phone normalizado
-- não cria 2 leads. Phone é guardado normalizado (E.164) pelo webhook.
create unique index if not exists crm_leads_source_phone_uniq
  on crm_leads (source, phone)
  where phone is not null;

-- =============================================================================
-- RLS — mesmo padrão das outras tabelas
-- =============================================================================

alter table crm_diagnosis_snapshots enable row level security;

create policy "crm_diagnosis_snapshots all for members" on crm_diagnosis_snapshots
  for all using (crm_is_member()) with check (crm_is_member());
