-- CRM Levi Lael — schema v1
-- Convivência com tabelas do site: tudo prefixado com crm_
-- auth.users é compartilhado entre site e CRM (mesma instância Supabase)

-- =============================================================================
-- USUÁRIOS DO CRM (whitelist; vincula a auth.users)
-- =============================================================================

create table crm_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('admin', 'operator')),
  telegram_chat_id text,
  receives_new_leads boolean not null default true,
  receives_sla_alerts boolean not null default true,
  receives_briefing_ready boolean not null default true,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- LEADS
-- =============================================================================

create table crm_leads (
  id uuid primary key default gen_random_uuid(),
  source_lead_id uuid,
  source text not null check (source in ('diagnosis', 'calcom', 'manual', 'telegram', 'referral')),

  name text not null,
  email text,
  phone text,
  company_name text,
  role_title text,

  diagnosis_answers jsonb,
  diagnosis_score int,

  stage text not null default 'new' check (stage in (
    'new', 'contact_tried', 'triage_scheduled', 'triage_done',
    'discovery_scheduled', 'discovery_done', 'proposal_sent',
    'negotiation', 'won', 'lost'
  )),
  qualification text check (qualification in ('AAA', 'AA', 'A', 'B', 'C')),
  qualification_reason text,

  owner_id uuid references crm_users(id) on delete set null,

  notes text,
  lost_reason text,
  estimated_ticket_min int,
  estimated_ticket_max int,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_contact_at timestamptz,
  next_action_at timestamptz,
  sla_alerted_at timestamptz
);

create unique index crm_leads_source_lead_id_idx on crm_leads (source, source_lead_id)
  where source_lead_id is not null;
create index crm_leads_stage_idx on crm_leads (stage);
create index crm_leads_owner_idx on crm_leads (owner_id);
create index crm_leads_qualification_idx on crm_leads (qualification);
create index crm_leads_created_idx on crm_leads (created_at desc);
create index crm_leads_last_contact_idx on crm_leads (last_contact_at);

-- =============================================================================
-- TIMELINE DE EVENTOS
-- =============================================================================

create table crm_lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references crm_leads(id) on delete cascade,
  actor_id uuid references crm_users(id) on delete set null,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index crm_lead_events_lead_idx on crm_lead_events (lead_id, created_at desc);

-- =============================================================================
-- HISTÓRICO DE ESTÁGIOS
-- =============================================================================

create table crm_lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references crm_leads(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by uuid references crm_users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index crm_lead_stage_history_lead_idx on crm_lead_stage_history (lead_id, changed_at desc);

-- =============================================================================
-- DIAGRAMAS (3 kinds por lead)
-- =============================================================================

create table crm_diagrams (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references crm_leads(id) on delete cascade,
  kind text not null check (kind in ('triage', 'discovery', 'solution')),
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  generated_by_ai boolean not null default false,
  ai_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, kind)
);

create index crm_diagrams_lead_idx on crm_diagrams (lead_id);

-- =============================================================================
-- TRANSCRIÇÕES (input pra IA)
-- =============================================================================

create table crm_transcriptions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references crm_leads(id) on delete cascade,
  kind text not null check (kind in ('triage_call', 'discovery_call', 'other')),
  source_type text not null check (source_type in ('audio_upload', 'text_paste')),
  audio_storage_path text,
  raw_text text not null,
  word_count int,
  duration_seconds int,
  created_at timestamptz not null default now(),
  created_by uuid references crm_users(id) on delete set null
);

create index crm_transcriptions_lead_idx on crm_transcriptions (lead_id, created_at desc);

-- =============================================================================
-- BRIEFINGS (versionado)
-- =============================================================================

create table crm_briefings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references crm_leads(id) on delete cascade,
  kind text not null check (kind in ('triage', 'discovery', 'solution_draft', 'discovery_script')),
  version int not null default 1,
  transcription_id uuid references crm_transcriptions(id) on delete set null,
  content_json jsonb not null,
  content_markdown text,
  ai_model text,
  prompt_tokens int,
  completion_tokens int,
  generated_at timestamptz not null default now(),
  generated_by uuid references crm_users(id) on delete set null,
  unique (lead_id, kind, version)
);

create index crm_briefings_lead_kind_version_idx on crm_briefings (lead_id, kind, version desc);

-- =============================================================================
-- TAREFAS
-- =============================================================================

