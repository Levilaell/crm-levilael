-- Adiciona estágio 'stand_by' (leads que pediram contato futuro — "me liga mês que vem").

alter table crm_leads drop constraint if exists crm_leads_stage_check;
alter table crm_leads add constraint crm_leads_stage_check check (stage in (
  'new', 'contact_tried', 'triage_scheduled', 'triage_done',
  'discovery_scheduled', 'discovery_done', 'proposal_sent',
  'negotiation', 'stand_by', 'won', 'lost'
));
