-- Log de operações de IA pra acompanhar uso/custo.
-- Cada chamada (briefing, script, slides, whisper) escreve aqui.
-- Dashboard em /settings/ai-usage agrega.

create table crm_ai_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references crm_leads(id) on delete cascade,
  operation text not null check (operation in (
    'briefing_triage',
    'briefing_discovery',
    'discovery_script',
    'slides_discovery_prep',
    'slides_proposal',
    'whisper_transcription'
  )),
  provider text not null check (provider in ('anthropic', 'openai')),
  model text not null,
  prompt_tokens int,
  completion_tokens int,
  audio_duration_seconds int,
  cost_brl_estimated numeric(10,4),
  duration_ms int,
  success boolean not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index crm_ai_logs_created_idx on crm_ai_logs (created_at desc);
create index crm_ai_logs_lead_op_idx on crm_ai_logs (lead_id, operation);
create index crm_ai_logs_operation_idx on crm_ai_logs (operation, created_at desc);

alter table crm_ai_logs enable row level security;

create policy "crm_ai_logs all for members" on crm_ai_logs
  for all using (crm_is_member()) with check (crm_is_member());