create table crm_tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references crm_leads(id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references crm_users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'doing', 'done', 'blocked')),
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references crm_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index crm_tasks_assignee_status_idx on crm_tasks (assignee_id, status);
create index crm_tasks_lead_idx on crm_tasks (lead_id);
create index crm_tasks_due_idx on crm_tasks (due_at);

-- =============================================================================
-- PROPOSTAS
-- =============================================================================

create table crm_proposals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references crm_leads(id) on delete cascade,
  total_value_min int,
  total_value_max int,
  waves jsonb,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'revised')),
  sent_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index crm_proposals_lead_idx on crm_proposals (lead_id);

-- =============================================================================
-- SLIDES GERADOS
-- =============================================================================

create table crm_slide_decks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references crm_leads(id) on delete cascade,
  briefing_id uuid references crm_briefings(id) on delete set null,
  kind text not null check (kind in ('discovery_prep', 'proposal')),
  html_content text not null,
  pdf_storage_path text,
  created_at timestamptz not null default now()
);

create index crm_slide_decks_lead_idx on crm_slide_decks (lead_id);

-- =============================================================================
-- TRIGGER: updated_at automático
-- =============================================================================

create or replace function crm_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger crm_leads_updated_at before update on crm_leads
  for each row execute function crm_set_updated_at();
create trigger crm_diagrams_updated_at before update on crm_diagrams
  for each row execute function crm_set_updated_at();
create trigger crm_proposals_updated_at before update on crm_proposals
  for each row execute function crm_set_updated_at();
create trigger crm_tasks_updated_at before update on crm_tasks
  for each row execute function crm_set_updated_at();

-- =============================================================================
-- RLS — qualquer usuário em crm_users tem acesso total às tabelas CRM
-- =============================================================================

alter table crm_users enable row level security;
alter table crm_leads enable row level security;
alter table crm_lead_events enable row level security;
alter table crm_lead_stage_history enable row level security;
alter table crm_diagrams enable row level security;
alter table crm_transcriptions enable row level security;
alter table crm_briefings enable row level security;
alter table crm_tasks enable row level security;
alter table crm_proposals enable row level security;
alter table crm_slide_decks enable row level security;

-- helper: usuário autenticado está em crm_users?
create or replace function crm_is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from crm_users where id = auth.uid()
  );
$$;

create policy "crm_users select self or member" on crm_users
  for select using (crm_is_member());
create policy "crm_users update self" on crm_users
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "crm_leads all for members" on crm_leads
  for all using (crm_is_member()) with check (crm_is_member());

create policy "crm_lead_events all for members" on crm_lead_events
  for all using (crm_is_member()) with check (crm_is_member());

create policy "crm_lead_stage_history all for members" on crm_lead_stage_history
  for all using (crm_is_member()) with check (crm_is_member());

create policy "crm_diagrams all for members" on crm_diagrams
  for all using (crm_is_member()) with check (crm_is_member());

create policy "crm_transcriptions all for members" on crm_transcriptions
  for all using (crm_is_member()) with check (crm_is_member());

create policy "crm_briefings all for members" on crm_briefings
  for all using (crm_is_member()) with check (crm_is_member());

create policy "crm_tasks all for members" on crm_tasks
  for all using (crm_is_member()) with check (crm_is_member());

create policy "crm_proposals all for members" on crm_proposals
  for all using (crm_is_member()) with check (crm_is_member());

create policy "crm_slide_decks all for members" on crm_slide_decks
  for all using (crm_is_member()) with check (crm_is_member());

-- =============================================================================
-- STORAGE BUCKETS (rodar manualmente no dashboard ou via SQL)
-- =============================================================================

-- crm_audio: áudios de calls (privado, signed URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crm_audio',
  'crm_audio',
  false,
  26214400, -- 25MB (limite do Whisper)
  array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/ogg', 'audio/webm']
)
on conflict (id) do nothing;

-- crm_pdfs: PDFs e HTMLs renderizados (privado, signed URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crm_pdfs',
  'crm_pdfs',
  false,
  20971520, -- 20MB
  array['application/pdf', 'text/html']
)
on conflict (id) do nothing;

-- Policies dos buckets: só membros do CRM
create policy "crm_audio members all" on storage.objects
  for all to authenticated
  using (bucket_id = 'crm_audio' and crm_is_member())
  with check (bucket_id = 'crm_audio' and crm_is_member());

create policy "crm_pdfs members all" on storage.objects
  for all to authenticated
  using (bucket_id = 'crm_pdfs' and crm_is_member())
  with check (bucket_id = 'crm_pdfs' and crm_is_member());
