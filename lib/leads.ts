import { createServiceRoleClient } from '@/lib/supabase/service';
import type { LeadStage, LeadSource, Qualification } from '@/types/crm';

export interface LeadRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  role_title: string | null;
  source: LeadSource;
  source_lead_id: string | null;
  stage: LeadStage;
  qualification: Qualification | null;
  qualification_reason: string | null;
  owner_id: string | null;
  notes: string | null;
  estimated_ticket_min: number | null;
  estimated_ticket_max: number | null;
  diagnosis_score: number | null;
  diagnosis_answers: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  last_contact_at: string | null;
  next_action_at: string | null;
  lost_reason: string | null;
  matched_diagnosis_id: string | null;
}

export interface LeadFilters {
  ownerId?: string;
  qualification?: Qualification;
  source?: LeadSource;
  search?: string;
}

const SELECT_COLS =
  'id, name, email, phone, company_name, role_title, source, source_lead_id, stage, qualification, qualification_reason, owner_id, notes, estimated_ticket_min, estimated_ticket_max, diagnosis_score, diagnosis_answers, created_at, updated_at, last_contact_at, next_action_at, lost_reason, matched_diagnosis_id';

export async function listLeads(filters: LeadFilters = {}): Promise<LeadRow[]> {
  const admin = createServiceRoleClient();
  let q = admin.from('crm_leads').select(SELECT_COLS).order('created_at', { ascending: false });

  if (filters.ownerId) q = q.eq('owner_id', filters.ownerId);
  if (filters.qualification) q = q.eq('qualification', filters.qualification);
  if (filters.source) q = q.eq('source', filters.source);
  if (filters.search) {
    const term = `%${filters.search}%`;
    q = q.or(`name.ilike.${term},company_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
  }
  const { data, error } = await q;
  if (error) {
    console.error('[leads] list failed', error);
    return [];
  }
  return (data ?? []) as LeadRow[];
}

export async function getLead(id: string): Promise<LeadRow | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.from('crm_leads').select(SELECT_COLS).eq('id', id).maybeSingle();
  if (error) {
    console.error('[leads] get failed', error);
    return null;
  }
  return (data ?? null) as LeadRow | null;
}

export async function listCrmUsers(): Promise<
  Array<{ id: string; display_name: string; email: string; role: 'admin' | 'operator' }>
> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.from('crm_users').select('id, display_name, email, role');
  if (error) return [];
  return (data ?? []) as Array<{ id: string; display_name: string; email: string; role: 'admin' | 'operator' }>;
}
